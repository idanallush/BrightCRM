"use client";

import { cn } from "@/lib/utils";
import { useSidebarCollapsed } from "./shell-context";

export function AppShellContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebarCollapsed();

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col transition-[margin] duration-300",
        // Push content to the left of the fixed sidebar (RTL: margin-right)
        collapsed ? "md:mr-16" : "md:mr-60",
      )}
    >
      {children}
    </div>
  );
}
