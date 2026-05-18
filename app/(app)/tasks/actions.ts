"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TaskInput = {
  title: string;
  client_id: string;
  description: string | null;
  status: "בעבודה" | "בוצע" | "סגור";
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

  // Sync assignees: easiest correct approach for tiny scale — delete + insert.
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

export async function updateTaskStatus(
  id: string,
  status: "בעבודה" | "בוצע" | "סגור",
) {
  const sb = createClient();
  const { error } = await sb.from("tasks").update({ status }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
