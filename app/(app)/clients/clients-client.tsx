"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  ExternalLink,
  Globe,
  FolderOpen,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, healthVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { ClientForm } from "./client-form";
import type { Client, TeamMember } from "@/lib/data";

const ALL = "__all__";

export function ClientsClient({
  clients,
  team,
  openTaskCounts,
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
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [clients, search, health, managerId]);

  const activeFilterCount =
    (health !== ALL ? 1 : 0) +
    (managerId !== ALL ? 1 : 0) +
    (search.trim().length > 0 ? 1 : 0);

  function clearFilters() {
    setSearch("");
    setHealth(ALL);
    setManagerId(ALL);
  }

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold text-ink md:text-2xl">לקוחות</h1>
          <span className="text-sm text-ink-muted">
            {filtered.length} מתוך {clients.length}
          </span>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-0.5 text-xs font-medium text-white transition-colors hover:bg-brand-focus"
            >
              {activeFilterCount} פילטרים · נקה
            </button>
          )}
        </div>
        <Button onClick={() => setCreateOpen(true)} className="hidden sm:inline-flex">
          <Plus className="h-4 w-4" /> לקוח חדש
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש שם לקוח"
            className="pr-9"
          />
        </div>
        <Select value={health} onValueChange={setHealth}>
          <SelectTrigger>
            <SelectValue placeholder="בריאות" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>כל הבריאויות</SelectItem>
            <SelectItem value="בריא">בריא</SelectItem>
            <SelectItem value="אסטרטגיה צריכה">אסטרטגיה צריכה</SelectItem>
            <SelectItem value="קריטי">קריטי</SelectItem>
          </SelectContent>
        </Select>
        <Select value={managerId} onValueChange={setManagerId}>
          <SelectTrigger>
            <SelectValue placeholder="מנהל לקוח" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>כל המנהלים</SelectItem>
            {team.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        activeFilterCount > 0 ? (
          <EmptyState
            title="לא נמצאו לקוחות תואמים"
            description="נסה לשנות את הפילטרים או לנקות אותם."
            action={
              <Button variant="outline" size="sm" onClick={clearFilters}>
                נקה פילטרים
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="אין לקוחות עדיין"
            description="הוסף את הלקוח הראשון כדי להתחיל לעקוב אחריו."
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> לקוח חדש
              </Button>
            }
          />
        )
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const v = healthVariant(c.health);
            const openCount = openTaskCounts[c.id] ?? 0;
            const links: { icon: React.ReactNode; url: string; label: string }[] =
              [];
            if (c.website_url)
              links.push({
                icon: <Globe className="h-3.5 w-3.5" />,
                url: c.website_url,
                label: "אתר",
              });
            if (c.drive_url)
              links.push({
                icon: <FolderOpen className="h-3.5 w-3.5" />,
                url: c.drive_url,
                label: "Drive",
              });
            if (c.facebook_ads_url)
              links.push({
                icon: <BarChart3 className="h-3.5 w-3.5" />,
                url: c.facebook_ads_url,
                label: "Meta",
              });
            if (c.google_ads_url)
              links.push({
                icon: <BarChart3 className="h-3.5 w-3.5" />,
                url: c.google_ads_url,
                label: "Google",
              });

            return (
              <Card
                key={c.id}
                className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
                onClick={() => router.push(`/clients/${c.id}`)}
              >
                <CardContent className="flex flex-col gap-3 p-4 md:p-5">
                  {/* Name + health */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-ink">
                      {c.name}
                    </h3>
                    {v && c.health && (
                      <Badge variant={v} className="shrink-0">
                        {c.health}
                      </Badge>
                    )}
                  </div>

                  {/* Manager + open tasks */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-muted">
                      {c.manager_name ?? "ללא מנהל"}
                    </span>
                    <span
                      className={cn(
                        "inline-flex min-w-[1.75rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium",
                        openCount === 0
                          ? "bg-gray-100 text-ink-muted"
                          : openCount <= 3
                            ? "bg-blue-50 text-blue-700"
                            : "bg-red-50 text-red-700",
                      )}
                    >
                      {openCount} משימות
                    </span>
                  </div>

                  {/* Quick links */}
                  {links.length > 0 && (
                    <div className="flex gap-1.5 border-t border-gray-100 pt-3">
                      {links.map((l) => (
                        <a
                          key={l.label}
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex h-8 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 text-xs text-ink-muted transition-colors hover:bg-gray-50 hover:text-ink"
                          title={l.label}
                        >
                          {l.icon}
                          <span className="hidden sm:inline">{l.label}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>לקוח חדש</DialogTitle>
            <DialogDescription>
              שדות חובה: שם בלבד. את השאר אפשר להשלים בהמשך.
            </DialogDescription>
          </DialogHeader>
          <ClientForm team={team} onDone={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
