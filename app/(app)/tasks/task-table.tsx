"use client";

import { ChevronLeft, Send, Globe, AlertTriangle, Download, Clock } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
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
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <table className="w-full text-right text-body-sm">
        <thead>
          <tr className="border-b border-border text-caption text-ink-muted">
            <th className="px-4 py-3 text-right">סטטוס</th>
            <th className="px-4 py-3 text-right">משימה</th>
            <th className="hidden px-4 py-3 text-right md:table-cell">לקוח</th>
            <th className="hidden px-4 py-3 text-right lg:table-cell">אחראי</th>
            <th className="px-4 py-3 text-right">דדליין</th>
            <th className="hidden px-4 py-3 text-right sm:table-cell">מקור</th>
            <th className="w-8 px-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {tasks.map((t) => {
            const overdue = ["מחכה לטיפול", "נכנס לעבודה", "בעבודה"].includes(t.status) && t.due_date && t.due_date < today;
            const { text: dateText, class: dateClass } = relativeDate(t.due_date);
            return (
              <tr
                key={t.id}
                onClick={() => onRowClick(t)}
                className="group cursor-pointer transition-colors duration-150 hover:bg-gray-50"
              >
                <td className="px-4 py-3 align-middle">
                  <StatusBadge status={t.status} />
                </td>
                <td className="max-w-xs px-4 py-3 align-middle">
                  <div className="font-medium text-ink">{t.title}</div>
                  {t.description && (
                    <div className="mt-0.5 max-w-xs truncate text-sm text-slate">{t.description}</div>
                  )}
                  {/* Client visible on mobile only */}
                  <div className="mt-0.5 text-sm text-stone md:hidden">{t.client?.name ?? ""}</div>
                </td>
                <td className="hidden px-4 py-3 align-middle text-ink-secondary md:table-cell">
                  {t.client?.name ?? "\u2014"}
                </td>
                <td className="hidden px-4 py-3 align-middle lg:table-cell">
                  {t.assignees.length === 0 ? (
                    <span className="text-ink-muted">{"\u2014"}</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-ink">
                        {getInitials(t.assignees[0].full_name)}
                      </span>
                      <span className="text-body-sm text-ink">{t.assignees[0].full_name}</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 align-middle">
                  <span className={`inline-flex items-center gap-1 text-body-sm ${dateClass}`}>
                    {overdue && <AlertTriangle className="h-3.5 w-3.5" />}
                    {dateText}
                  </span>
                </td>
                <td className="hidden px-4 py-3 align-middle sm:table-cell">
                  {t.source === "telegram" ? (
                    <Send className="h-3.5 w-3.5 text-ink-muted" />
                  ) : t.source === "web" ? (
                    <Globe className="h-3.5 w-3.5 text-ink-muted" />
                  ) : (
                    <Download className="h-3.5 w-3.5 text-ink-muted" />
                  )}
                </td>
                <td className="w-8 px-2 text-end text-ink-muted opacity-0 transition-opacity group-hover:opacity-100">
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
