import * as React from "react";
import { cn } from "@/lib/utils";

const STATUS_DOT: Record<string, string> = {
  "מחכה לטיפול": "bg-dot-waiting",
  "נכנס לעבודה": "bg-dot-incoming",
  "בעבודה": "bg-dot-working",
  "אישור לקוח": "bg-dot-approval",
  "אישור מנהל": "bg-dot-manager",
  "בוצע": "bg-dot-done",
  "בוטל": "bg-dot-cancelled",
  "סגור": "bg-dot-cancelled",
};

const HEALTH_DOT: Record<string, string> = {
  "בריא": "bg-health-good",
  "אסטרטגיה צריכה": "bg-health-strategy",
  "קריטי": "bg-health-critical",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const dot = STATUS_DOT[status] ?? "bg-gray-400";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-body-sm text-ink", className)}>
      <span className={cn("h-2 w-2 shrink-0 rounded-full", dot)} />
      {status}
    </span>
  );
}

export function HealthBadge({ health, className }: { health: string; className?: string }) {
  const dot = HEALTH_DOT[health] ?? "bg-gray-400";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-body-sm text-ink", className)}>
      <span className={cn("h-2 w-2 shrink-0 rounded-full", dot)} />
      {health}
    </span>
  );
}

// Legacy compat — still used by some pages
type Variant = "waiting" | "incoming" | "working" | "approval" | "manager" | "done" | "cancelled" | "overdue" | "neutral" | "good" | "warning" | "danger";

export function Badge({ variant = "neutral", dot = true, className, ...props }: { variant?: Variant; dot?: boolean } & React.HTMLAttributes<HTMLSpanElement>) {
  const dotMap: Record<Variant, string> = {
    waiting: "bg-dot-waiting", incoming: "bg-dot-incoming", working: "bg-dot-working",
    approval: "bg-dot-approval", manager: "bg-dot-manager", done: "bg-dot-done",
    cancelled: "bg-dot-cancelled", overdue: "bg-dot-overdue", neutral: "bg-gray-400",
    good: "bg-health-good", warning: "bg-health-strategy", danger: "bg-health-critical",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-body-sm text-ink", className)} {...props}>
      {dot && <span className={cn("h-2 w-2 shrink-0 rounded-full", dotMap[variant])} />}
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
