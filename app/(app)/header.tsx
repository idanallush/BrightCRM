"use client";

import { Menu } from "lucide-react";
import { GlobalSearch } from "@/components/global-search";
import { NotificationBell } from "@/components/notification-bell";
import { WeeklyMotivator } from "@/components/weekly-motivator";
import { useMobileMenu } from "./shell-context";

export function Header() {
  const { setMobileOpen } = useMobileMenu();
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-white/80 backdrop-blur-md px-4 md:px-6">
      <button type="button" onClick={() => setMobileOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-surface hover:text-ink md:hidden" aria-label="תפריט">
        <Menu className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1"><GlobalSearch /></div>
      <WeeklyMotivator />
      <div className="md:hidden"><NotificationBell /></div>
    </header>
  );
}
