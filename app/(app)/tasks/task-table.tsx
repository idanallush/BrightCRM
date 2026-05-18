"use client";

import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge, statusVariant } from "@/components/ui/badge";
import type { TaskWithRelations } from "@/lib/data";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("he-IL") : "—";

export function TaskTable({
  tasks,
  onRowClick,
}: {
  tasks: TaskWithRelations[];
  onRowClick: (t: TaskWithRelations) => void;
}) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-[18px] border border-[color:var(--color-hairline)] bg-white p-10 text-center text-sm text-[color:var(--color-ink-muted)]">
        אין משימות תואמות לפילטר.
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-[18px] border border-[color:var(--color-hairline)] bg-white">
      <Table>
        <THead>
          <TR>
            <TH>כותרת</TH>
            <TH>לקוח</TH>
            <TH>סטטוס</TH>
            <TH>תאריך יעד</TH>
            <TH>אחראי</TH>
          </TR>
        </THead>
        <TBody>
          {tasks.map((t) => {
            const overdue =
              t.status === "בעבודה" && t.due_date && t.due_date < today;
            return (
              <TR
                key={t.id}
                onClick={() => onRowClick(t)}
                className="cursor-pointer"
              >
                <TD className="font-medium">{t.title}</TD>
                <TD className="text-[color:var(--color-ink-muted)]">
                  {t.client?.name ?? "—"}
                </TD>
                <TD>
                  <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                </TD>
                <TD
                  className={
                    overdue
                      ? "font-medium text-[color:var(--color-health-critical)]"
                      : "text-[color:var(--color-ink-muted)]"
                  }
                >
                  {fmtDate(t.due_date)}
                </TD>
                <TD className="text-[color:var(--color-ink-muted)]">
                  {t.assignees.length === 0
                    ? "—"
                    : t.assignees.map((a) => a.full_name).join(", ")}
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
