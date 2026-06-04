"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { StatusCell } from "@/components/ui/badge";

type TaskRow = { id: string; title: string; status: string; due_date: string | null };

const DONE_STATUSES = ["בוצע"];
const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("he-IL") : "\u2014";

export function ClientTasksSection({ tasks, clientId }: { tasks: TaskRow[]; clientId: string }) {
  const [showCompleted, setShowCompleted] = React.useState(false);

  const activeTasks = tasks.filter((t) => !DONE_STATUSES.includes(t.status));
  const completedTasks = tasks.filter((t) => DONE_STATUSES.includes(t.status));

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-bold text-ink">משימות ({activeTasks.length} פעילות)</h3>
        <Link href={`/tasks?client=${clientId}`} className="text-xs font-medium text-link hover:underline">לכל המשימות</Link>
      </div>
      {activeTasks.length === 0 && completedTasks.length === 0 ? (
        <div className="rounded-xl border border-border bg-white p-6 text-center text-sm text-ink-muted">אין משימות ללקוח.</div>
      ) : (
        <>
          {activeTasks.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
              <table className="w-full text-right text-body-sm">
                <thead>
                  <tr className="bg-surface text-caption text-ink-secondary">
                    <th className="px-4 py-2.5 text-right font-medium">כותרת</th>
                    <th className="px-4 py-2.5 text-right font-medium">סטטוס</th>
                    <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">תאריך יעד</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTasks.map((t) => (
                    <tr key={t.id} className="border-b border-border cursor-pointer transition-colors hover:bg-surface">
                      <td className="px-4 py-2.5 font-medium"><Link href={`/tasks?task=${t.id}`} className="block transition-colors hover:text-link">{t.title}</Link></td>
                      <td className="px-4 py-2.5"><StatusCell status={t.status} /></td>
                      <td className="hidden px-4 py-2.5 text-ink-secondary sm:table-cell">{fmtDate(t.due_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {completedTasks.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
              <button
                type="button"
                onClick={() => setShowCompleted((v) => !v)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-right text-sm text-ink-secondary transition-colors hover:bg-surface"
              >
                {showCompleted ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                הצג הושלמו ({completedTasks.length})
              </button>
              {showCompleted && (
                <table className="w-full text-right text-body-sm">
                  <tbody>
                    {completedTasks.map((t) => (
                      <tr key={t.id} className="border-b border-border cursor-pointer transition-colors hover:bg-surface">
                        <td className="px-4 py-2.5 font-medium text-ink-muted"><Link href={`/tasks?task=${t.id}`} className="block transition-colors hover:text-link">{t.title}</Link></td>
                        <td className="px-4 py-2.5"><StatusCell status={t.status} /></td>
                        <td className="hidden px-4 py-2.5 text-ink-secondary sm:table-cell">{fmtDate(t.due_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
