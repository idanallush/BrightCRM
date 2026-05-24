"use client";

import * as React from "react";
import { ChevronLeft, ChevronDown, Send, Globe, AlertTriangle, Download, MessageCircle } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import type { TaskWithRelations } from "@/lib/data";

function getInitials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function relativeDate(iso: string | null): { text: string; class: string } {
  if (!iso) return { text: "ללא דדליין", class: "text-stone italic" };
  const diffDays = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diffDays < 0) return { text: `באיחור ${Math.abs(diffDays)} ימים`, class: "text-overdue font-medium" };
  if (diffDays === 0) return { text: "היום", class: "text-dot-waiting font-medium" };
  if (diffDays === 1) return { text: "מחר", class: "text-ink" };
  return { text: `עוד ${diffDays} ימים`, class: "text-slate" };
}

const DONE_STATUSES = ["בוצע", "בוטל", "סגור"];

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

  // Split active vs completed
  const activeTasks = tasks.filter((t) => !DONE_STATUSES.includes(t.status));
  const completedTasks = tasks.filter((t) => DONE_STATUSES.includes(t.status));

  // Sort active: nearest deadline first (nulls at end)
  const sortedActive = [...activeTasks].sort((a, b) => {
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return 0;
  });

  function renderRow(t: TaskWithRelations) {
    const overdue = !DONE_STATUSES.includes(t.status) && t.due_date && t.due_date < today;
    const { text: dateText, class: dateClass } = relativeDate(t.due_date);
    const cc = commentCounts[t.id] ?? 0;
    return (
      <tr
        key={t.id}
        onClick={() => onRowClick(t)}
        className="group cursor-pointer transition-colors duration-150 hover:bg-gray-50"
      >
        <td className="px-4 py-3 align-middle">
          <StatusBadge status={t.status} />
        </td>
        <td className="max-w-xs px-4 py-3 align-middle">
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink">{t.title}</span>
            {cc > 0 && (
              <span className="inline-flex items-center gap-1 text-caption text-ink-muted">
                <MessageCircle className="h-3.5 w-3.5" />{cc}
              </span>
            )}
          </div>
          {t.description && (
            <div className="mt-0.5 max-w-xs truncate text-sm text-slate">{t.description}</div>
          )}
          <div className="mt-0.5 text-sm text-stone md:hidden">{t.client?.name ?? ""}</div>
        </td>
        <td className="hidden px-4 py-3 align-middle text-ink-secondary md:table-cell">
          {t.client?.name ?? "\u2014"}
        </td>
        <td className="hidden px-4 py-3 align-middle lg:table-cell">
          {t.assignees.length === 0 ? (
            <span className="text-ink-muted">{"\u2014"}</span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-ink">
                {getInitials(t.assignees[0].full_name)}
              </span>
              <span className="text-body-sm text-ink">{t.assignees[0].full_name}</span>
            </div>
          )}
        </td>
        <td className="px-4 py-3 align-middle">
          <span className={`inline-flex items-center gap-1 text-body-sm ${dateClass}`}>
            {overdue && <AlertTriangle className="h-3.5 w-3.5" />}
            {dateText}
          </span>
        </td>
        <td className="hidden px-4 py-3 align-middle sm:table-cell">
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
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-lg border border-border bg-white">
        <table className="w-full text-right text-body-sm">
          <thead>
            <tr className="border-b border-border text-caption text-ink-muted">
              <th className="px-4 py-3 text-right">סטטוס</th>
              <th className="px-4 py-3 text-right">משימה</th>
              <th className="hidden px-4 py-3 text-right md:table-cell">לקוח</th>
              <th className="hidden px-4 py-3 text-right lg:table-cell">אחראי</th>
              <th className="px-4 py-3 text-right">דדליין</th>
              <th className="hidden px-4 py-3 text-right sm:table-cell">מקור</th>
              <th className="w-8 px-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedActive.map(renderRow)}
          </tbody>
        </table>
        {sortedActive.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-ink-muted">אין משימות פעילות</div>
        )}
      </div>

      {/* Completed tasks — collapsed by default */}
      {completedTasks.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            className="flex w-full items-center gap-2 px-4 py-3 text-right text-sm font-medium text-ink-secondary hover:bg-gray-50 transition-colors"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showCompleted ? "rotate-180" : ""}`} />
            משימות שהושלמו ({completedTasks.length})
          </button>
          {showCompleted && (
            <table className="w-full text-right text-body-sm">
              <tbody className="divide-y divide-gray-100">
                {completedTasks.map(renderRow)}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
