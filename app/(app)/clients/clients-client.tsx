"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Plus, Search } from "lucide-react";
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
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge, healthVariant } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { ClientForm } from "./client-form";
import type { Client, TeamMember } from "@/lib/data";

const ALL = "__all__";

function taskCountClass(n: number): string {
  if (n === 0) return "bg-black/5 text-[color:var(--color-ink-muted)]";
  if (n <= 3) return "bg-[color:var(--color-brand)]/10 text-[color:var(--color-brand)]";
  return "bg-[color:var(--color-health-critical)]/10 text-[color:var(--color-health-critical)]";
}

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

  // FAB deeplink: ?new=true opens create dialog and strips param.
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
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">לקוחות</h1>
          <span className="text-sm text-[color:var(--color-ink-muted)]">
            {filtered.length} מתוך {clients.length}
          </span>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-full bg-[color:var(--color-brand)] px-2.5 py-0.5 text-xs font-medium text-white"
            >
              פילטרים פעילים ({activeFilterCount}) · נקה
            </button>
          )}
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> לקוח חדש
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-ink-muted)]" />
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

      {filtered.length === 0 ? (
        activeFilterCount > 0 ? (
          <EmptyState
            icon={<span>👥</span>}
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
            icon={<span>👥</span>}
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
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>שם לקוח</TH>
                  <TH>איש קשר</TH>
                  <TH>מנהל לקוח</TH>
                  <TH>טלפון</TH>
                  <TH>אימייל</TH>
                  <TH>בריאות</TH>
                  <TH>משימות פתוחות</TH>
                  <TH className="w-10" />
                </TR>
              </THead>
              <TBody>
                {filtered.map((c) => {
                  const v = healthVariant(c.health);
                  const openCount = openTaskCounts[c.id] ?? 0;
                  return (
                    <TR
                      key={c.id}
                      onClick={() => router.push(`/clients/${c.id}`)}
                      className="cursor-pointer"
                    >
                      <TD className="font-medium">{c.name}</TD>
                      <TD className="text-[color:var(--color-ink-muted)]">
                        {c.contact_name ?? "—"}
                      </TD>
                      <TD className="text-[color:var(--color-ink-muted)]">
                        {c.manager_name ?? "—"}
                      </TD>
                      <TD className="text-[color:var(--color-ink-muted)]">
                        {c.phone ?? "—"}
                      </TD>
                      <TD className="text-[color:var(--color-ink-muted)]">
                        {c.email ?? "—"}
                      </TD>
                      <TD>{v && c.health ? <Badge variant={v}>{c.health}</Badge> : "—"}</TD>
                      <TD>
                        <span
                          className={cn(
                            "inline-flex min-w-[1.75rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium",
                            taskCountClass(openCount),
                          )}
                        >
                          {openCount}
                        </span>
                      </TD>
                      <TD className="w-10 text-end text-[color:var(--color-brand)] opacity-0 transition group-hover:opacity-100">
                        <ChevronLeft className="ms-auto h-4 w-4" />
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </CardContent>
        </Card>
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
