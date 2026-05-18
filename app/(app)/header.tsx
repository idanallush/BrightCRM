"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/global-search";

export function Header({ userLabel }: { userLabel: string }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center gap-4 border-b border-[color:var(--color-hairline)] bg-white px-5">
      <div className="flex-1 min-w-0">
        <GlobalSearch />
      </div>
      <div className="hidden text-sm text-[color:var(--color-ink-muted)] sm:block">
        {userLabel}
      </div>
      <Button variant="ghost" size="sm" onClick={signOut} title="התנתקות">
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">התנתקות</span>
      </Button>
    </header>
  );
}
