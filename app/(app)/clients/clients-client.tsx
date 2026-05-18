"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
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
import { ClientForm } from "./client-form";
import type { Client, TeamMember } from "@/lib/data";

const ALL = "__all__";

export function ClientsClient({
  clients,
  team,
}: {
  clients: (Client & { manager_name: string | null })[];
  team: TeamMember[];
}) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [health, setHealth] = React.useState(ALL);
  const [managerId, setManagerId] = React.useState(ALL);
  const [createOpen, setCreateOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    return clients.filter((c) => {
      if (health !== ALL && c.health !== health) return false;
      if (managerId !== ALL && c.account_manager_id !== managerId) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [clients, search, health, managerId]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">לקוחות</h1>
          <span className="text-sm text-[color:var(--color-ink-muted)]">
            {filtered.length} מתוך {clients.length}
          </span>
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
        <div className="rounded-[18px] border border-[color:var(--color-hairline)] bg-white p-10 text-center text-sm text-[color:var(--color-ink-muted)]">
          לא נמצאו לקוחות תואמים.
        </div>
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
                </TR>
              </THead>
              <TBody>
                {filtered.map((c) => {
                  const v = healthVariant(c.health);
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
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-hidden">
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
