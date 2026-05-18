"use client";

import * as React from "react";
import { Plus, LayoutGrid, Rows3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { TaskTable } from "./task-table";
import { TaskKanban } from "./task-kanban";
import { TaskForm } from "./task-form";
import { deleteTask } from "./actions";
import type { Client, TaskWithRelations, TeamMember } from "@/lib/data";

const STATUS_OPTIONS = ["__all__", "בעבודה", "בוצע", "סגור"] as const;
const VIEW_KEY = "brightcrm:tasks-view";

export function TasksClient({
  tasks,
  clients,
  team,
  initialFilters,
}: {
  tasks: TaskWithRelations[];
  clients: Client[];
  team: TeamMember[];
  initialFilters: { status: string; clientId: string; assigneeId: string };
}) {
  const router = useRouter();
  const [view, setView] = React.useState<"table" | "kanban">("table");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TaskWithRelations | null>(null);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const [filters, setFilters] = React.useState(initialFilters);

  // Hydrate view preference from localStorage on mount.
  React.useEffect(() => {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === "table" || saved === "kanban") setView(saved);
  }, []);

  function changeView(next: "table" | "kanban") {
    setView(next);
    localStorage.setItem(VIEW_KEY, next);
  }

  function updateFilter(key: keyof typeof filters, value: string) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    const params = new URLSearchParams();
    if (next.status && next.status !== "__all__") params.set("status", next.status);
    if (next.clientId && next.clientId !== "__all__") params.set("client", next.clientId);
    if (next.assigneeId && next.assigneeId !== "__all__")
      params.set("assignee", next.assigneeId);
    const qs = params.toString();
    router.push(qs ? `/tasks?${qs}` : "/tasks");
  }

  async function onDelete() {
    if (!editing) return;
    const res = await deleteTask(editing.id);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    toast.success("המשימה נמחקה");
    setConfirmingDelete(false);
    setEditing(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">משימות</h1>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-[color:var(--color-hairline)] bg-white p-0.5">
            <button
              type="button"
              onClick={() => changeView("table")}
              className={cn(
                "flex items-center gap-1.5 rounded px-3 py-1.5 text-sm",
                view === "table"
                  ? "bg-[color:var(--color-brand)]/10 text-[color:var(--color-brand)]"
                  : "text-[color:var(--color-ink-muted)]",
              )}
            >
              <Rows3 className="h-4 w-4" /> טבלה
            </button>
            <button
              type="button"
              onClick={() => changeView("kanban")}
              className={cn(
                "flex items-center gap-1.5 rounded px-3 py-1.5 text-sm",
                view === "kanban"
                  ? "bg-[color:var(--color-brand)]/10 text-[color:var(--color-brand)]"
                  : "text-[color:var(--color-ink-muted)]",
              )}
            >
              <LayoutGrid className="h-4 w-4" /> קנבן
            </button>
          </div>

          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> משימה חדשה
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
            <SelectTrigger>
              <SelectValue placeholder="סטטוס" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "__all__" ? "כל הסטטוסים" : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select
            value={filters.clientId}
            onValueChange={(v) => updateFilter("clientId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="לקוח" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">כל הלקוחות</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select
            value={filters.assigneeId}
            onValueChange={(v) => updateFilter("assigneeId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="אחראי" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">כל האחראים</SelectItem>
              {team.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {view === "table" ? (
        <TaskTable tasks={tasks} onRowClick={setEditing} />
      ) : (
        <TaskKanban tasks={tasks} onCardClick={setEditing} />
      )}

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>משימה חדשה</DialogTitle>
            <DialogDescription>
              פתיחה מהירה. נשמרת כ-source=web — בהמשך תזהה משימות מטלגרם בנפרד.
            </DialogDescription>
          </DialogHeader>
          <TaskForm
            clients={clients}
            team={team}
            onDone={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Sheet
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setConfirmingDelete(false);
          }
        }}
      >
        <SheetContent side="left" className="flex flex-col">
          {editing && (
            <>
              <SheetHeader>
                <SheetTitle>עריכת משימה</SheetTitle>
                <SheetDescription>
                  שינויים נשמרים מיד אחרי לחיצה על "שמירה".
                </SheetDescription>
              </SheetHeader>
              <TaskForm
                key={editing.id}
                task={editing}
                clients={clients}
                team={team}
                onDone={() => setEditing(null)}
              />
              <div className="border-t border-[color:var(--color-hairline)] pt-3">
                {confirmingDelete ? (
                  <div className="flex flex-col gap-2 rounded-md bg-red-50 p-3 text-right">
                    <p className="text-sm text-red-700">
                      למחוק את המשימה לצמיתות?
                    </p>
                    <div className="flex flex-row-reverse gap-2">
                      <Button variant="danger" size="sm" onClick={onDelete}>
                        מחק
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmingDelete(false)}
                      >
                        ביטול
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmingDelete(true)}
                    className="text-red-600"
                  >
                    מחיקה
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
