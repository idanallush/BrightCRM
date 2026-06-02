"use client";

import * as React from "react";
import { ArrowUpLeft, ChevronDown, ChevronUp, AlertTriangle, MessageCircle, EyeOff, Eye } from "lucide-react";
import { UserChip } from "@/components/user-hover-card";
import { AvatarStack } from "@/components/user-avatar";
import { Hint } from "@/components/ui/tooltip";
import { STATUS_COLORS, STATUS_LIGHT } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { updateTaskStatus } from "./actions";
import { toast } from "@/components/ui/toaster";
import { useRouter } from "next/navigation";
import type { TaskWithRelations } from "@/lib/data";

const ALL_STATUSES = ["מחכה לטיפול", "נכנס לעבודה", "בעבודה", "אישור לקוח", "בוצע"] as const;

const STATUS_LABELS: Record<string, string> = {
  "מחכה לטיפול": "ממתין",
  "נכנס לעבודה": "נכנס לעבודה",
  "בעבודה": "בעבודה",
  "אישור לקוח": "אישור לקוח",
  "בוצע": "בוצע",
};

const STATUS_BG: Record<string, string> = {
  "מחכה לטיפול": "bg-st-waiting-bg",
  "נכנס לעבודה": "bg-st-incoming-bg",
  "בעבודה":      "bg-st-working-bg",
  "אישור לקוח":  "bg-st-approval-bg",
  "בוצע":        "bg-st-done-bg",
};

const STATUS_TEXT: Record<string, string> = {
  "מחכה לטיפול": "text-st-waiting-text",
  "נכנס לעבודה": "text-st-incoming-text",
  "בעבודה":      "text-st-working-text",
  "אישור לקוח":  "text-st-approval-text",
  "בוצע":        "text-st-done-text",
};

