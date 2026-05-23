"use client";

import { ChevronLeft, Send, Globe, AlertTriangle, Download, Clock } from "lucide-react";
import { Badge, statusVariant } from "@/components/ui/badge";
import type { TaskWithRelations } from "@/lib/data";

function getInitials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function relativeDate(iso: string | null): { text: string; class: string } {
  if (!iso) return { text: "ללא דדליין", class: "text-stone italic" };
  const diffDays = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diffDays < 0) return { text: `באיחור ${Math.abs(diffDays)} ימים`, class: "text-overdue font-medium" };
  if (diffDays === 0) return { text: "היום", class: "text-st-waiting font-medium" };
  if (diffDays === 1) return { text: "מחר", class: "text-ink" };
  return { text: `עוד ${diffDays} ימים`, class: "text-slate" };
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
    <div className="overflow-hidden rounded-lg border border-hairline/60 bg-white shadow-subtle">
      <table className="w-full text-right text-sm">
        <thead>
          <tr className="bg-surface-soft text-xs font-medium uppercase tracking-wide text-slate">
            <th className="px-4 py-3 text-right">סטטוס</th>
            <th className="px-4 py-3 text-right">משימה</th>
            <th className="hidden px-4 py-3 text-right md:table-cell">לקוח</th>
            <th className="hidden px-4 py-3 text-right lg:table-cell">אחראי</th>
            <th className="px-4 py-3 text-right">דדליין</th>
            <th className="hidden px-4 py-3 text-right sm:table-cell">מקור</th>
            <th className="w-8 px-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline-soft">
          {tasks.map((t, i) => {
            const overdue = ["מחכה לטיפול", "נכנס לעבודה", "בעבודה"].includes(t.status) && t.due_date && t.due_date < today;
            const { text: dateText, class: dateClass } = relativeDate(t.due_date);
            return (
              <tr
                key={t.id}
                onClick={() => onRowClick(t)}
                className={`group cursor-pointer transition-colors duration-150 hover:bg-tint-sky/40 ${i % 2 === 1 ? "bg-surface-soft/30" : ""}`}
              >
                <td className="px-4 py-3 align-middle">
                  <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                </td>
                <td className="max-w-xs px-4 py-3 align-middle">
                  <div className="font-medium text-ink">{t.title}</div>
                  {t.description && (
                    <div className="mt-0.5 max-w-xs truncate text-sm text-slate">{t.description}</div>
                  )}
                  {/* Client visible on mobile only */}
                  <div className="mt-0.5 text-sm text-stone md:hidden">{t.client?.name ?? ""}</div>
                </td>
                <td className="hidden px-4 py-3 align-middle md:table-cell">
                  {t.client?.name ? (
                    <span className="inline-flex rounded-md bg-surface px-2 py-0.5 text-sm text-slate">{t.client.name}</span>
                  ) : (
                    <span className="text-stone">{"\u2014"}</span>
                  )}
                </td>
                <td className="hidden px-4 py-3 align-middle lg:table-cell">
                  {t.assignees.length === 0 ? (
                    <span className="text-stone">{"\u2014"}</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-tint-sky text-[11px] font-semibold text-link">
                        {getInitials(t.assignees[0].full_name)}
                      </span>
                      <span className="text-sm text-ink">{t.assignees[0].full_name}</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 align-middle">
                  <span className={`inline-flex items-center gap-1 text-sm ${dateClass}`}>
                    {overdue && <AlertTriangle className="h-3.5 w-3.5" />}
                    {!overdue && t.due_date && <Clock className="h-3.5 w-3.5 text-stone" />}
                    {dateText}
                  </span>
                </td>
                <td className="hidden px-4 py-3 align-middle sm:table-cell">
                  {t.source === "telegram" ? (
                    <span className="inline-flex items-center rounded-full bg-tint-lavender p-1.5 text-primary" title="טלגרם"><Send className="h-3.5 w-3.5" /></span>
                  ) : t.source === "web" ? (
                    <span className="inline-flex items-center rounded-full bg-surface p-1.5 text-slate" title="ממשק"><Globe className="h-3.5 w-3.5" /></span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-surface p-1.5 text-slate" title="ייבוא"><Download className="h-3.5 w-3.5" /></span>
                  )}
                </td>
                <td className="w-8 px-2 text-end text-stone opacity-0 transition-opacity group-hover:opacity-100">
                  <ChevronLeft className="ms-auto h-4 w-4" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
