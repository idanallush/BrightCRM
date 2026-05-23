"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  Megaphone,
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
  { href: "/campaigns", label: "קמפיינים", Icon: Megaphone },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const { mobileOpen, setMobileOpen } = useMobileMenu();

  // Close mobile sidebar on navigation
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  const navContent = (isMobile: boolean) => (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
            B
          </span>
          {(!collapsed || isMobile) && (
            <span className="text-base font-semibold text-ink">
              Bright<span className="text-brand">CRM</span>
            </span>
          )}
        </Link>
        {!isMobile && (
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="text-ink-muted transition-colors hover:text-ink"
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
            className="text-ink-muted"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="mt-2 flex flex-col gap-1 px-3">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                active
                  ? "bg-brand-light font-semibold text-brand"
                  : "text-ink-muted hover:bg-gray-100 hover:text-ink",
                !isMobile && collapsed && "justify-center px-0",
              )}
              title={label}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {(isMobile || !collapsed) && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-l border-gray-200 bg-white transition-all duration-300 md:flex",
          collapsed ? "w-16" : "w-64",
        )}
      >
        {navContent(false)}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 transition-opacity md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-72 transform bg-white shadow-xl transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        {navContent(true)}
      </aside>
    </>
  );
}
