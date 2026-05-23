"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TaskStatus =
  | "מחכה לטיפול"
  | "נכנס לעבודה"
  | "בעבודה"
  | "אישור לקוח"
  | "אישור מנהל"
  | "בוצע"
  | "בוטל";

export type TaskInput = {
  title: string;
  client_id: string;
  description: string | null;
  status: TaskStatus;
  due_date: string | null;
  assignee_ids: string[];
};

export async function createTask(input: TaskInput) {
  const sb = createClient();
  const { data, error } = await sb
    .from("tasks")
    .insert({
      title: input.title,
      client_id: input.client_id,
      description: input.description,
      status: input.status,
      due_date: input.due_date,
      source: "web",
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

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
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

export async function addComment(
  taskId: string,
  authorId: string,
  content: string,
  mentions: string[] = [],
) {
  const sb = createClient();
  const { error } = await sb.from("task_comments").insert({
    task_id: taskId,
    author_id: authorId,
    content,
    mentions,
  });
  if (error) return { error: error.message };

  // Create notification for each mentioned user
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
  return { ok: true as const };
}
