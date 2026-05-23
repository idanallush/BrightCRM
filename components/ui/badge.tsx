import * as React from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "waiting" | "incoming" | "working" | "approval" | "manager"
  | "done" | "cancelled" | "overdue"
  | "neutral" | "good" | "warning" | "danger";

const VARIANT_CLASSES: Record<Variant, string> = {
  waiting:   "bg-st-waiting-bg text-st-waiting",
  incoming:  "bg-st-incoming-bg text-st-incoming",
  working:   "bg-st-working-bg text-st-working",
  approval:  "bg-st-approval-bg text-st-approval",
  manager:   "bg-st-manager-bg text-st-manager",
  done:      "bg-st-done-bg text-st-done",
  cancelled: "bg-st-cancelled-bg text-st-cancelled",
  overdue:   "bg-overdue-bg text-overdue",
  neutral:   "bg-gray-100 text-ink-secondary",
  good:      "bg-success-bg text-success",
  warning:   "bg-warning-bg text-warning",
  danger:    "bg-overdue-bg text-overdue",
};

export function Badge({
  variant = "neutral",
  className,
  ...props
}: { variant?: Variant } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-medium",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
}

export function statusVariant(status: string): Variant {
  if (status === "מחכה לטיפול") return "waiting";
  if (status === "נכנס לעבודה") return "incoming";
  if (status === "בעבודה") return "working";
  if (status === "אישור לקוח") return "approval";
  if (status === "אישור מנהל") return "manager";
  if (status === "בוצע") return "done";
  if (status === "בוטל") return "cancelled";
  if (status === "סגור") return "cancelled";
  return "neutral";
}

export function healthVariant(health: string | null): Variant | null {
  if (!health) return null;
  if (health === "בריא") return "good";
  if (health === "אסטרטגיה צריכה") return "warning";
  if (health === "קריטי") return "danger";
  return "neutral";
}
