"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Globe, FolderOpen, BarChart3, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge, healthVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { ClientForm } from "./client-form";
import type { Client, TeamMember } from "@/lib/data";
import { motion } from "framer-motion";

const ALL = "__all__";

const HEALTH_BORDER: Record<string, string> = {
  "בריא": "border-r-green-500",
  "אסטרטגיה צריכה": "border-r-amber-500",
  "קריטי": "border-r-red-500",
};

const HEALTH_PILLS = [
  { key: ALL, label: "הכל" },
  { key: "בריא", label: "בריא", dot: "bg-success" },
  { key: "אסטרטגיה צריכה", label: "אסטרטגיה", dot: "bg-warning" },
  { key: "קריטי", label: "קריטי", dot: "bg-overdue" },
];

export function ClientsClient({
  clients, team, openTaskCounts,
}: {
  clients: (Client & { manager_name: string | null })[];
  team: TeamMember[];
  openTaskCounts: Record<string, number>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState("");
  const [health, setHealth] = React.useState(ALL);
  const [managerId, setManagerId] = React.useState(ALL);
  const [createOpen, setCreateOpen] = React.useState(false);

  React.useEffect(() => {
    if (searchParams.get("new") === "true") {
      setCreateOpen(true);
      router.replace("/clients");
    }
  }, [searchParams, router]);

  const filtered = React.useMemo(() => {
    return clients.filter((c) => {
      if (health !== ALL && c.health !== health) return false;
      if (managerId !== ALL && c.account_manager_id !== managerId) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [clients, search, health, managerId]);

  const activeFilterCount =
    (health !== ALL ? 1 : 0) + (managerId !== ALL ? 1 : 0) + (search.trim().length > 0 ? 1 : 0);

  function clearFilters() { setSearch(""); setHealth(ALL); setManagerId(ALL); }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold text-ink md:text-2xl">לקוחות</h1>
          <span className="text-caption text-ink-secondary">{filtered.length} מתוך {clients.length}</span>
          {activeFilterCount > 0 && (
            <button type="button" onClick={clearFilters}
              className="rounded-full bg-brand px-3 py-1 text-[11px] font-medium text-white transition-colors hover:bg-brand-hover">
              {activeFilterCount} פילטרים · נקה
            </button>
          )}
        </div>
        <Button onClick={() => setCreateOpen(true)} className="hidden sm:inline-flex">
          <Plus className="h-4 w-4" /> לקוח חדש
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {HEALTH_PILLS.map((p) => (
            <button key={p.key} type="button" onClick={() => setHealth(p.key)}
              className={cn("whitespace-nowrap rounded-full px-3 py-1.5 text-caption transition-all duration-200",
                health === p.key
                  ? p.key === ALL ? "bg-ink text-white" : "bg-white font-medium text-ink shadow-sm ring-1 ring-border"
                  : "text-ink-secondary hover:bg-gray-100")}>
              {p.dot && <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${p.dot}`} />}
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[160px] flex-1 sm:max-w-[220px]">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש שם לקוח" className="h-9 pr-9" />
          </div>
          <Select value={managerId} onValueChange={setManagerId}>
            <SelectTrigger className="h-9 w-auto min-w-[120px]"><SelectValue placeholder="מנהל לקוח" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>כל המנהלים</SelectItem>
              {team.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        activeFilterCount > 0 ? (
          <EmptyState title="לא נמצאו לקוחות תואמים" description="נסה לשנות את הפילטרים."
            action={<Button variant="secondary" size="sm" onClick={clearFilters}>נקה פילטרים</Button>} />
        ) : (
          <EmptyState title="אין לקוחות עדיין" description="הוסף את הלקוח הראשון."
            action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> לקוח חדש</Button>} />
        )
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c, i) => {
            const v = healthVariant(c.health);
            const openCount = openTaskCounts[c.id] ?? 0;
            const borderColor = c.health ? (HEALTH_BORDER[c.health] ?? "border-r-border") : "border-r-border";
            const links: { icon: React.ReactNode; url: string; label: string }[] = [];
            if (c.website_url) links.push({ icon: <Globe className="h-3.5 w-3.5" />, url: c.website_url, label: "אתר" });
            if (c.drive_url) links.push({ icon: <FolderOpen className="h-3.5 w-3.5" />, url: c.drive_url, label: "Drive" });
            if (c.facebook_ads_url) links.push({ icon: <BarChart3 className="h-3.5 w-3.5" />, url: c.facebook_ads_url, label: "Meta" });
            if (c.google_ads_url) links.push({ icon: <BarChart3 className="h-3.5 w-3.5" />, url: c.google_ads_url, label: "Google" });

            return (
              <motion.div key={c.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}>
                <div
                  className={`cursor-pointer rounded-xl border border-border bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover border-r-[3px] ${borderColor}`}
                  onClick={() => router.push(`/clients/${c.id}`)}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[15px] font-semibold text-ink">{c.name}</h3>
                    {v && c.health && <Badge variant={v} className="shrink-0">{c.health}</Badge>}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-ink-secondary">{c.manager_name ?? "ללא מנהל"}</span>
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-medium",
                      openCount === 0 ? "bg-gray-100 text-ink-muted"
                        : openCount <= 3 ? "bg-brand-light text-brand"
                        : "bg-overdue-bg text-overdue",
                    )}>
                      <CheckSquare className="h-3 w-3" />
                      {openCount}
                    </span>
                  </div>

                  {links.length > 0 && (
                    <div className="mt-3 flex gap-1.5 border-t border-gray-100 pt-3">
                      {links.map((l) => (
                        <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex h-7 items-center gap-1 rounded-lg border border-border bg-white px-2 text-caption text-ink-secondary transition-colors hover:text-ink"
                          title={l.label}>
                          {l.icon}
                          <span className="hidden sm:inline">{l.label}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>לקוח חדש</DialogTitle>
            <DialogDescription>שדות חובה: שם בלבד. את השאר אפשר להשלים בהמשך.</DialogDescription>
          </DialogHeader>
          <ClientForm team={team} onDone={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
