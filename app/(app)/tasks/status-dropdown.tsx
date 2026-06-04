"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { updateTaskStatus } from "./actions";
import { toast } from "@/components/ui/toaster";

const ALL_STATUSES = ["מחכה לטיפול", "נכנס לעבודה", "אישור לקוח", "בוצע"] as const;

export const STATUS_LABELS: Record<string, string> = {
  "מחכה לטיפול": "ממתין",
  "נכנס לעבודה": "נכנס לעבודה",
  "אישור לקוח": "אישור לקוח",
  "בוצע": "בוצע",
};

export const STATUS_BG: Record<string, string> = {
  "מחכה לטיפול": "bg-st-waiting-bg",
  "נכנס לעבודה": "bg-st-incoming-bg",
  "אישור לקוח":  "bg-st-approval-bg",
  "בוצע":        "bg-st-done-bg",
};

export const STATUS_TEXT: Record<string, string> = {
  "מחכה לטיפול": "text-st-waiting-text",
  "נכנס לעבודה": "text-st-incoming-text",
  "אישור לקוח":  "text-st-approval-text",
  "בוצע":        "text-st-done-text",
};

export function StatusDropdown({ taskId, status, onUpdated }: { taskId: string; status: string; onUpdated: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [current, setCurrent] = React.useState(status);
  const [loading, setLoading] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => { setCurrent(status); }, [status]);

  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function pick(next: string) {
    if (next === current) { setOpen(false); return; }
    setCurrent(next);
    setOpen(false);
    setLoading(true);
    const res = await updateTaskStatus(taskId, next);
    setLoading(false);
    if ("error" in res) { toast.error(res.error); setCurrent(status); return; }
    onUpdated();
  }

  const bg = STATUS_BG[current] ?? "bg-st-cancelled";
  const text = STATUS_TEXT[current] ?? "text-white";
  const label = STATUS_LABELS[current] ?? current;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={`inline-flex min-w-[90px] items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-center text-sm font-medium transition-opacity ${bg} ${text} ${loading ? "opacity-60" : "hover:opacity-90"}`}
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 min-w-[150px] overflow-hidden rounded-xl border border-border bg-white shadow-elevation-3"
          onClick={(e) => e.stopPropagation()}
        >
          {ALL_STATUSES.map((s) => {
            const sBg = STATUS_BG[s] ?? "bg-st-cancelled";
            const sLabel = STATUS_LABELS[s] ?? s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => pick(s)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-right text-sm transition-colors hover:bg-surface ${s === current ? "font-semibold" : ""}`}
              >
                <span className={`inline-block h-3 w-3 rounded-full ${sBg}`} />
                <span className="text-ink">{sLabel}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
