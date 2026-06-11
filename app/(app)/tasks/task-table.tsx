"use client";

import * as React from "react";
import { ArrowUpLeft, ChevronDown, ChevronUp, AlertTriangle, MessageCircle, EyeOff, Eye, Repeat, CalendarPlus } from "lucide-react";
import { UserChip } from "@/components/user-hover-card";
import { AvatarStack } from "@/components/user-avatar";
import { Hint } from "@/components/ui/tooltip";
import { STATUS_COLORS, STATUS_LIGHT } from "@/components/ui/badge";
import { cn, relativeDate } from "@/lib/utils";
import type { TaskViewRecord } from "./actions";
import { useRouter } from "next/navigation";
import type { TaskWithRelations } from "@/lib/data";
import { StatusDropdown } from "./status-dropdown";
import { renderTextWithLinks } from "./comment-helpers";

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

const DONE_STATUSES = ["בוצע"];

const STATUS_ORDER = [
  "מחכה לטיפול",
  "נכנס לעבודה",
  "בעבודה סטודיו",
  "בעבודה ספק חיצוני",
  "אישור לקוח",
];

const STATUS_GROUP_LABELS: Record<string, string> = {
  "מחכה לטיפול": "ממתין",
  "נכנס לעבודה": "נכנס לעבודה",
  "בעבודה סטודיו": "בעבודה סטודיו",
  "בעבודה ספק חיצוני": "בעבודה ספק חיצוני",
  "אישור לקוח": "אישור לקוח",
};

