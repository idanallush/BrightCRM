"use client";

import * as React from "react";
import { ChevronLeft, ChevronDown, ChevronUp, Send, Globe, AlertTriangle, Download, MessageCircle, EyeOff, Eye } from "lucide-react";
import { StatusCell, STATUS_COLORS } from "@/components/ui/badge";
import type { TaskWithRelations } from "@/lib/data";

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

function getInitials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
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
}: {
  tasks: TaskWithRelations[];
  commentCounts: Record<string, number>;
  onRowClick: (t: TaskWithRelations) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [showCompleted, setShowCompleted] = React.useState(false);
  const [hideStale, setHideStale] = React.useState(true);
  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(new Set());

  const staleCutoff = getStaleCutoff();
  const allActive = tasks.filter((t) => !DONE_STATUSES.includes(t.status));
  const staleTasks = allActive.filter((t) => isStale(t, staleCutoff));
  const activeTasks = hideStale ? allActive.filter((t) => !isStale(t, staleCutoff)) : allActive;
  const completedTasks = tasks.filter((t) => DONE_STATUSES.includes(t.status));

  // Group active tasks by status
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
        className="group cursor-pointer border-b border-border transition-colors duration-150 hover:bg-[#F5F6F8]"
      >
        <td className="px-4 py-2.5 align-middle">
          <StatusCell status={t.status} />
        </td>
        <td className="max-w-xs px-4 py-2.5 align-middle">
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink">{t.title}</span>
            {cc > 0 && (
              <span className="inline-flex items-center gap-1 text-caption text-ink-muted">
                <MessageCircle className="h-3.5 w-3.5" />{cc}
              </span>
            )}
          </div>
          {t.description && (
            <div className="mt-0.5 max-w-xs truncate text-sm text-ink-secondary">{t.description}</div>
          )}
          <div className="mt-0.5 text-sm text-ink-muted md:hidden">{t.client?.name ?? ""}</div>
        </td>
        <td className="hidden px-4 py-2.5 align-middle text-ink-secondary md:table-cell">
          {t.client?.name ?? "\u2014"}
        </td>
        <td className="hidden px-4 py-2.5 align-middle lg:table-cell">
          {t.assignees.length === 0 ? (
            <span className="text-ink-muted">{"\u2014"}</span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#CCEAFF] text-[10px] font-semibold text-primary">
                {getInitials(t.assignees[0].full_name)}
              </span>
              <span className="text-body-sm text-ink">{t.assignees[0].full_name}</span>
            </div>
          )}
        </td>
        <td className="px-4 py-2.5 align-middle">
          <span className={`inline-flex items-center gap-1 text-body-sm ${dateClass}`}>
            {overdue && <AlertTriangle className="h-3.5 w-3.5" />}
            {dateText}
          </span>
        </td>
        <td className="hidden px-4 py-2.5 align-middle sm:table-cell">
          {t.source === "telegram" ? (
            <Send className="h-3.5 w-3.5 text-ink-muted" />
          ) : t.source === "web" ? (
            <Globe className="h-3.5 w-3.5 text-ink-muted" />
          ) : (
            <Download className="h-3.5 w-3.5 text-ink-muted" />
          )}
        </td>
        <td className="w-8 px-2 text-end text-ink-muted opacity-0 transition-opacity group-hover:opacity-100">
          <ChevronLeft className="ms-auto h-4 w-4" />
        </td>
      </tr>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        <table className="w-full text-right text-body-sm">
          <thead>
            <tr className="bg-surface text-caption text-ink-secondary">
              <th className="px-4 py-3 text-right font-medium">סטטוס</th>
              <th className="px-4 py-3 text-right font-medium">משימה</th>
              <th className="hidden px-4 py-3 text-right font-medium md:table-cell">לקוח</th>
              <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">אחראי</th>
              <th className="px-4 py-3 text-right font-medium">דדליין</th>
              <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">מקור</th>
              <th className="w-8 px-2" />
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const isCollapsed = collapsedGroups.has(group.status);
              return (
                <React.Fragment key={group.status}>
                  {/* Group header — colored bar */}
                  <tr>
                    <td colSpan={7}>
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.status)}
                        className="flex w-full items-center gap-2 px-4 py-2 text-right transition-colors hover:opacity-90"
                        style={{ backgroundColor: group.color }}
                      >
                        {isCollapsed
                          ? <ChevronLeft className="h-4 w-4 text-white" />
                          : <ChevronDown className="h-4 w-4 text-white" />}
                        <span className="text-sm font-semibold text-white">
                          {group.label} ({group.tasks.length})
                        </span>
                      </button>
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

      {/* Stale tasks toggle */}
      {staleTasks.length > 0 && (
        <button
          type="button"
          onClick={() => setHideStale((v) => !v)}
          className="flex items-center gap-2 self-start rounded-md px-3 py-1.5 text-caption text-ink-secondary transition-colors hover:bg-white hover:text-ink"
        >
          {hideStale ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {hideStale ? `הצג ${staleTasks.length} משימות ישנות (מיובאות, 6+ חודשים)` : "הסתר משימות ישנות"}
        </button>
      )}

      {/* Completed tasks — collapsed by default */}
      {completedTasks.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
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
