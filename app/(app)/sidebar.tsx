"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  PanelRightOpen,
  PanelRightClose,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileMenu } from "./shell-context";
import * as React from "react";

const NAV = [
  { href: "/dashboard", label: "דשבורד", Icon: LayoutDashboard },
  { href: "/tasks", label: "משימות", Icon: CheckSquare },
  { href: "/clients", label: "לקוחות", Icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const { mobileOpen, setMobileOpen } = useMobileMenu();

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  const navContent = (isMobile: boolean) => (
    <>
      <div className="flex h-16 items-center justify-between border-b border-hairline-soft px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-white">
            B
          </span>
          {(!collapsed || isMobile) && (
            <span className="font-display text-[15px] font-semibold tracking-display-tight text-ink">
              BrightCRM
            </span>
          )}
        </Link>
        {!isMobile && (
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-card hover:text-ink"
          >
            {collapsed ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </button>
        )}
        {isMobile && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1 text-ink-muted"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="mt-3 flex flex-col gap-0.5 px-3">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150",
                active
                  ? "bg-surface-card font-semibold text-ink"
                  : "text-ink-muted hover:bg-surface-soft hover:text-ink",
                !isMobile && collapsed && "justify-center px-0",
              )}
              title={label}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {(isMobile || !collapsed) && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-l border-hairline bg-canvas transition-all duration-300 md:flex",
          collapsed ? "w-16" : "w-60",
        )}
      >
        {navContent(false)}
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-72 transform bg-canvas shadow-card transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        {navContent(true)}
      </aside>
    </>
  );
}
