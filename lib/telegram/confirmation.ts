import { createAdminClient } from "@/lib/supabase/admin";
import { sendMessage } from "./api";
import type { ParsedTask } from "./parse-task";

/** The inline keyboard shown on every confirmation message. */
function confirmationKeyboard(pendingTaskId: string) {
  return {
    inline_keyboard: [
      [
        { text: "✅ אשר", callback_data: `confirm:${pendingTaskId}` },
        { text: "✏️ ערוך", callback_data: `edit_menu:${pendingTaskId}` },
      ],
      [
        {
          text: "👥 שייך למישהו אחר",
          callback_data: `reassign:${pendingTaskId}`,
        },
      ],
    ],
  };
}

/** Builds the confirmation text from parsed task data. */
export function buildConfirmationText(parsed: ParsedTask): string {
  const dueDateText = parsed.due_date ?? "לא צוין";
  const showCreator = parsed.creator_id && parsed.creator_id !== parsed.assignee_id;

  const lines = [
    "<b>זה מה שהבנתי:</b>",
    "",
    `🏢 <b>לקוח:</b> ${parsed.client_name}`,
    `📋 <b>משימה:</b> ${parsed.title}`,
  ];

  if (showCreator) {
    lines.push(`👤 <b>פותח:</b> ${parsed.creator_name}`);
    lines.push(`🎯 <b>מבצע:</b> ${parsed.assignee_name}`);
  } else {
    lines.push(`👤 <b>אחראי:</b> ${parsed.assignee_name}`);
  }

  lines.push(`📅 <b>דדליין:</b> ${dueDateText}`);

  return lines.join("\n");
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

  await sendMessage(chatId, text, confirmationKeyboard(pending.id));
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

  await sendMessage(chatId, text, confirmationKeyboard(pendingTaskId));
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
      status: "מחכה לטיפול",
      source: "telegram",
      created_by_id: parsed.creator_id ?? null,
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

// ---------------------------------------------------------------------------
// Inline edit flow
// ---------------------------------------------------------------------------

/** Shows inline buttons for picking which field to edit. */
export async function showEditMenu(chatId: number, pendingTaskId: string) {
  await sendMessage(chatId, "<b>מה לערוך?</b>", {
    inline_keyboard: [
      [
        { text: "🏢 לקוח", callback_data: `edit_client:${pendingTaskId}` },
        { text: "📋 כותרת", callback_data: `edit_title:${pendingTaskId}` },
      ],
      [
        { text: "👤 אחראי", callback_data: `edit_assignee:${pendingTaskId}` },
        { text: "📅 דדליין", callback_data: `edit_due:${pendingTaskId}` },
      ],
      [{ text: "❌ ביטול", callback_data: `cancel_edit:${pendingTaskId}` }],
    ],
  });
}

/** Shows client selection buttons for editing the client field. */
export async function showClientOptions(
  chatId: number,
  pendingTaskId: string,
) {
  const db = createAdminClient();

  const { data: clients } = await db
    .from("clients")
    .select("id, name")
    .order("name");

  if (!clients || clients.length === 0) {
    await sendMessage(chatId, "לא נמצאו לקוחות.");
    return;
  }

  const buttons = clients.map((c) => [
    {
      text: c.name,
      callback_data: `select_client:${pendingTaskId}:${c.id}`,
    },
  ]);

  await sendMessage(chatId, "<b>בחר לקוח:</b>", {
    inline_keyboard: buttons,
  });
}

/** Sets the edit_field on a pending task so the next text message updates that field. */
export async function setEditState(pendingTaskId: string, field: string) {
  const db = createAdminClient();
  await db
    .from("telegram_pending_tasks")
    .update({ edit_field: field })
    .eq("id", pendingTaskId);
}

/** Updates a single field in parsed_data, clears edit_field, and re-sends confirmation. */
export async function updatePendingField(
  chatId: number,
  pendingTaskId: string,
  field: string,
  value: string,
) {
  const db = createAdminClient();

  const { data: pending } = await db
    .from("telegram_pending_tasks")
    .select("parsed_data")
    .eq("id", pendingTaskId)
    .single();

  if (!pending) {
    await sendMessage(chatId, "המשימה לא נמצאה. נסה שוב.");
    return;
  }

  const parsed = pending.parsed_data as ParsedTask;

  if (field === "title") {
    parsed.title = value;
    parsed.description = value;
  } else if (field === "due_date") {
    parsed.due_date = value || null;
  }

  // Save and clear edit state
  await db
    .from("telegram_pending_tasks")
    .update({ parsed_data: parsed, edit_field: null })
    .eq("id", pendingTaskId);

  // Re-send confirmation
  const text = buildConfirmationText(parsed);
  await sendMessage(chatId, text, confirmationKeyboard(pendingTaskId));
}

/** Updates the client in a pending task (called when user picks from client list). */
export async function updatePendingClient(
  chatId: number,
  pendingTaskId: string,
  clientId: string,
) {
  const db = createAdminClient();

  const { data: client } = await db
    .from("clients")
    .select("id, name")
    .eq("id", clientId)
    .single();

  if (!client) {
    await sendMessage(chatId, "הלקוח לא נמצא.");
    return;
  }

  const { data: pending } = await db
    .from("telegram_pending_tasks")
    .select("parsed_data")
    .eq("id", pendingTaskId)
    .single();

  if (!pending) {
    await sendMessage(chatId, "המשימה לא נמצאה. נסה שוב.");
    return;
  }

  const parsed = pending.parsed_data as ParsedTask;
  parsed.client_id = client.id;
  parsed.client_name = client.name;

  await db
    .from("telegram_pending_tasks")
    .update({ parsed_data: parsed })
    .eq("id", pendingTaskId);

  const text = buildConfirmationText(parsed);
  await sendMessage(chatId, text, confirmationKeyboard(pendingTaskId));
}

/** Cancels a pending task (deletes it). */
export async function cancelPendingTask(
  chatId: number,
  pendingTaskId: string,
) {
  const db = createAdminClient();
  await db.from("telegram_pending_tasks").delete().eq("id", pendingTaskId);
  await sendMessage(chatId, "המשימה בוטלה.");
}

/** Checks if a user has a pending task awaiting text input for an edit.
 *  Returns the pending task row if found, null otherwise. */
export async function getPendingEditState(telegramUserId: number) {
  const db = createAdminClient();

  const { data } = await db
    .from("telegram_pending_tasks")
    .select("id, edit_field, chat_id, parsed_data")
    .eq("telegram_user_id", telegramUserId)
    .not("edit_field", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

/** Parses a Hebrew relative date string into YYYY-MM-DD format. */
export function parseHebrewDate(text: string): string | null {
  const trimmed = text.trim();
  const today = new Date();

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  // Exact YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
  }

  // DD/MM (current year)
  const dmMatch = trimmed.match(/^(\d{1,2})[./](\d{1,2})$/);
  if (dmMatch) {
    return `${today.getFullYear()}-${dmMatch[2].padStart(2, "0")}-${dmMatch[1].padStart(2, "0")}`;
  }

  // "מחר"
  if (/^מחר$/.test(trimmed)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return fmt(d);
  }

  // "מחרתיים"
  if (/^מחרתיים$/.test(trimmed)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return fmt(d);
  }

  // "עוד X ימים"
  const daysMatch = trimmed.match(/^עוד\s+(\d+)\s+ימים$/);
  if (daysMatch) {
    const d = new Date(today);
    d.setDate(d.getDate() + parseInt(daysMatch[1]));
    return fmt(d);
  }

  // "עוד שבוע"
  if (/^עוד\s+שבוע$/.test(trimmed)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return fmt(d);
  }

  // Hebrew day names
  const dayMap: Record<string, number> = {
    "ראשון": 0,
    "א׳": 0,
    "א'": 0,
    "שני": 1,
    "ב׳": 1,
    "ב'": 1,
    "שלישי": 2,
    "ג׳": 2,
    "ג'": 2,
    "רביעי": 3,
    "ד׳": 3,
    "ד'": 3,
    "חמישי": 4,
    "ה׳": 4,
    "ה'": 4,
    "שישי": 5,
    "ו׳": 5,
    "ו'": 5,
    "שבת": 6,
  };

  // "יום ראשון", "יום א׳", or just "ראשון"
  const dayMatch = trimmed.match(/^(?:יום\s+)?(.+)$/);
  if (dayMatch) {
    const target = dayMap[dayMatch[1]];
    if (target !== undefined) {
      const d = new Date(today);
      const current = d.getDay();
      let diff = target - current;
      if (diff <= 0) diff += 7;
      d.setDate(d.getDate() + diff);
      return fmt(d);
    }
  }

  // "סוף השבוע" → next Friday
  if (/^סוף\s+השבוע$/.test(trimmed)) {
    const d = new Date(today);
    const current = d.getDay();
    let diff = 5 - current;
    if (diff <= 0) diff += 7;
    d.setDate(d.getDate() + diff);
    return fmt(d);
  }

  return null;
}
