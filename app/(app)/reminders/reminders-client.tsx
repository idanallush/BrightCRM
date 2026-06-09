"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Bell,
  Pencil,
  Trash2,
  X,
  Search,
  Eye,
  EyeOff,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";

export type Reminder = {
  id: string;
  title: string;
  description: string | null;
  reminder_date: string;
  reminder_time: string | null;
  scope: "personal" | "team";
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  created_by_id: string | null;
  created_by_name: string | null;
};

type TeamMember = {
  id: string;
  full_name: string;
};

const SCOPE_PILLS = [
  { key: "all", label: "הכל" },
  { key: "personal", label: "אישי" },
  { key: "team", label: "צוות" },
] as const;

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function RemindersClient({
  reminders: initialReminders,
  team,
  currentMemberId,
  initialScope,
}: {
  reminders: Reminder[];
  team: TeamMember[];
  currentMemberId: string | null;
  initialScope: string;
}) {
  const router = useRouter();
  const [reminders, setReminders] = React.useState(initialReminders);
  const [scopeFilter, setScopeFilter] = React.useState(initialScope);
  const [hideCompleted, setHideCompleted] = React.useState(false);
  const [searchText, setSearchText] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Reminder | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = React.useState<
    string | null
  >(null);
  const [saving, setSaving] = React.useState(false);

  // Form state
  const [formTitle, setFormTitle] = React.useState("");
  const [formDescription, setFormDescription] = React.useState("");
  const [formDate, setFormDate] = React.useState("");
  const [formScope, setFormScope] = React.useState<"personal" | "team">(
    "personal",
  );

  // Sync when server data changes
  React.useEffect(() => {
    setReminders(initialReminders);
  }, [initialReminders]);

  // Filter reminders
  const filtered = React.useMemo(() => {
    let result = reminders;

    if (scopeFilter === "personal") {
      result = result.filter((r) => r.scope === "personal");
    } else if (scopeFilter === "team") {
      result = result.filter((r) => r.scope === "team");
    }

    if (hideCompleted) {
      result = result.filter((r) => !r.is_completed);
    }

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q),
      );
    }

    // Sort: incomplete first, then by date
    return result.sort((a, b) => {
      if (a.is_completed !== b.is_completed)
        return a.is_completed ? 1 : -1;
      return a.reminder_date.localeCompare(b.reminder_date);
    });
  }, [reminders, scopeFilter, hideCompleted, searchText]);

  function openCreate() {
    setEditing(null);
    setFormTitle("");
    setFormDescription("");
    setFormDate("");
    setFormScope("personal");
    setDialogOpen(true);
  }

  function openEdit(reminder: Reminder) {
    setEditing(reminder);
    setFormTitle(reminder.title);
    setFormDescription(reminder.description ?? "");
    setFormDate(reminder.reminder_date);
    setFormScope(reminder.scope);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formTitle.trim() || !formDate) {
      toast.error("כותרת ותאריך הם שדות חובה");
      return;
    }

    setSaving(true);

    try {
      if (editing) {
        // Update
        const res = await fetch(`/api/reminders/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formTitle,
            description: formDescription || null,
            reminder_date: formDate,
            scope: formScope,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "שגיאה בעדכון");
        }
        toast.success("התזכורת עודכנה");
      } else {
        // Create
        const res = await fetch("/api/reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formTitle,
            description: formDescription || null,
            reminder_date: formDate,
            scope: formScope,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "שגיאה ביצירה");
        }
        toast.success("התזכורת נוצרה");
      }

      setDialogOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setSaving(false);
    }
  }

  async function toggleComplete(reminder: Reminder) {
    const newVal = !reminder.is_completed;

    // Optimistic update
    setReminders((prev) =>
      prev.map((r) =>
        r.id === reminder.id ? { ...r, is_completed: newVal } : r,
      ),
    );

    try {
      const res = await fetch(`/api/reminders/${reminder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_completed: newVal }),
      });
      if (!res.ok) throw new Error("שגיאה בעדכון");
      router.refresh();
    } catch {
      // Revert
      setReminders((prev) =>
        prev.map((r) =>
          r.id === reminder.id ? { ...r, is_completed: !newVal } : r,
        ),
      );
      toast.error("שגיאה בעדכון הסטטוס");
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/reminders/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "שגיאה במחיקה");
      }
      toast.success("התזכורת נמחקה");
      setConfirmingDeleteId(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
    }
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
        {/* New reminder button */}
        <Button onClick={openCreate} size="sm" className="shrink-0">
          <Plus className="h-4 w-4" />{" "}
          <span className="hidden sm:inline">תזכורת חדשה</span>
        </Button>

        <div className="h-5 w-px shrink-0 bg-[#333]" />

        {/* Scope filter pills */}
        <div className="flex items-center gap-1">
          {SCOPE_PILLS.map((pill) => (
            <button
              key={pill.key}
              onClick={() => setScopeFilter(pill.key)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-caption font-medium transition-colors",
                scopeFilter === pill.key
                  ? "bg-white/15 text-white"
                  : "text-[#9CA3AF] hover:text-white",
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <div className="h-5 w-px shrink-0 bg-[#333]" />

        {/* Hide completed toggle */}
        <button
          onClick={() => setHideCompleted(!hideCompleted)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-caption font-medium transition-colors",
            hideCompleted
              ? "bg-white/15 text-white"
              : "text-[#9CA3AF] hover:text-white",
          )}
        >
          {hideCompleted ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">הסתר שבוצעו</span>
        </button>

        {/* Search */}
        <div className="relative min-w-0 flex-1 sm:max-w-[180px]">
          <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6B7280]" />
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="חיפוש..."
            aria-label="חיפוש תזכורות"
            className="h-8 rounded-xl border-0 bg-[#2A2A2A] pr-8 text-caption text-white shadow-none placeholder:text-[#6B7280] hover:bg-[#333] focus:bg-[#333]"
          />
        </div>
      </div>

      {/* Reminder list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-8 w-8" />}
          title="אין תזכורות"
          description="צור תזכורת חדשה כדי להתחיל"
          action={
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4" /> תזכורת חדשה
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((reminder) => (
              <motion.div
                key={reminder.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border border-border bg-white p-4 shadow-elevation-1 transition-opacity",
                  reminder.is_completed && "opacity-60",
                )}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleComplete(reminder)}
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    reminder.is_completed
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-[#D1D5DB] hover:border-[#9CA3AF]",
                  )}
                  aria-label={
                    reminder.is_completed ? "סמן כלא בוצע" : "סמן כבוצע"
                  }
                >
                  {reminder.is_completed && (
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-body-md font-semibold text-ink",
                      reminder.is_completed && "line-through",
                    )}
                  >
                    {reminder.title}
                  </p>
                  {reminder.description && (
                    <p className="mt-0.5 line-clamp-2 text-body-sm text-ink-secondary">
                      {reminder.description}
                    </p>
                  )}
                  <div className="mt-1.5 flex items-center gap-2 text-caption text-ink-muted">
                    <span>{formatDate(reminder.reminder_date)}</span>
                    {reminder.created_by_name && (
                      <>
                        <span className="text-[#D1D5DB]">&middot;</span>
                        <span>{reminder.created_by_name}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Scope badge + actions */}
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-caption font-medium",
                      reminder.scope === "personal"
                        ? "bg-[#F5F3FF] text-[#5B21B6]"
                        : "bg-[#EFF6FF] text-[#1E40AF]",
                    )}
                  >
                    {reminder.scope === "personal" ? "אישי" : "צוות"}
                  </span>

                  {confirmingDeleteId === reminder.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-caption text-overdue font-medium">
                        למחוק?
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-caption text-overdue hover:bg-overdue/10"
                        onClick={() => handleDelete(reminder.id)}
                      >
                        מחק
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-caption text-ink-secondary hover:bg-surface"
                        onClick={() => setConfirmingDeleteId(null)}
                      >
                        ביטול
                      </Button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => openEdit(reminder)}
                        className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface hover:text-ink"
                        aria-label="ערוך תזכורת"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteId(reminder.id)}
                        className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-overdue/10 hover:text-overdue"
                        aria-label="מחק תזכורת"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "עריכת תזכורת" : "תזכורת חדשה"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {editing ? "עריכת תזכורת קיימת" : "יצירת תזכורת חדשה"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 pt-2">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label className="text-body-sm font-medium text-ink">
                כותרת
              </label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="מה צריך לזכור?"
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-body-sm font-medium text-ink">
                תיאור
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="פרטים נוספים (אופציונלי)"
                rows={3}
                className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-body-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-body-sm font-medium text-ink">
                תאריך
              </label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                dir="ltr"
              />
            </div>

            {/* Scope toggle */}
            <div className="flex flex-col gap-1.5">
              <label className="text-body-sm font-medium text-ink">סוג</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormScope("personal")}
                  className={cn(
                    "rounded-xl px-4 py-2 text-body-sm font-medium transition-colors",
                    formScope === "personal"
                      ? "bg-link text-white"
                      : "border border-border bg-white text-ink",
                  )}
                >
                  אישי
                </button>
                <button
                  type="button"
                  onClick={() => setFormScope("team")}
                  className={cn(
                    "rounded-xl px-4 py-2 text-body-sm font-medium transition-colors",
                    formScope === "team"
                      ? "bg-link text-white"
                      : "border border-border bg-white text-ink",
                  )}
                >
                  צוות
                </button>
              </div>
            </div>

            {/* Save button */}
            <Button
              onClick={handleSave}
              disabled={saving || !formTitle.trim() || !formDate}
              className="w-full"
            >
              {saving ? "שומר..." : "שמור"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
