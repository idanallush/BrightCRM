"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Globe, FileText, Loader2, CheckCircle2, PauseCircle, Users, SlidersHorizontal, X } from "lucide-react";
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
import { UserChip } from "@/components/user-hover-card";
import { ClientLogo } from "@/components/client-logo";

const ALL = "__all__";

const HEALTH_PILLS = [
  { key: ALL, label: "הכל", color: "" },
  { key: "בריא", label: "בריא", color: "#00C875" },
  { key: "אסטרטגיה צריכה", label: "אסטרטגיה", color: "#FDAB3D" },
  { key: "קריטי", label: "קריטי", color: "#E2445C" },
];

const ONBOARDING_PILLS = [
  { key: ALL, label: "הכל" },
  { key: "בתהליך קליטה", label: "בתהליך קליטה" },
  { key: "באוויר", label: "באוויר" },
  { key: "בהשהייה", label: "בהשהייה" },
  { key: "none", label: "ללא סטטוס" },
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
  const [onboardingFilter, setOnboardingFilter] = React.useState(ALL);
  const [createOpen, setCreateOpen] = React.useState(false);

  React.useEffect(() => {
    if (searchParams.get("new") === "true") { setCreateOpen(true); router.replace("/clients"); }
  }, [searchParams, router]);

  const filtered = React.useMemo(() => {
    return clients.filter((c) => {
      if (health !== ALL && c.health !== health) return false;
      if (managerId !== ALL && !c.account_managers.some((m) => m.id === managerId)) return false;
      if (onboardingFilter !== ALL) {
        if (onboardingFilter === "none" && c.onboarding_status !== null) return false;
        if (onboardingFilter !== "none" && c.onboarding_status !== onboardingFilter) return false;
      }
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [clients, search, health, managerId, onboardingFilter]);

  const { myClients, otherClients } = React.useMemo(() => {
    if (!currentMemberId) return { myClients: [], otherClients: filtered };
    const mine: typeof filtered = [];
    const others: typeof filtered = [];
    for (const c of filtered) {
      if (c.account_managers.some((m) => m.id === currentMemberId)) mine.push(c); else others.push(c);
    }
    return { myClients: mine, otherClients: others };
  }, [filtered, currentMemberId]);

  const activeFilterCount = (health !== ALL ? 1 : 0) + (managerId !== ALL ? 1 : 0) + (onboardingFilter !== ALL ? 1 : 0) + (search.trim().length > 0 ? 1 : 0);
  function clearFilters() { setSearch(""); setHealth(ALL); setManagerId(ALL); setOnboardingFilter(ALL); }

  function renderCard(c: (typeof clients)[0]) {
    const openCount = openTaskCounts[c.id] ?? 0;
    const managers = c.account_managers ?? [];
    const links = [
      c.website_url && { url: c.website_url, icon: <Globe className="h-3.5 w-3.5" />, label: "אתר" },
      c.drive_url && { url: c.drive_url, icon: <GoogleDriveIcon className="h-3.5 w-3.5" />, label: "Drive" },
      c.facebook_ads_url && { url: c.facebook_ads_url, icon: <MetaAdsIcon className="h-3.5 w-3.5" />, label: "Meta Ads" },
    ].filter(Boolean) as { url: string; icon: React.ReactNode; label: string }[];

    return (
      <div key={c.id} onClick={() => router.push(`/clients/${c.id}`)}
        className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-border bg-white p-4 shadow-elevation-1 transition-shadow hover:shadow-elevation-2">
        <ClientLogo logoUrl={c.logo_url} logoStoragePath={c.logo_storage_path} name={c.name} size="lg" />
        <span className="max-w-full truncate text-center text-sm font-semibold text-ink">{c.name}</span>
        <div className="flex items-center gap-2">
          {c.health && <HealthCell health={c.health} />}
          {openCount > 0 && (
            <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-[#1A1A1A]">{openCount} משימות</span>
          )}
        </div>
        {managers.length > 0 && (
          <div className="mt-auto flex flex-wrap items-center justify-center gap-1 pt-1">
            {managers.slice(0, 2).map((m) => (
              <UserChip key={m.id} member={m as import("@/components/user-hover-card").HoverMember} size="xs" />
            ))}
            {managers.length > 2 && (
              <span className="rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-medium text-ink-secondary">
                +{managers.length - 2}
              </span>
            )}
          </div>
        )}
        {links.length > 0 && (
          <div className="flex gap-1">
            {links.map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                className="rounded-lg p-1 text-ink-muted transition-colors hover:bg-surface hover:text-[#1A1A1A]" title={l.label}>{l.icon}</a>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col gap-4"
    >
      {/* Compact toolbar */}
      <div className="flex items-center gap-2 rounded-2xl bg-[#1A1A1A] px-3 py-2 shadow-elevation-1">
        <Button onClick={() => setCreateOpen(true)} size="sm" className="shrink-0">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">חדש</span>
        </Button>

        <div className="h-5 w-px shrink-0 bg-[#333]" />

        {/* Manager filter */}
        <Select value={managerId} onValueChange={setManagerId}>
          <SelectTrigger className="h-8 w-auto gap-1.5 border-0 bg-transparent px-2 text-caption text-[#E5E7EB] shadow-none hover:bg-white/10">
            <Users className="h-4 w-4 text-[#9CA3AF]" />
            <SelectValue placeholder="מנהל" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>כל המנהלים</SelectItem>
            {team.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="h-5 w-px shrink-0 bg-[#333]" />

        {/* Search */}
        <div className="relative min-w-0 flex-1 sm:max-w-[180px]">
          <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6B7280]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש..." aria-label="חיפוש לקוחות" className="h-8 rounded-xl border-0 bg-[#2A2A2A] pr-8 text-caption text-white shadow-none placeholder:text-[#6B7280] hover:bg-[#333] focus:bg-[#333]" />
        </div>

        {/* Combined filter: health + onboarding */}
        <Select
          value={health !== ALL ? health : onboardingFilter !== ALL ? `onb:${onboardingFilter}` : "__none__"}
          onValueChange={(v) => {
            if (v === "__none__") { setHealth(ALL); setOnboardingFilter(ALL); return; }
            if (v.startsWith("onb:")) { setOnboardingFilter(v.replace("onb:", "")); setHealth(ALL); return; }
            setHealth(v); setOnboardingFilter(ALL);
          }}
        >
          <SelectTrigger className="h-8 w-auto gap-1.5 border-0 bg-transparent px-2 text-caption text-[#E5E7EB] shadow-none hover:bg-white/10">
            <SlidersHorizontal className="h-4 w-4 text-[#9CA3AF]" />
            <span className="hidden sm:inline">סנן</span>
            {activeFilterCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-ink">{activeFilterCount}</span>
            )}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">ללא סינון</SelectItem>
            <div className="px-2 py-1.5 text-[11px] font-semibold text-ink-muted">בריאות</div>
            {HEALTH_PILLS.filter((p) => p.key !== ALL).map((p) => (
              <SelectItem key={p.key} value={p.key}>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.label}
                </div>
              </SelectItem>
            ))}
            <div className="px-2 py-1.5 text-[11px] font-semibold text-ink-muted">קליטה</div>
            {ONBOARDING_PILLS.filter((p) => p.key !== ALL).map((p) => (
              <SelectItem key={`onb-${p.key}`} value={`onb:${p.key}`}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Count badge */}
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-caption font-medium text-[#E5E7EB]">{filtered.length}</span>

        {/* Clear filters */}
        {activeFilterCount > 0 && (
          <>
            <div className="h-5 w-px shrink-0 bg-[#333]" />
            <button type="button" onClick={clearFilters} className="rounded-lg p-1.5 text-[#9CA3AF] transition-colors hover:bg-white/10 hover:text-white" aria-label="נקה פילטרים">
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Card grid */}
      {filtered.length === 0 ? (
        activeFilterCount > 0 ? (
          <EmptyState title="לא נמצאו לקוחות" description="נסה לשנות פילטרים."
            action={<Button variant="secondary" size="sm" onClick={clearFilters}>נקה</Button>} />
        ) : (
          <EmptyState title="אין לקוחות" description="הוסף לקוח ראשון."
            action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> לקוח חדש</Button>} />
        )
      ) : (
        <div className="flex flex-col gap-4">
          {myClients.length > 0 && (
            <div>
              <h2 className="mb-2 text-caption font-semibold text-ink-secondary">הלקוחות שלי</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {myClients.map(renderCard)}
              </div>
            </div>
          )}
          {myClients.length > 0 && otherClients.length > 0 && (
            <div>
              <h2 className="mb-2 text-caption font-semibold text-ink-secondary">לקוחות נוספים</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {otherClients.map(renderCard)}
              </div>
            </div>
          )}
          {myClients.length === 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {otherClients.map(renderCard)}
            </div>
          )}
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
    </motion.div>
  );
}
