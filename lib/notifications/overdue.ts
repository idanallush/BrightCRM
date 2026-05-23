import { createAdminClient } from "@/lib/supabase/admin";

type OverdueTask = {
  title: string;
  due_date: string;
  client_name: string;
  days_overdue: number;
};

type AssigneeTasks = {
  telegram_user_id: number;
  full_name: string;
  tasks: OverdueTask[];
};

async function sendTelegramMessage(chatId: number, text: string) {
  const res = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    },
  );
  const data = await res.json();
  if (!data.ok) {
    console.error(`[Overdue] Telegram send failed for ${chatId}:`, data);
  }
  return data.ok;
}

export async function checkAndNotifyOverdue() {
  const db = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: rows, error } = await db
    .from("tasks")
    .select(
      `
      id,
      title,
      due_date,
      clients!inner ( name ),
      task_assignees!inner (
        team_members!inner ( full_name, telegram_user_id )
      )
    `,
    )
    .in("status", ["מחכה לטיפול", "נכנס לעבודה", "בעבודה"])
    .lt("due_date", today);

  if (error) {
    console.error("[Overdue] Query failed:", error);
    throw new Error(`Failed to query overdue tasks: ${error.message}`);
  }

  if (!rows || rows.length === 0) {
    return { tasksFound: 0, messagesSent: 0 };
  }

  // Group by assignee telegram_user_id (skip members without one)
  const byAssignee = new Map<number, AssigneeTasks>();

  for (const row of rows) {
    const dueDate = new Date(row.due_date!);
    const daysOverdue = Math.floor(
      (Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const clientName = (row.clients as unknown as { name: string }).name;

    const assignees = row.task_assignees as unknown as {
      team_members: { full_name: string; telegram_user_id: number | null };
    }[];

    for (const a of assignees) {
      const tgId = a.team_members.telegram_user_id;
      if (!tgId) continue;

      if (!byAssignee.has(tgId)) {
        byAssignee.set(tgId, {
          telegram_user_id: tgId,
          full_name: a.team_members.full_name,
          tasks: [],
        });
      }
      byAssignee.get(tgId)!.tasks.push({
        title: row.title,
        due_date: row.due_date!,
        client_name: clientName,
        days_overdue: daysOverdue,
      });
    }
  }

  let messagesSent = 0;

  for (const [, assignee] of byAssignee) {
    const taskLines = assignee.tasks
      .sort((a, b) => b.days_overdue - a.days_overdue)
      .map(
        (t) =>
          `• ${t.client_name} — ${t.title} (דדליין: ${t.due_date}, איחור: ${t.days_overdue} ימים)`,
      )
      .join("\n");

    const text = `⚠️ יש לך ${assignee.tasks.length} משימות שעברו דדליין:\n\n${taskLines}`;

    const ok = await sendTelegramMessage(assignee.telegram_user_id, text);
    if (ok) messagesSent++;
  }

  return { tasksFound: rows.length, messagesSent };
}
