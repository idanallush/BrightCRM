import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNextRecurringInstance } from "@/lib/recurring";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Verify Vercel Cron secret — fail closed if not configured
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = createAdminClient();
    const today = new Date().toISOString().slice(0, 10);

    // Find tasks where recurrence is due AND task is not completed
    const { data: dueTasks, error } = await db
      .from("tasks")
      .select("id")
      .not("recurrence_rule", "is", null)
      .lte("next_recurrence_date", today)
      .not("status", "eq", "בוצע");

    if (error) throw error;

    let created = 0;
    for (const task of dueTasks ?? []) {
      const result = await createNextRecurringInstance(task.id, db);
      if (result) created++;
    }

    console.log(`[Cron] Recurring tasks: ${created} created from ${(dueTasks ?? []).length} due`);
    return NextResponse.json({ created, checked: (dueTasks ?? []).length });
  } catch (err) {
    console.error("[Cron] Recurring tasks failed:", err);
    return NextResponse.json(
      { error: "Failed to run recurring task creation" },
      { status: 500 },
    );
  }
}
