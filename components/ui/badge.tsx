import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "active" | "done" | "closed" | "neutral" | "warning" | "danger" | "good";

const VARIANT_CLASSES: Record<Variant, string> = {
  active: "bg-[color:var(--color-status-active)]/10 text-[color:var(--color-status-active)]",
  done: "bg-[color:var(--color-status-done)]/10 text-[color:var(--color-status-done)]",
  closed: "bg-black/5 text-[color:var(--color-ink-muted)]",
  neutral: "bg-black/5 text-[color:var(--color-ink)]",
  warning: "bg-[color:var(--color-health-strategy)]/15 text-[color:var(--color-health-strategy)]",
  danger: "bg-[color:var(--color-health-critical)]/10 text-[color:var(--color-health-critical)]",
  good: "bg-[color:var(--color-health-good)]/10 text-[color:var(--color-health-good)]",
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
