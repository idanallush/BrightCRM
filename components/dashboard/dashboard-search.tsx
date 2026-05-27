"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function DashboardSearch() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/tasks?search=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <form onSubmit={onSubmit} className="relative hidden sm:block">
      <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="חיפוש..."
        aria-label="חיפוש משימות ולקוחות"
        className="h-9 w-44 rounded-xl border border-border bg-surface pe-3 ps-9 text-sm text-ink placeholder:text-ink-muted transition-colors focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </form>
  );
}
