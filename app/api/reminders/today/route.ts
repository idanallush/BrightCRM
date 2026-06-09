import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest) {
  const sb = createClient();

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "לא מאומת" }, { status: 401 });
  }

  const { data: member } = await sb
    .from("team_members")
    .select("id")
    .eq("email", user.email)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "משתמש לא נמצא" }, { status: 404 });
  }

  // Israel timezone — reminders are date-based, use Israel date
  const israelDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });

  const { data, error } = await sb
    .from("reminders")
    .select(
      "id, title, description, reminder_date, reminder_time, scope, created_at, creator:team_members!reminders_created_by_id_fkey(id, full_name)",
    )
    .eq("reminder_date", israelDate)
    .eq("is_completed", false)
    .or(`and(scope.eq.personal,created_by_id.eq.${member.id}),scope.eq.team`)
    .order("reminder_time", { ascending: true, nullsFirst: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const allReminders = ((data ?? []) as Record<string, unknown>[]).map((r) => {
    const creator = r.creator as { id?: string; full_name?: string } | null;
    return {
      id: r.id as string,
      title: r.title as string,
      description: r.description as string | null,
      reminder_date: r.reminder_date as string,
      reminder_time: r.reminder_time as string | null,
      scope: r.scope as string,
      created_by_id: creator?.id ?? null,
      created_by_name: creator?.full_name ?? null,
    };
  });

  const teamReminderIds = allReminders
    .filter((r) => r.scope === "team")
    .map((r) => r.id);

  let recipientMap: Record<string, string[]> = {};
  if (teamReminderIds.length > 0) {
    const { data: recips } = await sb
      .from("reminder_recipients")
      .select("reminder_id, member_id")
      .in("reminder_id", teamReminderIds);
    for (const row of (recips ?? []) as { reminder_id: string; member_id: string }[]) {
      if (!recipientMap[row.reminder_id]) recipientMap[row.reminder_id] = [];
      recipientMap[row.reminder_id].push(row.member_id);
    }
  }

  const reminders = allReminders.filter((r) => {
    if (r.scope !== "team") return true;
    const specificRecipients = recipientMap[r.id];
    if (!specificRecipients || specificRecipients.length === 0) return true;
    return specificRecipients.includes(member.id);
  });

  return NextResponse.json(reminders);
}
