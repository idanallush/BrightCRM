import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyNewComment, notifyMentions } from "@/lib/email/notify";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;
  const sb = createClient();

  const { data, error } = await sb
    .from("task_comments")
    .select(
      "id, content, mentions, created_at, author:team_members!task_comments_author_id_fkey(id, full_name)",
    )
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const comments = ((data ?? []) as any[]).map((c) => ({
    id: c.id,
    content: c.content,
    mentions: c.mentions ?? [],
    created_at: c.created_at,
    author_id: c.author?.id ?? null,
    author_name: c.author?.full_name ?? null,
  }));

  return NextResponse.json(comments);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;
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
  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ error: "תוכן ריק" }, { status: 400 });
  }

  const mentions: string[] = Array.isArray(body.mentions) ? body.mentions : [];
  const parentId: string | null = body.parent_id ?? null;

  const { data: comment, error } = await sb
    .from("task_comments")
    .insert({
      task_id: taskId,
      author_id: member.id,
      content,
      mentions,
      parent_id: parentId,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // In-app notifications for mentions
  if (mentions.length > 0) {
    const { data: author } = await sb
      .from("team_members")
      .select("full_name")
      .eq("id", member.id)
      .single();
    const authorName = author?.full_name ?? "מישהו";
    const notifs = mentions.map((userId) => ({
      user_id: userId,
      type: "mention" as const,
      task_id: taskId,
      from_user_id: member.id,
      content: `${authorName} הזכיר/ה אותך בתגובה`,
    }));
    await sb.from("notifications").insert(notifs);
  }

  try {
    await notifyNewComment(comment.id);
    if (mentions.length > 0) {
      await notifyMentions(comment.id);
    }
  } catch (err) {
    console.error("[Email] comment notification failed:", err);
  }

  return NextResponse.json({ id: comment.id }, { status: 201 });
}