export function TaskTable({
  tasks,
  commentCounts,
  onRowClick,
  selectedIds,
  onSelectionChange,
  taskViews,
  teamSize,
  currentMemberId,
}: {
  tasks: TaskWithRelations[];
  commentCounts: Record<string, number>;
  onRowClick: (t: TaskWithRelations) => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  taskViews: Record<string, TaskViewRecord[]>;
  teamSize: number;
  currentMemberId: string | null;
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
  const completedTasks = tasks
    .filter((t) => DONE_STATUSES.includes(t.status))
    .sort((a, b) => (b.updated_at ?? b.created_at).localeCompare(a.updated_at ?? a.created_at));

  const watchedTasks = currentMemberId
    ? activeTasks
        .filter((t) => t.watchers?.some((w) => w.id === currentMemberId))
        .sort((a, b) => {
          if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
          if (a.due_date) return -1;
          if (b.due_date) return 1;
          return 0;
        })
    : [];

  const watchedIds = new Set(watchedTasks.map((t) => t.id));

  const statusGroups = STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_GROUP_LABELS[status],
    color: STATUS_COLORS[status] ?? "#C4C4C4",
    isWatched: false,
    tasks: activeTasks
      .filter((t) => !watchedIds.has(t.id) && t.status === status)
      .sort((a, b) => {
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return 0;
      }),
  })).filter((g) => g.tasks.length > 0);

  // Insert "במעקב" group right after "נכנס לעבודה"
  const watchedGroup = watchedTasks.length > 0
    ? { status: "__watched__", label: "במעקב", color: "#7C3AED", isWatched: true, tasks: watchedTasks }
    : null;

  const groups = (() => {
    if (!watchedGroup) return statusGroups;
    const idx = statusGroups.findIndex((g) => g.status === "נכנס לעבודה");
    const insertAt = idx >= 0 ? idx + 1 : 0;
    return [...statusGroups.slice(0, insertAt), watchedGroup, ...statusGroups.slice(insertAt)];
  })();

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
    const { text: dateText, className: dateClass } = relativeDate(t.due_date);
    const cc = commentCounts[t.id] ?? 0;
    const views = taskViews[t.id] ?? [];
    const seenAfterUpdate = views.filter((v) => v.last_seen_at >= (t.updated_at ?? t.created_at));
    const seenCount = seenAfterUpdate.length;
    const seenNames = seenAfterUpdate.map((v) => v.full_name).join(", ");
    const allSeen = seenCount >= teamSize;
    return (
      <tr
        key={t.id}
        onClick={() => onRowClick(t)}
        className={cn("group cursor-pointer border-b border-border transition-colors duration-150 hover:bg-[#F9FAFB]", selectedIds.has(t.id) && "bg-surface")}
      >
        {/* Checkbox */}
        <td className="w-8 px-2 pe-0 align-middle border-e border-border">
          <input
            type="checkbox"
            checked={selectedIds.has(t.id)}
            onChange={(e) => { e.stopPropagation(); toggleOne(t.id); }}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 cursor-pointer rounded border-border accent-link"
            aria-label={`בחר ${t.title}`}
          />
        </td>
        {/* Task title + comment badge + seen + tags */}
        <td className="max-w-xs px-4 py-2.5 align-middle">
          <div className="flex items-center gap-2">
            {t.recurrence_rule && (
              <Hint label="משימה חוזרת" side="top">
                <Repeat className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
              </Hint>
            )}
            <span className="font-medium text-ink">{t.title}</span>
            {cc > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-ink">
                <MessageCircle className="h-3 w-3" />{cc}
              </span>
            )}
            {seenCount > 0 && (
              <Hint label={`נצפה ע״י: ${seenNames}`} side="bottom">
                <span className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                  allSeen ? "text-st-done-text" : "text-ink-muted",
                )}>
                  <Eye className="h-3 w-3" />
                  {seenCount}
                </span>
              </Hint>
            )}
          </div>
          {t.tags && t.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {t.tags.map((tag) => (
                <span key={tag.id} className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: tag.color ?? "#DCE4FF", color: "#1A1A1A" }}>
                  {tag.name}
                </span>
              ))}
            </div>
          )}
          {t.description && (
            <div className="mt-0.5 max-w-xs truncate text-sm text-ink-secondary">{renderTextWithLinks(t.description)}</div>
          )}
          <div className="mt-0.5 text-sm text-ink-muted md:hidden">{t.client?.name ?? "כללי"}</div>
        </td>
        {/* Client */}
        <td className="hidden px-4 py-2.5 align-middle text-ink-secondary md:table-cell">
          {t.client?.name ?? "כללי"}
        </td>
        {/* Assignee */}
        <td className="hidden px-4 py-2.5 align-middle lg:table-cell">
          {t.assignees.length === 0 ? null : (
            <div className="flex items-center gap-2">
              {t.assignees.length === 1 ? (
                <UserChip member={t.assignees[0]} size="xs" withName />
              ) : (
                <div className="flex items-center gap-1.5">
                  <AvatarStack
                    people={t.assignees.map((a) => ({ full_name: a.full_name, avatar_url: a.avatar_url }))}
                    size="xs"
                  />
                  <span className="text-body-sm text-ink-secondary">{t.assignees.map(a => a.full_name.split(" ")[0]).join(", ")}</span>
                </div>
              )}
            </div>
          )}
        </td>
        {/* Opened date */}
        <td className="hidden px-4 py-2.5 align-middle text-ink-muted xl:table-cell">
          {new Date(t.created_at).toLocaleDateString("he-IL", { day: "numeric", month: "short" })}
        </td>
        {/* Deadline / Completion date */}
        <td className="px-4 py-2.5 align-middle">
          {DONE_STATUSES.includes(t.status) ? (
            <span className="inline-flex items-center gap-1 text-body-sm text-st-done-text">
              {t.completed_at
                ? `הושלם ${new Date(t.completed_at).toLocaleDateString("he-IL")}`
                : "הושלם"}
            </span>
          ) : (
            <span className={`inline-flex items-center gap-1 text-body-sm ${dateClass}`}>
              {overdue && <AlertTriangle className="h-3.5 w-3.5" />}
              {dateText}
            </span>
          )}
        </td>
        {/* Status dropdown */}
        <td className="px-4 py-2.5 align-middle">
          <StatusDropdown taskId={t.id} status={t.status} onUpdated={() => router.refresh()} />
        </td>
        {/* Open arrow */}
        <td className="w-8 px-2 ps-0 align-middle">
          <Hint label="פתח משימה" side="bottom">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRowClick(t); }}
              className="flex items-center justify-center rounded-lg p-1 text-ink-muted opacity-40 transition-[color,background-color,opacity] duration-150 group-hover:opacity-100 group-hover:text-link hover:bg-surface-soft focus-visible:outline-none"
              aria-label="פתח משימה"
            >
              <ArrowUpLeft className="h-4 w-4" />
            </button>
          </Hint>
        </td>
      </tr>
    );
  }

  const COL_COUNT = 8;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
        <table className="w-full text-right text-body-sm">
          <thead>
            <tr className="bg-surface text-caption text-ink-secondary">
              <th className="w-8 px-2 pe-0 border-e border-border">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={toggleAll}
                  className="h-4 w-4 cursor-pointer rounded border-border accent-link"
                  aria-label="בחר הכל"
                />
              </th>
              <th className="px-4 py-2.5 text-right font-medium">משימה</th>
              <th className="hidden px-4 py-2.5 text-right font-medium md:table-cell">לקוח</th>
              <th className="hidden px-4 py-2.5 text-right font-medium lg:table-cell">אחראי</th>
              <th className="hidden px-4 py-2.5 text-right font-medium xl:table-cell">נפתח</th>
              <th className="px-4 py-2.5 text-right font-medium">דדליין</th>
              <th className="px-4 py-2.5 text-right font-medium">סטטוס</th>
              <th className="w-8 px-2 ps-0" />
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
                        const light = group.isWatched
                          ? { bg: "rgba(124,58,237,0.10)", text: "#7C3AED", dot: "#7C3AED" }
                          : (STATUS_LIGHT[group.status] ?? { bg: "#F7F7F8", text: "#1A1A1A", dot: "#C4C4C4" });
                        return (
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.status)}
                            className="flex w-full items-center gap-2 rounded-none px-4 py-2 text-right transition-colors hover:opacity-90"
                            style={{ backgroundColor: light.bg }}
                          >
                            {group.isWatched
                              ? <Eye className="h-3.5 w-3.5" style={{ color: light.dot }} />
                              : <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: light.dot }} />}
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
                  <th className="w-8 px-2 pe-0 border-e border-border" />
                  <th className="px-4 py-2.5 text-right font-medium">משימה</th>
                  <th className="hidden px-4 py-2.5 text-right font-medium md:table-cell">לקוח</th>
                  <th className="hidden px-4 py-2.5 text-right font-medium lg:table-cell">אחראי</th>
                  <th className="hidden px-4 py-2.5 text-right font-medium xl:table-cell">נפתח</th>
                  <th className="px-4 py-2.5 text-right font-medium">דדליין</th>
                  <th className="px-4 py-2.5 text-right font-medium">סטטוס</th>
                  <th className="w-8 px-2 ps-0" />
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
