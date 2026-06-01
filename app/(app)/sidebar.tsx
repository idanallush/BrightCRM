"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CheckSquare, Users, Bot, Settings, Info, ChevronsLeft, ChevronsRight, X, LogOut, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileMenu, useSidebarCollapsed } from "./shell-context";
import { NotificationBell } from "@/components/notification-bell";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserAvatar } from "@/components/user-avatar";
import { Logo } from "@/components/logo";

const NAV_MAIN = [
  { href: "/dashboard", label: "דשבורד", Icon: LayoutDashboard },
  { href: "/tasks", label: "משימות", Icon: CheckSquare },
  { href: "/clients", label: "לקוחות", Icon: Users },
  { href: "/chat", label: "צ'אט AI", Icon: Bot },
];
const NAV_BOTTOM = [
  { href: "/profile", label: "פרופיל", Icon: UserCircle },
  { href: "/settings", label: "הגדרות", Icon: Settings },
  { href: "/about", label: "אודות", Icon: Info },
];

export function Sidebar({ userLabel, userAvatarUrl }: { userLabel: string; userAvatarUrl?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, setCollapsed } = useSidebarCollapsed();
  const { mobileOpen, setMobileOpen } = useMobileMenu();
  React.useEffect(() => { setMobileOpen(false); }, [pathname, setMobileOpen]);

  async function signOut() { const sb = createClient(); await sb.auth.signOut(); router.push("/login"); router.refresh(); }

  function NavLink({ href, label, Icon, isMobile, index }: { href: string; label: string; Icon: React.ComponentType<{ className?: string }>; isMobile: boolean; index: number }) {
    const active = pathname === href || pathname.startsWith(href + "/");
    const link = (
      <Link href={href} aria-current={active ? "page" : undefined}
        className={cn("group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm transition-colors duration-150",
          active
            ? "bg-white/10 font-semibold text-white"
            : "text-white/60 hover:bg-white/5 hover:text-white/90",
          !isMobile && collapsed && "justify-center px-0",
        )} title={label}>
        {active && <span className="absolute right-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-l-full bg-accent" />}
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
          <Logo size={collapsed && !isMobile ? "sm" : "md"} dark />
        </Link>
        <div className="flex items-center gap-1">
          {(!collapsed || isMobile) && <NotificationBell dark />}
          {!isMobile && <button type="button" onClick={() => setCollapsed((v) => !v)} aria-label={collapsed ? "הרחב תפריט" : "כווץ תפריט"} className="rounded-xl p-2 text-white/40 transition-colors duration-150 hover:bg-white/5 hover:text-white/80">
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>}
          {isMobile && <button type="button" onClick={() => setMobileOpen(false)} className="rounded-xl p-2.5 text-white/40 hover:text-white/80"><X className="h-5 w-5" /></button>}
        </div>
      </div>
      <nav className="mt-1 flex flex-col gap-0.5 px-3">{NAV_MAIN.map((item, i) => <NavLink key={item.href} {...item} isMobile={isMobile} index={i} />)}</nav>
      <div className="flex-1" />
      <div className="flex flex-col gap-0.5 border-t border-sidebar-border px-3 pt-2 pb-1">{NAV_BOTTOM.map((item, i) => <NavLink key={item.href} {...item} isMobile={isMobile} index={NAV_MAIN.length + i} />)}</div>
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div className={cn("flex items-center gap-3 rounded-xl px-2 py-2", collapsed && !isMobile && "justify-center px-0")}>
          <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-3 transition-opacity hover:opacity-80" title="פרופיל">
            <UserAvatar name={userLabel} avatarUrl={userAvatarUrl} size="sm" />
            {(isMobile || !collapsed) && <span className="truncate text-body-sm text-white/80">{userLabel}</span>}
          </Link>
          {(isMobile || !collapsed) && <button type="button" onClick={signOut} className="rounded-xl p-1.5 text-white/40 transition-colors duration-150 hover:bg-white/5 hover:text-white/80" title="התנתקות"><LogOut className="h-4 w-4" /></button>}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className={cn("fixed inset-y-0 right-0 z-30 hidden flex-col bg-sidebar transition-[width] duration-300 md:flex", collapsed ? "w-16" : "w-60")}>{content(false)}</aside>
      <AnimatePresence>{mobileOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-ink/25 backdrop-blur-[2px] md:hidden" onClick={() => setMobileOpen(false)} />}</AnimatePresence>
      <aside className={cn("fixed inset-y-0 right-0 z-50 w-72 transform bg-sidebar shadow-elevation-4 transition-transform duration-300 md:hidden", mobileOpen ? "translate-x-0" : "translate-x-full")}>{content(true)}</aside>
    </>
  );
}
