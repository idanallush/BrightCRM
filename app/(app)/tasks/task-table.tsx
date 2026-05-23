"use client";

import { ChevronLeft, Send, Globe, AlertTriangle } from "lucide-react";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge, statusVariant } from "@/components/ui/badge";
import type { TaskWithRelations } from "@/lib/data";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("he-IL") : "\u2014";

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
            <TH className="hidden md:table-cell">לקוח</TH>
            <TH className="hidden lg:table-cell">אחראי</TH>
            <TH>דדליין</TH>
            <TH className="hidden sm:table-cell">מקור</TH>
            <TH className="w-10" />
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
                  <div className="mt-0.5 text-caption text-ink-secondary md:hidden">{t.client?.name ?? ""}</div>
                </TD>
                <TD className="hidden text-ink-secondary md:table-cell">{t.client?.name ?? "\u2014"}</TD>
                <TD className="hidden text-ink-secondary lg:table-cell">
                  {t.assignees.length === 0 ? "\u2014" : t.assignees.map((a) => a.full_name).join(", ")}
                </TD>
                <TD>
                  <span className={overdue ? "inline-flex items-center gap-1 font-medium text-overdue" : "text-ink-secondary"}>
                    {overdue && <AlertTriangle className="h-3.5 w-3.5" />}
                    {fmtDate(t.due_date)}
                  </span>
                </TD>
                <TD className="hidden sm:table-cell"><SourceIcon source={t.source} /></TD>
                <TD className="w-10 text-end text-ink-muted opacity-0 transition-opacity group-hover:opacity-100">
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

function SourceIcon({ source }: { source: string }) {
  if (source === "telegram") {
    return <span className="inline-flex items-center rounded-full bg-brand-light p-1.5 text-brand"><Send className="h-3 w-3" /></span>;
  }
  if (source === "web") {
    return <span className="inline-flex items-center rounded-full bg-gray-100 p-1.5 text-ink-muted"><Globe className="h-3 w-3" /></span>;
  }
  return <span className="text-caption text-ink-muted">{source}</span>;
}
