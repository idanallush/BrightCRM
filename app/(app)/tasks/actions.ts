"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TaskStatus =
  | "מחכה לטיפול"
  | "נכנס לעבודה"
  | "בעבודה"
  | "אישור לקוח"
  | "בוצע";

export type TaskInput = {
  title: string;
  client_id: string;
  description: string | null;
  status: TaskStatus;
  due_date: string | null;
  assignee_ids: string[];
  tag_ids: string[];
};

export async function createTask(input: TaskInput) {
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
      client_id: input.client_id,
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

  if (input.tag_ids.length > 0) {
    const { error: tErr } = await sb
      .from("task_tags")
      .insert(input.tag_ids.map((tagId) => ({ task_id: data.id, tag_id: tagId })));
    if (tErr) return { error: tErr.message };
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");

  // Fire-and-forget email notification to assignees
  import("@/lib/email/notify").then((m) => m.notifyNewTask(data.id)).catch(() => {});

  return { ok: true as const };
}

export async function updateTask(id: string, input: TaskInput) {
  const sb = createClient();
  const { error } = await sb
    .from("tasks")
    .update({
      title: input.title,
      client_id: input.client_id,
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
  const sb = createClient();
  const { error } = await sb.from("tasks").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function updateTaskStatus(id: string, status: string) {
  const sb = createClient();
  const { error } = await sb.from("tasks").update({ status }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { ok: true as const };
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

export async function addComment(
  taskId: string,
  authorId: string,
  content: string,
  mentions: string[] = [],
  parentId: string | null = null,
) {
  const sb = createClient();
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

  // Fire-and-forget email notifications for comment + mentions
  import("@/lib/email/notify").then(async (m) => {
    await m.notifyNewComment(data.id);
    if (mentions.length > 0) await m.notifyMentions(data.id);
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

  const safeName = file.name.replace(/[^\w.\-א-ת ]+/g, "_");
  const path = `comments/${commentId}/${Date.now()}_${safeName}`;

  const { error: upErr } = await sb.storage
    .from(COMMENT_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return { error: `העלאה נכשלה: ${upErr.message}` };

  const { error: insErr } = await sb.from("comment_attachments").insert({
    comment_id: commentId,
    file_name: file.name,
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

    if (att.content_type?.startsWith("image/")) {
      const { data: signedData } = await sb.storage
        .from(COMMENT_BUCKET)
        .createSignedUrl(att.storage_path, 600);
      if (signedData?.signedUrl) thumbs[att.storage_path] = signedData.signedUrl;
    }
  }

  return { attachments, thumbs };
}
