import { createAdminClient } from "@/lib/supabase/admin";
import { sendMessage } from "./api";
import type { ParsedTask } from "./parse-task";

/** Builds the confirmation text from parsed task data. */
export function buildConfirmationText(parsed: ParsedTask): string {
  const dueDateText = parsed.due_date ?? "לא צוין";

  return [
    "<b>זה מה שהבנתי:</b>",
    "",
    `🏢 <b>לקוח:</b> ${parsed.client_name}`,
    `📋 <b>משימה:</b> ${parsed.title}`,
    `👤 <b>אחראי:</b> ${parsed.assignee_name}`,
    `📅 <b>דדליין:</b> ${dueDateText}`,
  ].join("\n");
}

/** Stores the parsed task and sends a confirmation message with inline buttons. */
export async function sendTaskConfirmation(
  chatId: number,
  telegramUserId: number,
  parsed: ParsedTask,
) {
  const db = createAdminClient();

  // Store pending task
  const { data: pending, error } = await db
    .from("telegram_pending_tasks")
    .insert({
      chat_id: chatId,
      telegram_user_id: telegramUserId,
      parsed_data: parsed,
    })
    .select("id")
    .single();

  if (error || !pending) {
    throw new Error(`Failed to store pending task: ${error?.message}`);
  }

  const text = buildConfirmationText(parsed);

  await sendMessage(chatId, text, {
    inline_keyboard: [
      [
        { text: "✅ אשר", callback_data: `confirm:${pending.id}` },
        { text: "✏️ ערוך", callback_data: `edit:${pending.id}` },
      ],
      [
        { text: "👥 שייך למישהו אחר", callback_data: `reassign:${pending.id}` },
      ],
    ],
  });
}

/** Shows team member selection buttons for reassignment. */
export async function showReassignOptions(
  chatId: number,
  pendingTaskId: string,
) {
  const db = createAdminClient();

  const { data: members } = await db
    .from("team_members")
    .select("id, full_name")
    .eq("active", true)
    .order("full_name");

  if (!members || members.length === 0) {
    await sendMessage(chatId, "לא נמצאו חברי צוות פעילים.");
    return;
  }

  const buttons = members.map((m) => [
    {
      text: m.full_name,
      callback_data: `assign:${pendingTaskId}:${m.id}`,
    },
  ]);

  await sendMessage(chatId, "<b>בחר אחראי חדש:</b>", {
    inline_keyboard: buttons,
  });
}

/** Updates the assignee in a pending task and re-sends the confirmation. */
export async function reassignPendingTask(
  chatId: number,
  telegramUserId: number,
  pendingTaskId: string,
  newMemberId: string,
) {
  const db = createAdminClient();

  // Fetch the new member's name
  const { data: member } = await db
    .from("team_members")
    .select("id, full_name")
    .eq("id", newMemberId)
    .single();

  if (!member) {
    await sendMessage(chatId, "חבר הצוות לא נמצא.");
    return;
  }

  // Fetch existing pending task
  const { data: pending } = await db
    .from("telegram_pending_tasks")
    .select("parsed_data")
    .eq("id", pendingTaskId)
    .single();

  if (!pending) {
    await sendMessage(chatId, "המשימה לא נמצאה. נסה שוב.");
    return;
  }

  // Update assignee in parsed data
  const parsed = pending.parsed_data as ParsedTask;
  parsed.assignee_id = member.id;
  parsed.assignee_name = member.full_name;

  // Update the pending task
  await db
    .from("telegram_pending_tasks")
    .update({ parsed_data: parsed })
    .eq("id", pendingTaskId);

  // Re-send confirmation with updated data
  const text = buildConfirmationText(parsed);

  await sendMessage(chatId, text, {
    inline_keyboard: [
      [
        { text: "✅ אשר", callback_data: `confirm:${pendingTaskId}` },
        { text: "✏️ ערוך", callback_data: `edit:${pendingTaskId}` },
      ],
      [
        { text: "👥 שייך למישהו אחר", callback_data: `reassign:${pendingTaskId}` },
      ],
    ],
  });
}

/** Creates the actual task in the DB from a confirmed pending task. */
export async function confirmTask(pendingTaskId: string) {
  const db = createAdminClient();

  const { data: pending, error: fetchErr } = await db
    .from("telegram_pending_tasks")
    .select("*")
    .eq("id", pendingTaskId)
    .single();

  if (fetchErr || !pending) {
    throw new Error(`Pending task not found: ${fetchErr?.message}`);
  }

  const parsed = pending.parsed_data as ParsedTask;

  // Create the task
  const { data: task, error: taskErr } = await db
    .from("tasks")
    .insert({
      title: parsed.title,
      client_id: parsed.client_id,
      description: parsed.description,
      due_date: parsed.due_date,
      source: "telegram",
    })
    .select("id")
    .single();

  if (taskErr || !task) {
    throw new Error(`Failed to create task: ${taskErr?.message}`);
  }

  // Create assignee link
  await db.from("task_assignees").insert({
    task_id: task.id,
    member_id: parsed.assignee_id,
  });

  // Clean up pending task
  await db.from("telegram_pending_tasks").delete().eq("id", pendingTaskId);

  return task.id;
}
