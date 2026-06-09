"use client";

import * as React from "react";
import { Bell, ArrowLeft, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type UpcomingReminder = {
  id: string;
  title: string;
  reminder_date: string;
  scope: "personal" | "team";
  is_completed: boolean;
};

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

function isToday(dateStr: string) {
  return dateStr === new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
}

export function UpcomingReminders({ reminders }: { reminders: UpcomingReminder[] }) {
  const [popupOpen, setPopupOpen] = React.useState(false);
  const [items, setItems] = React.useState(reminders);

  React.useEffect(() => { setItems(reminders); }, [reminders]);

  async function toggleComplete(id: string) {
    const item = items.find((r) => r.id === id);
    if (!item) return;
    const newVal = !item.is_completed;
    setItems((prev) => prev.map((r) => r.id === id ? { ...r, is_completed: newVal } : r));
    try {
      const res = await fetch(`/api/reminders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_completed: newVal }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setItems((prev) => prev.map((r) => r.id === id ? { ...r, is_completed: !newVal } : r));
    }
  }

  const activeItems = items.filter((r) => !r.is_completed);
  const preview = activeItems.slice(0, 5);

  if (activeItems.length === 0) return null;

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-500" />
            <h2 className="text-base font-bold text-ink">תזכורות קרובות</h2>
          </div>
          {activeItems.length > 5 ? (
            <button
              onClick={() => setPopupOpen(true)}
              className="flex items-center gap-1 text-caption text-ink-secondary transition-colors hover:text-ink"
            >
              הכל ({activeItems.length}) <ArrowLeft className="h-3 w-3" />
            </button>
          ) : (
            <Link
              href="/reminders"
              className="flex items-center gap-1 text-caption text-ink-secondary transition-colors hover:text-ink"
            >
              כל התזכורות <ArrowLeft className="h-3 w-3" />
            </Link>
          )}
        </div>
        <div className="divide-y divide-border">
          {preview.map((r) => (
            <ReminderRow key={r.id} reminder={r} onToggle={toggleComplete} />
          ))}
        </div>
      </div>

      <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>כל התזכורות הקרובות</DialogTitle>
            <DialogDescription className="sr-only">רשימת כל התזכורות הקרובות שלא בוצעו</DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[60vh] flex-col divide-y divide-border overflow-y-auto">
            {activeItems.map((r) => (
              <ReminderRow key={r.id} reminder={r} onToggle={toggleComplete} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReminderRow({
  reminder,
  onToggle,
}: {
  reminder: UpcomingReminder;
  onToggle: (id: string) => void;
}) {
  const today = isToday(reminder.reminder_date);
  return (
    <div className="flex items-center gap-2.5 px-4 py-3">
      <button
        onClick={() => onToggle(reminder.id)}
        className={cn(
          "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          reminder.is_completed
            ? "border-green-500 bg-green-500 text-white"
            : "border-[#D1D5DB] hover:border-[#9CA3AF]",
        )}
        aria-label={reminder.is_completed ? "סמן כלא בוצע" : "סמן כבוצע"}
      >
        {reminder.is_completed && (
          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <span className={cn("text-sm font-medium text-ink", reminder.is_completed && "line-through opacity-60")}>
          {reminder.title}
        </span>
      </div>
      <span className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
        today ? "bg-amber-100 text-amber-800" : "bg-surface text-ink-muted",
      )}>
        {today ? "היום" : formatShortDate(reminder.reminder_date)}
      </span>
      <span className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
        reminder.scope === "personal" ? "bg-[#F5F3FF] text-[#5B21B6]" : "bg-[#EFF6FF] text-[#1E40AF]",
      )}>
        {reminder.scope === "personal" ? "אישי" : "צוות"}
      </span>
    </div>
  );
}
