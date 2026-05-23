"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CheckSquare, Users, Settings, Info,
  ChevronsLeft, ChevronsRight, X, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileMenu, useSidebarCollapsed } from "./shell-context";
import { NotificationBell } from "@/components/notification-bell";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_MAIN = [
  { href: "/dashboard", label: "דשבורד", Icon: LayoutDashboard },
  { href: "/tasks", label: "משימות", Icon: CheckSquare },
  { href: "/clients", label: "לקוחות", Icon: Users },
];

const NAV_BOTTOM = [
  { href: "/settings", label: "הגדרות", Icon: Settings },
  { href: "/about", label: "אודות", Icon: Info },
];

function getInitials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export function Sidebar({ userLabel }: { userLabel: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, setCollapsed } = useSidebarCollapsed();
  const { mobileOpen, setMobileOpen } = useMobileMenu();

  React.useEffect(() => { setMobileOpen(false); }, [pathname, setMobileOpen]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = getInitials(userLabel);

  function NavLink({ href, label, Icon, isMobile, index }: {
    href: string; label: string; Icon: React.ComponentType<{ className?: string }>; isMobile: boolean; index: number;
  }) {
    const active = pathname === href || pathname.startsWith(href + "/");
    const link = (
      <Link href={href} aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
          active ? "bg-brand-light font-semibold text-brand" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
          !isMobile && collapsed && "justify-center px-0",
        )} title={label}>
        {active && <span className="absolute right-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-l-full bg-brand" />}
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {(isMobile || !collapsed) && <span>{label}</span>}
      </Link>
    );
    if (isMobile) {
      return (
        <motion.div key={href} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.04, duration: 0.2 }}>
          {link}
        </motion.div>
      );
    }
    return <div key={href}>{link}</div>;
  }

  const sidebarContent = (isMobile: boolean) => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white shadow-sm">B</span>
          {(!collapsed || isMobile) && (
            <span className="text-[15px] font-semibold text-gray-900">Bright<span className="text-brand">CRM</span></span>
          )}
        </Link>
        <div className="flex items-center gap-1">
          {(!collapsed || isMobile) && <NotificationBell />}
          {!isMobile && (
            <button type="button" onClick={() => setCollapsed((v) => !v)}
              className="rounded-lg p-1.5 text-gray-400 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-600">
              {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            </button>
          )}
          {isMobile && (
            <button type="button" onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-gray-400">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <nav className="mt-2 flex flex-col gap-1 px-3">
        {NAV_MAIN.map((item, i) => <NavLink key={item.href} {...item} isMobile={isMobile} index={i} />)}
      </nav>

      <div className="flex-1" />

      <div className="flex flex-col gap-1 border-t border-gray-200 px-3 pt-2 pb-1">
        {NAV_BOTTOM.map((item, i) => <NavLink key={item.href} {...item} isMobile={isMobile} index={NAV_MAIN.length + i} />)}
      </div>

      <div className="shrink-0 border-t border-gray-200 p-3">
        <div className={cn("flex items-center gap-3 rounded-lg px-2 py-2", collapsed && !isMobile && "justify-center px-0")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-light text-[11px] font-semibold text-brand">{initials}</div>
          {(isMobile || !collapsed) && (
            <div className="flex min-w-0 flex-1 items-center justify-between">
              <span className="truncate text-sm text-gray-900">{userLabel}</span>
              <button type="button" onClick={signOut} className="rounded-lg p-1.5 text-gray-400 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-600" title="התנתקות">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar — fixed */}
      <aside className={cn(
        "fixed inset-y-0 right-0 z-30 hidden flex-col border-l border-gray-200 bg-white transition-all duration-300 md:flex",
        collapsed ? "w-16" : "w-60",
      )}>
        {sidebarContent(false)}
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
        )}
      </AnimatePresence>
      {/* Mobile drawer */}
      <aside className={cn(
        "fixed inset-y-0 right-0 z-50 w-72 transform bg-white shadow-overlay transition-transform duration-300 md:hidden",
        mobileOpen ? "translate-x-0" : "translate-x-full",
      )}>
        {sidebarContent(true)}
      </aside>
    </>
  );
}
