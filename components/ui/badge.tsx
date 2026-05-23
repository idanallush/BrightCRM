import * as React from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "waiting" | "incoming" | "working" | "approval" | "manager"
  | "done" | "cancelled" | "overdue"
  | "neutral" | "good" | "warning" | "danger"
  | "purple" | "pink" | "orange";

const VARIANT_CLASSES: Record<Variant, string> = {
  waiting:   "bg-tint-yellow text-st-waiting",
  incoming:  "bg-tint-sky text-st-incoming",
  working:   "bg-tint-lavender text-st-working",
  approval:  "bg-tint-peach text-st-approval",
  manager:   "bg-tint-rose text-st-manager",
  done:      "bg-tint-mint text-st-done",
  cancelled: "bg-surface text-slate",
  overdue:   "bg-overdue-bg text-overdue",
  neutral:   "bg-surface text-slate",
  good:      "bg-tint-mint text-b-green",
  warning:   "bg-tint-yellow text-b-orange",
  danger:    "bg-overdue-bg text-overdue",
  purple:    "bg-primary text-white",
  pink:      "bg-b-pink text-white",
  orange:    "bg-b-orange text-white",
};

const DOT_COLORS: Partial<Record<Variant, string>> = {
  waiting: "bg-st-waiting", incoming: "bg-st-incoming", working: "bg-st-working",
  approval: "bg-st-approval", manager: "bg-st-manager", done: "bg-st-done",
  cancelled: "bg-slate", overdue: "bg-overdue", good: "bg-b-green",
  warning: "bg-b-orange", danger: "bg-overdue",
};

export function Badge({
  variant = "neutral", dot = true, className, ...props
}: { variant?: Variant; dot?: boolean } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-caption", VARIANT_CLASSES[variant], className)} {...props}>
      {dot && DOT_COLORS[variant] && <span className={cn("h-2 w-2 shrink-0 rounded-full", DOT_COLORS[variant])} />}
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
