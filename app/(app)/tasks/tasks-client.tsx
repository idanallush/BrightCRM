"use client";

import * as React from "react";
import { Plus, LayoutGrid, Rows3, AlertTriangle, Search, Calendar, User, Briefcase, Globe, Send, Download, Clock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatusCell, STATUS_COLORS } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import { TaskTable } from "./task-table";
import { TaskKanban } from "./task-kanban";
import { TaskForm } from "./task-form";
import { TaskAttachments } from "./task-attachments";
import { TaskComments } from "./task-comments";
import { deleteTask } from "./actions";
import type { Client, TaskWithRelations, TeamMember } from "@/lib/data";

const STATUS_PILLS = [
  { key: "__all__", label: "הכל", color: "" },
  { key: "מחכה לטיפול", label: "ממתין", color: "#FDAB3D" },
  { key: "נכנס לעבודה", label: "נכנס", color: "#0073EA" },
  { key: "בעבודה", label: "בעבודה", color: "#A25DDC" },
  { key: "אישור לקוח", label: "אישור", color: "#FFCB00" },
  { key: "בוצע", label: "בוצע", color: "#00C875" },
] as const;
const VIEW_KEY = "brightcrm:tasks-view";

function fmtDate(iso: string | null): string {
  if (!iso) return "ללא";
  return new Date(iso).toLocaleDateString("he-IL");
}

