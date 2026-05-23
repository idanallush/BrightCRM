"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CheckSquare, Users, Settings, Info, ChevronsLeft, ChevronsRight, X, LogOut } from "lucide-react";
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

function getInitials(name: string) { return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2); }

export function Sidebar({ userLabel }: { userLabel: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, setCollapsed } = useSidebarCollapsed();
  const { mobileOpen, setMobileOpen } = useMobileMenu();
  React.useEffect(() => { setMobileOpen(false); }, [pathname, setMobileOpen]);

  async function signOut() { const sb = createClient(); await sb.auth.signOut(); router.push("/login"); router.refresh(); }
  const initials = getInitials(userLabel);

  function NavLink({ href, label, Icon, isMobile, index }: { href: string; label: string; Icon: React.ComponentType<{ className?: string }>; isMobile: boolean; index: number }) {
    const active = pathname === href || pathname.startsWith(href + "/");
    const link = (
      <Link href={href} aria-current={active ? "page" : undefined}
        className={cn("group relative flex items-center gap-3 rounded-md px-3 py-2 text-body-sm transition-all duration-150",
          active ? "bg-gray-100 font-semibold text-ink" : "text-ink-secondary hover:bg-gray-50 hover:text-ink",
          !isMobile && collapsed && "justify-center px-0",
        )} title={label}>
        {active && <span className="absolute right-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-l-full bg-ink" />}
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {(isMobile || !collapsed) && <span>{label}</span>}
      </Link>
    );
    if (isMobile) return <motion.div key={href} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04, duration: 0.2 }}>{link}</motion.div>;
    return <div key={href}>{link}</div>;
  }

  const content = (isMobile: boolean) => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-body-sm font-bold text-white">B</span>
          {(!collapsed || isMobile) && <span className="text-body-sm font-semibold text-ink">Bright<span className="text-accent">.</span>CRM</span>}
        </Link>
        <div className="flex items-center gap-1">
          {(!collapsed || isMobile) && <NotificationBell />}
          {!isMobile && <button type="button" onClick={() => setCollapsed((v) => !v)} className="rounded-sm p-1.5 text-stone transition-colors duration-150 hover:bg-surface hover:text-ink">
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>}
          {isMobile && <button type="button" onClick={() => setMobileOpen(false)} className="rounded-sm p-1.5 text-stone"><X className="h-5 w-5" /></button>}
        </div>
      </div>
      <nav className="mt-1 flex flex-col gap-0.5 px-3">{NAV_MAIN.map((item, i) => <NavLink key={item.href} {...item} isMobile={isMobile} index={i} />)}</nav>
      <div className="flex-1" />
      <div className="flex flex-col gap-0.5 border-t border-border px-3 pt-2 pb-1">{NAV_BOTTOM.map((item, i) => <NavLink key={item.href} {...item} isMobile={isMobile} index={NAV_MAIN.length + i} />)}</div>
      <div className="shrink-0 border-t border-border p-3">
        <div className={cn("flex items-center gap-3 rounded-md px-2 py-2", collapsed && !isMobile && "justify-center px-0")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-caption text-ink">{initials}</div>
          {(isMobile || !collapsed) && <div className="flex min-w-0 flex-1 items-center justify-between">
            <span className="truncate text-body-sm text-ink">{userLabel}</span>
            <button type="button" onClick={signOut} className="rounded-sm p-1.5 text-stone transition-colors duration-150 hover:bg-surface hover:text-ink" title="התנתקות"><LogOut className="h-4 w-4" /></button>
          </div>}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className={cn("fixed inset-y-0 right-0 z-30 hidden flex-col border-l border-border bg-canvas transition-all duration-300 md:flex", collapsed ? "w-16" : "w-60")}>{content(false)}</aside>
      <AnimatePresence>{mobileOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setMobileOpen(false)} />}</AnimatePresence>
      <aside className={cn("fixed inset-y-0 right-0 z-50 w-72 transform bg-canvas shadow-lg transition-transform duration-300 md:hidden", mobileOpen ? "translate-x-0" : "translate-x-full")}>{content(true)}</aside>
    </>
  );
}
