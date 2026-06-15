"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClientLogo } from "@/components/client-logo";
import type { Client } from "@/lib/data";

// Why no Radix Popover here:
// When this combobox lives inside a Radix Dialog, the Popover portal lands as a
// body sibling of the Dialog. Both Dialog and Popover (modal=true) apply
// inert/aria-hidden to each other's subtrees via react-remove-scroll +
// aria-hidden. The net result: the search input is focusable (cursor visible)
// but its subtree is inert, so keystrokes don't register. Two attempts with
// Radix Popover failed for this exact reason. We use the same inline-dropdown
// pattern the project's @mention dropdown uses, which works fine inside the
// Dialog: relative wrapper + absolute-positioned panel, no portal, no
// FocusScope.

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

  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
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

  // Reset query + focus input when the dropdown opens.
  React.useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Close on outside click. mousedown (not click) so a click inside the dropdown
  // doesn't first blur the input and then re-open via the trigger.
  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep highlighted item in view as the list filters.
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
    // Return focus to the trigger so Tab order remains natural.
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
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
      requestAnimationFrame(() => triggerRef.current?.focus());
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIdx(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIdx(Math.max(0, filtered.length - 1));
    } else if (e.key === "Tab") {
      // Let Tab close the menu and move focus normally.
      setOpen(false);
    }
  }

  function handleTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  }

  const selectedClient = value !== GENERAL_OPTION ? clients.find((c) => c.id === value) : null;
  const triggerLabel = value === GENERAL_OPTION
    ? "כללי (לכולם)"
    : selectedClient?.name ?? "בחר לקוח";

  const heightClass = size === "sm" ? "h-9 text-sm" : "h-10 text-sm";

  return (
    <div ref={wrapperRef} className="relative" dir="rtl">
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleTriggerKeyDown}
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

      {open && (
        <div
          className="absolute inset-x-0 top-full z-[100] mt-1 overflow-hidden rounded-xl border border-border bg-white shadow-elevation-3"
          role="listbox"
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
              onKeyDown={handleInputKeyDown}
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
                    role="option"
                    aria-selected={isSelected}
                    // onMouseDown + preventDefault so the click registers before
                    // the input loses focus (matches the @mention dropdown pattern).
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(i);
                    }}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-ink outline-none",
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
        </div>
      )}
    </div>
  );
}
