"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isBrightEmail } from "@/lib/utils";

/** Verify the caller is an authenticated Bright domain member. Returns email or throws. */
async function requireAuth() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email || !isBrightEmail(user.email)) {
    throw new Error("UNAUTHORIZED");
  }
  return user.email;
}

export type TaskStatus =
  | "מחכה לטיפול"
  | "נכנס לעבודה"
  | "בעבודה"
  | "אישור לקוח"
  | "בוצע";

export type TaskInput = {
  title: string;
  client_id: string | null;
  description: string | null;
  status: TaskStatus;
  due_date: string | null;
  assignee_ids: string[];
  watcher_ids?: string[];
  tag_ids: string[];
};

export async function createTask(input: TaskInput) {
  try { await requireAuth(); } catch { return { error: "לא מאומת" }; }
  const sb = createClient();

  // Resolve current user's team_member id for created_by_id
  let createdById: string | null = null;
  const { data: { user } } = await sb.auth.getUser();
  if (user?.email) {
    const { data: member } = await sb
      .from("team_members")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();
    createdById = member?.id ?? null;
  }

  const { data, error } = await sb
    .from("tasks")
    .insert({
      title: input.title,
      client_id: input.client_id || null,
      description: input.description,
      status: input.status,
      due_date: input.due_date,
      source: "web",
      created_by_id: createdById,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  if (input.assignee_ids.length > 0) {
    const { error: aErr } = await sb
      .from("task_assignees")
      .insert(input.assignee_ids.map((id) => ({ task_id: data.id, member_id: id })));
    if (aErr) return { error: aErr.message };
  }

  const watcherIds = input.watcher_ids ?? [];
  if (watcherIds.length > 0) {
    const { error: wErr } = await sb
      .from("task_watchers")
      .insert(watcherIds.map((id) => ({ task_id: data.id, member_id: id })));
    if (wErr) return { error: wErr.message };
  }

  if (input.tag_ids.length > 0) {
    const { error: tErr } = await sb
      .from("task_tags")
      .insert(input.tag_ids.map((tagId) => ({ task_id: data.id, tag_id: tagId })));
    if (tErr) return { error: tErr.message };
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");

  try {
    const { notifyNewTask } = await import("@/lib/email/notify");
    await notifyNewTask(data.id);
  } catch (err) {
    console.error("[Email] notifyNewTask failed:", err);
  }

  return { ok: true as const };
}

export async function updateTask(id: string, input: TaskInput) {
  try { await requireAuth(); } catch { return { error: "לא מאומת" }; }
  const sb = createClient();
  const { error } = await sb
    .from("tasks")
    .update({
      title: input.title,
      client_id: input.client_id || null,
      description: input.description,
      status: input.status,
      due_date: input.due_date,
    })
    .eq("id", id);
  if (error) return { error: error.message };

  const { error: dErr } = await sb.from("task_assignees").delete().eq("task_id", id);
  if (dErr) return { error: dErr.message };
  if (input.assignee_ids.length > 0) {
    const { error: aErr } = await sb
      .from("task_assignees")
      .insert(input.assignee_ids.map((mid) => ({ task_id: id, member_id: mid })));
    if (aErr) return { error: aErr.message };
  }

  const { error: dwErr } = await sb.from("task_watchers").delete().eq("task_id", id);
  if (dwErr) return { error: dwErr.message };
  const watcherIds = input.watcher_ids ?? [];
  if (watcherIds.length > 0) {
    const { error: wErr } = await sb
      .from("task_watchers")
      .insert(watcherIds.map((mid) => ({ task_id: id, member_id: mid })));
    if (wErr) return { error: wErr.message };
  }

  const { error: dtErr } = await sb.from("task_tags").delete().eq("task_id", id);
  if (dtErr) return { error: dtErr.message };
  if (input.tag_ids.length > 0) {
    const { error: tErr } = await sb
      .from("task_tags")
      .insert(input.tag_ids.map((tagId) => ({ task_id: id, tag_id: tagId })));
    if (tErr) return { error: tErr.message };
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function deleteTask(id: string) {
  try { await requireAuth(); } catch { return { error: "לא מאומת" }; }
  const sb = createClient();
  const { error } = await sb.from("tasks").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function updateTaskStatus(id: string, status: string) {
  try { await requireAuth(); } catch { return { error: "לא מאומת" }; }
  const sb = createClient();
  const { error } = await sb.from("tasks").update({ status }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function bulkUpdateStatus(ids: string[], status: string) {
  try { await requireAuth(); } catch { return { error: "לא מאומת" }; }
  if (ids.length === 0) return { error: "לא נבחרו משימות" };
  const sb = createClient();
  const { error } = await sb.from("tasks").update({ status }).in("id", ids);
  if (error) return { error: error.message };
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { ok: true as const, count: ids.length };
}

export async function bulkUpdateAssignees(ids: string[], assigneeIds: string[]) {
  try { await requireAuth(); } catch { return { error: "לא מאומת" }; }
  if (ids.length === 0) return { error: "לא נבחרו משימות" };
  const sb = createClient();
  // Delete existing assignees for all tasks, then insert new ones
  const { error: dErr } = await sb.from("task_assignees").delete().in("task_id", ids);
  if (dErr) return { error: dErr.message };
  if (assigneeIds.length > 0) {
    const rows = ids.flatMap((taskId) => assigneeIds.map((memberId) => ({ task_id: taskId, member_id: memberId })));
    const { error: iErr } = await sb.from("task_assignees").insert(rows);
    if (iErr) return { error: iErr.message };
  }
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { ok: true as const, count: ids.length };
}

export async function bulkDeleteTasks(ids: string[]) {
  try { await requireAuth(); } catch { return { error: "לא מאומת" }; }
  if (ids.length === 0) return { error: "לא נבחרו משימות" };
  const sb = createClient();
  const { error } = await sb.from("tasks").delete().in("id", ids);
  if (error) return { error: error.message };
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { ok: true as const, count: ids.length };
}

export async function quickParseTask(text: string) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return { error: "לא מחובר" };

  const { data: member } = await sb
    .from("team_members")
    .select("id,full_name")
    .eq("email", user.email)
    .maybeSingle();
  if (!member) return { error: "משתמש לא נמצא" };

  try {
    const { parseTaskFromText } = await import("@/lib/whatsapp/parse-task");
    const parsed = await parseTaskFromText(text, { id: member.id, full_name: member.full_name });
    return { ok: true as const, parsed };
  } catch {
    return { error: "שירות הפענוח לא זמין, נסה שוב" };
  }
}

export async function createTag(name: string, color: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from("tags")
    .insert({ name: name.trim(), color })
    .select("id,name,color,created_at")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/tasks");
  return { ok: true as const, tag: data };
}

export async function updateTag(tagId: string, fields: { name?: string; color?: string }) {
  const sb = createClient();
  const updates: Record<string, string> = {};
  if (fields.name !== undefined) updates.name = fields.name.trim();
  if (fields.color !== undefined) updates.color = fields.color;
  if (Object.keys(updates).length === 0) return { error: "אין שדות לעדכון" };
  const { data, error } = await sb
    .from("tags")
    .update(updates)
    .eq("id", tagId)
    .select("id,name,color,created_at")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/tasks");
  return { ok: true as const, tag: data };
}

export async function addComment(
  taskId: string,
  _authorId: string, // DEPRECATED: ignored, derived from session for security
  content: string,
  mentions: string[] = [],
  parentId: string | null = null,
) {
  const sb = createClient();

  // Derive author from authenticated session — never trust caller-provided ID
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return { error: "לא מאומת" };
  const { data: authMember } = await sb
    .from("team_members")
    .select("id")
    .eq("email", user.email)
    .maybeSingle();
  if (!authMember) return { error: "משתמש לא נמצא" };
  const authorId = authMember.id;

  const { data, error } = await sb.from("task_comments").insert({
    task_id: taskId,
    author_id: authorId,
    content,
    mentions,
    parent_id: parentId,
  }).select("id").single();
  if (error) return { error: error.message };

  if (mentions.length > 0) {
    const { data: author } = await sb
      .from("team_members")
      .select("full_name")
      .eq("id", authorId)
      .single();
    const authorName = author?.full_name ?? "מישהו";
    const notifs = mentions.map((userId) => ({
      user_id: userId,
      type: "mention" as const,
      task_id: taskId,
      from_user_id: authorId,
      content: `${authorName} הזכיר/ה אותך בתגובה`,
    }));
    await sb.from("notifications").insert(notifs);
  }

  revalidatePath("/tasks");

  // Fire-and-forget email notification (handles both regular + mention recipients)
  import("@/lib/email/notify").then(async (m) => {
    await m.notifyNewComment(data.id);
  }).catch(() => {});

  return { ok: true as const, commentId: data.id as string };
}

const COMMENT_BUCKET = "attachments";
const COMMENT_MAX_BYTES = 10 * 1024 * 1024;
const COMMENT_ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.ms-excel",
];

export async function uploadCommentAttachment(commentId: string, formData: FormData) {
  const file = formData.get("file") as File | null;
  const fileName = (formData.get("fileName") as string) || file?.name || "unnamed";
  if (!file) return { error: "לא נשלח קובץ" };
  if (file.size > COMMENT_MAX_BYTES) return { error: "הקובץ גדול מ-10MB" };
  if (!COMMENT_ALLOWED.includes(file.type)) return { error: `סוג קובץ לא נתמך: ${file.type}` };

  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: "לא מאומת" };

  const { data: member } = await sb
    .from("team_members")
    .select("id")
    .eq("email", user.email)
    .maybeSingle();

  const ext = fileName.includes(".")
    ? fileName.slice(fileName.lastIndexOf(".")).toLowerCase()
    : "";
  const path = `comments/${commentId}/${Date.now()}-${crypto.randomUUID()}${ext}`;

  const { error: upErr } = await sb.storage
    .from(COMMENT_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return { error: `העלאה נכשלה: ${upErr.message}` };

  const { error: insErr } = await sb.from("comment_attachments").insert({
    comment_id: commentId,
    file_name: fileName,
    file_size: file.size,
    content_type: file.type,
    storage_path: path,
    uploaded_by: member?.id ?? null,
  });
  if (insErr) {
    await sb.storage.from(COMMENT_BUCKET).remove([path]);
    return { error: `שמירת רשומה נכשלה: ${insErr.message}` };
  }

  revalidatePath("/tasks");
  return { ok: true as const };
}

export type CommentAttachment = {
  id: string;
  comment_id: string;
  file_name: string;
  file_size: number | null;
  content_type: string | null;
  storage_path: string;
  created_at: string;
};

export async function getCommentAttachments(commentIds: string[]) {
  if (commentIds.length === 0) return { attachments: {} as Record<string, CommentAttachment[]>, thumbs: {} as Record<string, string> };

  const sb = createClient();
  const { data } = await sb
    .from("comment_attachments")
    .select("id,comment_id,file_name,file_size,content_type,storage_path,created_at")
    .in("comment_id", commentIds)
    .order("created_at", { ascending: true });

  const attachments: Record<string, CommentAttachment[]> = {};
  const thumbs: Record<string, string> = {};

  for (const row of (data ?? []) as any[]) {
    const att: CommentAttachment = {
      id: row.id,
      comment_id: row.comment_id,
      file_name: row.file_name,
      file_size: row.file_size ?? null,
      content_type: row.content_type ?? null,
      storage_path: row.storage_path,
      created_at: row.created_at,
    };
    if (!attachments[att.comment_id]) attachments[att.comment_id] = [];
    attachments[att.comment_id].push(att);

    // Generate signed URLs for ALL files (images and non-images)
    const { data: signedData } = await sb.storage
      .from(COMMENT_BUCKET)
      .createSignedUrl(att.storage_path, 600);
    if (signedData?.signedUrl) thumbs[att.storage_path] = signedData.signedUrl;
  }

  return { attachments, thumbs };
}

export async function updateComment(commentId: string, content: string) {
  const sb = createClient();

  // Verify the current user owns this comment
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return { error: "לא מאומת" };
  const { data: member } = await sb
    .from("team_members")
    .select("id")
    .eq("email", user.email)
    .maybeSingle();
  if (!member) return { error: "משתמש לא נמצא" };

  const { data: comment } = await sb
    .from("task_comments")
    .select("author_id")
    .eq("id", commentId)
    .single();
  if (!comment) return { error: "תגובה לא נמצאה" };
  if (comment.author_id !== member.id) return { error: "אין הרשאה לערוך תגובה של משתמש אחר" };

  const { error } = await sb
    .from("task_comments")
    .update({ content })
    .eq("id", commentId);
  if (error) return { error: error.message };
  revalidatePath("/tasks");
  return { ok: true as const };
}

export async function deleteComment(commentId: string) {
  const sb = createClient();

  // Verify the current user owns this comment
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return { error: "לא מאומת" };
  const { data: member } = await sb
    .from("team_members")
    .select("id")
    .eq("email", user.email)
    .maybeSingle();
  if (!member) return { error: "משתמש לא נמצא" };

  const { data: comment } = await sb
    .from("task_comments")
    .select("author_id")
    .eq("id", commentId)
    .single();
  if (!comment) return { error: "תגובה לא נמצאה" };
  if (comment.author_id !== member.id) return { error: "אין הרשאה למחוק תגובה של משתמש אחר" };

  // Delete attachments from storage first
  const { data: attachments } = await sb
    .from("comment_attachments")
    .select("storage_path")
    .eq("comment_id", commentId);
  if (attachments && attachments.length > 0) {
    await sb.storage.from(COMMENT_BUCKET).remove(attachments.map((a) => a.storage_path));
    await sb.from("comment_attachments").delete().eq("comment_id", commentId);
  }
  // Delete child replies
  await sb.from("task_comments").delete().eq("parent_id", commentId);
  // Delete the comment itself
  const { error } = await sb.from("task_comments").delete().eq("id", commentId);
  if (error) return { error: error.message };
  revalidatePath("/tasks");
  return { ok: true as const };
}

export async function toggleWatchTask(taskId: string, memberId: string) {
  const sb = createClient();
  const { data: existing } = await sb
    .from("task_watchers")
    .select("id")
    .eq("task_id", taskId)
    .eq("member_id", memberId)
    .maybeSingle();

  if (existing) {
    const { error } = await sb.from("task_watchers").delete().eq("id", existing.id);
    if (error) return { error: error.message };
    revalidatePath("/tasks");
    return { ok: true as const, watching: false };
  }

  const { error } = await sb.from("task_watchers").insert({ task_id: taskId, member_id: memberId });
  if (error) return { error: error.message };
  revalidatePath("/tasks");
  return { ok: true as const, watching: true };
}

export async function recordTaskView(taskId: string, memberId: string) {
  const sb = createClient();
  await sb.from("task_views").upsert(
    { task_id: taskId, member_id: memberId, last_seen_at: new Date().toISOString() },
    { onConflict: "task_id,member_id" },
  );
}

export async function getTaskViews(taskId: string): Promise<{ member_id: string; full_name: string; avatar_url: string | null; last_seen_at: string }[]> {
  const sb = createClient();
  const { data } = await sb
    .from("task_views")
    .select("member_id, last_seen_at, member:team_members!task_views_member_id_fkey(full_name, avatar_url)")
    .eq("task_id", taskId);
  return ((data ?? []) as any[]).map((r) => ({
    member_id: r.member_id,
    full_name: r.member?.full_name ?? "",
    avatar_url: r.member?.avatar_url ?? null,
    last_seen_at: r.last_seen_at,
  }));
}

export type TaskViewRecord = { task_id: string; member_id: string; full_name: string; avatar_url: string | null; last_seen_at: string };

export async function getTaskViewsBulk(taskIds: string[]): Promise<Record<string, TaskViewRecord[]>> {
  if (taskIds.length === 0) return {};
  const sb = createClient();
  const { data } = await sb
    .from("task_views")
    .select("task_id, member_id, last_seen_at, member:team_members!task_views_member_id_fkey(full_name, avatar_url)")
    .in("task_id", taskIds);
  const map: Record<string, TaskViewRecord[]> = {};
  for (const r of (data ?? []) as any[]) {
    const rec: TaskViewRecord = {
      task_id: r.task_id,
      member_id: r.member_id,
      full_name: r.member?.full_name ?? "",
      avatar_url: r.member?.avatar_url ?? null,
      last_seen_at: r.last_seen_at,
    };
    if (!map[r.task_id]) map[r.task_id] = [];
    map[r.task_id].push(rec);
  }
  return map;
}