export function TasksClient({
  tasks, clients, team, commentCounts, initialFilters, initialOpenTaskId,
}: {
  tasks: TaskWithRelations[];
  clients: Client[];
  team: TeamMember[];
  commentCounts: Record<string, number>;
  initialFilters: { status: string; clientId: string; assigneeId: string; overdue: boolean };
  initialOpenTaskId: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = React.useState<"table" | "kanban">("table");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TaskWithRelations | null>(null);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const [filters, setFilters] = React.useState(initialFilters);
  const [searchText, setSearchText] = React.useState("");

  React.useEffect(() => {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === "table" || saved === "kanban") setView(saved);
  }, []);

  React.useEffect(() => {
    const id = searchParams.get("task");
    if (id && (!editing || editing.id !== id)) {
      const found = tasks.find((t) => t.id === id);
      if (found) setEditing(found);
    }
  }, [searchParams, tasks, editing]);

  React.useEffect(() => {
    if (searchParams.get("new") === "true") {
      setCreateOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("new");
      router.replace(params.toString() ? `/tasks?${params}` : "/tasks");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const filteredTasks = React.useMemo(() => {
    if (!searchText.trim()) return tasks;
    const q = searchText.toLowerCase();
    return tasks.filter((t) => t.title.toLowerCase().includes(q) || t.client?.name?.toLowerCase().includes(q));
  }, [tasks, searchText]);

  const activeFilterCount =
    (filters.status !== "__all__" ? 1 : 0) + (filters.clientId !== "__all__" ? 1 : 0) +
    (filters.assigneeId !== "__all__" ? 1 : 0) + (filters.overdue ? 1 : 0);

  function clearFilters() {
    setFilters({ status: "__all__", clientId: "__all__", assigneeId: "__all__", overdue: false });
    setSearchText("");
    router.push("/tasks");
  }

  function changeView(next: "table" | "kanban") { setView(next); localStorage.setItem(VIEW_KEY, next); }

  function updateFilter(key: keyof typeof filters, value: string | boolean) {
    const next = { ...filters, [key]: value as never };
    setFilters(next);
    const params = new URLSearchParams();
    if (next.status && next.status !== "__all__") params.set("status", next.status);
    if (next.clientId && next.clientId !== "__all__") params.set("client", next.clientId);
    if (next.assigneeId && next.assigneeId !== "__all__") params.set("assignee", next.assigneeId);
    if (next.overdue) params.set("overdue", "true");
    router.push(params.toString() ? `/tasks?${params}` : "/tasks");
  }

  function closeSheet() {
    setEditing(null);
    setConfirmingDelete(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("task");
    router.replace(params.toString() ? `/tasks?${params}` : "/tasks");
  }

  async function onDelete() {
    if (!editing) return;
    const res = await deleteTask(editing.id);
    if ("error" in res) { toast.error(res.error); return; }
    toast.success("המשימה נמחקה");
    closeSheet();
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Board header — white bar */}
      <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-ink">משימות</h1>
            {activeFilterCount > 0 && (
              <button type="button" onClick={clearFilters}
                className="rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-white transition-colors hover:bg-primary-hover">
                {activeFilterCount} פילטרים · נקה
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
              <button type="button" onClick={() => changeView("table")}
                className={cn("flex items-center gap-1.5 rounded px-3 py-1.5 text-caption transition-all duration-200",
                  view === "table" ? "bg-white font-medium text-ink shadow-sm" : "text-ink-secondary")}>
                <Rows3 className="h-4 w-4" /><span className="hidden sm:inline">טבלה</span>
              </button>
              <button type="button" onClick={() => changeView("kanban")}
                className={cn("flex items-center gap-1.5 rounded px-3 py-1.5 text-caption transition-all duration-200",
                  view === "kanban" ? "bg-white font-medium text-ink shadow-sm" : "text-ink-secondary")}>
                <LayoutGrid className="h-4 w-4" /><span className="hidden sm:inline">קנבן</span>
              </button>
            </div>
            <Button onClick={() => setCreateOpen(true)} className="hidden sm:inline-flex">
              <Plus className="h-4 w-4" /> משימה חדשה
            </Button>
          </div>
        </div>

        {/* Filter row */}
        <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {STATUS_PILLS.map((pill) => (
              <button key={pill.key} type="button" onClick={() => updateFilter("status", pill.key)}
                className={cn("whitespace-nowrap rounded-full px-3 py-1.5 text-caption transition-all duration-200",
                  filters.status === pill.key
                    ? "font-medium text-white"
                    : "text-ink-secondary hover:bg-surface")}
                style={filters.status === pill.key
                  ? { backgroundColor: pill.color || "#323338" }
                  : undefined}>
                {pill.label}
              </button>
            ))}
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-[140px] flex-1 sm:max-w-[200px]">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <Input value={searchText} onChange={(e) => setSearchText(e.target.value)}
                placeholder="חיפוש..." className="h-9 pr-9" />
            </div>

            <Select value={filters.clientId} onValueChange={(v) => updateFilter("clientId", v)}>
              <SelectTrigger className="h-9 w-auto min-w-[120px]"><SelectValue placeholder="לקוח" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">כל הלקוחות</SelectItem>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.assigneeId} onValueChange={(v) => updateFilter("assigneeId", v)}>
              <SelectTrigger className="h-9 w-auto min-w-[100px]"><SelectValue placeholder="אחראי" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">כל האחראים</SelectItem>
                {team.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
              </SelectContent>
            </Select>

            <button type="button" onClick={() => updateFilter("overdue", !filters.overdue)}
              className={cn("flex h-9 items-center gap-1.5 rounded-md border px-3 text-caption transition-colors duration-200",
                filters.overdue ? "border-overdue bg-red-50 text-overdue" : "border-border bg-white text-ink-secondary hover:bg-surface")}>
              <AlertTriangle className="h-3.5 w-3.5" />עבר דדליין
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {filteredTasks.length === 0 ? (
        activeFilterCount > 0 || searchText ? (
          <EmptyState title="לא נמצאו משימות תואמות" description="נסה לשנות את הפילטרים."
            action={<Button variant="secondary" size="sm" onClick={clearFilters}>נקה פילטרים</Button>} />
        ) : (
          <EmptyState title="אין משימות עדיין" description="פתח משימה ראשונה דרך הכפתור או דרך בוט הטלגרם."
            action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> משימה חדשה</Button>} />
        )
      ) : view === "table" ? (
        <TaskTable tasks={filteredTasks} commentCounts={commentCounts} onRowClick={setEditing} />
      ) : (
        <TaskKanban tasks={filteredTasks} onCardClick={setEditing} />
      )}

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>משימה חדשה</DialogTitle>
            <DialogDescription>מלא את הפרטים ולחץ צור משימה.</DialogDescription>
          </DialogHeader>
          <TaskForm clients={clients} team={team} onDone={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Task detail panel — Monday.com style */}
      <Sheet open={!!editing} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent side="left" className="flex flex-col gap-0 p-0 sm:max-w-[450px]">
          {editing && (
            <>
              {/* Header */}
              <div className="shrink-0 border-b border-border px-5 pb-4 pt-5 md:px-6 md:pt-6">
                <h2 className="text-lg font-semibold text-ink leading-snug">{editing.title}</h2>
                <div className="mt-3">
                  <StatusCell status={editing.status} />
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                {/* Details grid */}
                <div className="border-b border-border px-5 py-4 md:px-6">
                  <div className="grid grid-cols-2 gap-3">
                    <DetailField icon={Briefcase} label="לקוח" value={editing.client?.name ?? "ללא"} />
                    <DetailField icon={User} label="אחראי" value={editing.assignees.map(a => a.full_name).join(", ") || "לא שויך"} />
                    <DetailField icon={Calendar} label="דדליין" value={fmtDate(editing.due_date)} />
                    <DetailField icon={Clock} label="נוצר" value={fmtDate(editing.created_at)} />
                  </div>
                  {editing.description && (
                    <p className="mt-3 text-sm text-ink-secondary leading-relaxed">{editing.description}</p>
                  )}
                </div>

                {/* Updates / Comments — center of task */}
                <div className="flex-1 px-5 py-4 md:px-6">
                  <TaskComments taskId={editing.id} team={team} />
                </div>

                {/* Edit form */}
                <details className="border-t border-border">
                  <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-ink-secondary hover:text-ink md:px-6">
                    עריכת פרטים
                  </summary>
                  <div className="px-5 pb-4 md:px-6">
                    <TaskForm key={editing.id} task={editing} clients={clients} team={team} onDone={closeSheet} compact />
                  </div>
                </details>

                {/* Files */}
                <details className="border-t border-border">
                  <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-ink-secondary hover:text-ink md:px-6">
                    קבצים
                  </summary>
                  <div className="px-5 pb-4 md:px-6">
                    <TaskAttachments key={editing.id} taskId={editing.id} />
                  </div>
                </details>

                {/* Delete */}
                <div className="border-t border-border px-5 py-3 md:px-6">
                  {confirmingDelete ? (
                    <div className="flex flex-col gap-2 rounded-lg bg-red-50 p-3 text-right">
                      <p className="text-sm text-overdue">למחוק את המשימה לצמיתות?</p>
                      <div className="flex flex-row-reverse gap-2">
                        <Button variant="danger" size="sm" onClick={onDelete}>מחק</Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>ביטול</Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)} className="text-overdue">מחיקה</Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DetailField({ icon: Icon, label, value }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-ink-muted" />
      <div className="min-w-0">
        <div className="text-[11px] text-ink-muted">{label}</div>
        <div className="truncate text-sm text-ink">{value}</div>
      </div>
    </div>
  );
}
