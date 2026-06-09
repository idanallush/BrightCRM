"use client";

import * as React from "react";
import { Bell, ChevronDown, ChevronUp, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "brightcrm:reminders-banner-dismissed";
const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  reminder_date: string;
  reminder_time: string | null;
  scope: string;
  created_by_id: string | null;
  created_by_name: string | null;
}

export function RemindersBanner() {
  const [reminders, setReminders] = React.useState<Reminder[]>([]);
  const [expanded, setExpanded] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const fetchReminders = React.useCallback(async () => {
    try {
      const res = await fetch("/api/reminders/today");
      if (!res.ok) return;
      const data: Reminder[] = await res.json();
      setReminders(data);
    } catch {
      // silent — banner is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  // Check sessionStorage on mount
  React.useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "true") {
        setDismissed(true);
      }
    } catch {
      // sessionStorage unavailable
    }
  }, []);

  // Fetch + poll
  React.useEffect(() => {
    fetchReminders();
    const interval = setInterval(fetchReminders, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchReminders]);

  const handleDismiss = React.useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "true");
    } catch {
      // sessionStorage unavailable
    }
  }, []);

  const handleComplete = React.useCallback(async (id: string) => {
    // Optimistic remove
    setReminders((prev) => prev.filter((r) => r.id !== id));

    try {
      await fetch(`/api/reminders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_completed: true }),
      });
    } catch {
      // Re-fetch to restore state on error
      fetchReminders();
    }
  }, [fetchReminders]);

  // Don't render if loading, dismissed, or no reminders
  if (loading || dismissed || reminders.length === 0) {
    return null;
  }

  const count = reminders.length;
  const label = count === 1 ? "תזכורת אחת להיום" : `יש לך ${count} תזכורות להיום`;

  return (
    <div className="mx-4 mt-4 md:mx-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="rounded-2xl border border-amber-200 bg-amber-50"
      >
        {/* Header row */}
        <div className="flex items-center gap-3 px-4 py-3">
          <Bell className="h-5 w-5 shrink-0 text-amber-600" />
          <span className="flex-1 text-sm font-medium text-amber-900">
            {label}
          </span>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-lg p-1 text-amber-600 transition-colors hover:bg-amber-100"
            aria-label={expanded ? "כווץ רשימה" : "הרחב רשימה"}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg p-1 text-amber-600 transition-colors hover:bg-amber-100"
            aria-label="סגור באנר תזכורות"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Expanded list */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="border-t border-amber-200 px-4 pb-3 pt-2">
                <div className="flex flex-col gap-2">
                  {reminders.map((reminder) => (
                    <motion.div
                      key={reminder.id}
                      layout
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      className="flex items-start gap-3 rounded-xl bg-amber-100/50 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-amber-900">
                            {reminder.title}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                              reminder.scope === "team"
                                ? "bg-amber-200 text-amber-800"
                                : "bg-amber-100 text-amber-700",
                            )}
                          >
                            {reminder.scope === "team" ? "צוות" : "אישי"}
                          </span>
                        </div>
                        {reminder.description && (
                          <p className="mt-0.5 truncate text-sm text-amber-700">
                            {reminder.description}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleComplete(reminder.id)}
                        className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-amber-700"
                      >
                        <Check className="h-3 w-3" />
                        בוצע
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
