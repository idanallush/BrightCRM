"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, MessageSquare, ListChecks } from "lucide-react";
import { StatusCell } from "@/components/ui/badge";
import { MarkDoneButton } from "@/components/dashboard/mark-done-button";
import { cn, relativeDate } from "@/lib/utils";

type MyTask = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  created_at: string;
  client_name: string | null;
};

const TABS = [
  { key: "__all__", label: "הכל" },
  { key: "waiting", label: "ממתין" },
  { key: "working", label: "בעבודה" },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "ללא";
  return new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "long" });
}

export function MyTasksSection({
  tasks,
  commentCounts,
}: {
  tasks: MyTask[];
  commentCounts: Record<string, number>;
}) {
  const [tab, setTab] = React.useState("__all__");

  const filtered = React.useMemo(() => {
    if (tab === "__all__") return tasks;
    if (tab === "waiting") return tasks.filter((t) => t.status === "מחכה לטיפול");
    if (tab === "working")
      return tasks.filter((t) => t.status === "נכנס לעבודה" || t.status === "בעבודה");
    return tasks;
  }, [tasks, tab]);

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-primary/15 bg-white shadow-elevation-1">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <ListChecks className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-base font-bold text-ink">המשימות שלי</h2>
        </div>
        <div className="flex items-center gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-caption font-medium transition-colors",
                tab === t.key
                  ? "bg-primary text-white"
                  : "text-ink-muted hover:bg-surface"
              )}
            >
              {t.label}
            </button>
          ))}
          <div className="mx-2 h-5 w-px bg-border" />
          <Link
            href="/tasks"
            className="flex items-center gap-1 text-caption text-ink-secondary transition-colors hover:text-ink"
          >
            הצג הכל ({tasks.length}) <ArrowLeft className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface">
            <CheckCircle2 className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">
              {tab === "__all__" ? "אין משימות פתוחות" : "אין משימות בסטטוס הזה"}
            </p>
            <p className="mt-0.5 text-caption text-ink-muted">
              {tab === "__all__" ? "כל המשימות טופלו" : "נסה לבחור סטטוס אחר"}
            </p>
          </div>
        </div>
      ) : (
        <table className="w-full text-right text-body-sm">
          <thead>
            <tr className="bg-surface text-caption text-ink-secondary">
              <th className="px-4 py-2.5 text-right font-medium">משימה</th>
              <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">לקוח</th>
              <th className="px-4 py-2.5 text-center font-medium">סטטוס</th>
              <th className="hidden px-4 py-2.5 text-right font-medium lg:table-cell">נפתח</th>
              <th className="px-4 py-2.5 text-right font-medium">דדליין</th>
              <th className="w-10 px-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const { overdue } = relativeDate(t.due_date);
              return (
                <tr
                  key={t.id}
                  className="group relative border-b border-border transition-colors hover:bg-surface"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/tasks?task=${t.id}`}
                      className="font-medium text-ink group-hover:text-primary after:absolute after:inset-0 after:content-['']"
                    >
                      {t.title}
                    </Link>
                    {(commentCounts[t.id] ?? 0) > 0 && (
                      <span className="ms-2 inline-flex items-center gap-0.5 text-xs text-ink-muted">
                        <MessageSquare className="h-3 w-3" />
                        {commentCounts[t.id]}
                      </span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-ink-secondary sm:table-cell">
                    {t.client_name ?? "כללי"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusCell status={t.status} />
                  </td>
                  <td className="hidden px-4 py-3 text-ink-muted lg:table-cell">
                    {new Date(t.created_at).toLocaleDateString("he-IL", {
                      day: "numeric",
                      month: "short",
                    })}
                  </td>
                  <td
                    className={`px-4 py-3 ${overdue ? "font-medium text-overdue" : "text-ink-secondary"}`}
                  >
                    {fmtDate(t.due_date)}
                  </td>
                  <td className="relative z-10 px-2 py-3 text-center">
                    <MarkDoneButton taskId={t.id} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
