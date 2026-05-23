"use client";

import { ChevronLeft, Send, Globe, AlertTriangle, Download } from "lucide-react";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge, statusVariant } from "@/components/ui/badge";
import type { TaskWithRelations } from "@/lib/data";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("he-IL") : "\u2014";

function getInitials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export function TaskTable({
  tasks,
  onRowClick,
}: {
  tasks: TaskWithRelations[];
  onRowClick: (t: TaskWithRelations) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <Table>
        <THead>
          <TR className="hover:bg-transparent">
            <TH>סטטוס</TH>
            <TH>משימה</TH>
            <TH>לקוח</TH>
            <TH className="hidden sm:table-cell">אחראי</TH>
            <TH>דדליין</TH>
            <TH className="hidden sm:table-cell">מקור</TH>
            <TH className="w-8" />
          </TR>
        </THead>
        <TBody>
          {tasks.map((t) => {
            const overdue =
              ["מחכה לטיפול", "נכנס לעבודה", "בעבודה"].includes(t.status) && t.due_date && t.due_date < today;
            return (
              <TR key={t.id} onClick={() => onRowClick(t)} className="cursor-pointer">
                <TD><Badge variant={statusVariant(t.status)}>{t.status}</Badge></TD>
                <TD>
                  <div className="font-medium text-ink">{t.title}</div>
                  {t.description && <div className="mt-0.5 line-clamp-1 text-caption text-ink-secondary">{t.description}</div>}
                </TD>
                <TD className="text-ink-secondary">{t.client?.name ?? "\u2014"}</TD>
                <TD className="hidden sm:table-cell">
                  <div className="flex items-center gap-1.5">
                    {t.assignees.length === 0 ? (
                      <span className="text-ink-muted">{"\u2014"}</span>
                    ) : (
                      <>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-light text-[10px] font-semibold text-brand">
                          {getInitials(t.assignees[0].full_name)}
                        </span>
                        <span className="text-sm text-ink-secondary">{t.assignees[0].full_name}</span>
                      </>
                    )}
                  </div>
                </TD>
                <TD>
                  <span className={overdue ? "inline-flex items-center gap-1 font-medium text-overdue" : "text-ink-secondary"}>
                    {overdue && <AlertTriangle className="h-3.5 w-3.5" />}
                    {fmtDate(t.due_date)}
                  </span>
                </TD>
                <TD className="hidden sm:table-cell">
                  {t.source === "telegram" ? (
                    <span className="inline-flex items-center rounded-full bg-purple-50 p-1.5 text-st-working"><Send className="h-3 w-3" /></span>
                  ) : t.source === "web" ? (
                    <span className="inline-flex items-center rounded-full bg-gray-100 p-1.5 text-ink-muted"><Globe className="h-3 w-3" /></span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-100 p-1.5 text-ink-muted"><Download className="h-3 w-3" /></span>
                  )}
                </TD>
                <TD className="w-8 text-end text-ink-muted opacity-0 transition-opacity group-hover:opacity-100">
                  <ChevronLeft className="ms-auto h-4 w-4" />
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
