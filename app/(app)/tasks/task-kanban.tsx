"use client";

import * as React from "react";
import { AlertTriangle, Clock } from "lucide-react";
import type { TaskWithRelations } from "@/lib/data";

const COLUMNS = [
  { key: "מחכה לטיפול", label: "ממתין", dot: "bg-dot-waiting" },
  { key: "נכנס לעבודה", label: "נכנס לעבודה", dot: "bg-dot-incoming" },
  { key: "בעבודה", label: "בעבודה", dot: "bg-dot-working" },
  { key: "אישור לקוח", label: "אישור לקוח", dot: "bg-dot-approval" },
  { key: "אישור מנהל", label: "אישור מנהל", dot: "bg-dot-manager" },
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
          <div key={col.key} className="min-h-[50vh] rounded-lg bg-gray-50 p-3">
            <div className="sticky top-0 z-10 mb-3 flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2.5">
              <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
              <h3 className="text-body-sm font-semibold text-ink">{col.label}</h3>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-caption text-ink-secondary">{colTasks.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {colTasks.map((t) => (
                <KanbanCard key={t.id} task={t} onClick={() => onCardClick(t)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({ task, onClick }: {
  task: TaskWithRelations; onClick: () => void;
}) {
  const { text: dateText, overdue } = relativeDate(task.due_date);

  return (
    <button type="button" onClick={onClick}
      className={`w-full rounded-lg border bg-white p-3 text-right transition-colors duration-150 hover:bg-gray-50 ${overdue ? "border-red-200" : "border-border"}`}>
      <div className="text-body-sm font-medium text-ink">{task.title}</div>
      <div className="mt-1 text-body-sm text-ink-secondary">{task.client?.name ?? "\u2014"}</div>
      <div className="mt-2 flex items-center justify-between">
        <span className={`text-caption ${overdue ? "font-medium text-overdue" : "text-ink-muted"}`}>
          {overdue && <AlertTriangle className="mb-px me-1 inline h-3 w-3" />}
          {dateText}
        </span>
        <div className="flex items-center -space-x-1">
          {task.assignees.slice(0, 2).map((a) => (
            <span key={a.id} className="flex h-5 w-5 items-center justify-center rounded-full border border-white bg-gray-100 text-[9px] font-medium text-ink" title={a.full_name}>
              {getInitials(a.full_name)}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
