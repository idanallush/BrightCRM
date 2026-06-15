"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { ClientLogo } from "@/components/client-logo";
import type { Client } from "@/lib/data";

export const GENERAL_OPTION = "__general__";

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

  const selectedClient = value !== GENERAL_OPTION ? clients.find((c) => c.id === value) : null;
  const triggerLabel = value === GENERAL_OPTION
    ? "כללי (לכולם)"
    : selectedClient?.name ?? "בחר לקוח";

  const heightClass = size === "sm" ? "h-9 text-sm" : "h-10 text-sm";

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
      >
        <Command
          // Hebrew-aware case-insensitive partial match. cmdk's default filter only handles ASCII well.
          filter={(itemValue, search) => {
            if (!search) return 1;
            return itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="חיפוש לקוח..." dir="rtl" />
          <CommandList>
            <CommandEmpty>לא נמצא לקוח</CommandEmpty>
            {includeGeneral && (
              <>
                <CommandGroup>
                  <CommandItem
                    value="כללי לכולם"
                    onSelect={() => {
                      onChange(GENERAL_OPTION);
                      setOpen(false);
                    }}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent/30 text-[9px] font-bold text-ink">
                      כל
                    </span>
                    <span className="flex-1 truncate">כללי (לכולם)</span>
                    <Check
                      className={cn(
                        "h-4 w-4",
                        value === GENERAL_OPTION ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            <CommandGroup>
              {clients.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.name}
                  onSelect={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                >
                  <ClientLogo
                    logoUrl={c.logo_url}
                    logoStoragePath={c.logo_storage_path}
                    name={c.name}
                    size="sm"
                  />
                  <span className="flex-1 truncate">{c.name}</span>
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value === c.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
