"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { STATUS_LIGHT } from "@/components/ui/badge";
import type { TaskWithRelations } from "@/lib/data";
import { AvatarStack } from "@/components/user-avatar";

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
        const light = STATUS_LIGHT[col.key] ?? { bg: "#F7F7F8", text: "#050038", dot: "#C4C4C4" };
        return (
          <div key={col.key} className="min-h-[50vh] rounded-2xl bg-white border border-border shadow-elevation-1">
            {/* Light header with colored dot */}
            <div
              className="flex items-center gap-2 rounded-t-2xl border-b border-border px-3 py-2.5"
              style={{ backgroundColor: light.bg }}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: light.dot }} />
              <h3 className="text-sm font-semibold" style={{ color: light.text }}>{col.label}</h3>
              <span className="rounded-full px-2 py-0.5 text-caption font-medium" style={{ backgroundColor: light.dot + "20", color: light.text }}>{colTasks.length}</span>
            </div>
            <div className="flex flex-col gap-2 p-2">
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
      className="w-full rounded-xl border border-border bg-white p-3 text-right transition-shadow duration-150 hover:shadow-elevation-2">
      <div className="text-body-sm font-medium text-ink">{task.title}</div>
      {task.tags && task.tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <span key={tag.id} className="inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: tag.color ?? "#DCE4FF", color: "#050038" }}>
              {tag.name}
            </span>
          ))}
        </div>
      )}
      <div className="mt-1 text-body-sm text-ink-secondary">{task.client?.name ?? "\u05db\u05dc\u05dc\u05d9"}</div>
      <div className="mt-2 flex items-center justify-between">
        <span className={`text-caption ${overdue ? "font-medium text-overdue" : "text-ink-muted"}`}>
          {overdue && <AlertTriangle className="mb-px me-1 inline h-3 w-3" />}
          {dateText}
        </span>
        <AvatarStack people={task.assignees} size="xs" max={3} />
      </div>
    </button>
  );
}
