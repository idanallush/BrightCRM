import * as React from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "waiting" | "incoming" | "working" | "approval" | "manager"
  | "done" | "cancelled" | "overdue"
  | "neutral" | "good" | "warning" | "danger";

const DOT_COLORS: Partial<Record<Variant, string>> = {
  waiting:   "bg-amber-500",
  incoming:  "bg-blue-500",
  working:   "bg-purple-500",
  approval:  "bg-orange-500",
  manager:   "bg-pink-500",
  done:      "bg-green-500",
  cancelled: "bg-gray-400",
  overdue:   "bg-red-500",
  good:      "bg-green-500",
  warning:   "bg-amber-500",
  danger:    "bg-red-500",
};

const VARIANT_CLASSES: Record<Variant, string> = {
  waiting:   "bg-amber-100 text-amber-700",
  incoming:  "bg-blue-100 text-blue-700",
  working:   "bg-purple-100 text-purple-700",
  approval:  "bg-orange-100 text-orange-700",
  manager:   "bg-pink-100 text-pink-700",
  done:      "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
  overdue:   "bg-red-100 text-red-700",
  neutral:   "bg-gray-100 text-gray-500",
  good:      "bg-green-100 text-green-700",
  warning:   "bg-amber-100 text-amber-700",
  danger:    "bg-red-100 text-red-700",
};

export function Badge({
  variant = "neutral",
  dot = true,
  className,
  ...props
}: { variant?: Variant; dot?: boolean } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-medium",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      {dot && DOT_COLORS[variant] && (
        <span className={cn("h-2 w-2 shrink-0 rounded-full", DOT_COLORS[variant])} />
      )}
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
