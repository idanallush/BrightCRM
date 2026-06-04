"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, ClipboardList, Paperclip, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { UserChip } from "@/components/user-hover-card";
import { TaskForm } from "./task-form";
import { TaskAttachments } from "./task-attachments";
import { TaskComments } from "./task-comments";
import { updateTask, type TaskInput, type TaskViewRecord } from "./actions";
import type { Client, Tag, TaskWithRelations, TeamMember } from "@/lib/data";

export function TaskDetailPanel({
  task, clients, team, tags, onClose, onDelete, confirmingDelete, setConfirmingDelete, onTitleSaved, taskViews, teamSize,
}: {
  task: TaskWithRelations;
  clients: Client[];
  team: TeamMember[];
  tags: Tag[];
  onClose: () => void;
  onDelete: () => void;
  confirmingDelete: boolean;
  setConfirmingDelete: (v: boolean) => void;
  onTitleSaved: (title: string) => void;
  taskViews: TaskViewRecord[];
  teamSize: number;
}) {
  const router = useRouter();
  const [fileCount, setFileCount] = React.useState<number | null>(null);

  const [editingTitle, setEditingTitle] = React.useState(false);
  const [titleDraft, setTitleDraft] = React.useState(task.title);
  const [savingTitle, setSavingTitle] = React.useState(false);

  const creatorName = task.creator?.full_name ?? null;
  const creatorRole = team.find(m => m.id === task.created_by_id)?.role ?? null;
  const isCreatorDifferent = creatorName && !task.assignees.some((a) => a.id === task.created_by_id);

  async function saveTitle() {
    const next = titleDraft.trim();
    setEditingTitle(false);
    if (!next || next === task.title) { setTitleDraft(task.title); return; }
    setSavingTitle(true);
    const payload = {
      title: next,
      client_id: task.client_id,
      description: task.description,
      status: task.status as TaskInput["status"],
      due_date: task.due_date,
      assignee_ids: task.assignees.map((a) => a.id),
      watcher_ids: task.watchers.map((w) => w.id),
      tag_ids: task.tags.map((t) => t.id),
    };
    const res = await updateTask(task.id, payload);
    setSavingTitle(false);
    if ("error" in res) { toast.error(res.error); setTitleDraft(task.title); return; }
    onTitleSaved(next);
    router.refresh();
  }

  const creator = task.creator ?? (creatorName ? { full_name: creatorName, avatar_url: null } : null);
  const firstAssignee = task.assignees[0] ?? null;
  const firstWatcher = task.watchers[0] ?? null;

  return (
    <>
      {/* ── Header: title + roles bar ── */}
      <div className="shrink-0 border-b border-border px-5 pb-4 pt-5 md:px-6 md:pt-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            {editingTitle ? (
              <Input
                autoFocus
                value={titleDraft}
                disabled={savingTitle}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); saveTitle(); }
                  if (e.key === "Escape") { setTitleDraft(task.title); setEditingTitle(false); }
                }}
                className="text-xl font-bold text-ink"
              />
            ) : (
              <h2
                onClick={() => { setTitleDraft(task.title); setEditingTitle(true); }}
                title="לחץ לעריכה"
                className="-mx-1.5 cursor-text rounded-lg px-1.5 py-0.5 text-xl font-bold leading-snug text-ink transition-colors hover:bg-surface"
              >
                {task.title}
              </h2>
            )}
          </div>
        </div>

        {/* Roles bar — deduplicated: same person with multiple roles shows one avatar */}
        <div className="mt-4 flex items-center gap-6 border-t border-border pt-4">
          {(() => {
            const roleMap = new Map<string, { member: { id?: string; full_name: string; avatar_url?: string | null }; roles: string[] }>();

            if (creator && task.created_by_id) {
              roleMap.set(task.created_by_id, { member: creator, roles: ["נפתח ע״י"] });
            }
            for (const a of task.assignees) {
              const existing = roleMap.get(a.id);
              if (existing) { existing.roles.push("אחראי"); }
              else { roleMap.set(a.id, { member: a, roles: ["אחראי"] }); }
            }
            for (const w of task.watchers) {
              const existing = roleMap.get(w.id);
              if (existing) { existing.roles.push("במעקב"); }
              else { roleMap.set(w.id, { member: w, roles: ["במעקב"] }); }
            }

            const entries = [...roleMap.values()];
            return entries.map((entry, i) => (
              <React.Fragment key={entry.member.full_name}>
                {i > 0 && <div className="h-8 w-px bg-border" />}
                <div className="flex items-center gap-2.5">
                  <div className="flex flex-col items-end">
                    <span className="text-[11px] text-ink-muted">{entry.roles.join(" · ")}</span>
                    <span className="text-sm font-medium text-ink">{entry.member.full_name}</span>
                  </div>
                  <UserChip member={entry.member} size="sm" />
                </div>
              </React.Fragment>
            ));
          })()}
          {/* Seen-by indicator */}
          {(() => {
            const seenAfterUpdate = taskViews.filter((v) => v.last_seen_at >= (task.updated_at ?? task.created_at));
            if (seenAfterUpdate.length === 0) return null;
            return (
              <>
                <div className="h-8 w-px bg-border" />
                <div className="flex items-center gap-2.5" title={`נצפה ע״י: ${seenAfterUpdate.map(v => v.full_name).join(", ")}`}>
                  <div className="flex flex-col items-end">
                    <span className="text-[11px] text-ink-muted">נצפה</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex -space-x-1.5 space-x-reverse">
                      {seenAfterUpdate.slice(0, 3).map((v) => (
                        <UserChip key={v.member_id} member={{ full_name: v.full_name, avatar_url: v.avatar_url }} size="xs" />
                      ))}
                    </div>
                    {seenAfterUpdate.length > 3 && (
                      <span className="text-xs font-medium text-ink-muted">+{seenAfterUpdate.length - 3}</span>
                    )}
                    <Eye className="h-3.5 w-3.5 text-ink-muted" />
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* ── Body: two-column layout ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left column — form */}
        <div className="flex w-1/2 flex-col border-e border-border">
          <div className="flex items-center gap-2 px-5 py-3 md:px-6">
            <ClipboardList className="h-4 w-4 text-ink-muted" />
            <h3 className="text-base font-semibold text-ink">פרטי משימה</h3>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-4 md:px-6">
            <TaskForm key={task.id} task={task} clients={clients} team={team} tags={tags} onDone={onClose} compact />
          </div>
        </div>

        {/* Right column — comments + files */}
        <div className="flex w-1/2 flex-col">
          <div className="flex-1 overflow-y-auto">
            {/* Comments section */}
            <div className="px-5 pb-4 pt-3 md:px-6">
              <TaskComments taskId={task.id} team={team} />
            </div>

            {/* Files section */}
            <div className="border-t border-border px-5 pb-4 pt-3 md:px-6">
              <div className="mb-3 flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-ink-muted" />
                <h3 className="text-base font-semibold text-ink">
                  קבצים{fileCount !== null ? ` (${fileCount})` : ""}
                </h3>
              </div>
              <TaskAttachments taskId={task.id} onCountChange={setFileCount} />
            </div>
          </div>

          {/* Delete — bottom of right column */}
          <div className="border-t border-border px-5 py-3 md:px-6">
            {confirmingDelete ? (
              <div className="flex flex-col gap-2 rounded-xl bg-overdue-bg p-3 text-right">
                <p className="text-sm text-overdue">למחוק את המשימה לצמיתות?</p>
                <div className="flex flex-row-reverse gap-2">
                  <Button variant="danger" size="sm" onClick={onDelete}>מחק</Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>ביטול</Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="flex items-center gap-1.5 text-sm text-overdue transition-colors hover:text-overdue/80"
                >
                  <Trash2 className="h-4 w-4" />
                  מחיקה
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
