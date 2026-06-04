"use client";

import { Menu } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { useMobileMenu } from "./shell-context";
import { Logo } from "@/components/logo";
import Link from "next/link";

export function MobileTopBar() {
  const { setMobileOpen } = useMobileMenu();
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-white/80 px-4 backdrop-blur-md md:hidden">
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-surface hover:text-ink"
        aria-label="תפריט"
      >
        <Menu className="h-5 w-5" />
      </button>
      <Link href="/dashboard">
        <Logo size="sm" />
      </Link>
      <NotificationBell />
    </header>
  );
}
