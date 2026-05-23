"use client";

import * as React from "react";
import { AlertTriangle, Clock } from "lucide-react";
import type { TaskWithRelations } from "@/lib/data";

const COLUMNS = [
  { key: "מחכה לטיפול", label: "ממתין", dot: "bg-amber-500", border: "border-t-amber-500" },
  { key: "נכנס לעבודה", label: "נכנס לעבודה", dot: "bg-blue-500", border: "border-t-blue-500" },
  { key: "בעבודה", label: "בעבודה", dot: "bg-purple-500", border: "border-t-purple-500" },
  { key: "אישור לקוח", label: "אישור לקוח", dot: "bg-orange-500", border: "border-t-orange-500" },
  { key: "אישור מנהל", label: "אישור מנהל", dot: "bg-pink-500", border: "border-t-pink-500" },
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
          <div key={col.key} className="min-h-[50vh] rounded-xl bg-gray-50 p-3">
            {/* Column header */}
            <div className="sticky top-0 z-10 mb-3 rounded-lg bg-white p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${col.dot}`} />
                <h3 className="text-sm font-semibold text-gray-900">{col.label}</h3>
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600">
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
      className={`w-full rounded-lg border bg-white p-4 text-right shadow-sm transition-all duration-200 hover:shadow-md border-t-[3px] ${topBorder} ${overdue ? "border-red-200 bg-red-50/30" : "border-gray-200"}`}
    >
      <div className="text-sm font-medium leading-tight text-gray-900">{task.title}</div>
      <div className="mt-1.5 text-sm text-gray-500">{task.client?.name ?? "\u2014"}</div>
      <div className="mt-3 flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 text-caption ${overdue ? "font-medium text-red-600" : "text-gray-400"}`}>
          {overdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
          {dateText}
        </span>
        <div className="flex items-center -space-x-1.5">
          {task.assignees.slice(0, 3).map((a) => (
            <span
              key={a.id}
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-blue-100 text-[9px] font-semibold text-blue-700"
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
