"use client";

import * as React from "react";
import { ChevronRight, ChevronLeft, AlertTriangle, MessageCircle, Bell } from "lucide-react";
import { STATUS_COLORS } from "@/components/ui/badge";
import type { TaskWithRelations } from "@/lib/data";

const HEB_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

const HEB_DAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export type CalendarReminder = {
  id: string;
  title: string;
  scope: "personal" | "team";
  is_completed: boolean;
};

export function TaskCalendar({
  tasks,
  commentCounts,
  onTaskClick,
  reminders,
  onReminderClick,
}: {
  tasks: TaskWithRelations[];
  commentCounts: Record<string, number>;
  onTaskClick: (t: TaskWithRelations) => void;
  reminders?: Record<string, CalendarReminder[]>;
  onReminderClick?: (r: CalendarReminder) => void;
}) {
  const today = new Date();
  const [year, setYear] = React.useState(today.getFullYear());
  const [month, setMonth] = React.useState(today.getMonth());

  const todayStr = today.toISOString().slice(0, 10);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }
  function goToday() { setYear(today.getFullYear()); setMonth(today.getMonth()); }

  const tasksByDate = React.useMemo(() => {
    const map: Record<string, TaskWithRelations[]> = {};
    for (const t of tasks) {
      if (!t.due_date) continue;
      if (!map[t.due_date]) map[t.due_date] = [];
      map[t.due_date].push(t);
    }
    return map;
  }, [tasks]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Month nav */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-white px-4 py-3 shadow-elevation-1">
        <div className="flex items-center gap-3">
          <button type="button" onClick={nextMonth} className="rounded-xl p-1.5 text-ink-secondary transition-colors hover:bg-surface hover:text-ink">
            <ChevronRight className="h-5 w-5" />
          </button>
          <h2 className="text-base font-semibold text-ink">
            {HEB_MONTHS[month]} {year}
          </h2>
          <button type="button" onClick={prevMonth} className="rounded-xl p-1.5 text-ink-secondary transition-colors hover:bg-surface hover:text-ink">
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
        <button type="button" onClick={goToday}
          className="rounded-full border border-border px-3 py-1.5 text-sm font-medium text-ink-secondary transition-colors hover:bg-surface hover:text-ink">
          היום
        </button>
      </div>

      {/* Calendar grid */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border bg-surface">
          {HEB_DAYS.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-caption font-medium text-ink-secondary">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
            {week.map((day, di) => {
              if (day === null) {
                return <div key={di} className="min-h-[100px] border-l border-border bg-surface/50 first:border-l-0" />;
              }
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isToday = dateStr === todayStr;
              const dayTasks = tasksByDate[dateStr] ?? [];
              const dayReminders = (reminders?.[dateStr] ?? []).filter((r) => !r.is_completed);
              const totalItems = dayTasks.length + dayReminders.length;
              const maxShow = 3;

              return (
                <div key={di} className="relative min-h-[100px] border-l border-border p-1.5 first:border-l-0">
                  <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    isToday ? "bg-[#1A1A1A] text-white" : "text-ink-secondary"
                  }`}>
                    {day}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {/* Tasks */}
                    {dayTasks.slice(0, maxShow).map((t) => {
                      const color = STATUS_COLORS[t.status] ?? "#C4C4C4";
                      const overdue = t.due_date && t.due_date < todayStr && t.status !== "בוצע";
                      const cc = commentCounts[t.id] ?? 0;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => onTaskClick(t)}
                          className="group/cal flex items-center gap-1 rounded px-1.5 py-0.5 text-right text-[11px] leading-tight transition-colors hover:bg-surface"
                          style={{ borderRight: `3px solid ${color}` }}
                        >
                          <span className="flex-1 truncate font-medium text-ink">{t.title}</span>
                          {cc > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-link">
                              <MessageCircle className="h-2.5 w-2.5" />{cc}
                            </span>
                          )}
                          {overdue && <AlertTriangle className="h-2.5 w-2.5 shrink-0 text-overdue" />}
                        </button>
                      );
                    })}
                    {/* Reminders */}
                    {dayReminders.slice(0, Math.max(0, maxShow - dayTasks.length)).map((r) => (
                      <button
                        key={`rem-${r.id}`}
                        type="button"
                        onClick={() => onReminderClick?.(r)}
                        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-right text-[11px] leading-tight transition-colors hover:bg-amber-50"
                        style={{ borderRight: "3px solid #F59E0B" }}
                      >
                        <Bell className="h-2.5 w-2.5 shrink-0 text-amber-500" />
                        <span className="flex-1 truncate font-medium text-amber-800">{r.title}</span>
                        <span className="shrink-0 rounded-full bg-amber-100 px-1 text-[9px] font-medium text-amber-700">
                          {r.scope === "team" ? "צוות" : "אישי"}
                        </span>
                      </button>
                    ))}
                    {totalItems > maxShow && (
                      <span className="px-1.5 text-[10px] text-ink-muted">+{totalItems - maxShow} נוספות</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
