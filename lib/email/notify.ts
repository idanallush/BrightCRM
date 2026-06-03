import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "./resend";
import {
  newTaskEmail,
  newCommentEmail,
  mentionEmail,
  overdueEmail,
} from "./templates";

type NotifyMember = {
  id: string;
  full_name?: string;
  email?: string | null;
  notify_email?: boolean | null;
};

// Collapse assignees + watchers into a unique email list.
// Skips members who opted out of email (notify_email === false) and anyone
// failing the `keep` predicate (e.g. the actor who triggered the event).
function dedupeRecipients(members: NotifyMember[], keep: (m: NotifyMember) => boolean): string[] {
  const emails = new Set<string>();
  for (const m of members) {
    if (!m) continue;
    if (m.notify_email === false) continue;
    if (!keep(m)) continue;
    if (m.email) emails.add(m.email);
  }
  return [...emails];
}

export async function notifyNewTask(taskId: string) {
  console.log("[Email] notifyNewTask called, looking up task:", taskId);

  try {
    const db = createAdminClient();

    const { data: task, error: taskErr } = await db
      .from("tasks")
      .select(
        "id, title, description, due_date, status, created_by_id, clients(name)",
      )
      .eq("id", taskId)
      .single();

    console.log("[Email] Task query result:", task?.id, task?.title, "error:", taskErr?.message ?? "none");

    if (!task) {
      console.log("[Email] Task not found, skipping notification");
      return;
    }

    const { data: assigneeRows, error: assigneeErr } = await db
      .from("task_assignees")
      .select("member:team_members!inner(id, full_name, email, notify_email)")
      .eq("task_id", taskId);

    const assignees = ((assigneeRows ?? []) as any[]).map((r) => r.member);
    console.log("[Email] Assignees found:", assignees.length, JSON.stringify(assignees), "error:", assigneeErr?.message ?? "none");

    const { data: watcherRows } = await db
      .from("task_watchers")
      .select("member:team_members!inner(id, full_name, email, notify_email)")
      .eq("task_id", taskId);

    const watchers = ((watcherRows ?? []) as any[]).map((r) => r.member);
    console.log("[Email] Watchers found:", watchers.length);

    if (assignees.length === 0 && watchers.length === 0) {
      console.log("[Email] No assignees or watchers, skipping notification");
      return;
    }

    let creator = { full_name: "המערכת" };
    if (task.created_by_id) {
      const { data: c } = await db
        .from("team_members")
        .select("full_name")
        .eq("id", task.created_by_id)
        .single();
      if (c) creator = c;
    }
    console.log("[Email] Creator:", creator.full_name, "created_by_id:", task.created_by_id);

    const client = (task.clients as unknown as { name: string } | null) ?? { name: "כללי" };

    const recipients = dedupeRecipients(
      [...assignees, ...watchers],
      (m) => m.id !== task.created_by_id,
    );

    console.log("[Email] Recipients after filtering creator:", recipients);

    if (recipients.length === 0) {
      console.log("[Email] No recipients after filtering, skipping notification");
      return;
    }

    const { subject, html } = newTaskEmail(
      { id: task.id, title: task.title, due_date: task.due_date, status: task.status, description: task.description },
      client,
      assignees,
      creator,
      watchers,
    );

    console.log("[Email] Sending email to:", recipients, "subject:", subject);
    const result = await sendEmail(recipients, subject, html);
    console.log("[Email] Resend result:", JSON.stringify(result));
  } catch (err: any) {
    console.error("[Email] Error in notifyNewTask:", err?.message, err?.stack);
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
    .select("id, title, due_date, status, clients(name)")
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
    .select("member:team_members!inner(id, full_name, email, notify_email)")
    .eq("task_id", comment.task_id);

  const assignees = ((assigneeRows ?? []) as any[]).map((r) => r.member);

  const { data: watcherRows } = await db
    .from("task_watchers")
    .select("member:team_members!inner(id, full_name, email, notify_email)")
    .eq("task_id", comment.task_id);

  const watchers = ((watcherRows ?? []) as any[]).map((r) => r.member);
  const client = (task.clients as unknown as { name: string } | null) ?? { name: "כללי" };

  const mentionIds = new Set<string>(comment.mentions ?? []);

  // Mentioned users get the "mention" template; everyone else gets the "comment" template.
  // Each person gets exactly one email, never two.
  const allMembers = [...assignees, ...watchers];

  // Also include mentioned users who aren't assignees/watchers.
  if (mentionIds.size > 0) {
    const { data: mentionedRows } = await db
      .from("team_members")
      .select("id, full_name, email, notify_email")
      .in("id", [...mentionIds]);
    for (const m of mentionedRows ?? []) {
      if (!allMembers.some((x) => x.id === m.id)) allMembers.push(m);
    }
  }

  const seen = new Set<string>();
  const taskInfo = { id: task.id, title: task.title, due_date: task.due_date, status: task.status };

  for (const m of allMembers) {
    if (!m || !m.email) continue;
    if (m.notify_email === false) continue;
    if (m.id === comment.author_id) continue;
    if (seen.has(m.email)) continue;
    seen.add(m.email);

    const isMentioned = mentionIds.has(m.id);

    const { subject, html } = isMentioned
      ? mentionEmail(taskInfo, client, { content: comment.content }, author, m)
      : newCommentEmail(taskInfo, client, { content: comment.content }, author);

    try {
      await sendEmail([m.email], subject, html);
    } catch (err) {
      console.error(`[Notify] comment email to ${m.email} failed:`, err);
    }
  }
}

// Kept for backwards compatibility but no longer called from addComment.
export async function notifyMentions(_commentId: string) {
  // Mentions are now handled inside notifyNewComment to avoid duplicate emails.
}

export async function notifyOverdueByEmail() {
  const db = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: rows } = await db
    .from("tasks")
    .select(
      `id, title, due_date, status,
       clients(name),
       task_assignees!inner(member:team_members!inner(id, full_name, email))`,
    )
    .in("status", ["מחכה לטיפול", "נכנס לעבודה", "בעבודה"])
    .lt("due_date", today);

  if (!rows || rows.length === 0) return { sent: 0 };

  let sent = 0;

  for (const row of rows) {
    const client = (row.clients as unknown as { name: string } | null) ?? { name: "כללי" };
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
