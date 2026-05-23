import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "active" | "done" | "closed" | "neutral" | "warning" | "danger" | "good";

const VARIANT_CLASSES: Record<Variant, string> = {
  active: "bg-blue-50 text-blue-700",
  done: "bg-green-50 text-green-700",
  closed: "bg-gray-100 text-gray-500",
  neutral: "bg-gray-100 text-gray-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  good: "bg-green-50 text-green-700",
};

export function Badge({
  variant = "neutral",
  className,
  ...props
}: { variant?: Variant } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
}

export function statusVariant(status: string): Variant {
  if (status === "בעבודה") return "active";
  if (status === "בוצע") return "done";
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
