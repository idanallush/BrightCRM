import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Simple in-memory rate limiter: 20 queries per user per hour
const rateLimits = new Map<string, { count: number; reset: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(userId);
  if (!entry || now > entry.reset) {
    rateLimits.set(userId, { count: 1, reset: now + 3600000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

type TaskRow = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  client_name: string | null;
};

type ClientRow = {
  id: string;
  name: string;
  health: string | null;
};

const ACTIVE_STATUSES = ["מחכה לטיפול", "נכנס לעבודה", "בעבודה", "אישור לקוח", "אישור מנהל"];

async function getMemberId(email: string): Promise<string | null> {
  const db = createAdminClient();
  const { data } = await db.from("team_members").select("id").eq("email", email).maybeSingle();
  return data?.id ?? null;
}

async function getMyActiveTasks(memberId: string): Promise<TaskRow[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("tasks")
    .select("id,title,status,due_date,client:clients(name),assignees:task_assignees(member:team_members(id))")
    .in("status", ACTIVE_STATUSES)
    .order("due_date", { ascending: true, nullsFirst: false });
  return ((data ?? []) as any[])
    .filter((t: any) => (t.assignees ?? []).some((a: any) => a.member?.id === memberId))
    .map((t: any) => ({
      id: t.id, title: t.title, status: t.status, due_date: t.due_date,
      client_name: t.client?.name ?? null,
    }));
}

async function handleQuickAction(action: string, memberId: string) {
  const db = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  if (action === "today") {
    const tasks = await getMyActiveTasks(memberId);
    const todayTasks = tasks.filter((t) => t.due_date && t.due_date <= today);
    if (todayTasks.length === 0) return { text: "אין משימות שצריכות טיפול היום. יום שקט!", tasks: [] };
    return { text: `יש לך ${todayTasks.length} משימות להיום:`, tasks: todayTasks };
  }

  if (action === "overdue") {
    const tasks = await getMyActiveTasks(memberId);
    const overdue = tasks.filter((t) => t.due_date && t.due_date < today);
    if (overdue.length === 0) return { text: "אין משימות באיחור. מצוין!", tasks: [] };
    return { text: `${overdue.length} משימות באיחור:`, tasks: overdue };
  }

  if (action === "weekly") {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const [created, completed] = await Promise.all([
      db.from("tasks").select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo)
        .eq("source", "web"),
      db.from("tasks").select("*", { count: "exact", head: true })
        .eq("status", "בוצע")
        .gte("updated_at", weekAgo),
    ]);
    const telegramCount = await db.from("tasks").select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo).eq("source", "telegram");
    return {
      text: `סיכום שבועי:\n\n• ${created.count ?? 0} משימות נפתחו מהממשק\n• ${telegramCount.count ?? 0} משימות נפתחו מטלגרם\n• ${completed.count ?? 0} משימות הושלמו`,
      tasks: [],
    };
  }

  if (action === "no_deadline") {
    const tasks = await getMyActiveTasks(memberId);
    const noDeadline = tasks.filter((t) => !t.due_date);
    if (noDeadline.length === 0) return { text: "כל המשימות שלך עם דדליין. נהדר!", tasks: [] };
    return { text: `${noDeadline.length} משימות בלי דדליין:`, tasks: noDeadline };
  }

  if (action === "attention_clients") {
    const { data } = await db
      .from("clients")
      .select("id,name,health")
      .in("health", ["קריטי", "אסטרטגיה צריכה"])
      .order("name");
    const clients = ((data ?? []) as ClientRow[]);
    if (clients.length === 0) return { text: "כל הלקוחות במצב תקין!", tasks: [], clients: [] };
    return {
      text: `${clients.length} לקוחות שצריכים תשומת לב:`,
      tasks: [],
      clients,
    };
  }

  return null;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { question, action, userEmail } = body as {
    question?: string;
    action?: string;
    userEmail: string;
  };

  if (!userEmail) {
    return NextResponse.json({ error: "חסר מייל משתמש" }, { status: 400 });
  }

  if (!checkRateLimit(userEmail)) {
    return NextResponse.json({ error: "הגעת למגבלת השאלות. נסה שוב בעוד שעה." }, { status: 429 });
  }

  const memberId = await getMemberId(userEmail);
  if (!memberId) {
    return NextResponse.json({ error: "משתמש לא נמצא" }, { status: 404 });
  }

  // Quick actions
  if (action) {
    const result = await handleQuickAction(action, memberId);
    if (result) return NextResponse.json(result);
    return NextResponse.json({ error: "פעולה לא מוכרת" }, { status: 400 });
  }

  // Free-text question — use Claude
  if (!question?.trim()) {
    return NextResponse.json({ error: "חסרה שאלה" }, { status: 400 });
  }

  // Gather context for Claude
  const [myTasks, allClients] = await Promise.all([
    getMyActiveTasks(memberId),
    (async () => {
      const db = createAdminClient();
      const { data } = await db.from("clients").select("id,name,health").order("name");
      return (data ?? []) as ClientRow[];
    })(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const taskContext = myTasks.map((t) => {
    const overdue = t.due_date && t.due_date < today ? " [באיחור!]" : "";
    return `- ${t.title} | לקוח: ${t.client_name ?? "ללא"} | סטטוס: ${t.status} | דדליין: ${t.due_date ?? "ללא"}${overdue}`;
  }).join("\n");

  const clientContext = allClients.map((c) =>
    `- ${c.name} | בריאות: ${c.health ?? "לא צוין"}`
  ).join("\n");

  const systemPrompt = `אתה עוזר CRM חכם של סוכנות השיווק Bright. ענה בעברית, בקצרה ולעניין.

התאריך היום: ${today}

המשימות הפתוחות של המשתמש:
${taskContext || "אין משימות פתוחות"}

רשימת לקוחות:
${clientContext}

כללים:
- ענה בקצרה ובבהירות
- אם שואלים על משימה או לקוח ספציפי, ציין את הפרטים
- אם אין לך מידע, אמור את זה בכנות
- אל תמציא נתונים`;

  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: "user", content: question }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "תשובה לא צפויה" }, { status: 500 });
    }

    return NextResponse.json({ text: content.text, tasks: [], clients: [] });
  } catch (err) {
    console.error("[Chat] Claude API error:", err);
    return NextResponse.json({ error: "שגיאה בעיבוד השאלה. נסה שוב." }, { status: 500 });
  }
}
