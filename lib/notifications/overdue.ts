import { createAdminClient } from "@/lib/supabase/admin";
import { sendTextMessage } from "@/lib/whatsapp/api";

type OverdueTask = {
  title: string;
  due_date: string;
  client_name: string;
  days_overdue: number;
};

type AssigneeTasks = {
  whatsapp_phone: string;
  full_name: string;
  tasks: OverdueTask[];
};

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
      clients ( name ),
      task_assignees!inner (
        team_members!inner ( full_name, whatsapp_phone, notify_whatsapp )
      )
    `,
    )
    .in("status", ["מחכה לטיפול", "נכנס לעבודה", "בעבודה סטודיו", "בעבודה ספק חיצוני"])
    .lt("due_date", today);

  if (error) {
    console.error("[Overdue] Query failed:", error);
    throw new Error(`Failed to query overdue tasks: ${error.message}`);
  }

  if (!rows || rows.length === 0) {
    return { tasksFound: 0, messagesSent: 0 };
  }

  const byAssignee = new Map<string, AssigneeTasks>();

  for (const row of rows) {
    const dueDate = new Date(row.due_date!);
    const daysOverdue = Math.floor(
      (Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const clientName = (row.clients as unknown as { name: string } | null)?.name ?? "כללי";

    const assignees = row.task_assignees as unknown as {
      team_members: { full_name: string; whatsapp_phone: string | null; notify_whatsapp: boolean | null };
    }[];

    for (const a of assignees) {
      const phone = a.team_members.whatsapp_phone;
      if (!phone) continue;
      if (a.team_members.notify_whatsapp === false) continue;

      if (!byAssignee.has(phone)) {
        byAssignee.set(phone, {
          whatsapp_phone: phone,
          full_name: a.team_members.full_name,
          tasks: [],
        });
      }
      byAssignee.get(phone)!.tasks.push({
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

    const text = `יש לך ${assignee.tasks.length} משימות שעברו דדליין:\n\n${taskLines}`;

    try {
      await sendTextMessage(assignee.whatsapp_phone, text);
      messagesSent++;
    } catch (err) {
      console.error(`[Overdue] WhatsApp send failed for ${assignee.whatsapp_phone}:`, err);
    }
  }

  return { tasksFound: rows.length, messagesSent };
}
