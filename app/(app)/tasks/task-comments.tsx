"use client";

import * as React from "react";
import { Send, Paperclip, FileText, FileSpreadsheet, FileImage, File as FileIcon, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { addComment, uploadCommentAttachment, getCommentAttachments } from "./actions";
import type { CommentAttachment } from "./actions";
import type { TeamMember } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";

type Comment = {
  id: string;
  content: string;
  author_name: string | null;
  author_id: string | null;
  parent_id: string | null;
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

function isImage(t: string | null) {
  return !!t && t.startsWith("image/");
}

function iconFor(t: string | null) {
  if (!t) return FileIcon;
  if (isImage(t)) return FileImage;
  if (t === "application/pdf") return FileText;
  if (t.includes("spreadsheet") || t.includes("excel")) return FileSpreadsheet;
  if (t.includes("word")) return FileText;
  return FileIcon;
}

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT =
  "image/jpeg,image/png,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.ms-excel";

// ---- Comment input with file attach ----

function CommentInput({
  onSend,
  team,
  placeholder,
  compact,
}: {
  onSend: (text: string, mentions: string[], files: File[]) => Promise<void>;
  team: TeamMember[];
  placeholder?: string;
  compact?: boolean;
}) {
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [showMentions, setShowMentions] = React.useState(false);
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  function handleTextChange(val: string) {
    setText(val);
    const lastAt = val.lastIndexOf("@");
    if (lastAt >= 0 && (lastAt === 0 || val[lastAt - 1] === " ")) {
      const query = val.slice(lastAt + 1);
      if (!query.includes(" ")) { setShowMentions(true); return; }
    }
    setShowMentions(false);
  }

  function insertMention(member: TeamMember) {
    const mention = `@${member.full_name} `;
    const val = text.replace(/@\S*$/, mention);
    setText(val);
    setShowMentions(false);
    textareaRef.current?.focus();
  }

  function handleFileSelect(files: FileList | null) {
    if (!files) return;
    const list = Array.from(files);
    const valid: File[] = [];
    for (const f of list) {
      if (f.size > MAX_BYTES) {
        toast.error(`"${f.name}" גדול מ-10MB`);
      } else {
        valid.push(f);
      }
    }
    setPendingFiles((prev) => [...prev, ...valid]);
  }

  function removeFile(idx: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSend() {
    if ((!text.trim() && pendingFiles.length === 0) || sending) return;
    setSending(true);
    const mentionIds: string[] = [];
    for (const m of team) {
      if (text.includes(`@${m.full_name}`)) mentionIds.push(m.id);
    }
    try {
      await onSend(text.trim(), mentionIds, pendingFiles);
      setText("");
      setPendingFiles([]);
    } finally {
      setSending(false);
    }
  }

  const mentionQuery = text.slice(text.lastIndexOf("@") + 1).toLowerCase();
  const filteredMembers = showMentions
    ? team.filter((m) => m.full_name.toLowerCase().includes(mentionQuery))
    : [];

  return (
    <div className="relative">
      {/* Pending files preview */}
      {pendingFiles.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {pendingFiles.map((f, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full bg-surface border border-border px-2.5 py-0.5 text-[11px] text-ink-secondary"
            >
              {f.name.length > 20 ? f.name.slice(0, 17) + "..." : f.name}
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="text-ink-muted hover:text-ink ms-0.5"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
        }}
        placeholder={placeholder ?? "כתוב עדכון... (@ לאזכור)"}
        rows={compact ? 1 : 2}
        className={`w-full resize-none rounded-xl border border-border bg-white p-3 pe-20 text-sm text-ink placeholder:text-ink-muted transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${compact ? "py-2" : ""}`}
      />

      <div className="absolute bottom-2 end-2 flex items-center gap-1">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink"
          title="צרף קובץ"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <Button
          size="icon"
          onClick={handleSend}
          disabled={(!text.trim() && pendingFiles.length === 0) || sending}
          className="h-8 w-8"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept={ACCEPT}
        multiple
        onChange={(e) => { handleFileSelect(e.target.files); if (e.target) e.target.value = ""; }}
      />

      {showMentions && filteredMembers.length > 0 && (
        <div className="absolute bottom-full mb-1 start-0 w-52 rounded-xl border border-border bg-white p-1 shadow-elevation-3 z-10">
          {filteredMembers.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => insertMention(m)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink transition-colors hover:bg-surface"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pastel-blue text-[10px] font-semibold text-primary">
                {getInitials(m.full_name)}
              </span>
              {m.full_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Comment attachment display ----

function CommentAttachmentList({
  attachments,
  thumbs,
}: {
  attachments: CommentAttachment[];
  thumbs: Record<string, string>;
}) {
  if (attachments.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {attachments.map((att) => {
        const thumb = isImage(att.content_type) ? thumbs[att.storage_path] : null;
        if (thumb) {
          return (
            <a key={att.id} href={thumb} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumb}
                alt={att.file_name}
                className="h-16 w-16 rounded-lg object-cover border border-border transition-opacity hover:opacity-80 cursor-pointer"
              />
            </a>
          );
        }
        const Icon = iconFor(att.content_type);
        return (
          <span
            key={att.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-border px-3 py-1 text-[11px] text-ink-secondary"
          >
            <Icon className="h-3.5 w-3.5 text-ink-muted" />
            {att.file_name.length > 25 ? att.file_name.slice(0, 22) + "..." : att.file_name}
          </span>
        );
      })}
    </div>
  );
}

// ---- Single comment ----

function SingleComment({
  comment,
  replyCount,
  attachments,
  thumbs,
  onReplyClick,
  isReply,
}: {
  comment: Comment;
  replyCount?: number;
  attachments: CommentAttachment[];
  thumbs: Record<string, string>;
  onReplyClick?: () => void;
  isReply?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className={`flex shrink-0 items-center justify-center rounded-full bg-pastel-blue text-[11px] font-semibold text-primary ${isReply ? "h-6 w-6 text-[9px]" : "h-8 w-8"}`}>
        {comment.author_name ? getInitials(comment.author_name) : "?"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`font-semibold text-ink ${isReply ? "text-xs" : "text-sm"}`}>
            {comment.author_name ?? "לא ידוע"}
          </span>
          <span className="text-[11px] text-ink-muted">{timeAgo(comment.created_at)}</span>
        </div>
        <p className={`mt-0.5 text-ink-secondary whitespace-pre-wrap leading-relaxed ${isReply ? "text-xs" : "text-sm"}`}>
          {comment.content}
        </p>
        <CommentAttachmentList attachments={attachments} thumbs={thumbs} />
        {!isReply && (
          <div className="mt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={onReplyClick}
              className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
            >
              השב
            </button>
            {replyCount && replyCount > 0 ? (
              <span className="text-[11px] text-ink-muted">
                {replyCount} {replyCount === 1 ? "תגובה" : "תגובות"}
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Main component ----

export function TaskComments({ taskId, team }: { taskId: string; team: TeamMember[] }) {
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [memberId, setMemberId] = React.useState<string | null>(null);
  const [replyingTo, setReplyingTo] = React.useState<string | null>(null);
  const [expandedThreads, setExpandedThreads] = React.useState<Set<string>>(new Set());
  const [attachmentMap, setAttachmentMap] = React.useState<Record<string, CommentAttachment[]>>({});
  const [thumbMap, setThumbMap] = React.useState<Record<string, string>>({});

  // Fetch current user's team member ID
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
  const fetchComments = React.useCallback(async () => {
    const sb = createClient();
    const { data } = await sb
      .from("task_comments")
      .select("id,content,created_at,parent_id,author:team_members!task_comments_author_id_fkey(id,full_name)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });
    if (data) {
      const mapped = (data as any[]).map((c) => ({
        id: c.id,
        content: c.content,
        author_name: c.author?.full_name ?? null,
        author_id: c.author?.id ?? null,
        parent_id: c.parent_id ?? null,
        created_at: c.created_at,
      }));
      setComments(mapped);

      // Fetch attachments for all comments
      const ids = mapped.map((c) => c.id);
      if (ids.length > 0) {
        const { attachments, thumbs } = await getCommentAttachments(ids);
        setAttachmentMap(attachments);
        setThumbMap(thumbs);
      }
    }
  }, [taskId]);

  React.useEffect(() => { fetchComments(); }, [fetchComments]);

  // Build tree
  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesMap = React.useMemo(() => {
    const map: Record<string, Comment[]> = {};
    for (const c of comments) {
      if (c.parent_id) {
        if (!map[c.parent_id]) map[c.parent_id] = [];
        map[c.parent_id].push(c);
      }
    }
    return map;
  }, [comments]);

  function toggleThread(commentId: string) {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  }

  async function handleSend(text: string, mentions: string[], files: File[], parentId: string | null = null) {
    if (!memberId) return;

    // We need content OR files
    const content = text || (files.length > 0 ? `[${files.length} ${files.length === 1 ? "קובץ" : "קבצים"}]` : "");
    if (!content && files.length === 0) return;

    const res = await addComment(taskId, memberId, content, mentions, parentId);
    if ("error" in res) {
      toast.error("שליחת התגובה נכשלה");
      return;
    }

    // Upload files if any
    if (files.length > 0 && res.commentId) {
      const results = await Promise.allSettled(
        files.map(async (file) => {
          const fd = new FormData();
          fd.append("file", file);
          return uploadCommentAttachment(res.commentId, fd);
        }),
      );
      let errors = 0;
      for (const r of results) {
        if (r.status === "rejected" || (r.status === "fulfilled" && "error" in r.value)) {
          errors++;
        }
      }
      if (errors > 0) toast.error(`${errors} קבצים נכשלו בהעלאה`);
    }

    // If replying, auto-expand that thread
    if (parentId) {
      setExpandedThreads((prev) => new Set(prev).add(parentId));
    }
    setReplyingTo(null);

    // Refresh comments
    await fetchComments();
  }

  const totalComments = comments.length;

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-sm font-semibold text-ink">עדכונים ({totalComments})</h4>

      {topLevel.length > 0 && (
        <div className="flex flex-col gap-4">
          {topLevel.map((c) => {
            const replies = repliesMap[c.id] ?? [];
            const isExpanded = expandedThreads.has(c.id);
            const showReplies = replies.length > 0 && isExpanded;

            return (
              <div key={c.id} className="flex flex-col">
                <SingleComment
                  comment={c}
                  replyCount={replies.length}
                  attachments={attachmentMap[c.id] ?? []}
                  thumbs={thumbMap}
                  onReplyClick={() => {
                    setReplyingTo(replyingTo === c.id ? null : c.id);
                    if (replies.length > 0) setExpandedThreads((prev) => new Set(prev).add(c.id));
                  }}
                />

                {/* Thread toggle */}
                {replies.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleThread(c.id)}
                    className="ms-11 mt-1 flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {isExpanded ? "הסתר תגובות" : `הצג ${replies.length} ${replies.length === 1 ? "תגובה" : "תגובות"}`}
                  </button>
                )}

                {/* Replies */}
                {showReplies && (
                  <div className="ms-10 mt-2 flex flex-col gap-3 border-e-2 border-primary/20 pe-3">
                    {replies.map((r) => (
                      <SingleComment
                        key={r.id}
                        comment={r}
                        attachments={attachmentMap[r.id] ?? []}
                        thumbs={thumbMap}
                        isReply
                      />
                    ))}
                  </div>
                )}

                {/* Reply input */}
                {replyingTo === c.id && (
                  <div className="ms-10 mt-2">
                    <CommentInput
                      team={team}
                      placeholder="כתוב תגובה..."
                      compact
                      onSend={(text, mentions, files) => handleSend(text, mentions, files, c.id)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Main input */}
      <CommentInput
        team={team}
        onSend={(text, mentions, files) => handleSend(text, mentions, files, null)}
      />
    </div>
  );
}
