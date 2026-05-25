"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { STATUS_COLORS } from "@/components/ui/badge";
import type { TaskWithRelations } from "@/lib/data";

const COLUMNS = [
  { key: "מחכה לטיפול", label: "ממתין" },
  { key: "נכנס לעבודה", label: "נכנס לעבודה" },
  { key: "בעבודה", label: "בעבודה" },
  { key: "אישור לקוח", label: "אישור לקוח" },
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
        const color = STATUS_COLORS[col.key] ?? "#C4C4C4";
        return (
          <div key={col.key} className="min-h-[50vh] rounded-lg bg-white border border-border shadow-sm">
            {/* Colored header */}
            <div
              className="flex items-center gap-2 rounded-t-lg px-3 py-2.5"
              style={{ backgroundColor: color }}
            >
              <h3 className="text-sm font-semibold text-white">{col.label}</h3>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-caption font-medium text-white">{colTasks.length}</span>
            </div>
            <div className="flex flex-col gap-2 p-2">
              {colTasks.map((t) => (
                <KanbanCard key={t.id} task={t} color={color} onClick={() => onCardClick(t)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({ task, color, onClick }: {
  task: TaskWithRelations; color: string; onClick: () => void;
}) {
  const { text: dateText, overdue } = relativeDate(task.due_date);

  return (
    <button type="button" onClick={onClick}
      className="w-full rounded-md border border-border bg-white p-3 text-right transition-all duration-150 hover:shadow-sm"
      style={{ borderRightWidth: 3, borderRightColor: color }}>
      <div className="text-body-sm font-medium text-ink">{task.title}</div>
      <div className="mt-1 text-body-sm text-ink-secondary">{task.client?.name ?? "\u2014"}</div>
      <div className="mt-2 flex items-center justify-between">
        <span className={`text-caption ${overdue ? "font-medium text-overdue" : "text-ink-muted"}`}>
          {overdue && <AlertTriangle className="mb-px me-1 inline h-3 w-3" />}
          {dateText}
        </span>
        <div className="flex items-center -space-x-1">
          {task.assignees.slice(0, 2).map((a) => (
            <span key={a.id} className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#CCEAFF] text-[9px] font-medium text-primary" title={a.full_name}>
              {getInitials(a.full_name)}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
