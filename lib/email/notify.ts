import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "./resend";
import {
  newTaskEmail,
  newCommentEmail,
  mentionEmail,
  overdueEmail,
} from "./templates";

export async function notifyNewTask(taskId: string) {
  const db = createAdminClient();

  const { data: task } = await db
    .from("tasks")
    .select(
      "id, title, description, due_date, status, created_by_id, clients!inner(name)",
    )
    .eq("id", taskId)
    .single();

  if (!task) return;

  const { data: assigneeRows } = await db
    .from("task_assignees")
    .select("member:team_members!inner(id, full_name, email)")
    .eq("task_id", taskId);

  const assignees = ((assigneeRows ?? []) as any[]).map((r) => r.member);
  if (assignees.length === 0) return;

  let creator = { full_name: "המערכת" };
  if (task.created_by_id) {
    const { data: c } = await db
      .from("team_members")
      .select("full_name")
      .eq("id", task.created_by_id)
      .single();
    if (c) creator = c;
  }

  const client = task.clients as unknown as { name: string };

  const recipients = assignees
    .filter((a: any) => a.id !== task.created_by_id)
    .map((a: any) => a.email as string)
    .filter(Boolean);

  if (recipients.length === 0) return;

  const { subject, html } = newTaskEmail(
    { id: task.id, title: task.title, due_date: task.due_date, status: task.status, description: task.description },
    client,
    assignees,
    creator,
  );

  try {
    await sendEmail(recipients, subject, html);
  } catch (err) {
    console.error("[Notify] newTask email failed:", err);
  }
}

export async function notifyNewComment(commentId: string) {
  const db = createAdminClient();

  const { data: comment } = await db
    .from("task_comments")
    .select("id, task_id, author_id, content, mentions")
    .eq("id", commentId)
    .single();

  if (!comment) return;

  const { data: task } = await db
    .from("tasks")
    .select("id, title, due_date, status, clients!inner(name)")
    .eq("id", comment.task_id)
    .single();

  if (!task) return;

  const { data: author } = await db
    .from("team_members")
    .select("id, full_name, email")
    .eq("id", comment.author_id)
    .single();

  if (!author) return;

  const { data: assigneeRows } = await db
    .from("task_assignees")
    .select("member:team_members!inner(id, full_name, email)")
    .eq("task_id", comment.task_id);

  const assignees = ((assigneeRows ?? []) as any[]).map((r) => r.member);
  const client = task.clients as unknown as { name: string };

  const recipients = assignees
    .filter((a: any) => a.id !== comment.author_id)
    .map((a: any) => a.email as string)
    .filter(Boolean);

  if (recipients.length === 0) return;

  const { subject, html } = newCommentEmail(
    { id: task.id, title: task.title, due_date: task.due_date, status: task.status },
    client,
    { content: comment.content },
    author,
  );

  try {
    await sendEmail(recipients, subject, html);
  } catch (err) {
    console.error("[Notify] newComment email failed:", err);
  }
}

export async function notifyMentions(commentId: string) {
  const db = createAdminClient();

  const { data: comment } = await db
    .from("task_comments")
    .select("id, task_id, author_id, content, mentions")
    .eq("id", commentId)
    .single();

  if (!comment || !comment.mentions || comment.mentions.length === 0) return;

  const { data: task } = await db
    .from("tasks")
    .select("id, title, due_date, status, clients!inner(name)")
    .eq("id", comment.task_id)
    .single();

  if (!task) return;

  const { data: author } = await db
    .from("team_members")
    .select("id, full_name")
    .eq("id", comment.author_id)
    .single();

  if (!author) return;

  const { data: mentionedUsers } = await db
    .from("team_members")
    .select("id, full_name, email")
    .in("id", comment.mentions);

  if (!mentionedUsers || mentionedUsers.length === 0) return;

  const client = task.clients as unknown as { name: string };

  for (const user of mentionedUsers) {
    if (user.id === comment.author_id) continue;
    if (!user.email) continue;

    const { subject, html } = mentionEmail(
      { id: task.id, title: task.title, due_date: task.due_date, status: task.status },
      client,
      { content: comment.content },
      author,
      user,
    );

    try {
      await sendEmail([user.email], subject, html);
    } catch (err) {
      console.error(`[Notify] mention email to ${user.email} failed:`, err);
    }
  }
}

export async function notifyOverdueByEmail() {
  const db = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: rows } = await db
    .from("tasks")
    .select(
      `id, title, due_date, status,
       clients!inner(name),
       task_assignees!inner(member:team_members!inner(id, full_name, email))`,
    )
    .in("status", ["מחכה לטיפול", "נכנס לעבודה", "בעבודה"])
    .lt("due_date", today);

  if (!rows || rows.length === 0) return { sent: 0 };

  let sent = 0;

  for (const row of rows) {
    const client = row.clients as unknown as { name: string };
    const assignees = (row.task_assignees as any[]).map((a) => a.member);

    for (const assignee of assignees) {
      if (!assignee.email) continue;

      // Check notification_log to avoid duplicate emails for same task+person today
      const { data: existing } = await db
        .from("notification_log")
        .select("id")
        .eq("type", "overdue")
        .eq("recipient_email", assignee.email)
        .eq("reference_id", row.id)
        .gte("sent_at", `${today}T00:00:00Z`)
        .limit(1);

      if (existing && existing.length > 0) continue;

      const { subject, html } = overdueEmail(
        { id: row.id, title: row.title, due_date: row.due_date, status: row.status },
        client,
        assignees,
      );

      try {
        await sendEmail([assignee.email], subject, html);
        await db.from("notification_log").insert({
          type: "overdue",
          recipient_email: assignee.email,
          reference_id: row.id,
        });
        sent++;
      } catch (err) {
        console.error(`[Notify] overdue email to ${assignee.email} failed:`, err);
      }
    }
  }

  return { sent };
}
