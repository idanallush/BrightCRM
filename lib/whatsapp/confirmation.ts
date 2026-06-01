import { createAdminClient } from "@/lib/supabase/admin";
import { sendTextMessage, sendInteractiveButtons } from "./api";
import type { ParsedTask } from "./parse-task";

function confirmationButtons(pendingTaskId: string) {
  return [
    { id: `confirm:${pendingTaskId}`, title: "אשר" },
    { id: `edit:${pendingTaskId}`, title: "ערוך" },
    { id: `cancel:${pendingTaskId}`, title: "בטל" },
  ];
}

export function buildConfirmationText(parsed: ParsedTask): string {
  const dueDateText = parsed.due_date ?? "לא צוין";
  const showCreator =
    parsed.creator_id && parsed.creator_id !== parsed.assignee_id;

  const lines = [
    "זה מה שהבנתי:",
    "",
    `לקוח: ${parsed.client_name}`,
    `משימה: ${parsed.title}`,
  ];

  if (showCreator) {
    lines.push(`פותח: ${parsed.creator_name}`);
    lines.push(`מבצע: ${parsed.assignee_name}`);
  } else {
    lines.push(`אחראי: ${parsed.assignee_name}`);
  }

  lines.push(`דדליין: ${dueDateText}`);

  return lines.join("\n");
}

export async function sendTaskConfirmation(
  phone: string,
  parsed: ParsedTask,
) {
  const db = createAdminClient();

  // Clear any older pending tasks for this user
  await db.from("whatsapp_pending_tasks").delete().eq("phone", phone);

  const { data: pending, error } = await db
    .from("whatsapp_pending_tasks")
    .insert({
      phone,
      parsed_data: parsed,
    })
    .select("id")
    .single();

  if (error || !pending) {
    throw new Error(`Failed to store pending task: ${error?.message}`);
  }

  const text = buildConfirmationText(parsed);
  await sendInteractiveButtons(phone, text, confirmationButtons(pending.id));
}

export async function confirmTask(pendingTaskId: string) {
  const db = createAdminClient();

  const { data: pending, error: fetchErr } = await db
    .from("whatsapp_pending_tasks")
    .select("*")
    .eq("id", pendingTaskId)
    .single();

  if (fetchErr || !pending) {
    throw new Error(`Pending task not found: ${fetchErr?.message}`);
  }

  const parsed = pending.parsed_data as ParsedTask;

  const { data: task, error: taskErr } = await db
    .from("tasks")
    .insert({
      title: parsed.title,
      client_id: parsed.client_id,
      description: parsed.description,
      due_date: parsed.due_date,
      status: "מחכה לטיפול",
      source: "whatsapp",
      created_by_id: parsed.creator_id ?? null,
    })
    .select("id")
    .single();

  if (taskErr || !task) {
    throw new Error(`Failed to create task: ${taskErr?.message}`);
  }

  const { error: assigneeErr } = await db.from("task_assignees").insert({
    task_id: task.id,
    member_id: parsed.assignee_id,
  });
  console.log("[WhatsApp] task_assignees insert:", assigneeErr ? `ERROR: ${assigneeErr.message}` : "OK", "task:", task.id, "member:", parsed.assignee_id);

  await db.from("whatsapp_pending_tasks").delete().eq("id", pendingTaskId);

  // Fire-and-forget email notification to assignees
  console.log("[Email] Calling notifyNewTask for task:", task.id);
  import("@/lib/email/notify")
    .then((m) => m.notifyNewTask(task.id))
    .then(() => console.log("[Email] notifyNewTask completed for task:", task.id))
    .catch((err) => console.error("[Email] notifyNewTask failed:", err));

  return task.id;
}

export async function cancelPendingTask(phone: string, pendingTaskId: string) {
  const db = createAdminClient();
  await db.from("whatsapp_pending_tasks").delete().eq("id", pendingTaskId);
  await sendTextMessage(phone, "המשימה בוטלה.");
}

export async function setEditState(pendingTaskId: string) {
  const db = createAdminClient();
  await db
    .from("whatsapp_pending_tasks")
    .update({ edit_field: "awaiting_edit" })
    .eq("id", pendingTaskId);
}

