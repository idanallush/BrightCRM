"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeamMember } from "@/lib/data";

export function AssigneeDropdown({
  team, selected, onToggle, noun = "אחראים",
}: {
  team: TeamMember[];
  selected: string[];
  onToggle: (id: string) => void;
  noun?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const names = selected.map((id) => team.find((m) => m.id === id)?.full_name).filter(Boolean);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-9 w-full items-center justify-between rounded-xl border border-border bg-white px-2 text-sm text-ink transition-colors hover:bg-surface"
      >
        <span className="truncate">
          {names.length === 0 ? `בחר ${noun}` : names.length === 1 ? names[0] : `${names.length} ${noun}`}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
      </button>
      {open && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-xl border border-border bg-white py-1 shadow-elevation-3">
          {team.map((m) => {
            const active = selected.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onToggle(m.id)}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-sm text-ink transition-colors hover:bg-surface"
              >
                <span className={cn(
                  "flex h-4 w-4 items-center justify-center rounded border",
                  active ? "border-primary bg-primary text-white" : "border-border bg-white",
                )}>
                  {active && <Check className="h-3 w-3" />}
                </span>
                {m.full_name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
