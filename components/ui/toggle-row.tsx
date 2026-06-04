"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function ToggleRow({
  label,
  icon,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  icon?: React.ReactNode;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
      <span className="flex items-center gap-2 text-sm text-ink">
        {icon}
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50",
          checked ? "bg-primary" : "bg-border",
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow-elevation-1 transition-transform duration-150",
            checked ? "-translate-x-0.5" : "-translate-x-[22px]",
          )}
        />
      </button>
    </div>
  );
}
