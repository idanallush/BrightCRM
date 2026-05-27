"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { globalSearch } from "@/app/actions/search";
import type { SearchResults } from "@/lib/data";

const DEBOUNCE_MS = 300;
const MIN_LEN = 2;
const EMPTY: SearchResults = { tasks: [], clients: [], campaigns: [] };

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<SearchResults>(EMPTY);
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); inputRef.current?.focus(); setOpen(true); } else if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); } }
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);
  React.useEffect(() => {
    function onClick(e: MouseEvent) { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); }
    window.addEventListener("mousedown", onClick); return () => window.removeEventListener("mousedown", onClick);
  }, []);
  React.useEffect(() => {
    const text = q.trim();
    if (text.length < MIN_LEN) { setResults(EMPTY); setLoading(false); return; }
    setLoading(true);
    const handle = window.setTimeout(async () => { setResults(await globalSearch(text)); setLoading(false); }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [q]);

  function navigate(href: string) { setOpen(false); setQ(""); router.push(href); }
  const totalCount = results.tasks.length + results.clients.length + (results.campaigns?.length ?? 0);

  return (
    <div ref={wrapRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <input ref={inputRef} type="search" value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setOpen(true)}
          placeholder="חיפוש..." className="h-9 w-full rounded-xl border border-border bg-white pr-9 ps-12 text-body-sm text-ink transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
        <span className="pointer-events-none absolute start-2 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] text-ink-muted sm:inline">⌘K</span>
      </div>
      {open && q.trim().length >= MIN_LEN && (
        <div className="absolute end-0 top-full z-50 mt-1 w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-white shadow-elevation-3">
          {loading && <div className="flex items-center justify-center gap-2 p-4 text-body-sm text-ink-secondary"><Loader2 className="h-4 w-4 animate-spin" />מחפש...</div>}
          {!loading && totalCount === 0 && <div className="p-4 text-center text-body-sm text-ink-secondary">לא נמצאו תוצאות</div>}
          {!loading && totalCount > 0 && (
            <div className="max-h-[60vh] overflow-y-auto p-1">
              {results.tasks.length > 0 && <Group label="משימות">{results.tasks.map((t) => <Item key={t.id} onClick={() => navigate(`/tasks?task=${t.id}`)} title={t.title} sub={t.client_name} />)}</Group>}
              {results.clients.length > 0 && <Group label="לקוחות">{results.clients.map((c) => <Item key={c.id} onClick={() => navigate(`/clients/${c.id}`)} title={c.name} sub={null} />)}</Group>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="py-1"><div className="px-3 py-1 text-caption text-ink-muted">{label}</div>{children}</div>;
}
function Item({ title, sub, onClick }: { title: string; sub: string | null; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded px-3 py-2 text-right transition-colors hover:bg-surface">
      <div className="min-w-0 flex-1">
        <div className="truncate text-body-sm font-medium text-ink">{title}</div>
        {sub && <div className="truncate text-caption text-ink-muted">{sub}</div>}
      </div>
    </button>
  );
}
