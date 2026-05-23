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
  { key: "בריא", label: "בריא", dot: "bg-st-done" },
  { key: "אסטרטגיה צריכה", label: "אסטרטגיה", dot: "bg-st-waiting" },
  { key: "קריטי", label: "קריטי", dot: "bg-red-500" },
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

  // Split into my clients and others
  const { myClients, otherClients } = React.useMemo(() => {
    if (!currentMemberId) return { myClients: [], otherClients: filtered };
    const mine: typeof filtered = [];
    const others: typeof filtered = [];
    for (const c of filtered) {
      if (c.account_manager_id === currentMemberId) {
        mine.push(c);
      } else {
        others.push(c);
      }
    }
    return { myClients: mine, otherClients: others };
  }, [filtered, currentMemberId]);

  const activeFilterCount =
    (health !== ALL ? 1 : 0) + (managerId !== ALL ? 1 : 0) + (search.trim().length > 0 ? 1 : 0);

  function clearFilters() { setSearch(""); setHealth(ALL); setManagerId(ALL); }

  function renderCard(c: (typeof clients)[0], i: number, isMine: boolean) {
    const v = healthVariant(c.health);
    const openCount = openTaskCounts[c.id] ?? 0;
    const borderColor = c.health ? (HEALTH_BORDER[c.health] ?? "border-r-hairline") : "border-r-hairline";
    const links: { icon: React.ReactNode; url: string; label: string }[] = [];
    if (c.website_url) links.push({ icon: <Globe className="h-3.5 w-3.5" />, url: c.website_url, label: "אתר" });
    if (c.drive_url) links.push({ icon: <FolderOpen className="h-3.5 w-3.5" />, url: c.drive_url, label: "Drive" });
    if (c.facebook_ads_url) links.push({ icon: <BarChart3 className="h-3.5 w-3.5" />, url: c.facebook_ads_url, label: "Meta" });
    if (c.google_ads_url) links.push({ icon: <BarChart3 className="h-3.5 w-3.5" />, url: c.google_ads_url, label: "Google" });

    return (
      <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}>
        <div
          className={cn(
            "cursor-pointer rounded-lg border border-hairline/60 p-5 shadow-subtle transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover border-r-[3px]",
            borderColor,
            isMine ? "bg-tint-sky/30" : "bg-white",
          )}
          onClick={() => router.push(`/clients/${c.id}`)}>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-semibold text-ink">{c.name}</h3>
            {v && c.health && <Badge variant={v} className="shrink-0">{c.health}</Badge>}
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-slate">{c.manager_name ?? "ללא מנהל"}</span>
            <span className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-medium",
              openCount === 0 ? "bg-surface text-stone"
                : openCount <= 3 ? "bg-tint-sky text-link"
                : "bg-overdue-bg text-overdue",
            )}>
              <CheckSquare className="h-3 w-3" />{openCount}
            </span>
          </div>
          {links.length > 0 && (
            <div className="mt-3 flex gap-1.5 border-t border-hairline-soft pt-3">
              {links.map((l) => (
                <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex h-7 items-center gap-1 rounded-lg border border-hairline bg-white px-2 text-caption text-slate transition-colors hover:text-ink"
                  title={l.label}>{l.icon}<span className="hidden sm:inline">{l.label}</span></a>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold text-ink">לקוחות</h1>
          <span className="text-caption text-stone">{filtered.length} מתוך {clients.length}</span>
          {activeFilterCount > 0 && (
            <button type="button" onClick={clearFilters}
              className="rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-white transition-colors hover:bg-primary-pressed">
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
                  ? p.key === ALL ? "bg-primary text-white" : "bg-accent font-medium text-ink-deep shadow-subtle"
                  : "text-slate hover:bg-surface")}>
              {p.dot && <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${p.dot}`} />}
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[160px] flex-1 sm:max-w-[220px]">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone" />
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
        <div className="flex flex-col gap-6">
          {/* My clients */}
          {myClients.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-5 w-[3px] rounded-full bg-accent" />
                <h2 className="text-lg font-semibold text-ink">הלקוחות שלי</h2>
                <span className="text-caption text-stone">{myClients.length}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {myClients.map((c, i) => renderCard(c, i, true))}
              </div>
            </div>
          )}

          {/* Separator */}
          {myClients.length > 0 && otherClients.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-hairline" />
              <span className="text-caption text-stone">לקוחות נוספים</span>
              <div className="h-px flex-1 bg-hairline" />
            </div>
          )}

          {/* Other clients */}
          {otherClients.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {otherClients.map((c, i) => renderCard(c, i + myClients.length, false))}
            </div>
          )}
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
