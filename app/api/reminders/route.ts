import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
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

  const params = request.nextUrl.searchParams;
  const from = params.get("from");
  const to = params.get("to");
  const scope = params.get("scope") || "all";
  const memberId = params.get("member_id");

  let q = sb
    .from("reminders")
    .select(
      "id, title, description, reminder_date, reminder_time, scope, is_completed, created_at, updated_at, creator:team_members!reminders_created_by_id_fkey(id, full_name)",
    )
    .order("reminder_date", { ascending: true });

  if (from) q = q.gte("reminder_date", from);
  if (to) q = q.lte("reminder_date", to);

  if (scope === "personal") {
    // Show user's personal reminders + all team reminders
    q = q.or(`and(scope.eq.personal,created_by_id.eq.${member.id}),scope.eq.team`);
  } else if (scope === "team") {
    q = q.eq("scope", "team");
  } else {
    // scope='all' — user's personal + all team reminders
    q = q.or(`and(scope.eq.personal,created_by_id.eq.${member.id}),scope.eq.team`);
  }

  if (memberId) {
    q = q.eq("created_by_id", memberId);
  }

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const reminderIds = (data ?? []).map((r) => (r as Record<string, unknown>).id as string);
  let recipientMap: Record<string, { id: string; full_name: string }[]> = {};
  if (reminderIds.length > 0) {
    const { data: recips } = await sb
      .from("reminder_recipients")
      .select("reminder_id, member:team_members!reminder_recipients_member_id_fkey(id, full_name)")
      .in("reminder_id", reminderIds);
    for (const row of (recips ?? []) as Record<string, unknown>[]) {
      const rid = row.reminder_id as string;
      const m = row.member as { id: string; full_name: string } | null;
      if (!m) continue;
      if (!recipientMap[rid]) recipientMap[rid] = [];
      recipientMap[rid].push(m);
    }
  }

  const reminders = ((data ?? []) as Record<string, unknown>[]).map((r) => {
    const creator = r.creator as { id?: string; full_name?: string } | null;
    const id = r.id as string;
    return {
      id,
      title: r.title as string,
      description: r.description as string | null,
      reminder_date: r.reminder_date as string,
      reminder_time: r.reminder_time as string | null,
      scope: r.scope as string,
      is_completed: r.is_completed as boolean,
      created_at: r.created_at as string,
      updated_at: r.updated_at as string,
      created_by_id: creator?.id ?? null,
      created_by_name: creator?.full_name ?? null,
      recipients: recipientMap[id] ?? [],
    };
  });

  return NextResponse.json(reminders);
}

export async function POST(request: NextRequest) {
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

  const body = await request.json();
  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "כותרת חסרה" }, { status: 400 });
  }

  const reminderDate = body.reminder_date;
  if (!reminderDate) {
    return NextResponse.json({ error: "תאריך חסר" }, { status: 400 });
  }

  const scope = body.scope === "team" ? "team" : "personal";

  const { data: reminder, error } = await sb
    .from("reminders")
    .insert({
      title,
      description: body.description?.trim() || null,
      reminder_date: reminderDate,
      reminder_time: body.reminder_time || null,
      scope,
      created_by_id: member.id,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const recipientIds: string[] | undefined = body.recipient_ids;
  if (scope === "team" && recipientIds && recipientIds.length > 0) {
    const rows = recipientIds.map((mid: string) => ({
      reminder_id: reminder.id,
      member_id: mid,
    }));
    await sb.from("reminder_recipients").insert(rows);
  }

  return NextResponse.json({ id: reminder.id }, { status: 201 });
}
