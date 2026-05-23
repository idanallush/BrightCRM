"use client";

import * as React from "react";
import { AlertTriangle, Clock } from "lucide-react";
import type { TaskWithRelations } from "@/lib/data";

const COLUMNS = [
  { key: "מחכה לטיפול", label: "ממתין", dot: "bg-st-waiting", border: "border-t-amber-500" },
  { key: "נכנס לעבודה", label: "נכנס לעבודה", dot: "bg-blue-500", border: "border-t-blue-500" },
  { key: "בעבודה", label: "בעבודה", dot: "bg-purple-500", border: "border-t-purple-500" },
  { key: "אישור לקוח", label: "אישור לקוח", dot: "bg-st-approval", border: "border-t-orange-500" },
  { key: "אישור מנהל", label: "אישור מנהל", dot: "bg-b-pink", border: "border-t-pink-500" },
];

function relativeDate(iso: string | null): { text: string; overdue: boolean } {
  if (!iso) return { text: "ללא דדליין", overdue: false };
  const diffDays = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diffDays < 0) return { text: `באיחור ${Math.abs(diffDays)} ימים`, overdue: true };
  if (diffDays === 0) return { text: "היום", overdue: false };
  if (diffDays === 1) return { text: "מחר", overdue: false };
  return { text: `עוד ${diffDays} ימים`, overdue: false };
}

function getInitials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export function TaskKanban({
  tasks,
  onCardClick,
}: {
  tasks: TaskWithRelations[];
  onCardClick: (t: TaskWithRelations) => void;
}) {
  function byStatus(key: string) {
    return tasks.filter((t) => t.status === key);
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {COLUMNS.map((col) => {
        const colTasks = byStatus(col.key);
        return (
          <div key={col.key} className="min-h-[50vh] rounded-lg bg-surface-soft p-3">
            {/* Column header */}
            <div className="sticky top-0 z-10 mb-3 rounded-lg bg-white p-3 shadow-subtle">
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${col.dot}`} />
                <h3 className="text-sm font-semibold text-ink">{col.label}</h3>
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-slate">
                  {colTasks.length}
                </span>
              </div>
            </div>
            {/* Cards */}
            <div className="flex flex-col gap-3">
              {colTasks.map((t) => (
                <KanbanCard key={t.id} task={t} topBorder={col.border} onClick={() => onCardClick(t)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({ task, topBorder, onClick }: {
  task: TaskWithRelations; topBorder: string; onClick: () => void;
}) {
  const { text: dateText, overdue } = relativeDate(task.due_date);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg border bg-white p-4 text-right shadow-subtle transition-all duration-200 hover:shadow-card border-t-[3px] ${topBorder} ${overdue ? "border-overdue/30 bg-overdue-bg/30" : "border-hairline"}`}
    >
      <div className="text-sm font-medium leading-tight text-ink">{task.title}</div>
      <div className="mt-1.5 text-sm text-slate">{task.client?.name ?? "\u2014"}</div>
      <div className="mt-3 flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 text-caption ${overdue ? "font-medium text-overdue" : "text-stone"}`}>
          {overdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
          {dateText}
        </span>
        <div className="flex items-center -space-x-1.5">
          {task.assignees.slice(0, 3).map((a) => (
            <span
              key={a.id}
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-tint-sky text-[9px] font-semibold text-link"
              title={a.full_name}
            >
              {getInitials(a.full_name)}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
