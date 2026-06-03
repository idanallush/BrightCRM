import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { morningDigestEmail } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Skip Shabbat — Saturday is day 6.
  // Cron runs at 06:00 UTC = 09:00 Israel.
  // Israel is UTC+2/+3, so at 06:00 UTC the local day is the same calendar day.
  const now = new Date();
  const israelHour = now.getUTCHours() + 3; // approximate IST
  const israelDay = israelHour >= 24 ? (now.getUTCDay() + 1) % 7 : now.getUTCDay();
  // Skip Saturday (6) and Friday (5) — work days are Sun(0)-Thu(4)
  if (israelDay === 5 || israelDay === 6) {
    return NextResponse.json({ skipped: true, reason: "weekend" });
  }

  try {
    const result = await sendMorningDigests();
    console.log("[Cron] Morning digest:", result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[Cron] Morning digest failed:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

async function sendMorningDigests() {
  const db = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: members } = await db
    .from("team_members")
    .select("id, full_name, email")
    .eq("active", true);

  if (!members || members.length === 0) return { sent: 0 };

  let sent = 0;

  for (const member of members) {
    if (!member.email) continue;

    // Get tasks assigned to this member that are open
    const { data: assignedRows } = await db
      .from("task_assignees")
      .select(
        "task:tasks!inner(id, title, due_date, status, client:clients(name), assignees:task_assignees(member:team_members!inner(full_name)))",
      )
      .eq("member_id", member.id);

    const tasks = ((assignedRows ?? []) as any[])
      .map((r) => r.task)
      .filter(
        (t: any) =>
          t &&
          ["מחכה לטיפול", "נכנס לעבודה", "בעבודה", "אישור לקוח"].includes(
            t.status,
          ),
      );

    if (tasks.length === 0) continue;

    const toDigestTask = (t: any) => ({
      id: t.id as string,
      title: t.title as string,
      client_name: (t.client?.name as string) ?? "כללי",
      due_date: t.due_date as string | null,
      status: t.status as string,
      assignee_names: ((t.assignees ?? []) as any[])
        .map((a: any) => a.member?.full_name)
        .filter(Boolean)
        .join(", "),
    });

    const openTasks = tasks.map(toDigestTask);
    const overdueTasks = openTasks.filter(
      (t) => t.due_date && t.due_date < today,
    );
    const todayTasks = openTasks.filter((t) => t.due_date === today);

    const { subject, html } = morningDigestEmail(
      member,
      openTasks,
      overdueTasks,
      todayTasks,
    );

    try {
      await sendEmail([member.email], subject, html, { type: "digest" });
      sent++;
    } catch (err) {
      console.error(`[Digest] Email to ${member.email} failed:`, err);
    }
  }

  return { sent };
}