function StatusDropdown({ taskId, status, onUpdated }: { taskId: string; status: string; onUpdated: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [current, setCurrent] = React.useState(status);
  const [loading, setLoading] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => { setCurrent(status); }, [status]);

  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function pick(next: string) {
    if (next === current) { setOpen(false); return; }
    setCurrent(next);
    setOpen(false);
    setLoading(true);
    const res = await updateTaskStatus(taskId, next);
    setLoading(false);
    if ("error" in res) { toast.error(res.error); setCurrent(status); return; }
    onUpdated();
  }

  const bg = STATUS_BG[current] ?? "bg-st-cancelled";
  const text = STATUS_TEXT[current] ?? "text-white";
  const label = STATUS_LABELS[current] ?? current;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={`inline-flex min-w-[90px] items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-center text-sm font-medium transition-opacity ${bg} ${text} ${loading ? "opacity-60" : "hover:opacity-90"}`}
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 min-w-[150px] overflow-hidden rounded-xl border border-border bg-white shadow-elevation-3"
          onClick={(e) => e.stopPropagation()}
        >
          {ALL_STATUSES.map((s) => {
            const sBg = STATUS_BG[s] ?? "bg-st-cancelled";
            const sLabel = STATUS_LABELS[s] ?? s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => pick(s)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-right text-sm transition-colors hover:bg-surface ${s === current ? "font-semibold" : ""}`}
              >
                <span className={`inline-block h-3 w-3 rounded-full ${sBg}`} />
                <span className="text-ink">{sLabel}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const STALE_DAYS = 180;

function getStaleCutoff(): string {
  return new Date(Date.now() - STALE_DAYS * 86400000).toISOString();
}

function isStale(t: TaskWithRelations, cutoff: string): boolean {
  if (t.source !== "import") return false;
  if (t.updated_at > cutoff) return false;
  if (t.created_at > cutoff) return false;
  return true;
}


function relativeDate(iso: string | null): { text: string; class: string } {
  if (!iso) return { text: "ללא דדליין", class: "text-ink-muted italic" };
  const diffDays = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diffDays < 0) return { text: `באיחור ${Math.abs(diffDays)} ימים`, class: "text-overdue font-medium" };
  if (diffDays === 0) return { text: "היום", class: "text-st-waiting font-medium" };
  if (diffDays === 1) return { text: "מחר", class: "text-ink" };
  return { text: `עוד ${diffDays} ימים`, class: "text-ink-secondary" };
}

const DONE_STATUSES = ["בוצע"];

const STATUS_ORDER = [
  "מחכה לטיפול",
  "נכנס לעבודה",
  "בעבודה",
  "אישור לקוח",
];

const STATUS_GROUP_LABELS: Record<string, string> = {
  "מחכה לטיפול": "ממתין",
  "נכנס לעבודה": "נכנס לעבודה",
  "בעבודה": "בעבודה",
  "אישור לקוח": "אישור לקוח",
};

export function TaskTable({
  tasks,
  commentCounts,
  onRowClick,
  selectedIds,
  onSelectionChange,
}: {
  tasks: TaskWithRelations[];
  commentCounts: Record<string, number>;
  onRowClick: (t: TaskWithRelations) => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [showCompleted, setShowCompleted] = React.useState(false);
  const [hideStale, setHideStale] = React.useState(true);
  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(new Set());

  const staleCutoff = getStaleCutoff();
  const allActive = tasks.filter((t) => !DONE_STATUSES.includes(t.status));
  const staleTasks = allActive.filter((t) => isStale(t, staleCutoff));
  const activeTasks = hideStale ? allActive.filter((t) => !isStale(t, staleCutoff)) : allActive;
  const completedTasks = tasks.filter((t) => DONE_STATUSES.includes(t.status));

  const groups = STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_GROUP_LABELS[status],
    color: STATUS_COLORS[status] ?? "#C4C4C4",
    tasks: activeTasks
      .filter((t) => t.status === status)
      .sort((a, b) => {
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return 0;
      }),
  })).filter((g) => g.tasks.length > 0);

  const allVisibleIds = activeTasks.map((t) => t.id);
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.has(id));
  const someSelected = allVisibleIds.some((id) => selectedIds.has(id));

  function toggleAll() {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(allVisibleIds));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectionChange(next);
  }

  function toggleGroup(status: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status); else next.add(status);
      return next;
    });
  }

  function renderRow(t: TaskWithRelations) {
    const overdue = !DONE_STATUSES.includes(t.status) && t.due_date && t.due_date < today;
    const { text: dateText, class: dateClass } = relativeDate(t.due_date);
    const cc = commentCounts[t.id] ?? 0;
    return (
      <tr
        key={t.id}
        onClick={() => onRowClick(t)}
        className={cn("group cursor-pointer border-b border-border transition-colors duration-150 hover:bg-surface", selectedIds.has(t.id) && "bg-surface")}
      >
        {/* Checkbox */}
        <td className="w-8 px-2 pe-0 align-middle">
          <input
            type="checkbox"
            checked={selectedIds.has(t.id)}
            onChange={(e) => { e.stopPropagation(); toggleOne(t.id); }}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
            aria-label={`בחר ${t.title}`}
          />
        </td>
        {/* Open arrow */}
        <td className="w-8 px-2 pe-0 align-middle">
          <Hint label="פתח משימה" side="bottom">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRowClick(t); }}
              className="flex items-center justify-center rounded-lg p-1 text-ink-muted opacity-40 transition-[color,background-color,opacity] duration-150 group-hover:opacity-100 group-hover:text-primary hover:bg-surface-soft focus-visible:outline-none"
              aria-label="פתח משימה"
            >
              <ArrowUpLeft className="h-4 w-4" />
            </button>
          </Hint>
        </td>
        {/* Task title + comment badge + tags */}
        <td className="max-w-xs px-4 py-2.5 align-middle">
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink">{t.title}</span>
            {cc > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-ink">
                <MessageCircle className="h-3 w-3" />{cc}
              </span>
            )}
          </div>
          {t.tags && t.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {t.tags.map((tag) => (
                <span key={tag.id} className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: tag.color ?? "#DCE4FF", color: "#050038" }}>
                  {tag.name}
                </span>
              ))}
            </div>
          )}
          {t.description && (
            <div className="mt-0.5 max-w-xs truncate text-sm text-ink-secondary">{t.description}</div>
          )}
          <div className="mt-0.5 text-sm text-ink-muted md:hidden">{t.client?.name ?? ""}</div>
        </td>
        {/* Client */}
        <td className="hidden px-4 py-2.5 align-middle text-ink-secondary md:table-cell">
          {t.client?.name ?? ""}
        </td>
        {/* Assignee */}
        <td className="hidden px-4 py-2.5 align-middle lg:table-cell">
          {t.assignees.length === 0 ? null : t.assignees.length === 1 ? (
            <UserChip member={t.assignees[0]} size="xs" />
          ) : (
            <AvatarStack
              people={t.assignees.map((a) => ({ full_name: a.full_name, avatar_url: undefined }))}
              size="xs"
            />
          )}
        </td>
        {/* Deadline */}
        <td className="px-4 py-2.5 align-middle">
          <span className={`inline-flex items-center gap-1 text-body-sm ${dateClass}`}>
            {overdue && <AlertTriangle className="h-3.5 w-3.5" />}
            {dateText}
          </span>
        </td>
        {/* Status dropdown */}
        <td className="px-4 py-2.5 align-middle">
          <StatusDropdown taskId={t.id} status={t.status} onUpdated={() => router.refresh()} />
        </td>
      </tr>
    );
  }

  const COL_COUNT = 7;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
        <table className="w-full text-right text-body-sm">
          <thead>
            <tr className="bg-surface text-caption text-ink-secondary">
              <th className="w-8 px-2 pe-0">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={toggleAll}
                  className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                  aria-label="בחר הכל"
                />
              </th>
              <th className="w-8 px-2 pe-0" />
              <th className="px-4 py-2.5 text-right font-medium">משימה</th>
              <th className="hidden px-4 py-2.5 text-right font-medium md:table-cell">לקוח</th>
              <th className="hidden px-4 py-2.5 text-right font-medium lg:table-cell">אחראי</th>
              <th className="px-4 py-2.5 text-right font-medium">דדליין</th>
              <th className="px-4 py-2.5 text-right font-medium">סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const isCollapsed = collapsedGroups.has(group.status);
              return (
                <React.Fragment key={group.status}>
                  <tr>
                    <td colSpan={COL_COUNT}>
                      {(() => {
                        const light = STATUS_LIGHT[group.status] ?? { bg: "#F7F7F8", text: "#050038", dot: "#C4C4C4" };
                        return (
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.status)}
                            className="flex w-full items-center gap-2 rounded-none px-4 py-2 text-right transition-colors hover:opacity-90"
                            style={{ backgroundColor: light.bg }}
                          >
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: light.dot }} />
                            {isCollapsed
                              ? <ChevronDown className="h-4 w-4 -rotate-90" style={{ color: light.text }} />
                              : <ChevronDown className="h-4 w-4" style={{ color: light.text }} />}
                            <span className="text-sm font-semibold" style={{ color: light.text }}>
                              {group.label} ({group.tasks.length})
                            </span>
                          </button>
                        );
                      })()}
                    </td>
                  </tr>
                  {!isCollapsed && group.tasks.map(renderRow)}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {groups.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-ink-muted">אין משימות פעילות</div>
        )}
      </div>

      {staleTasks.length > 0 && (
        <button
          type="button"
          onClick={() => setHideStale((v) => !v)}
          className="flex items-center gap-2 self-start rounded-full px-4 py-1.5 text-caption text-ink-secondary transition-colors hover:bg-white hover:text-ink"
        >
          {hideStale ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {hideStale ? `הצג ${staleTasks.length} משימות ישנות (מיובאות, 6+ חודשים)` : "הסתר משימות ישנות"}
        </button>
      )}

      {completedTasks.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
          <button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            className="flex w-full items-center gap-2 px-4 py-3 text-right text-sm font-medium text-ink-secondary transition-colors hover:bg-surface"
          >
            {showCompleted
              ? <ChevronUp className="h-4 w-4" />
              : <ChevronDown className="h-4 w-4" />}
            משימות שהושלמו ({completedTasks.length})
          </button>
          {showCompleted && (
            <table className="w-full text-right text-body-sm">
              <thead>
                <tr className="bg-surface text-caption text-ink-secondary">
                  <th className="w-8 px-2 pe-0" />
                  <th className="w-8 px-2 pe-0" />
                  <th className="px-4 py-2.5 text-right font-medium">משימה</th>
                  <th className="hidden px-4 py-2.5 text-right font-medium md:table-cell">לקוח</th>
                  <th className="hidden px-4 py-2.5 text-right font-medium lg:table-cell">אחראי</th>
                  <th className="px-4 py-2.5 text-right font-medium">דדליין</th>
                  <th className="px-4 py-2.5 text-right font-medium">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {completedTasks.map(renderRow)}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
