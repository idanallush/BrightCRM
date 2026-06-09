// TEMPORARY — remove after testing
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyTodayReminders } from "@/lib/email/notify";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const debug: Record<string, unknown> = {
    today_date: "",
    timezone: "Asia/Jerusalem",
    reminders_query: null,
    reminders_found: [] as unknown[],
    team_members: [] as unknown[],
    recipient_resolution: [] as unknown[],
    errors: [] as string[],
  };

  try {
    const db = createAdminClient();
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
    debug.today_date = today;
    debug.utc_now = new Date().toISOString();
    debug.utc_date = new Date().toISOString().split("T")[0];

    // 1. Query reminders for today
    const { data: reminders, error: remError } = await db
      .from("reminders")
      .select("id, title, reminder_date, scope, is_completed, created_by_id, created_at")
      .eq("reminder_date", today)
      .eq("is_completed", false);

    debug.reminders_query = {
      filter: `reminder_date = '${today}' AND is_completed = false`,
      error: remError?.message ?? null,
      count: reminders?.length ?? 0,
    };

    // Also check ALL reminders (without date filter) to see if the date is the issue
    const { data: allReminders } = await db
      .from("reminders")
      .select("id, title, reminder_date, scope, is_completed, created_by_id")
      .eq("is_completed", false)
      .order("reminder_date", { ascending: true })
      .limit(10);

    debug.all_active_reminders = (allReminders ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      reminder_date: r.reminder_date,
      scope: r.scope,
      is_completed: r.is_completed,
      created_by_id: r.created_by_id,
      date_matches_today: r.reminder_date === today,
    }));

    debug.reminders_found = (reminders ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      reminder_date: r.reminder_date,
      scope: r.scope,
      is_completed: r.is_completed,
      created_by_id: r.created_by_id,
      created_at: r.created_at,
    }));

    // 2. Query team members
    const { data: members, error: memError } = await db
      .from("team_members")
      .select("id, full_name, email, notify_email, active")
      .eq("active", true);

    if (memError) {
      (debug.errors as string[]).push(`team_members query error: ${memError.message}`);
    }

    debug.team_members = (members ?? []).map((m) => ({
      id: m.id,
      full_name: m.full_name,
      email: m.email,
      notify_email: m.notify_email,
      active: m.active,
    }));

    // 3. For each reminder, resolve creator and recipients
    for (const rem of reminders ?? []) {
      const resolution: Record<string, unknown> = {
        reminder_id: rem.id,
        reminder_title: rem.title,
        scope: rem.scope,
        created_by_id: rem.created_by_id,
      };

      // Find creator in team_members
      const creator = (members ?? []).find((m) => m.id === rem.created_by_id);
      resolution.creator_found = creator
        ? { id: creator.id, full_name: creator.full_name, email: creator.email }
        : null;

      if (rem.scope === "personal") {
        resolution.recipient_type = "personal → creator only";
        resolution.resolved_emails = creator?.email ? [creator.email] : [];
        if (!creator) {
          resolution.problem = "creator not found in active team_members";
        } else if (!creator.email) {
          resolution.problem = "creator has no email";
        }
      } else {
        // Team scope — check reminder_recipients
        const { data: specificRecips, error: recipError } = await db
          .from("reminder_recipients")
          .select("member_id")
          .eq("reminder_id", rem.id);

        resolution.reminder_recipients_error = recipError?.message ?? null;
        const specificIds = (specificRecips ?? []).map(
          (r: { member_id: string }) => r.member_id,
        );
        resolution.specific_recipient_ids = specificIds;

        if (specificIds.length > 0) {
          resolution.recipient_type = "team → specific recipients";
          const emails = (members ?? [])
            .filter(
              (m) =>
                specificIds.includes(m.id) &&
                m.email &&
                m.notify_email !== false,
            )
            .map((m) => m.email);
          resolution.resolved_emails = emails;
        } else {
          resolution.recipient_type = "team → all active members";
          const emails = (members ?? [])
            .filter((m) => m.email && m.notify_email !== false)
            .map((m) => m.email);
          resolution.resolved_emails = emails;
        }
      }

      (debug.recipient_resolution as unknown[]).push(resolution);
    }

    // 4. Actually send the emails
    const result = await notifyTodayReminders();

    return NextResponse.json({
      ok: true,
      ...result,
      debug,
    });
  } catch (err) {
    (debug.errors as string[]).push(
      err instanceof Error ? `${err.message}\n${err.stack}` : String(err),
    );
    return NextResponse.json({ ok: false, sent: 0, debug }, { status: 500 });
  }
}
