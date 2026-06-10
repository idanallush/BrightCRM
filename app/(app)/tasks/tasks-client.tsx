"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, LayoutGrid, Rows3, CalendarDays, Search, Tag as TagIcon, X, Trash2, ArrowRightLeft, SlidersHorizontal, Users, Calendar } from "lucide-react";
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
import { TaskCalendar, type CalendarReminder } from "./task-calendar";
import { TaskForm } from "./task-form";
import { TaskDetailPanel } from "./task-detail-panel";
import { deleteTask, bulkUpdateStatus, bulkUpdateAssignees, bulkDeleteTasks, recordTaskView, getTaskViewsBulk, type TaskViewRecord } from "./actions";
import { STATUS_LIGHT } from "@/components/ui/badge";
import type { Client, Tag, TaskWithRelations, TeamMember } from "@/lib/data";

const STATUS_PILLS = [
  { key: "__all__", label: "הכל" },
  { key: "מחכה לטיפול", label: "ממתין" },
  { key: "נכנס לעבודה", label: "נכנס" },
  { key: "בעבודה סטודיו", label: "סטודיו" },
  { key: "בעבודה ספק חיצוני", label: "ספק" },
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
  initialFilters: { status: string; clientId: string; assigneeId: string; dateFilter: string };
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
  const [calendarReminders, setCalendarReminders] = React.useState<Record<string, CalendarReminder[]>>({});

  // Fetch task views
  React.useEffect(() => {
    const ids = tasks.map((t) => t.id);
    if (ids.length > 0) getTaskViewsBulk(ids).then(setTaskViews);
  }, [tasks]);

  // Fetch reminders for calendar view
  React.useEffect(() => {
    if (view !== "calendar") return;
    async function fetchReminders() {
      try {
        const res = await fetch("/api/reminders?scope=all");
        if (!res.ok) return;
        const data = await res.json() as { id: string; title: string; reminder_date: string; scope: "personal" | "team"; is_completed: boolean }[];
        const map: Record<string, CalendarReminder[]> = {};
        for (const r of data) {
          if (!map[r.reminder_date]) map[r.reminder_date] = [];
          map[r.reminder_date].push({ id: r.id, title: r.title, scope: r.scope, is_completed: r.is_completed });
        }
        setCalendarReminders(map);
      } catch { /* non-critical */ }
    }
    fetchReminders();
  }, [view]);

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
    if (filters.dateFilter !== "__all__") {
      const today = new Date().toISOString().slice(0, 10);
      const endOfWeek = (() => {
        const d = new Date();
        const day = d.getDay();
        const diff = day === 6 ? 1 : (6 - day); // Saturday = end of Israeli week
        d.setDate(d.getDate() + diff);
        return d.toISOString().slice(0, 10);
      })();
      switch (filters.dateFilter) {
        case "overdue":
          result = result.filter((t) => t.due_date && t.due_date < today && t.status !== "בוצע");
          break;
        case "today":
          result = result.filter((t) => t.due_date === today);
          break;
        case "this_week":
          result = result.filter((t) => t.due_date && t.due_date >= today && t.due_date <= endOfWeek);
          break;
        case "no_date":
          result = result.filter((t) => !t.due_date);
          break;
      }
    }
    return result;
  }, [tasks, searchText, tagFilter, filters.dateFilter]);

  const activeFilterCount =
    (filters.status !== "__all__" ? 1 : 0) + (filters.clientId !== "__all__" ? 1 : 0) +
    (filters.assigneeId !== "__all__" ? 1 : 0) + (filters.dateFilter !== "__all__" ? 1 : 0) +
    (tagFilter !== "__all__" ? 1 : 0);

  function clearFilters() {
    setFilters({ status: "__all__", clientId: "__all__", assigneeId: "__all__", dateFilter: "__all__" });
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
    if (next.dateFilter && next.dateFilter !== "__all__") params.set("date", next.dateFilter);
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
    params.delete("comment");
    router.replace(params.toString() ? `/tasks?${params}` : "/tasks", { scroll: false });
    setTimeout(() => {
      setEditing(null);
    }, 350);
  }

  // Reset the closing guard once the URL param is actually gone
  React.useEffect(() => {
    if (closingRef.current && !searchParams.get("task")) {
      closingRef.current = false;
    }
  }, [searchParams]);

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
      {/* Toolbar */}
      <div className="flex items-center gap-2 rounded-2xl bg-[#1A1A1A] px-3 py-2 shadow-elevation-1">
        {/* New task button */}
        <Button onClick={() => setCreateOpen(true)} size="sm" className="shrink-0">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">חדש</span>
        </Button>

        <div className="h-5 w-px shrink-0 bg-[#333]" />

        {/* People filter */}
        <Select value={filters.assigneeId} onValueChange={(v) => updateFilter("assigneeId", v)}>
          <SelectTrigger className="h-8 w-auto gap-1.5 border-0 bg-transparent px-2 text-caption text-[#E5E7EB] shadow-none hover:bg-white/10">
            <Users className="h-4 w-4 text-[#9CA3AF]" />
            <SelectValue placeholder="אנשים" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">כל האנשים</SelectItem>
            {team.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Date filter */}
        <Select value={filters.dateFilter} onValueChange={(v) => updateFilter("dateFilter", v)}>
          <SelectTrigger className={cn("h-8 w-auto gap-1.5 border-0 bg-transparent px-2 text-caption text-[#E5E7EB] shadow-none hover:bg-white/10",
            filters.dateFilter !== "__all__" && "bg-overdue/20 text-overdue hover:bg-overdue/20")}>
            <Calendar className="h-4 w-4 text-[#9CA3AF]" />
            <SelectValue placeholder="תאריכים" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">כל התאריכים</SelectItem>
            <SelectItem value="overdue">באיחור</SelectItem>
            <SelectItem value="today">היום</SelectItem>
            <SelectItem value="this_week">השבוע</SelectItem>
            <SelectItem value="no_date">ללא דדליין</SelectItem>
          </SelectContent>
        </Select>

        <div className="h-5 w-px shrink-0 bg-[#333]" />

        {/* Search */}
        <div className="relative min-w-0 flex-1 sm:max-w-[180px]">
          <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6B7280]" />
          <Input value={searchText} onChange={(e) => setSearchText(e.target.value)}
            placeholder="חיפוש..." aria-label="חיפוש משימות" className="h-8 rounded-xl border-0 bg-[#2A2A2A] pr-8 text-caption text-white shadow-none placeholder:text-[#6B7280] hover:bg-[#333] focus:bg-[#333]" />
        </div>

        {/* Filter: status + client + tags */}
        <Select
          value={filters.status !== "__all__" ? filters.status : filters.clientId !== "__all__" ? `client:${filters.clientId}` : tagFilter !== "__all__" ? `tag:${tagFilter}` : "__none__"}
          onValueChange={(v) => {
            if (v === "__none__") { clearFilters(); return; }
            if (v.startsWith("client:")) { updateFilter("clientId", v.replace("client:", "")); return; }
            if (v.startsWith("tag:")) { setTagFilter(v.replace("tag:", "")); return; }
            updateFilter("status", v);
          }}
        >
          <SelectTrigger className="h-8 w-auto gap-1.5 border-0 bg-transparent px-2 text-caption text-[#E5E7EB] shadow-none hover:bg-white/10">
            <SlidersHorizontal className="h-4 w-4 text-[#9CA3AF]" />
            <span className="hidden sm:inline">סנן</span>
            {activeFilterCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-ink">{activeFilterCount}</span>
            )}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">ללא סינון</SelectItem>
            <div className="px-2 py-1.5 text-[11px] font-semibold text-ink-muted">סטטוס</div>
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
            <div className="px-2 py-1.5 text-[11px] font-semibold text-ink-muted">לקוח</div>
            <SelectItem value="client:__general__">כללי</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={`client:${c.id}`}>{c.name}</SelectItem>)}
            {tags.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-[11px] font-semibold text-ink-muted">תגית</div>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={`tag:${tag.id}`}>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color ?? "#DCE4FF" }} />
                      {tag.name}
                    </div>
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>

        <div className="h-5 w-px shrink-0 bg-[#333]" />

        {/* View toggle */}
        <div className="inline-flex items-center gap-0.5">
          <button type="button" onClick={() => changeView("table")} aria-label="טבלה"
            className={cn("rounded-lg p-1.5 transition-colors", view === "table" ? "bg-white/15 text-white" : "text-[#9CA3AF] hover:text-white")}>
            <Rows3 className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => changeView("kanban")} aria-label="קנבן"
            className={cn("rounded-lg p-1.5 transition-colors", view === "kanban" ? "bg-white/15 text-white" : "text-[#9CA3AF] hover:text-white")}>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => changeView("calendar")} aria-label="לוח שנה"
            className={cn("rounded-lg p-1.5 transition-colors", view === "calendar" ? "bg-white/15 text-white" : "text-[#9CA3AF] hover:text-white")}>
            <CalendarDays className="h-4 w-4" />
          </button>
        </div>

        {/* Active filter clear */}
        {activeFilterCount > 0 && (
          <>
            <div className="h-5 w-px shrink-0 bg-[#333]" />
            <button type="button" onClick={clearFilters} className="rounded-lg p-1.5 text-[#9CA3AF] transition-colors hover:bg-white/10 hover:text-white" aria-label="נקה פילטרים">
              <X className="h-4 w-4" />
            </button>
          </>
        )}
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

            <div className="h-4 w-px bg-[#1A1A1A]/20" />

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

            <div className="h-4 w-px bg-[#1A1A1A]/20" />

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
          <TaskCalendar tasks={filteredTasks} commentCounts={commentCounts} onTaskClick={openTask} reminders={calendarReminders} onReminderClick={() => router.push("/reminders")} />
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
          {editing && <TaskDetailPanel key={editing.id} task={editing} clients={clients} team={team} tags={tags} onClose={closeSheet} onDelete={onDelete} confirmingDelete={confirmingDelete} setConfirmingDelete={setConfirmingDelete} onTitleSaved={(t) => setEditing((prev) => prev ? { ...prev, title: t } : prev)} taskViews={taskViews[editing.id] ?? []} teamSize={team.length} focusCommentId={searchParams.get("comment")} />}
        </SheetContent>
      </Sheet>
    </motion.div>
  );
}
