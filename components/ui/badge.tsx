import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "active" | "pending" | "done" | "closed" | "neutral" | "warning" | "danger" | "good";

const VARIANT_CLASSES: Record<Variant, string> = {
  active: "bg-accent/10 text-accent",
  pending: "bg-status-warning/10 text-status-warning",
  done: "bg-status-done/10 text-status-done",
  closed: "bg-surface-card text-ink-muted",
  neutral: "bg-surface-card text-ink",
  warning: "bg-status-warning/10 text-status-warning",
  danger: "bg-status-overdue/10 text-status-overdue",
  good: "bg-status-done/10 text-status-done",
};

export function Badge({
  variant = "neutral",
  className,
  ...props
}: { variant?: Variant } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-3 py-0.5 text-[13px] font-medium",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
}

export function statusVariant(status: string): Variant {
  if (status === "מחכה לטיפול") return "pending";
  if (status === "נכנס לעבודה") return "active";
  if (status === "בעבודה") return "active";
  if (status === "אישור לקוח") return "warning";
  if (status === "אישור מנהל") return "warning";
  if (status === "בוצע") return "done";
  if (status === "בוטל") return "closed";
  // Legacy
  if (status === "סגור") return "closed";
  return "neutral";
}

export function healthVariant(health: string | null): Variant | null {
  if (!health) return null;
  if (health === "בריא") return "good";
  if (health === "אסטרטגיה צריכה") return "warning";
  if (health === "קריטי") return "danger";
  return "neutral";
}
