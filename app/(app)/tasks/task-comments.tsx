"use client";

import * as React from "react";
import { Send, Paperclip, AtSign, FileText, FileSpreadsheet, FileImage, File as FileIcon, Loader2, ChevronDown, ChevronUp, Maximize2, X, Pencil, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Hint } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { addComment, uploadCommentAttachment, getCommentAttachments, updateComment, deleteComment } from "./actions";
import type { CommentAttachment } from "./actions";
import type { TeamMember } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils";

type Comment = {
  id: string;
  content: string;
  author_name: string | null;
  author_id: string | null;
  parent_id: string | null;
  created_at: string;
  mentions: string[];
};

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "עכשיו";
  if (mins < 60) return `לפני ${mins} דק'`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} שע'`;
  return `לפני ${Math.floor(hours / 24)} ימים`;
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

// Escape a string for safe use inside a RegExp.
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Turn plain text into React nodes, wrapping URLs in clickable links.
const URL_PATTERN = /https?:\/\/[^\s<>"']+/;
const URL_SPLIT = /(https?:\/\/[^\s<>"']+)/g;

function renderTextWithLinks(text: string): React.ReactNode {
  const parts = text.split(URL_SPLIT);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (URL_PATTERN.test(part)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer"
          className="text-primary underline hover:text-primary/80 break-all" dir="ltr">
          {part}
        </a>
      );
    }
    return part;
  });
}

