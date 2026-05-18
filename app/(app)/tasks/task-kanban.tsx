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
import type { TaskWithRelations } from "@/lib/data";

const COLUMNS: { key: "בעבודה" | "בוצע" | "סגור"; label: string }[] = [
  { key: "בעבודה", label: "בעבודה" },
  { key: "בוצע", label: "בוצע" },
  { key: "סגור", label: "סגור" },
];

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("he-IL") : "—";

export function TaskKanban({
  tasks,
  onCardClick,
}: {
  tasks: TaskWithRelations[];
  onCardClick: (t: TaskWithRelations) => void;
}) {
  const router = useRouter();
  // Optimistic local copy so cards move instantly.
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
    const newStatus = e.over?.id as "בעבודה" | "בוצע" | "סגור" | undefined;
    if (!newStatus) return;
    const current = local.find((t) => t.id === taskId);
    if (!current || current.status === newStatus) return;

    setLocal((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    );
    const res = await updateTaskStatus(taskId, newStatus);
    if ("error" in res) {
      // Roll back on failure.
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
          ? "min-h-[200px] rounded-[18px] border-2 border-dashed border-[color:var(--color-brand)] bg-[color:var(--color-brand)]/5 p-3"
          : "min-h-[200px] rounded-[18px] border border-[color:var(--color-hairline)] bg-white p-3"
      }
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-sm font-medium">{label}</h3>
        <span className="text-xs text-[color:var(--color-ink-muted)]">
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
  const overdue = task.status === "בעבודה" && task.due_date && task.due_date < today;

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
        // Don't treat a drag as a click.
        if (isDragging) return;
        e.preventDefault();
        onClick();
      }}
      className="cursor-grab rounded-md border border-[color:var(--color-hairline)] bg-white p-3 text-right transition hover:border-[color:var(--color-brand)]/40 active:cursor-grabbing"
    >
      <div className="text-sm font-medium leading-tight">{task.title}</div>
      <div className="mt-1 text-xs text-[color:var(--color-ink-muted)]">
        {task.client?.name ?? "—"}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span
          className={
            overdue
              ? "text-[color:var(--color-health-critical)]"
              : "text-[color:var(--color-ink-muted)]"
          }
        >
          {fmtDate(task.due_date)}
        </span>
        <span className="truncate text-[color:var(--color-ink-muted)]">
          {task.assignees.map((a) => a.full_name).join(", ")}
        </span>
      </div>
    </div>
  );
}
