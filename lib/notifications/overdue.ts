import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

type OverdueTask = {
  task_id: string;
  title: string;
  due_date: string;
  client_name: string;
  days_overdue: number;
};

type AssigneeTasks = {
  email: string;
  full_name: string;
  tasks: OverdueTask[];
};

export async function checkAndNotifyOverdue() {
  const db = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  // Get all overdue tasks (status = בעבודה, due_date < today) with assignees
  const { data: rows, error } = await db
    .from("tasks")
    .select(
      `
      id,
      title,
      due_date,
      clients!inner ( name ),
      task_assignees!inner (
        team_members!inner ( email, full_name )
      )
    `,
    )
    .eq("status", "בעבודה")
    .lt("due_date", today);

  if (error) {
    console.error("[Overdue] Query failed:", error);
    throw new Error(`Failed to query overdue tasks: ${error.message}`);
  }

  if (!rows || rows.length === 0) {
    return { tasksFound: 0, emailsSent: 0 };
  }

  // Group tasks by assignee email
  const byAssignee = new Map<string, AssigneeTasks>();

  for (const row of rows) {
    const dueDate = new Date(row.due_date!);
    const daysOverdue = Math.floor(
      (Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const clientName = (row.clients as unknown as { name: string }).name;

    const assignees = row.task_assignees as unknown as {
      team_members: { email: string; full_name: string };
    }[];

    for (const a of assignees) {
      const email = a.team_members.email;
      if (!byAssignee.has(email)) {
        byAssignee.set(email, {
          email,
          full_name: a.team_members.full_name,
          tasks: [],
        });
      }
      byAssignee.get(email)!.tasks.push({
        task_id: row.id,
        title: row.title,
        due_date: row.due_date!,
        client_name: clientName,
        days_overdue: daysOverdue,
      });
    }
  }

  // Send one email per assignee
  const resend = new Resend(process.env.RESEND_API_KEY);
  let emailsSent = 0;

  for (const [, assignee] of byAssignee) {
    const taskRows = assignee.tasks
      .sort((a, b) => b.days_overdue - a.days_overdue)
      .map(
        (t) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${t.client_name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${t.title}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${t.due_date}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#dc2626;font-weight:bold;">${t.days_overdue} ימים</td>
        </tr>`,
      )
      .join("");

    const html = `
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#1e293b;">שלום ${assignee.full_name},</h2>
      <p style="color:#475569;font-size:16px;">יש לך <strong>${assignee.tasks.length}</strong> משימות שעברו את הדדליין:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #e2e8f0;">לקוח</th>
            <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #e2e8f0;">משימה</th>
            <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #e2e8f0;">דדליין</th>
            <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #e2e8f0;">איחור</th>
          </tr>
        </thead>
        <tbody>${taskRows}</tbody>
      </table>
      <p style="color:#64748b;font-size:14px;">נשלח אוטומטית מ-BrightCRM</p>
    </div>`;

    const fromAddress =
      process.env.RESEND_FROM_EMAIL ?? "BrightCRM <onboarding@resend.dev>";

    const { error: sendErr } = await resend.emails.send({
      from: fromAddress,
      to: assignee.email,
      subject: `⚠️ יש לך ${assignee.tasks.length} משימות שעברו דדליין`,
      html,
    });

    if (sendErr) {
      console.error(
        `[Overdue] Failed to send to ${assignee.email}:`,
        sendErr,
      );
    } else {
      emailsSent++;
    }
  }

  return { tasksFound: rows.length, emailsSent };
}
