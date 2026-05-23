"use client";

import { ChevronLeft, Send, Globe, AlertTriangle, Download, Clock } from "lucide-react";
import { Badge, statusVariant } from "@/components/ui/badge";
import type { TaskWithRelations } from "@/lib/data";

function getInitials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function relativeDate(iso: string | null): { text: string; class: string } {
  if (!iso) return { text: "ללא דדליין", class: "text-gray-400 italic" };
  const diffDays = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diffDays < 0) return { text: `באיחור ${Math.abs(diffDays)} ימים`, class: "text-red-600 font-medium" };
  if (diffDays === 0) return { text: "היום", class: "text-amber-600 font-medium" };
  if (diffDays === 1) return { text: "מחר", class: "text-gray-700" };
  return { text: `עוד ${diffDays} ימים`, class: "text-gray-500" };
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
    <div className="overflow-hidden rounded-xl border border-gray-200/60 bg-white shadow-sm">
      <table className="w-full text-right text-sm">
        <thead>
          <tr className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
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
          {tasks.map((t, i) => {
            const overdue = ["מחכה לטיפול", "נכנס לעבודה", "בעבודה"].includes(t.status) && t.due_date && t.due_date < today;
            const { text: dateText, class: dateClass } = relativeDate(t.due_date);
            return (
              <tr
                key={t.id}
                onClick={() => onRowClick(t)}
                className={`group cursor-pointer transition-colors duration-150 hover:bg-blue-50/40 ${i % 2 === 1 ? "bg-gray-50/30" : ""}`}
              >
                <td className="px-4 py-3 align-middle">
                  <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                </td>
                <td className="max-w-xs px-4 py-3 align-middle">
                  <div className="font-medium text-gray-900">{t.title}</div>
                  {t.description && (
                    <div className="mt-0.5 max-w-xs truncate text-sm text-gray-500">{t.description}</div>
                  )}
                  {/* Client visible on mobile only */}
                  <div className="mt-0.5 text-sm text-gray-400 md:hidden">{t.client?.name ?? ""}</div>
                </td>
                <td className="hidden px-4 py-3 align-middle md:table-cell">
                  {t.client?.name ? (
                    <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-sm text-gray-600">{t.client.name}</span>
                  ) : (
                    <span className="text-gray-400">{"\u2014"}</span>
                  )}
                </td>
                <td className="hidden px-4 py-3 align-middle lg:table-cell">
                  {t.assignees.length === 0 ? (
                    <span className="text-gray-400">{"\u2014"}</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-700">
                        {getInitials(t.assignees[0].full_name)}
                      </span>
                      <span className="text-sm text-gray-700">{t.assignees[0].full_name}</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 align-middle">
                  <span className={`inline-flex items-center gap-1 text-sm ${dateClass}`}>
                    {overdue && <AlertTriangle className="h-3.5 w-3.5" />}
                    {!overdue && t.due_date && <Clock className="h-3.5 w-3.5 text-gray-400" />}
                    {dateText}
                  </span>
                </td>
                <td className="hidden px-4 py-3 align-middle sm:table-cell">
                  {t.source === "telegram" ? (
                    <span className="inline-flex items-center rounded-full bg-purple-100 p-1.5 text-purple-600" title="טלגרם"><Send className="h-3.5 w-3.5" /></span>
                  ) : t.source === "web" ? (
                    <span className="inline-flex items-center rounded-full bg-gray-100 p-1.5 text-gray-500" title="ממשק"><Globe className="h-3.5 w-3.5" /></span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-100 p-1.5 text-gray-500" title="ייבוא"><Download className="h-3.5 w-3.5" /></span>
                  )}
                </td>
                <td className="w-8 px-2 text-end text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">
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
