import * as React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({ icon, title, description, action, className }: {
  icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-white px-6 py-12 text-center", className)}>
      {icon && <div className="text-3xl text-ink-muted">{icon}</div>}
      <div className="flex flex-col gap-1">
        <h3 className="text-body-md font-semibold text-ink">{title}</h3>
        {description && <p className="text-body-sm text-ink-secondary">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
