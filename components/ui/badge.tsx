import * as React from "react";
import { cn } from "@/lib/utils";

// Status cell colors — light bg with matched dark text
const STATUS_CELL: Record<string, { bg: string; text: string }> = {
  "מחכה לטיפול": { bg: "bg-st-waiting-bg",  text: "text-st-waiting-text" },
  "נכנס לעבודה": { bg: "bg-st-incoming-bg", text: "text-st-incoming-text" },
  "בעבודה":      { bg: "bg-st-working-bg",  text: "text-st-working-text" },
  "אישור לקוח":  { bg: "bg-st-approval-bg", text: "text-st-approval-text" },
  "בוצע":        { bg: "bg-st-done-bg",     text: "text-st-done-text" },
};

const STATUS_LABELS: Record<string, string> = {
  "מחכה לטיפול": "ממתין",
  "נכנס לעבודה": "נכנס לעבודה",
  "בעבודה": "בעבודה",
  "אישור לקוח": "אישור לקוח",
  "בוצע": "בוצע",
};

const HEALTH_CELL: Record<string, { bg: string; text: string }> = {
  "בריא": { bg: "bg-health-good-bg", text: "text-health-good-text" },
  "אסטרטגיה צריכה": { bg: "bg-health-strategy-bg", text: "text-health-strategy-text" },
  "קריטי": { bg: "bg-health-critical-bg", text: "text-health-critical-text" },
};

/** Full-colored status pill */
export function StatusCell({ status, className }: { status: string; className?: string }) {
  const style = STATUS_CELL[status] ?? { bg: "bg-st-cancelled", text: "text-white" };
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span className={cn(
      "inline-block min-w-[90px] rounded-full px-3 py-1.5 text-center text-sm font-medium",
      style.bg, style.text, className,
    )}>
      {label}
    </span>
  );
}

/** Full-colored health pill */
export function HealthCell({ health, className }: { health: string; className?: string }) {
  const style = HEALTH_CELL[health] ?? { bg: "bg-st-cancelled", text: "text-white" };
  return (
    <span className={cn(
      "inline-block min-w-[80px] rounded-full px-3 py-1.5 text-center text-sm font-medium",
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
  waiting:   { bg: "bg-st-waiting-bg",  text: "text-st-waiting-text" },
  incoming:  { bg: "bg-st-incoming-bg", text: "text-st-incoming-text" },
  working:   { bg: "bg-st-working-bg",  text: "text-st-working-text" },
  approval:  { bg: "bg-st-approval-bg", text: "text-st-approval-text" },
  manager:   { bg: "bg-st-manager",     text: "text-white" },
  done:      { bg: "bg-st-done-bg",     text: "text-st-done-text" },
  cancelled: { bg: "bg-st-cancelled",   text: "text-white" },
  overdue:   { bg: "bg-overdue-bg",     text: "text-overdue-text" },
  neutral:   { bg: "bg-st-cancelled",   text: "text-white" },
  good:      { bg: "bg-health-good-bg",      text: "text-health-good-text" },
  warning:   { bg: "bg-health-strategy-bg", text: "text-health-strategy-text" },
  danger:    { bg: "bg-health-critical-bg", text: "text-health-critical-text" },
};

export function Badge({ variant = "neutral", className, ...props }: { variant?: Variant } & React.HTMLAttributes<HTMLSpanElement>) {
  const style = VARIANT_CELL[variant];
  return (
    <span className={cn(
      "inline-block min-w-[80px] rounded-full px-3 py-1.5 text-center text-sm font-medium",
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
  if (status === "בוצע") return "done";
  return "neutral";
}

export function healthVariant(health: string | null): Variant | null {
  if (!health) return null;
  if (health === "בריא") return "good";
  if (health === "אסטרטגיה צריכה") return "warning";
  if (health === "קריטי") return "danger";
  return "neutral";
}

/** Raw saturated color strings (used for small dots/indicators only) */
export const STATUS_COLORS: Record<string, string> = {
  "מחכה לטיפול": "#FDAB3D",
  "נכנס לעבודה": "#4262FF",
  "בעבודה": "#A25DDC",
  "אישור לקוח": "#FFCB00",
  "בוצע": "#00C875",
};

/** Light background + dark text pairs for Studio Light treatment */
export const STATUS_LIGHT: Record<string, { bg: string; text: string; dot: string }> = {
  "מחכה לטיפול": { bg: "#FFF3E0", text: "#92400E", dot: "#FDAB3D" },
  "נכנס לעבודה": { bg: "#EEF2FF", text: "#2B42B0", dot: "#4262FF" },
  "בעבודה":      { bg: "#F5F3FF", text: "#5B21B6", dot: "#A25DDC" },
  "אישור לקוח":  { bg: "#FFFBEB", text: "#78350F", dot: "#FFCB00" },
  "בוצע":        { bg: "#ECFDF5", text: "#065F46", dot: "#00C875" },
};