export async function getPendingEditState(phone: string) {
  const db = createAdminClient();

  const { data } = await db
    .from("whatsapp_pending_tasks")
    .select("id, edit_field, parsed_data")
    .eq("phone", phone)
    .not("edit_field", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function handleEditMessage(
  phone: string,
  pendingTaskId: string,
  editText: string,
  parsed: ParsedTask,
) {
  const db = createAdminClient();

  const lower = editText.trim();

  let updated = false;

  // Simple field detection
  const titleMatch = lower.match(/^(?:כותרת|שם|title)[:\s]+(.+)$/);
  const deadlineMatch = lower.match(/^(?:דדליין|תאריך|deadline|due)[:\s]+(.+)$/);
  const clientMatch = lower.match(/^(?:לקוח|client)[:\s]+(.+)$/);
  const assigneeMatch = lower.match(
    /^(?:אחראי|מבצע|assignee)[:\s]+(.+)$/,
  );

  if (titleMatch) {
    parsed.title = titleMatch[1].trim();
    parsed.description = parsed.title;
    updated = true;
  } else if (deadlineMatch) {
    const dateText = deadlineMatch[1].trim();
    const resolvedDate = parseHebrewDate(dateText);
    if (resolvedDate) {
      parsed.due_date = resolvedDate;
      updated = true;
    } else {
      await sendTextMessage(
        phone,
        "לא הצלחתי לפענח את התאריך. נסה שוב, למשל: מחר, יום ראשון, 05/06/2026",
      );
      return;
    }
  } else if (clientMatch) {
    const clientName = clientMatch[1].trim();
    const { data: client } = await db
      .from("clients")
      .select("id, name")
      .ilike("name", `%${clientName}%`)
      .limit(1)
      .maybeSingle();
    if (client) {
      parsed.client_id = client.id;
      parsed.client_name = client.name;
      updated = true;
    } else {
      await sendTextMessage(phone, `לא מצאתי לקוח בשם "${clientName}". נסה שוב.`);
      return;
    }
  } else if (assigneeMatch) {
    const assigneeName = assigneeMatch[1].trim();
    const { data: member } = await db
      .from("team_members")
      .select("id, full_name")
      .ilike("full_name", `%${assigneeName}%`)
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    if (member) {
      parsed.assignee_id = member.id;
      parsed.assignee_name = member.full_name;
      updated = true;
    } else {
      await sendTextMessage(
        phone,
        `לא מצאתי חבר צוות בשם "${assigneeName}". נסה שוב.`,
      );
      return;
    }
  }

  if (!updated) {
    await sendTextMessage(
      phone,
      'לא הבנתי מה לשנות. כתוב למשל:\nכותרת: הכותרת החדשה\nלקוח: שם הלקוח\nאחראי: שם האחראי\nדדליין: מחר',
    );
    return;
  }

  await db
    .from("whatsapp_pending_tasks")
    .update({ parsed_data: parsed, edit_field: null })
    .eq("id", pendingTaskId);

  const text = buildConfirmationText(parsed);
  await sendInteractiveButtons(
    phone,
    text,
    confirmationButtons(pendingTaskId),
  );
}

export function parseHebrewDate(text: string): string | null {
  const trimmed = text.trim();
  const today = new Date();

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const dmyMatch = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
  }

  const dmMatch = trimmed.match(/^(\d{1,2})[./](\d{1,2})$/);
  if (dmMatch) {
    return `${today.getFullYear()}-${dmMatch[2].padStart(2, "0")}-${dmMatch[1].padStart(2, "0")}`;
  }

  if (/^מחר$/.test(trimmed)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return fmt(d);
  }

  if (/^מחרתיים$/.test(trimmed)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return fmt(d);
  }

  const daysMatch = trimmed.match(/^עוד\s+(\d+)\s+ימים$/);
  if (daysMatch) {
    const d = new Date(today);
    d.setDate(d.getDate() + parseInt(daysMatch[1]));
    return fmt(d);
  }

  if (/^עוד\s+שבוע$/.test(trimmed)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return fmt(d);
  }

  const dayMap: Record<string, number> = {
    ראשון: 0, "א׳": 0, "א'": 0,
    שני: 1, "ב׳": 1, "ב'": 1,
    שלישי: 2, "ג׳": 2, "ג'": 2,
    רביעי: 3, "ד׳": 3, "ד'": 3,
    חמישי: 4, "ה׳": 4, "ה'": 4,
    שישי: 5, "ו׳": 5, "ו'": 5,
    שבת: 6,
  };

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