// Render comment content, turning known @mentions into inline blue chips.
// `names` are the full names that were mentioned (resolved from stored mention IDs).
// Line breaks are preserved. URLs are rendered as clickable links.
function renderContentWithMentions(content: string, names: string[]): React.ReactNode {
  if (names.length === 0) return renderTextWithLinks(content);
  // Longest names first so e.g. "@דני לוי" wins over "@דני".
  const sorted = [...names].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`@(?:${sorted.map(escapeRegExp).join("|")})`, "g");
  const parts = content.split(pattern);
  const matches = content.match(pattern) ?? [];

  const nodes: React.ReactNode[] = [];
  parts.forEach((part, i) => {
    if (part) nodes.push(<React.Fragment key={`t${i}`}>{renderTextWithLinks(part)}</React.Fragment>);
    if (i < matches.length) {
      nodes.push(
        <span
          key={`m${i}`}
          className="rounded-full bg-surface px-1.5 font-medium text-ink"
        >
          {matches[i]}
        </span>,
      );
    }
  });
  return nodes;
}

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

  // Local object URLs for image previews of pending files. Recreated on change, revoked on cleanup.
  const previews = React.useMemo(
    () => pendingFiles.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : null)),
    [pendingFiles],
  );
  React.useEffect(() => {
    return () => { previews.forEach((u) => u && URL.revokeObjectURL(u)); };
  }, [previews]);

  function handleTextChange(val: string) {
    setText(val);
    const lastAt = val.lastIndexOf("@");
    if (lastAt >= 0 && (lastAt === 0 || val[lastAt - 1] === " ")) {
      const query = val.slice(lastAt + 1);
      if (!query.includes(" ")) { setShowMentions(true); return; }
    }
    setShowMentions(false);
  }

  // Insert an "@" at the cursor (or end), focus the textarea, and open the mentions dropdown.
  // Same flow as typing "@" manually.
  function triggerMention() {
    const ta = textareaRef.current;
    const pos = ta ? ta.selectionStart : text.length;
    const before = text.slice(0, pos);
    const after = text.slice(pos);
    // Ensure the "@" begins a mention token (preceded by start-of-text or a space).
    const needsSpace = before.length > 0 && before[before.length - 1] !== " ";
    const insert = (needsSpace ? " @" : "@");
    const next = before + insert + after;
    setText(next);
    setShowMentions(true);
    requestAnimationFrame(() => {
      const caret = (before + insert).length;
      ta?.focus();
      ta?.setSelectionRange(caret, caret);
    });
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

  const canSend = (text.trim() || pendingFiles.length > 0) && !sending;

  return (
    <div className="relative">
      <div className="rounded-xl border border-border bg-white transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          placeholder={placeholder ?? "כתוב עדכון... (@ לאזכור)"}
          rows={compact ? 1 : 2}
          className="w-full resize-none rounded-t-xl bg-transparent px-3 pt-3 pb-1.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none"
        />

        {/* Pending files preview */}
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pb-1.5">
            {pendingFiles.map((f, i) => {
              const preview = previews[i];
              if (preview) {
                return (
                  <span key={i} className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt={f.name}
                      className="h-14 w-14 rounded-lg border border-border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute -end-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white shadow-elevation-2 hover:bg-ink-hover"
                      aria-label="הסר קובץ"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              }
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-ink-secondary"
                >
                  <FileIcon className="h-3.5 w-3.5 text-ink-muted" />
                  {f.name.length > 20 ? f.name.slice(0, 17) + "..." : f.name}
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="ms-0.5 text-ink-muted hover:text-ink"
                    aria-label="הסר קובץ"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between border-t border-border px-2 py-1.5">
          <div className="flex items-center gap-0.5">
            <Hint label="צרף קובץ">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink"
              >
                <Paperclip className="h-4 w-4" />
              </button>
            </Hint>
            <Hint label="תייג מישהו">
              <button
                type="button"
                onClick={triggerMention}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink"
              >
                <AtSign className="h-4 w-4" />
              </button>
            </Hint>
          </div>
          <Hint label="שלח">
            <Button
              onClick={handleSend}
              disabled={!canSend}
              className="h-8 gap-1.5 px-3 text-xs"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              שלח
            </Button>
          </Hint>
        </div>
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
        <div className="absolute bottom-full mb-1 start-0 z-10 w-52 rounded-xl border border-border bg-white p-1 shadow-elevation-3">
          {filteredMembers.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => insertMention(m)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink transition-colors hover:bg-surface"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface text-[10px] font-semibold text-ink">
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
        const url = thumbs[att.storage_path];
        return (
          <a
            key={att.id}
            href={url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-border px-3 py-1 text-[11px] text-ink-secondary cursor-pointer hover:bg-surface/80 transition-colors"
          >
            <Icon className="h-3.5 w-3.5 text-ink-muted" />
            {att.file_name.length > 25 ? att.file_name.slice(0, 22) + "..." : att.file_name}
          </a>
        );
      })}
    </div>
  );
}

// ---- Single comment ----

function SingleComment({
  comment,
  team,
  replyCount,
  attachments,
  thumbs,
  onReplyClick,
  isReply,
  currentUserId,
  onEdited,
  onDeleted,
}: {
  comment: Comment;
  team: TeamMember[];
  replyCount?: number;
  attachments: CommentAttachment[];
  thumbs: Record<string, string>;
  onReplyClick?: () => void;
  isReply?: boolean;
  currentUserId: string | null;
  onEdited: () => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [editText, setEditText] = React.useState(comment.content);
  const [saving, setSaving] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const isOwner = currentUserId && comment.author_id === currentUserId;

  const mentionNames = React.useMemo(() => {
    if (!comment.mentions || comment.mentions.length === 0) return [];
    const byId = new Map(team.map((m) => [m.id, m.full_name]));
    return comment.mentions
      .map((id) => byId.get(id))
      .filter((n): n is string => !!n);
  }, [comment.mentions, team]);

  async function handleSaveEdit() {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === comment.content) { setEditing(false); setEditText(comment.content); return; }
    setSaving(true);
    const res = await updateComment(comment.id, trimmed);
    setSaving(false);
    if ("error" in res) { toast.error("העדכון נכשל"); return; }
    setEditing(false);
    onEdited();
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await deleteComment(comment.id);
    setDeleting(false);
    if ("error" in res) { toast.error("המחיקה נכשלה"); return; }
    setConfirmDelete(false);
    onDeleted();
  }

  return (
    <div className="group/comment flex gap-3">
      <div className={`flex shrink-0 items-center justify-center rounded-full bg-surface text-[11px] font-semibold text-ink ${isReply ? "h-6 w-6 text-[9px]" : "h-8 w-8"}`}>
        {comment.author_name ? getInitials(comment.author_name) : "?"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`font-semibold text-ink ${isReply ? "text-xs" : "text-base"}`}>
            {comment.author_name ?? "לא ידוע"}
          </span>
          <div className="flex items-center gap-1.5">
            {isOwner && !editing && !confirmDelete && (
              <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/comment:opacity-100">
                <button type="button" onClick={() => { setEditText(comment.content); setEditing(true); }}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-ink-muted hover:bg-surface hover:text-ink" aria-label="ערוך">
                  <Pencil className="h-3 w-3" />
                </button>
                <button type="button" onClick={() => setConfirmDelete(true)}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-ink-muted hover:bg-overdue-bg hover:text-overdue" aria-label="מחק">
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            )}
            <span className="text-xs text-ink-muted">{timeAgo(comment.created_at)}</span>
          </div>
        </div>

        {confirmDelete ? (
          <div className="mt-1 flex items-center gap-2 rounded-lg bg-overdue-bg p-2">
            <span className="text-xs text-overdue">למחוק תגובה?</span>
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting} className="h-6 px-2 text-xs">
              {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "מחק"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} className="h-6 px-2 text-xs">ביטול</Button>
          </div>
        ) : editing ? (
          <div className="mt-1">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); } if (e.key === "Escape") { setEditing(false); setEditText(comment.content); } }}
              rows={2}
              className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
              disabled={saving}
            />
            <div className="mt-1 flex items-center gap-1.5">
              <Button size="sm" onClick={handleSaveEdit} disabled={saving} className="h-6 gap-1 px-2 text-xs">
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                שמור
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setEditText(comment.content); }} className="h-6 px-2 text-xs">ביטול</Button>
            </div>
          </div>
        ) : (
          <p className={`mt-0.5 text-ink-secondary whitespace-pre-wrap leading-relaxed ${isReply ? "text-xs" : "text-base"}`}>
            {renderContentWithMentions(comment.content, mentionNames)}
          </p>
        )}

        <CommentAttachmentList attachments={attachments} thumbs={thumbs} />
        {!isReply && !editing && !confirmDelete && (
          <div className="mt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={onReplyClick}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              השב
            </button>
            {replyCount && replyCount > 0 ? (
              <span className="text-xs text-ink-muted">
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
  const [showAll, setShowAll] = React.useState(false);
  const [attachmentMap, setAttachmentMap] = React.useState<Record<string, CommentAttachment[]>>({});
  const [thumbMap, setThumbMap] = React.useState<Record<string, string>>({});
  const [expanded, setExpanded] = React.useState(false);

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
      .select("id,content,created_at,parent_id,mentions,author:team_members!task_comments_author_id_fkey(id,full_name)")
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
        mentions: Array.isArray(c.mentions) ? c.mentions : [],
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
      try {
        const results = await Promise.allSettled(
          files.map(async (file) => {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("fileName", file.name);
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
      } catch {
        toast.error("העלאה נכשלה, ייתכן שהקובץ גדול מדי");
      }
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

  // Comment list + composer. Rendered once and relocated into the Dialog when expanded,
  // so list state (fetched in this parent) stays intact.
  const body = (
    <div className="flex flex-col gap-3">
      {topLevel.length > 0 && (
        <div className="flex flex-col divide-y divide-border">
          {(showAll ? topLevel : topLevel.slice(0, 2)).map((c) => {
            const replies = repliesMap[c.id] ?? [];
            const isExpanded = expandedThreads.has(c.id);
            const showReplies = replies.length > 0 && isExpanded;

            return (
              <div key={c.id} className="flex flex-col py-3 first:pt-0 last:pb-0">
                <SingleComment
                  comment={c}
                  team={team}
                  replyCount={replies.length}
                  attachments={attachmentMap[c.id] ?? []}
                  thumbs={thumbMap}
                  currentUserId={memberId}
                  onEdited={fetchComments}
                  onDeleted={fetchComments}
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
                    className="ms-11 mt-1 flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
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
                        team={team}
                        attachments={attachmentMap[r.id] ?? []}
                        thumbs={thumbMap}
                        isReply
                        currentUserId={memberId}
                        onEdited={fetchComments}
                        onDeleted={fetchComments}
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
          {!showAll && topLevel.length > 2 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors py-1"
            >
              צפה בעוד {topLevel.length - 2}
            </button>
          )}
        </div>
      )}

      {/* Main input */}
      <CommentInput
        team={team}
        onSend={(text, mentions, files) => handleSend(text, mentions, files, null)}
      />
    </div>
  );

  const header = (
    <div className="flex items-center justify-between">
      <h4 className="text-base font-semibold text-ink">עדכונים ({totalComments})</h4>
      <Hint label="הגדל">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink"
          aria-label="הגדל"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </Hint>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {header}
      {!expanded && body}

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>עדכונים ({totalComments})</DialogTitle>
          <div className="-me-2 max-h-[70vh] overflow-y-auto pe-2">
            {expanded && body}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
