"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Globe, FileText } from "lucide-react";
import { MetaAdsIcon, GoogleDriveIcon } from "@/components/brand-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { HealthCell } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { ClientForm } from "./client-form";
import type { Client, TeamMember } from "@/lib/data";

const ALL = "__all__";

const HEALTH_PILLS = [
  { key: ALL, label: "הכל", color: "" },
  { key: "בריא", label: "בריא", color: "#00C875" },
  { key: "אסטרטגיה צריכה", label: "אסטרטגיה", color: "#FDAB3D" },
  { key: "קריטי", label: "קריטי", color: "#E2445C" },
];

export function ClientsClient({
  clients, team, openTaskCounts, currentMemberId,
}: {
  clients: (Client & { manager_name: string | null })[];
  team: TeamMember[];
  openTaskCounts: Record<string, number>;
  currentMemberId: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState("");
  const [health, setHealth] = React.useState(ALL);
  const [managerId, setManagerId] = React.useState(ALL);
  const [createOpen, setCreateOpen] = React.useState(false);

  React.useEffect(() => {
    if (searchParams.get("new") === "true") { setCreateOpen(true); router.replace("/clients"); }
  }, [searchParams, router]);

  const filtered = React.useMemo(() => {
    return clients.filter((c) => {
      if (health !== ALL && c.health !== health) return false;
      if (managerId !== ALL && c.account_manager_id !== managerId) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [clients, search, health, managerId]);

  const { myClients, otherClients } = React.useMemo(() => {
    if (!currentMemberId) return { myClients: [], otherClients: filtered };
    const mine: typeof filtered = [];
    const others: typeof filtered = [];
    for (const c of filtered) {
      if (c.account_manager_id === currentMemberId) mine.push(c); else others.push(c);
    }
    return { myClients: mine, otherClients: others };
  }, [filtered, currentMemberId]);

  const activeFilterCount = (health !== ALL ? 1 : 0) + (managerId !== ALL ? 1 : 0) + (search.trim().length > 0 ? 1 : 0);
  function clearFilters() { setSearch(""); setHealth(ALL); setManagerId(ALL); }

  function renderRow(c: (typeof clients)[0]) {
    const openCount = openTaskCounts[c.id] ?? 0;
    const links = [
      c.website_url && { url: c.website_url, icon: <Globe className="h-3.5 w-3.5" />, label: "אתר" },
      c.drive_url && { url: c.drive_url, icon: <GoogleDriveIcon className="h-3.5 w-3.5" />, label: "Drive" },
      c.facebook_ads_url && { url: c.facebook_ads_url, icon: <MetaAdsIcon className="h-3.5 w-3.5" />, label: "Meta Ads" },
    ].filter(Boolean) as { url: string; icon: React.ReactNode; label: string }[];

    return (
      <tr key={c.id} onClick={() => router.push(`/clients/${c.id}`)}
        className="cursor-pointer border-b border-border transition-colors duration-150 hover:bg-[#F5F6F8]">
        <td className="px-4 py-3 font-medium text-ink">
          <div className="flex items-center gap-2.5">
            {c.logo_url ? (
              <img src={c.logo_url} alt={c.name} className="h-7 w-7 shrink-0 rounded-full object-cover bg-surface" />
            ) : (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {c.name.charAt(0)}
              </span>
            )}
            {c.name}
          </div>
        </td>
        <td className="px-4 py-3 text-ink-secondary">{c.manager_name ?? "ללא"}</td>
        <td className="hidden px-4 py-3 sm:table-cell">
          {c.health ? <HealthCell health={c.health} /> : <span className="text-ink-muted">{"—"}</span>}
        </td>
        <td className="px-4 py-3">
          <span className={openCount > 0 ? "font-semibold text-primary" : "text-ink-muted"}>{openCount}</span>
        </td>
        <td className="hidden px-4 py-3 md:table-cell">
          <div className="flex gap-1.5">
            {c.brief && (
              <span onClick={(e) => { e.stopPropagation(); router.push(`/clients/${c.id}#brief`); }}
                className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface hover:text-primary cursor-pointer" title="בריף לקוח">
                <FileText className="h-3.5 w-3.5" />
              </span>
            )}
            {links.map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface hover:text-primary" title={l.label}>{l.icon}</a>
            ))}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header bar */}
      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-primary px-4 py-3">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-white">לקוחות</h1>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-caption text-white">{filtered.length}</span>
            {activeFilterCount > 0 && (
              <button type="button" onClick={clearFilters}
                className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-medium text-white hover:bg-white/30">
                {activeFilterCount === 1 ? "פילטר 1" : `${activeFilterCount} פילטרים`} · נקה
              </button>
            )}
          </div>
          <Button onClick={() => setCreateOpen(true)} className="hidden sm:inline-flex">
            <Plus className="h-4 w-4" /> לקוח חדש
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 border-t border-primary-hover px-4 py-3 sm:flex-row sm:items-center">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {HEALTH_PILLS.map((p) => (
              <button key={p.key} type="button" onClick={() => setHealth(p.key)}
                className={cn("whitespace-nowrap rounded-full px-3 py-1.5 text-caption transition-colors duration-150",
                  health === p.key ? "font-medium text-white" : "text-ink-secondary hover:bg-surface")}
                style={health === p.key ? { backgroundColor: p.color || "#323338" } : undefined}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-[160px] flex-1 sm:max-w-[220px]">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש" aria-label="חיפוש לקוחות" className="h-9 pr-9" />
            </div>
            <Select value={managerId} onValueChange={setManagerId}>
              <SelectTrigger className="h-9 w-auto min-w-[120px]"><SelectValue placeholder="מנהל" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>כל המנהלים</SelectItem>
                {team.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        activeFilterCount > 0 ? (
          <EmptyState title="לא נמצאו לקוחות" description="נסה לשנות פילטרים."
            action={<Button variant="secondary" size="sm" onClick={clearFilters}>נקה</Button>} />
        ) : (
          <EmptyState title="אין לקוחות" description="הוסף לקוח ראשון."
            action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> לקוח חדש</Button>} />
        )
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
          <table className="w-full text-right text-body-sm">
            <thead>
              <tr className="bg-surface text-caption text-ink-secondary">
                <th className="px-4 py-2.5 text-right font-medium">לקוח</th>
                <th className="px-4 py-2.5 text-right font-medium">מנהל</th>
                <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">בריאות</th>
                <th className="px-4 py-2.5 text-right font-medium">משימות</th>
                <th className="hidden px-4 py-2.5 text-right font-medium md:table-cell">קישורים</th>
              </tr>
            </thead>
            <tbody>
              {myClients.length > 0 && (
                <>
                  <tr>
                    <td colSpan={5} className="bg-primary px-4 py-1.5 text-caption font-semibold text-white">הלקוחות שלי</td>
                  </tr>
                  {myClients.map(renderRow)}
                </>
              )}
              {myClients.length > 0 && otherClients.length > 0 && (
                <tr>
                  <td colSpan={5} className="bg-surface px-4 py-1.5 text-caption font-medium text-ink-secondary">לקוחות נוספים</td>
                </tr>
              )}
              {otherClients.map(renderRow)}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>לקוח חדש</DialogTitle>
            <DialogDescription>שדות חובה: שם בלבד.</DialogDescription>
          </DialogHeader>
          <ClientForm team={team} onDone={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
