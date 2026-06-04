"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Maximize2 } from "lucide-react";
import { Hint } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { addComment, uploadCommentAttachment, getCommentAttachments, getTaskViews } from "./actions";
import type { CommentAttachment } from "./actions";
import type { TeamMember } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { CommentInput } from "./comment-input";
import { SingleComment } from "./single-comment";
import type { Comment } from "./single-comment";

// ---- Main component ----

type TaskView = { member_id: string; full_name: string; avatar_url: string | null; last_seen_at: string };

export function TaskComments({ taskId, team, focusCommentId }: { taskId: string; team: TeamMember[]; focusCommentId?: string | null }) {
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [memberId, setMemberId] = React.useState<string | null>(null);
  const [views, setViews] = React.useState<TaskView[]>([]);
  const [replyingTo, setReplyingTo] = React.useState<string | null>(null);
  const [expandedThreads, setExpandedThreads] = React.useState<Set<string>>(new Set());
  const [showAll, setShowAll] = React.useState(false);
  const [attachmentMap, setAttachmentMap] = React.useState<Record<string, CommentAttachment[]>>({});
  const [thumbMap, setThumbMap] = React.useState<Record<string, string>>({});
  const [expanded, setExpanded] = React.useState(false);
  const [highlightId, setHighlightId] = React.useState<string | null>(null);
  const didScrollRef = React.useRef(false);

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
      .select("id,content,created_at,parent_id,mentions,author:team_members!task_comments_author_id_fkey(id,full_name,avatar_url)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });
    if (data) {
      const mapped = (data as Record<string, unknown>[]).map((c) => {
        const author = c.author as { id?: string; full_name?: string; avatar_url?: string | null } | null;
        return {
          id: c.id as string,
          content: c.content as string,
          author_name: author?.full_name ?? null,
          author_id: author?.id ?? null,
          author_avatar_url: author?.avatar_url ?? null,
          parent_id: (c.parent_id as string | null) ?? null,
          created_at: c.created_at as string,
          mentions: Array.isArray(c.mentions) ? c.mentions : [],
        };
      });
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

  // Scroll to target comment (specific or latest) after comments load
  React.useEffect(() => {
    if (didScrollRef.current || comments.length === 0) return;

    const targetId = focusCommentId || comments[comments.length - 1]?.id;
    if (!targetId) return;

    // Show all comments first so the target is in the DOM
    if (!showAll && comments.filter(c => !c.parent_id).length > 2) {
      setShowAll(true);
      return;
    }

    // If target is a reply, expand its parent thread so the element renders
    const targetComment = comments.find(c => c.id === targetId);
    if (targetComment?.parent_id && !expandedThreads.has(targetComment.parent_id)) {
      setExpandedThreads(prev => new Set(prev).add(targetComment.parent_id!));
      return;
    }

    didScrollRef.current = true;
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-comment-id="${targetId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightId(targetId);
        setTimeout(() => setHighlightId(null), 2500);
      }
    });
  }, [comments, focusCommentId, showAll, expandedThreads]);

  // Fetch who has viewed this task
  React.useEffect(() => {
    getTaskViews(taskId).then(setViews);
  }, [taskId]);

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
              <div key={c.id} data-comment-id={c.id} className={`flex flex-col py-3 first:pt-0 last:pb-0 rounded-lg ${highlightId === c.id ? "animate-highlight" : ""}`}>
                <SingleComment
                  comment={c}
                  team={team}
                  replyCount={replies.length}
                  attachments={attachmentMap[c.id] ?? []}
                  thumbs={thumbMap}
                  currentUserId={memberId}
                  onEdited={fetchComments}
                  onDeleted={fetchComments}
                  seenBy={views.filter(v => v.last_seen_at >= c.created_at && v.member_id !== c.author_id).map(v => ({ full_name: v.full_name, avatar_url: v.avatar_url, last_seen_at: v.last_seen_at }))}
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
                      <div key={r.id} data-comment-id={r.id} className={`rounded-lg ${highlightId === r.id ? "animate-highlight" : ""}`}>
                        <SingleComment
                          comment={r}
                          team={team}
                          attachments={attachmentMap[r.id] ?? []}
                          thumbs={thumbMap}
                          isReply
                          currentUserId={memberId}
                          onEdited={fetchComments}
                          onDeleted={fetchComments}
                          seenBy={views.filter(v => v.last_seen_at >= r.created_at && v.member_id !== r.author_id).map(v => ({ full_name: v.full_name, avatar_url: v.avatar_url, last_seen_at: v.last_seen_at }))}
                        />
                      </div>
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
