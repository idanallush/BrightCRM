import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sb = createClient();

  const { data, error } = await sb
    .from("reminders")
    .select(
      "id, title, description, reminder_date, reminder_time, scope, is_completed, created_at, updated_at, creator:team_members!reminders_created_by_id_fkey(id, full_name)",
    )
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  const creator = (data as Record<string, unknown>).creator as { id?: string; full_name?: string } | null;

  return NextResponse.json({
    id: data.id,
    title: data.title,
    description: data.description,
    reminder_date: data.reminder_date,
    reminder_time: data.reminder_time,
    scope: data.scope,
    is_completed: data.is_completed,
    created_at: data.created_at,
    updated_at: data.updated_at,
    created_by_id: creator?.id ?? null,
    created_by_name: creator?.full_name ?? null,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sb = createClient();

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "לא מאומת" }, { status: 401 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.reminder_date !== undefined) updates.reminder_date = body.reminder_date;
  if (body.reminder_time !== undefined) updates.reminder_time = body.reminder_time || null;
  if (body.scope !== undefined) updates.scope = body.scope === "team" ? "team" : "personal";
  if (body.is_completed !== undefined) updates.is_completed = body.is_completed;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "אין שדות לעדכון" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("reminders")
    .update(updates)
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sb = createClient();

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "לא מאומת" }, { status: 401 });
  }

  const { error } = await sb.from("reminders").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
