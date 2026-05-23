"use client";

import { useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/global-search";
import { useMobileMenu } from "./shell-context";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Header({ userLabel }: { userLabel: string }) {
  const router = useRouter();
  const { setMobileOpen } = useMobileMenu();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = getInitials(userLabel);

  return (
    <header className="flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 md:px-6">
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-gray-100 hover:text-ink md:hidden"
        aria-label="תפריט"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <GlobalSearch />
      </div>

      {/* User avatar + name */}
      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-ink-muted sm:block">
          {userLabel}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-xs font-semibold text-brand">
          {initials}
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} title="התנתקות">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
