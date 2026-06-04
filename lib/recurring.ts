export type RecurrenceRule = {
  type: "weekly" | "monthly" | "custom";
  day: number; // weekly: 0=Sun..6=Sat. monthly: 1-31. custom: ignored
  interval: number; // custom: every X days. weekly/monthly: ignored
  end_date: string | null; // ISO date string or null
};

const DAY_NAMES = [
  "ראשון",
  "שני",
  "שלישי",
  "רביעי",
  "חמישי",
  "שישי",
  "שבת",
];

/**
 * Given a recurrence rule and a reference date, calculates the NEXT occurrence date.
 * Returns null if the recurrence has ended (past end_date).
 */
export function calculateNextRecurrenceDate(
  rule: RecurrenceRule,
  fromDate: Date
): Date | null {
  let next: Date;

  switch (rule.type) {
    case "weekly": {
      const from = new Date(fromDate);
      const currentDay = from.getDay();
      let daysUntil = rule.day - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      next = new Date(from);
      next.setDate(next.getDate() + daysUntil);
      break;
    }

    case "monthly": {
      const from = new Date(fromDate);
      let year = from.getFullYear();
      let month = from.getMonth();

      // Try rule.day in the current month first
      const lastDayCurrent = new Date(year, month + 1, 0).getDate();
      const dayCurrent = Math.min(rule.day, lastDayCurrent);
      const candidate = new Date(year, month, dayCurrent);

      if (candidate > from) {
        next = candidate;
      } else {
        // Advance to next month
        month++;
        if (month > 11) {
          month = 0;
          year++;
        }
        const lastDayNext = new Date(year, month + 1, 0).getDate();
        const dayNext = Math.min(rule.day, lastDayNext);
        next = new Date(year, month, dayNext);
      }
      break;
    }

    case "custom": {
      next = new Date(fromDate);
      next.setDate(next.getDate() + rule.interval);
      break;
    }

    default:
      return null;
  }

  // Check end_date
  if (rule.end_date) {
    const end = new Date(rule.end_date);
    if (next > end) return null;
  }

  return next;
}

/**
 * Returns a human-readable Hebrew description of a recurrence rule.
 */
export function formatRecurrenceDescription(rule: RecurrenceRule): string {
  let desc: string;

  switch (rule.type) {
    case "weekly":
      desc = "חוזרת כל יום " + DAY_NAMES[rule.day];
      break;
    case "monthly":
      desc = "חוזרת ב-" + rule.day + " לכל חודש";
      break;
    case "custom":
      desc = "חוזרת כל " + rule.interval + " ימים";
      break;
    default:
      desc = "";
  }

  if (rule.end_date) {
    const end = new Date(rule.end_date);
    const formatted = end.toLocaleDateString("he-IL");
    desc += " (עד " + formatted + ")";
  }

  return desc;
}

/**
 * Creates the next recurring instance of a task.
 * Copies assignees, watchers, and tags from the source task.
 * Updates the source task to clear its next_recurrence_date.
 */
export async function createNextRecurringInstance(
  taskId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any
): Promise<{ newTaskId: string } | null> {
  // 1. Fetch the source task
  const { data: task, error: fetchError } = await db
    .from("tasks")
    .select(
      "id, title, description, client_id, recurrence_rule, recurring_source_id, next_recurrence_date, due_date"
    )
    .eq("id", taskId)
    .single();

  if (fetchError || !task) return null;

  const rule = task.recurrence_rule as RecurrenceRule | null;
  if (!rule || !task.next_recurrence_date) return null;

  // 2. Check if recurrence has ended
  if (rule.end_date) {
    const end = new Date(rule.end_date);
    const nextDate = new Date(task.next_recurrence_date);
    if (nextDate > end) return null;
  }

  // 3. Calculate next_recurrence_date for the NEW task
  const newDueDate = new Date(task.next_recurrence_date);
  const nextAfterNew = calculateNextRecurrenceDate(rule, newDueDate);

  // 4. Determine the original source id
  const originalSourceId = task.recurring_source_id || task.id;

  // 5. Create the new task
  const { data: newTask, error: insertError } = await db
    .from("tasks")
    .insert({
      title: task.title,
      description: task.description,
      client_id: task.client_id,
      status: "מחכה לטיפול",
      due_date: newDueDate.toISOString().slice(0, 10),
      source: "recurring",
      recurrence_rule: rule,
      recurring_source_id: originalSourceId,
      next_recurrence_date: nextAfterNew
        ? nextAfterNew.toISOString().slice(0, 10)
        : null,
    })
    .select("id")
    .single();

  if (insertError || !newTask) return null;

  const newTaskId = newTask.id;

  // 6. Copy task_assignees
  const { data: assignees } = await db
    .from("task_assignees")
    .select("member_id")
    .eq("task_id", taskId);

  if (assignees && assignees.length > 0) {
    await db.from("task_assignees").insert(
      assignees.map((a: { member_id: string }) => ({
        task_id: newTaskId,
        member_id: a.member_id,
      }))
    );
  }

  // 7. Copy task_watchers
  const { data: watchers } = await db
    .from("task_watchers")
    .select("member_id")
    .eq("task_id", taskId);

  if (watchers && watchers.length > 0) {
    await db.from("task_watchers").insert(
      watchers.map((w: { member_id: string }) => ({
        task_id: newTaskId,
        member_id: w.member_id,
      }))
    );
  }

  // 8. Copy task_tags
  const { data: tags } = await db
    .from("task_tags")
    .select("tag_id")
    .eq("task_id", taskId);

  if (tags && tags.length > 0) {
    await db.from("task_tags").insert(
      tags.map((t: { tag_id: string }) => ({
        task_id: newTaskId,
        tag_id: t.tag_id,
      }))
    );
  }

  // 9. Clear next_recurrence_date on the source task (chain moved to new task)
  await db
    .from("tasks")
    .update({ next_recurrence_date: null })
    .eq("id", taskId);

  return { newTaskId };
}
