"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { addComment } from "./actions";
import { cn } from "@/lib/utils";
import type { TeamMember } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";

type Comment = {
  id: string;
  content: string;
  author_name: string | null;
  author_id: string | null;
  created_at: string;
};

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "עכשיו";
  if (mins < 60) return `לפני ${mins} דק'`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} שע'`;
  return `לפני ${Math.floor(hours / 24)} ימים`;
}

function getInitials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export function TaskComments({ taskId, team }: { taskId: string; team: TeamMember[] }) {
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [showMentions, setShowMentions] = React.useState(false);
  const [memberId, setMemberId] = React.useState<string | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Fetch current user member ID
  React.useEffect(() => {
    async function fetchMember() {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user?.email) return;
      const { data } = await sb.from("team_members").select("id").eq("email", user.email).maybeSingle();
      if (data) setMemberId(data.id);
    }
    fetchMember();
  }, []);

  // Fetch comments
  React.useEffect(() => {
    async function fetchComments() {
      const sb = createClient();
      const { data } = await sb
        .from("task_comments")
        .select("id,content,created_at,author:team_members!task_comments_author_id_fkey(id,full_name)")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });
      if (data) {
        setComments(
          (data as any[]).map((c) => ({
            id: c.id,
            content: c.content,
            author_name: c.author?.full_name ?? null,
            author_id: c.author?.id ?? null,
            created_at: c.created_at,
          })),
        );
      }
    }
    fetchComments();
  }, [taskId]);

  async function handleSend() {
    if (!text.trim() || !memberId) return;
    setSending(true);
    // Extract mentions: find @Name patterns and match to team
    const mentionIds: string[] = [];
    for (const m of team) {
      if (text.includes(`@${m.full_name}`)) {
        mentionIds.push(m.id);
      }
    }

    const res = await addComment(taskId, memberId, text.trim(), mentionIds);
    if ("error" in res) {
      toast.error("שליחת התגובה נכשלה");
    } else {
      // Add optimistically
      setComments((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          content: text.trim(),
          author_name: team.find((m) => m.id === memberId)?.full_name ?? null,
          author_id: memberId,
          created_at: new Date().toISOString(),
        },
      ]);
      setText("");
    }
    setSending(false);
  }

  function insertMention(member: TeamMember) {
    const mention = `@${member.full_name} `;
    // Replace the @ trigger with the full mention
    const val = text.replace(/@\S*$/, mention);
    setText(val);
    setShowMentions(false);
    textareaRef.current?.focus();
  }

  function handleTextChange(val: string) {
    setText(val);
    // Show mention dropdown when user types @
    const lastAt = val.lastIndexOf("@");
    if (lastAt >= 0 && (lastAt === 0 || val[lastAt - 1] === " ")) {
      const query = val.slice(lastAt + 1);
      if (!query.includes(" ")) {
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
  }

  const mentionQuery = text.slice(text.lastIndexOf("@") + 1).toLowerCase();
  const filteredMembers = showMentions
    ? team.filter((m) => m.full_name.toLowerCase().includes(mentionQuery))
    : [];

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-sm font-semibold text-ink">תגובות ({comments.length})</h4>

      {comments.length > 0 && (
        <div className="flex flex-col gap-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tint-lavender text-[10px] font-semibold text-primary">
                {c.author_name ? getInitials(c.author_name) : "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-caption font-medium text-ink">{c.author_name ?? "לא ידוע"}</span>
                  <span className="text-[11px] text-stone">{timeAgo(c.created_at)}</span>
                </div>
                <p className="mt-0.5 text-sm text-slate whitespace-pre-wrap">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          placeholder="כתוב תגובה... (@ לאזכור)"
          rows={2}
          className="w-full resize-none rounded-lg border border-hairline bg-white p-3 pe-12 text-sm text-ink placeholder:text-stone transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="absolute bottom-2 start-2 h-8 w-8 text-primary"
        >
          <Send className="h-4 w-4" />
        </Button>

        {/* Mention dropdown */}
        {showMentions && filteredMembers.length > 0 && (
          <div className="absolute bottom-full mb-1 start-0 w-52 rounded-lg border border-hairline bg-white p-1 shadow-overlay">
            {filteredMembers.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => insertMention(m)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink transition-colors hover:bg-surface"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-tint-lavender text-[10px] font-semibold text-primary">
                  {getInitials(m.full_name)}
                </span>
                {m.full_name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
