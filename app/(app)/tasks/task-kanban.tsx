"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "@/components/ui/toaster";
import { updateTaskStatus } from "./actions";
import type { Task, TaskWithRelations } from "@/lib/data";

const COLUMNS: { key: string; label: string }[] = [
  { key: "מחכה לטיפול", label: "ממתין" },
  { key: "נכנס לעבודה", label: "נכנס לעבודה" },
  { key: "בעבודה", label: "בעבודה" },
  { key: "אישור לקוח", label: "אישור" },
  { key: "בוצע", label: "בוצע" },
];

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("he-IL") : "\u2014";

export function TaskKanban({
  tasks,
  onCardClick,
}: {
  tasks: TaskWithRelations[];
  onCardClick: (t: TaskWithRelations) => void;
}) {
  const router = useRouter();
  const [local, setLocal] = React.useState(tasks);
  React.useEffect(() => setLocal(tasks), [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function byStatus(key: string) {
    return local.filter((t) => t.status === key);
  }

  async function onDragEnd(e: DragEndEvent) {
    const taskId = String(e.active.id);
    const newStatus = e.over?.id as Task["status"] | undefined;
    if (!newStatus) return;
    const current = local.find((t) => t.id === taskId);
    if (!current || current.status === newStatus) return;

    setLocal((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    );
    const res = await updateTaskStatus(taskId, newStatus);
    if ("error" in res) {
      setLocal((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: current.status } : t)),
      );
      toast.error("שינוי הסטטוס נכשל");
      return;
    }
    router.refresh();
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.key}
            id={col.key}
            label={col.label}
            tasks={byStatus(col.key)}
            onCardClick={onCardClick}
          />
        ))}
      </div>
    </DndContext>
  );
}

function KanbanColumn({
  id,
  label,
  tasks,
  onCardClick,
}: {
  id: string;
  label: string;
  tasks: TaskWithRelations[];
  onCardClick: (t: TaskWithRelations) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={
        isOver
          ? "min-h-[200px] rounded-lg border-2 border-dashed border-ink/30 bg-surface-card/50 p-3"
          : "min-h-[200px] rounded-lg bg-surface-card/50 p-3"
      }
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-ink">{label}</h3>
        <span className="rounded-pill bg-surface-strong px-2 py-0.5 text-xs font-medium text-ink-muted">
          {tasks.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {tasks.map((t) => (
          <KanbanCard key={t.id} task={t} onClick={() => onCardClick(t)} />
        ))}
      </div>
    </div>
  );
}

function KanbanCard({
  task,
  onClick,
}: {
  task: TaskWithRelations;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });
  const today = new Date().toISOString().slice(0, 10);
  const activeStatuses = ["מחכה לטיפול", "נכנס לעבודה", "בעבודה"];
  const overdue = activeStatuses.includes(task.status) && task.due_date && task.due_date < today;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
      }}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (isDragging) return;
        e.preventDefault();
        onClick();
      }}
      className={`cursor-grab rounded-lg border bg-canvas p-3 text-right shadow-subtle transition-all duration-150 hover:shadow-card active:cursor-grabbing ${overdue ? "border-l-2 border-l-status-overdue border-t-hairline border-r-hairline border-b-hairline" : "border-hairline"}`}
    >
      <div className="text-sm font-medium leading-tight text-ink">{task.title}</div>
      <div className="mt-1 text-xs text-ink-muted">{task.client?.name ?? "\u2014"}</div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className={overdue ? "font-medium text-status-overdue" : "text-ink-muted"}>
          {fmtDate(task.due_date)}
        </span>
        <div className="flex items-center gap-1">
          {task.assignees.slice(0, 2).map((a) => (
            <span
              key={a.id}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-card text-[10px] font-semibold text-ink"
              title={a.full_name}
            >
              {a.full_name
                .split(/\s+/)
                .map((w) => w[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
