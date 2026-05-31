import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

export type ParsedTask = {
  client_name: string;
  client_id: string;
  title: string;
  description: string;
  assignee_name: string;
  assignee_id: string;
  creator_name: string;
  creator_id: string;
  due_date: string | null;
  priority: string;
  confidence: number;
};

type Sender = {
  id: string;
  full_name: string;
};

function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?\s*```$/, "");
  }
  return cleaned.trim();
}

export async function parseTaskFromText(
  text: string,
  sender: Sender,
): Promise<ParsedTask> {
  const db = createAdminClient();

  // Fetch context lists for Claude
  const [clientsRes, membersRes] = await Promise.all([
    db.from("clients").select("id, name").order("name"),
    db
      .from("team_members")
      .select("id, full_name")
      .eq("active", true)
      .order("full_name"),
  ]);

  const clients = clientsRes.data ?? [];
  const members = membersRes.data ?? [];

  const clientList = clients
    .map((c) => `- ${c.name} (ID: ${c.id})`)
    .join("\n");
  const memberList = members
    .map((m) => `- ${m.full_name} (ID: ${m.id})`)
    .join("\n");

  const today = new Date().toISOString().slice(0, 10);
  const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const todayDayName = dayNames[new Date().getDay()];

  const systemPrompt = `אתה מפענח הודעות טקסט בעברית למשימות מובנות עבור סוכנות שיווק דיגיטלי (Bright).

התאריך היום: ${today} (יום ${todayDayName})

רשימת לקוחות:
${clientList}

חברי צוות:
${memberList}

השולח הוא: ${sender.full_name} (ID: ${sender.id})

כללים:
- client_name ו-client_id חייבים להתאים ללקוח מהרשימה. אם השם לא מדויק, בחר את ההתאמה הקרובה ביותר.
- creator = השולח תמיד. creator_name ו-creator_id הם תמיד של השולח.
- assignee ברירת מחדל = השולח, אלא אם ההודעה מציינת מישהו אחר (למשל "תפתח משימה לשרון" → assignee = שרון, creator = השולח).
- due_date בפורמט YYYY-MM-DD. תמיד תרגם תאריכים יחסיים לתאריך מלא:
  "מחר" / "מחרתיים" = יום אחד/יומיים מ-${today}
  "יום ראשון" / "יום א׳" = יום ראשון הקרוב (אם היום כבר יום ראשון, הכוונה ליום ראשון הבא)
  "יום שני" / "יום ב׳" = יום שני הקרוב (אותו כלל)
  "עוד שבוע" = ${today} + 7 ימים
  "סוף השבוע" = יום שישי הקרוב
  "עוד יומיים" / "עוד 3 ימים" = ${today} + N ימים
  אם לא צוין תאריך כלל, החזר null.
- priority: "normal" או "urgent" לפי הטון.
- confidence: 0-1, כמה אתה בטוח בפענוח.
- title: כותרת קצרה וברורה למשימה בעברית.
- description: תיאור מלא יותר אם ההודעה מכילה פרטים, אחרת זהה ל-title.

החזר JSON בלבד, בלי טקסט נוסף. הפורמט:
{"client_name":"...","client_id":"...","title":"...","description":"...","assignee_name":"...","assignee_id":"...","creator_name":"...","creator_id":"...","due_date":null,"priority":"normal","confidence":0.9}`;

  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: "user", content: text }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude API");
  }

  const parsed = JSON.parse(cleanJsonResponse(content.text)) as ParsedTask;
  // Creator is always the sender — enforce even if the model omits it
  parsed.creator_id = sender.id;
  parsed.creator_name = sender.full_name;
  return parsed;
}
