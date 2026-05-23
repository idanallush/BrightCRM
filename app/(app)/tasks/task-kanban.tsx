"use client";

import * as React from "react";
import { Badge, statusVariant } from "@/components/ui/badge";
import type { TaskWithRelations } from "@/lib/data";

const COLUMNS = [
  { key: "מחכה לטיפול", label: "ממתין", dot: "bg-st-waiting" },
  { key: "נכנס לעבודה", label: "נכנס לעבודה", dot: "bg-st-incoming" },
  { key: "בעבודה", label: "בעבודה", dot: "bg-st-working" },
  { key: "אישור לקוח", label: "אישור לקוח", dot: "bg-st-approval" },
  { key: "אישור מנהל", label: "אישור מנהל", dot: "bg-st-manager" },
];

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("he-IL") : "\u2014";

const STATUS_TOP_BORDER: Record<string, string> = {
  "מחכה לטיפול": "border-t-st-waiting",
  "נכנס לעבודה": "border-t-st-incoming",
  "בעבודה": "border-t-st-working",
  "אישור לקוח": "border-t-st-approval",
  "אישור מנהל": "border-t-st-manager",
};

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
          <div key={col.key} className="min-h-[160px] rounded-xl bg-gray-50 p-2.5">
            <div className="mb-3 flex items-center gap-2 px-1">
              <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
              <h3 className="text-caption font-semibold text-ink">{col.label}</h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-ink-secondary shadow-sm">
                {colTasks.length}
              </span>
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

function KanbanCard({ task, onClick }: { task: TaskWithRelations; onClick: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const overdue = ["מחכה לטיפול", "נכנס לעבודה", "בעבודה"].includes(task.status) && task.due_date && task.due_date < today;
  const topBorder = STATUS_TOP_BORDER[task.status] ?? "border-t-border";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg border border-border bg-white p-3 text-right shadow-sm transition-all duration-200 hover:shadow-card border-t-[3px] ${topBorder} ${overdue ? "ring-1 ring-overdue/20" : ""}`}
    >
      <div className="text-sm font-medium leading-tight text-ink">{task.title}</div>
      <div className="mt-1 text-caption text-ink-secondary">{task.client?.name ?? "\u2014"}</div>
      <div className="mt-2 flex items-center justify-between text-caption">
        <span className={overdue ? "font-medium text-overdue" : "text-ink-muted"}>
          {fmtDate(task.due_date)}
        </span>
        <div className="flex items-center gap-1">
          {task.assignees.slice(0, 2).map((a) => (
            <span
              key={a.id}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-light text-[10px] font-semibold text-brand"
              title={a.full_name}
            >
              {a.full_name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
