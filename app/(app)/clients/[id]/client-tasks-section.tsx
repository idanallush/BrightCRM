"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge, statusVariant } from "@/components/ui/badge";

type TaskRow = { id: string; title: string; status: string; due_date: string | null };

const DONE_STATUSES = ["בוצע", "בוטל", "סגור"];
const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("he-IL") : "\u2014";

export function ClientTasksSection({ tasks, clientId }: { tasks: TaskRow[]; clientId: string }) {
  const [showCompleted, setShowCompleted] = React.useState(false);

  const activeTasks = tasks.filter((t) => !DONE_STATUSES.includes(t.status));
  const completedTasks = tasks.filter((t) => DONE_STATUSES.includes(t.status));

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-ink">משימות ({activeTasks.length} פעילות)</h3>
        <Link href={`/tasks?client=${clientId}`} className="text-xs font-medium text-slate transition-colors hover:text-ink">לכל המשימות</Link>
      </div>
      {activeTasks.length === 0 && completedTasks.length === 0 ? (
        <div className="rounded-lg bg-surface-soft p-6 text-center text-sm text-slate">אין משימות ללקוח.</div>
      ) : (
        <>
          {activeTasks.length > 0 && (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <THead><TR className="hover:bg-transparent"><TH>כותרת</TH><TH>סטטוס</TH><TH className="hidden sm:table-cell">תאריך יעד</TH></TR></THead>
                  <TBody>
                    {activeTasks.map((t) => (
                      <TR key={t.id} className="cursor-pointer">
                        <TD className="font-medium"><Link href={`/tasks?task=${t.id}`} className="block transition-colors hover:text-primary">{t.title}</Link></TD>
                        <TD><Badge variant={statusVariant(t.status)}>{t.status}</Badge></TD>
                        <TD className="hidden text-slate sm:table-cell">{fmtDate(t.due_date)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {completedTasks.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-border bg-white">
              <button
                type="button"
                onClick={() => setShowCompleted((v) => !v)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-right text-sm text-ink-secondary hover:bg-gray-50 transition-colors"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${showCompleted ? "rotate-180" : ""}`} />
                הצג הושלמו ({completedTasks.length})
              </button>
              {showCompleted && (
                <Table>
                  <TBody>
                    {completedTasks.map((t) => (
                      <TR key={t.id} className="cursor-pointer">
                        <TD className="font-medium text-ink-muted"><Link href={`/tasks?task=${t.id}`} className="block transition-colors hover:text-primary">{t.title}</Link></TD>
                        <TD><Badge variant={statusVariant(t.status)}>{t.status}</Badge></TD>
                        <TD className="hidden text-slate sm:table-cell">{fmtDate(t.due_date)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
