"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListTodo, Users, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "דשבורד", Icon: Home },
  { href: "/tasks", label: "משימות", Icon: ListTodo },
  { href: "/clients", label: "לקוחות", Icon: Users },
  { href: "/campaigns", label: "קמפיינים", Icon: Megaphone },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "shrink-0 border-l border-[color:var(--color-hairline)] bg-white",
        // Collapsed on mobile (icons only), full on md+
        "w-16 md:w-56",
      )}
    >
      <div className="flex h-14 items-center px-4 md:px-5">
        <div className="font-semibold tracking-tight text-[color:var(--color-ink)]">
          <span className="hidden md:inline">BrightCRM</span>
          <span className="text-[color:var(--color-brand)] md:hidden">B</span>
        </div>
      </div>
      <nav className="flex flex-col gap-1 px-2 md:px-3">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                active
                  ? "bg-[color:var(--color-brand)]/10 text-[color:var(--color-brand)]"
                  : "text-[color:var(--color-ink)] hover:bg-black/5",
              )}
              title={label}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
