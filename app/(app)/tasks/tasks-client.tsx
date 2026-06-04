"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, LayoutGrid, Rows3, CalendarDays, AlertTriangle, Search, Tag as TagIcon, X, Trash2, ArrowRightLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import { TaskTable } from "./task-table";
import { TaskKanban } from "./task-kanban";
import { TaskCalendar } from "./task-calendar";
import { TaskForm } from "./task-form";
import { TaskDetailPanel } from "./task-detail-panel";
import { deleteTask, bulkUpdateStatus, bulkUpdateAssignees, bulkDeleteTasks, recordTaskView, getTaskViewsBulk, type TaskViewRecord } from "./actions";
import { STATUS_LIGHT } from "@/components/ui/badge";
import type { Client, Tag, TaskWithRelations, TeamMember } from "@/lib/data";

const STATUS_PILLS = [
  { key: "__all__", label: "הכל" },
  { key: "מחכה לטיפול", label: "ממתין" },
  { key: "נכנס לעבודה", label: "נכנס" },
  { key: "אישור לקוח", label: "אישור" },
  { key: "בוצע", label: "בוצע" },
] as const;
const VIEW_KEY = "brightcrm:tasks-view";


export function TasksClient({
  tasks, clients, team, tags, commentCounts, currentMemberId, initialFilters, initialOpenTaskId,
}: {
  tasks: TaskWithRelations[];
  clients: Client[];
  team: TeamMember[];
  tags: Tag[];
  commentCounts: Record<string, number>;
  currentMemberId: string | null;
  initialFilters: { status: string; clientId: string; assigneeId: string; overdue: boolean };
  initialOpenTaskId: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = React.useState<"table" | "kanban" | "calendar">("table");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TaskWithRelations | null>(null);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const [filters, setFilters] = React.useState(initialFilters);
  const [tagFilter, setTagFilter] = React.useState<string>("__all__");
  const [searchText, setSearchText] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = React.useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = React.useState(false);
  const [taskViews, setTaskViews] = React.useState<Record<string, TaskViewRecord[]>>({});

  // Fetch task views
  React.useEffect(() => {
    const ids = tasks.map((t) => t.id);
    if (ids.length > 0) getTaskViewsBulk(ids).then(setTaskViews);
  }, [tasks]);

  // Record view when opening a task
  const openTask = React.useCallback((t: TaskWithRelations) => {
    setEditing(t);
    setSheetOpen(true);
    if (currentMemberId) {
      recordTaskView(t.id, currentMemberId).then(() => {
        getTaskViewsBulk(tasks.map((tt) => tt.id)).then(setTaskViews);
      });
    }
  }, [currentMemberId, tasks]);

  // Clear selection when filters/view change
  React.useEffect(() => { setSelectedIds(new Set()); }, [filters, tagFilter, searchText, view]);

  React.useEffect(() => {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === "table" || saved === "kanban" || saved === "calendar") setView(saved);
  }, []);

  React.useEffect(() => {
    if (closingRef.current) return;
    const id = searchParams.get("task");
    if (id && (!editing || editing.id !== id)) {
      const found = tasks.find((t) => t.id === id);
      if (found) openTask(found);
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
    let result = tasks;
    if (tagFilter !== "__all__") {
      result = result.filter((t) => t.tags.some((tag) => tag.id === tagFilter));
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q) || t.client?.name?.toLowerCase().includes(q));
    }
    return result;
  }, [tasks, searchText, tagFilter]);

  const activeFilterCount =
    (filters.status !== "__all__" ? 1 : 0) + (filters.clientId !== "__all__" ? 1 : 0) +
    (filters.assigneeId !== "__all__" ? 1 : 0) + (filters.overdue ? 1 : 0) +
    (tagFilter !== "__all__" ? 1 : 0);

  function clearFilters() {
    setFilters({ status: "__all__", clientId: "__all__", assigneeId: "__all__", overdue: false });
    setTagFilter("__all__");
    setSearchText("");
    router.push("/tasks");
  }

  function changeView(next: "table" | "kanban" | "calendar") { setView(next); localStorage.setItem(VIEW_KEY, next); }

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

  const [sheetOpen, setSheetOpen] = React.useState(false);

  const closingRef = React.useRef(false);

  function closeSheet() {
    closingRef.current = true;
    setSheetOpen(false);
    setConfirmingDelete(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("task");
    router.replace(params.toString() ? `/tasks?${params}` : "/tasks", { scroll: false });
    setTimeout(() => {
      setEditing(null);
      closingRef.current = false;
    }, 350);
  }

  async function onDelete() {
    if (!editing) return;
    const res = await deleteTask(editing.id);
    if ("error" in res) { toast.error(res.error); return; }
    toast.success("המשימה נמחקה");
    closeSheet();
    router.refresh();
  }

  async function onBulkStatus(status: string) {
    setBulkLoading(true);
    const res = await bulkUpdateStatus([...selectedIds], status);
    setBulkLoading(false);
    if ("error" in res) { toast.error(res.error); return; }
    toast.success(`${res.count} משימות עודכנו`);
    setSelectedIds(new Set());
    router.refresh();
  }

  async function onBulkAssignee(assigneeId: string) {
    setBulkLoading(true);
    const res = await bulkUpdateAssignees([...selectedIds], [assigneeId]);
    setBulkLoading(false);
    if ("error" in res) { toast.error(res.error); return; }
    toast.success(`${res.count} משימות עודכנו`);
    setSelectedIds(new Set());
    router.refresh();
  }

  async function onBulkDelete() {
    setBulkLoading(true);
    const res = await bulkDeleteTasks([...selectedIds]);
    setBulkLoading(false);
    if ("error" in res) { toast.error(res.error); return; }
    toast.success(`${res.count} משימות נמחקו`);
    setSelectedIds(new Set());
    setConfirmBulkDelete(false);
    router.refresh();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col gap-4"
    >
      {/* Board header */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-ink">משימות</h1>
            {activeFilterCount > 0 && (
              <button type="button" onClick={clearFilters}
                className="rounded-full bg-surface px-3 py-1 text-[11px] font-medium text-ink-secondary transition-colors hover:bg-border">
                {activeFilterCount === 1 ? "פילטר 1" : `${activeFilterCount} פילטרים`} · נקה
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full border border-border bg-surface p-0.5">
              <button type="button" onClick={() => changeView("table")}
                className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-caption transition-colors duration-200",
                  view === "table" ? "bg-white font-medium text-ink shadow-sm" : "text-ink-secondary hover:text-ink")}>
                <Rows3 className="h-4 w-4" /><span className="hidden sm:inline">טבלה</span>
              </button>
              <button type="button" onClick={() => changeView("kanban")}
                className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-caption transition-colors duration-200",
                  view === "kanban" ? "bg-white font-medium text-ink shadow-sm" : "text-ink-secondary hover:text-ink")}>
                <LayoutGrid className="h-4 w-4" /><span className="hidden sm:inline">קנבן</span>
              </button>
              <button type="button" onClick={() => changeView("calendar")}
                className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-caption transition-colors duration-200",
                  view === "calendar" ? "bg-white font-medium text-ink shadow-sm" : "text-ink-secondary hover:text-ink")}>
                <CalendarDays className="h-4 w-4" /><span className="hidden sm:inline">לוח שנה</span>
              </button>
            </div>
            <Button onClick={() => setCreateOpen(true)} className="hidden sm:inline-flex">
              <Plus className="h-4 w-4" /> משימה חדשה
            </Button>
          </div>
        </div>

        {/* Filter row */}
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center">
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none sm:overflow-x-visible sm:pb-0">
            {STATUS_PILLS.map((pill) => {
              const isActive = filters.status === pill.key;
              const light = STATUS_LIGHT[pill.key];
              return (
                <button key={pill.key} type="button" onClick={() => updateFilter("status", pill.key)}
                  className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-caption transition-colors duration-200",
                    isActive
                      ? light ? "font-medium" : "bg-ink font-medium text-white"
                      : "text-ink-secondary hover:bg-surface")}
                  style={isActive && light
                    ? { backgroundColor: light.bg, color: light.text }
                    : undefined}>
                  {isActive && light && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: light.dot }} />}
                  {pill.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-[140px] flex-1 sm:max-w-[200px]">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <Input value={searchText} onChange={(e) => setSearchText(e.target.value)}
                placeholder="חיפוש..." aria-label="חיפוש משימות" className="h-9 pr-9" />
            </div>

            <Select value={filters.clientId} onValueChange={(v) => updateFilter("clientId", v)}>
              <SelectTrigger className="h-9 w-auto min-w-[120px]"><SelectValue placeholder="לקוח" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">כל הלקוחות</SelectItem>
                <SelectItem value="__general__">כללי</SelectItem>
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
              className={cn("flex h-9 items-center gap-1.5 rounded-full border px-3 text-caption transition-colors duration-200",
                filters.overdue ? "border-overdue bg-overdue-bg text-overdue-text" : "border-border bg-white text-ink-secondary hover:bg-surface")}>
              <AlertTriangle className="h-3.5 w-3.5" />עבר דדליין
            </button>

            {tags.length > 0 && (
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="h-9 w-auto min-w-[100px]">
                  <div className="flex items-center gap-1.5">
                    <TagIcon className="h-3.5 w-3.5" />
                    <SelectValue placeholder="תגית" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">כל התגיות</SelectItem>
                  {tags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tag.color ?? "#DCE4FF" }} />
                        {tag.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink/10 bg-surface px-4 py-2.5 shadow-elevation-1"
          >
            <span className="text-body-sm font-semibold text-ink">
              {selectedIds.size} {selectedIds.size === 1 ? "משימה נבחרה" : "משימות נבחרו"}
            </span>

            <div className="h-4 w-px bg-primary/20" />

            {/* Status change */}
            <Select onValueChange={onBulkStatus} disabled={bulkLoading}>
              <SelectTrigger className="h-8 w-auto min-w-[120px] gap-1.5 border-primary/20 bg-white text-caption">
                <ArrowRightLeft className="h-3.5 w-3.5 text-ink-muted" />
                <SelectValue placeholder="שנה סטטוס" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_PILLS.filter((p) => p.key !== "__all__").map((pill) => {
                  const light = STATUS_LIGHT[pill.key];
                  return (
                    <SelectItem key={pill.key} value={pill.key}>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: light?.dot ?? "#C4C4C4" }} />
                        {pill.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Assignee change */}
            <Select onValueChange={onBulkAssignee} disabled={bulkLoading}>
              <SelectTrigger className="h-8 w-auto min-w-[120px] gap-1.5 border-primary/20 bg-white text-caption">
                <SelectValue placeholder="שנה אחראי" />
              </SelectTrigger>
              <SelectContent>
                {team.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="h-4 w-px bg-primary/20" />

            {/* Delete */}
            {confirmBulkDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-caption text-overdue">למחוק {selectedIds.size} משימות?</span>
                <Button variant="danger" size="sm" onClick={onBulkDelete} disabled={bulkLoading}>
                  מחק
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmBulkDelete(false)}>
                  ביטול
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setConfirmBulkDelete(true)} disabled={bulkLoading}
                className="text-overdue hover:bg-overdue-bg hover:text-overdue">
                <Trash2 className="h-3.5 w-3.5" /> מחיקה
              </Button>
            )}

            <div className="flex-1" />

            {/* Clear selection */}
            <button type="button" onClick={() => setSelectedIds(new Set())}
              className="rounded-full p-1.5 text-ink-muted transition-colors hover:bg-white hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <AnimatePresence mode="wait">
      {filteredTasks.length === 0 ? (
        <motion.div key="empty" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.2 }}>
        {activeFilterCount > 0 || searchText ? (
          <EmptyState title="לא נמצאו משימות תואמות" description="נסה לשנות את הפילטרים."
            action={<Button variant="secondary" size="sm" onClick={clearFilters}>נקה פילטרים</Button>} />
        ) : (
          <EmptyState title="אין משימות עדיין" description="פתח משימה ראשונה דרך הכפתור או דרך בוט הטלגרם."
            action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> משימה חדשה</Button>} />
        )}
        </motion.div>
      ) : view === "table" ? (
        <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <TaskTable tasks={filteredTasks} commentCounts={commentCounts} onRowClick={openTask} selectedIds={selectedIds} onSelectionChange={setSelectedIds} taskViews={taskViews} teamSize={team.length} currentMemberId={currentMemberId} />
        </motion.div>
      ) : view === "kanban" ? (
        <motion.div key="kanban" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <TaskKanban tasks={filteredTasks} onCardClick={openTask} />
        </motion.div>
      ) : (
        <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <TaskCalendar tasks={filteredTasks} commentCounts={commentCounts} onTaskClick={openTask} />
        </motion.div>
      )}
      </AnimatePresence>

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>משימה חדשה</DialogTitle>
            <DialogDescription>שדות חובה: כותרת ולקוח.</DialogDescription>
          </DialogHeader>
          <TaskForm clients={clients} team={team} tags={tags} onDone={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Task detail panel */}
      <Sheet open={sheetOpen} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent side="left" className="flex flex-col gap-0 p-0 sm:max-w-[960px]">
          <SheetTitle className="sr-only">{editing?.title ?? "פרטי משימה"}</SheetTitle>
          {editing && <TaskDetailPanel key={editing.id} task={editing} clients={clients} team={team} tags={tags} onClose={closeSheet} onDelete={onDelete} confirmingDelete={confirmingDelete} setConfirmingDelete={setConfirmingDelete} onTitleSaved={(t) => setEditing((prev) => prev ? { ...prev, title: t } : prev)} taskViews={taskViews[editing.id] ?? []} teamSize={team.length} />}
        </SheetContent>
      </Sheet>
    </motion.div>
  );
}
