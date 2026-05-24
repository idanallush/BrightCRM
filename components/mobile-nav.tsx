"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CheckSquare, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "דשבורד", Icon: LayoutDashboard },
  { href: "/tasks", label: "משימות", Icon: CheckSquare },
  { href: "/clients", label: "לקוחות", Icon: Users },
  { href: "/settings", label: "הגדרות", Icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white md:hidden">
      <div className="flex h-14 items-stretch">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} className={cn("flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors", active ? "font-semibold text-primary" : "text-ink-muted")}>
              <Icon className="h-5 w-5" /><span>{label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
