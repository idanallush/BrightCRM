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
      <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="חיפוש..."
        aria-label="חיפוש משימות ולקוחות"
        className="h-8 w-36 rounded-xl border-0 bg-transparent pe-3 ps-8 text-caption text-ink placeholder:text-ink-muted transition-colors hover:bg-surface focus:bg-surface focus:outline-none"
      />
    </form>
  );
}
