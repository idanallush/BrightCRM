import * as React from "react";
import { cn } from "@/lib/utils";

// Monday.com status cell colors — full bg with white text
const STATUS_CELL: Record<string, { bg: string; text: string }> = {
  "מחכה לטיפול": { bg: "bg-st-waiting", text: "text-white" },
  "נכנס לעבודה": { bg: "bg-st-incoming", text: "text-white" },
  "בעבודה": { bg: "bg-st-working", text: "text-white" },
  "אישור לקוח": { bg: "bg-st-approval", text: "text-[#323338]" },
  "אישור מנהל": { bg: "bg-st-manager", text: "text-white" },
  "בוצע": { bg: "bg-st-done", text: "text-white" },
  "בוטל": { bg: "bg-st-cancelled", text: "text-white" },
  "סגור": { bg: "bg-st-cancelled", text: "text-white" },
};

const STATUS_LABELS: Record<string, string> = {
  "מחכה לטיפול": "ממתין",
  "נכנס לעבודה": "נכנס לעבודה",
  "בעבודה": "בעבודה",
  "אישור לקוח": "אישור לקוח",
  "אישור מנהל": "אישור מנהל",
  "בוצע": "בוצע",
  "בוטל": "בוטל",
  "סגור": "סגור",
};

const HEALTH_CELL: Record<string, { bg: string; text: string }> = {
  "בריא": { bg: "bg-health-good", text: "text-white" },
  "אסטרטגיה צריכה": { bg: "bg-health-strategy", text: "text-white" },
  "קריטי": { bg: "bg-health-critical", text: "text-white" },
};

/** Monday.com full-colored status cell */
export function StatusCell({ status, className }: { status: string; className?: string }) {
  const style = STATUS_CELL[status] ?? { bg: "bg-gray-400", text: "text-white" };
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span className={cn(
      "inline-block min-w-[90px] rounded-md px-3 py-1.5 text-center text-sm font-medium",
      style.bg, style.text, className,
    )}>
      {label}
    </span>
  );
}

/** Monday.com full-colored health cell */
export function HealthCell({ health, className }: { health: string; className?: string }) {
  const style = HEALTH_CELL[health] ?? { bg: "bg-gray-400", text: "text-white" };
  return (
    <span className={cn(
      "inline-block min-w-[80px] rounded-md px-3 py-1.5 text-center text-sm font-medium",
      style.bg, style.text, className,
    )}>
      {health}
    </span>
  );
}

// Legacy compat aliases
export const StatusBadge = StatusCell;
export const HealthBadge = HealthCell;

type Variant = "waiting" | "incoming" | "working" | "approval" | "manager" | "done" | "cancelled" | "overdue" | "neutral" | "good" | "warning" | "danger";

const VARIANT_CELL: Record<Variant, { bg: string; text: string }> = {
  waiting: { bg: "bg-st-waiting", text: "text-white" },
  incoming: { bg: "bg-st-incoming", text: "text-white" },
  working: { bg: "bg-st-working", text: "text-white" },
  approval: { bg: "bg-st-approval", text: "text-[#323338]" },
  manager: { bg: "bg-st-manager", text: "text-white" },
  done: { bg: "bg-st-done", text: "text-white" },
  cancelled: { bg: "bg-st-cancelled", text: "text-white" },
  overdue: { bg: "bg-overdue", text: "text-white" },
  neutral: { bg: "bg-gray-400", text: "text-white" },
  good: { bg: "bg-health-good", text: "text-white" },
  warning: { bg: "bg-health-strategy", text: "text-white" },
  danger: { bg: "bg-health-critical", text: "text-white" },
};

export function Badge({ variant = "neutral", className, ...props }: { variant?: Variant } & React.HTMLAttributes<HTMLSpanElement>) {
  const style = VARIANT_CELL[variant];
  return (
    <span className={cn(
      "inline-block min-w-[80px] rounded-md px-3 py-1.5 text-center text-sm font-medium",
      style.bg, style.text, className,
    )} {...props}>
      {props.children}
    </span>
  );
}

export function statusVariant(status: string): Variant {
  if (status === "מחכה לטיפול") return "waiting";
  if (status === "נכנס לעבודה") return "incoming";
  if (status === "בעבודה") return "working";
  if (status === "אישור לקוח") return "approval";
  if (status === "אישור מנהל") return "manager";
  if (status === "בוצע") return "done";
  if (status === "בוטל" || status === "סגור") return "cancelled";
  return "neutral";
}

export function healthVariant(health: string | null): Variant | null {
  if (!health) return null;
  if (health === "בריא") return "good";
  if (health === "אסטרטגיה צריכה") return "warning";
  if (health === "קריטי") return "danger";
  return "neutral";
}

/** Raw color strings for use in inline styles (kanban, group headers) */
export const STATUS_COLORS: Record<string, string> = {
  "מחכה לטיפול": "#FDAB3D",
  "נכנס לעבודה": "#0073EA",
  "בעבודה": "#A25DDC",
  "אישור לקוח": "#FFCB00",
  "אישור מנהל": "#FF642E",
  "בוצע": "#00C875",
  "בוטל": "#C4C4C4",
  "סגור": "#C4C4C4",
};
