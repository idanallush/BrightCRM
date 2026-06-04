"use client";

import * as React from "react";
import { Pencil, Trash2, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { updateComment, deleteComment } from "./actions";
import type { CommentAttachment } from "./actions";
import { UserAvatar } from "@/components/user-avatar";
import { SeenIndicator } from "@/components/ui/seen-indicator";
import { timeAgo } from "@/lib/utils";
import type { TeamMember } from "@/lib/data";
import { CommentAttachmentList, renderContentWithMentions } from "./comment-helpers";

export type Comment = {
  id: string;
  content: string;
  author_name: string | null;
  author_id: string | null;
  author_avatar_url: string | null;
  parent_id: string | null;
  created_at: string;
  mentions: string[];
};

export function SingleComment({
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
  seenBy,
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
  seenBy?: { full_name: string; avatar_url: string | null; last_seen_at: string }[];
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
      <UserAvatar
        name={comment.author_name}
        avatarUrl={comment.author_avatar_url}
        size={isReply ? "xs" : "sm"}
      />
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
            <SeenIndicator
              viewers={seenBy?.map(s => ({ full_name: s.full_name, avatar_url: s.avatar_url, viewed_at: s.last_seen_at }))}
              size="sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}
