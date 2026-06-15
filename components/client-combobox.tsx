"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ClientLogo } from "@/components/client-logo";
import type { Client } from "@/lib/data";

// Why this is plain HTML inside a Popover (no cmdk):
// cmdk's internal focus + aria-activedescendant management fights Radix Dialog's
// FocusScope when the combobox is rendered inside a Dialog. With modal=true on
// the Popover the click works but typing into CommandInput silently fails. We
// reuse Radix Popover for positioning + portal + DismissableLayer interaction,
// but render a plain <input> and a filtered list — same UX, no focus war.

export const GENERAL_OPTION = "__general__";

type Option = { id: string; name: string; client?: Client };

export function ClientCombobox({
  value,
  onChange,
  clients,
  size = "md",
  includeGeneral = true,
}: {
  value: string;
  onChange: (next: string) => void;
  clients: Client[];
  size?: "sm" | "md";
  includeGeneral?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIdx, setActiveIdx] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const itemRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const options = React.useMemo<Option[]>(() => {
    const opts: Option[] = [];
    if (includeGeneral) opts.push({ id: GENERAL_OPTION, name: "כללי (לכולם)" });
    for (const c of clients) opts.push({ id: c.id, name: c.name, client: c });
    return opts;
  }, [clients, includeGeneral]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, query]);

  // Reset state each time the popover opens.
  React.useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
    }
  }, [open]);

  // Keep highlighted item in range and scrolled into view as the list filters.
  React.useEffect(() => {
    if (activeIdx >= filtered.length) {
      setActiveIdx(Math.max(0, filtered.length - 1));
      return;
    }
    itemRefs.current[activeIdx]?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, filtered.length]);

  function pick(idx: number) {
    const opt = filtered[idx];
    if (!opt) return;
    onChange(opt.id);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(activeIdx);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIdx(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIdx(Math.max(0, filtered.length - 1));
    }
  }

  const selectedClient = value !== GENERAL_OPTION ? clients.find((c) => c.id === value) : null;
  const triggerLabel = value === GENERAL_OPTION
    ? "כללי (לכולם)"
    : selectedClient?.name ?? "בחר לקוח";

  const heightClass = size === "sm" ? "h-9 text-sm" : "h-10 text-sm";

  return (
    // modal=true keeps the trigger clickable when this lives inside a Radix Dialog.
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          dir="rtl"
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-md border border-border bg-white px-3 text-ink transition-colors hover:bg-surface/50 focus:outline-none focus:ring-2 focus:ring-link/30",
            heightClass,
          )}
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            {value === GENERAL_OPTION ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent/30 text-[9px] font-bold text-ink">
                כל
              </span>
            ) : selectedClient ? (
              <ClientLogo
                logoUrl={selectedClient.logo_url}
                logoStoragePath={selectedClient.logo_storage_path}
                name={selectedClient.name}
                size="sm"
              />
            ) : null}
            <span className="truncate">{triggerLabel}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-ink-muted" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        dir="rtl"
        // Stop Radix from auto-focusing the first descendant button; we want the input.
        // Also blocks the focus from bouncing back to the trigger when Dialog wraps us.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 shrink-0 text-ink-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="חיפוש לקוח..."
            dir="rtl"
            autoComplete="off"
            spellCheck={false}
            className="flex h-10 w-full bg-transparent py-3 text-sm text-ink placeholder:text-ink-muted outline-none"
          />
        </div>
        <div className="max-h-[260px] overflow-y-auto overflow-x-hidden p-1">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-ink-muted">לא נמצא לקוח</div>
          ) : (
            filtered.map((opt, i) => {
              const isActive = i === activeIdx;
              const isSelected = opt.id === value;
              return (
                <button
                  key={opt.id}
                  ref={(el) => { itemRefs.current[i] = el; }}
                  type="button"
                  // Use onMouseDown (not onClick) so the click registers before
                  // the input blur closes the popover.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(i);
                  }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-ink outline-none",
                    "text-start",
                    isActive && "bg-surface",
                  )}
                >
                  {opt.id === GENERAL_OPTION ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent/30 text-[9px] font-bold text-ink">
                      כל
                    </span>
                  ) : opt.client ? (
                    <ClientLogo
                      logoUrl={opt.client.logo_url}
                      logoStoragePath={opt.client.logo_storage_path}
                      name={opt.client.name}
                      size="sm"
                    />
                  ) : null}
                  <span className="flex-1 truncate">{opt.name}</span>
                  <Check
                    className={cn(
                      "h-4 w-4",
                      isSelected ? "opacity-100" : "opacity-0",
                    )}
                  />
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
