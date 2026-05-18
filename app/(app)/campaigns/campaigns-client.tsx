"use client";

import * as React from "react";
import { ChevronLeft, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { EmptyState } from "@/components/empty-state";
import { CampaignForm } from "./campaign-form";
import { deleteCampaignRow } from "./actions";
import type { Campaign, Client } from "@/lib/data";

const ALL = "__all__";

const PLATFORM_LABELS: Record<string, string> = {
  google: "Google",
  facebook: "Meta",
  tiktok: "TikTok",
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("he-IL") : "—";
const fmtMoney = (n: number | null) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("he-IL", {
        style: "currency",
        currency: "ILS",
        minimumFractionDigits: 2,
      }).format(n);

export function CampaignsClient({
  campaigns,
  clients,
  initial,
}: {
  campaigns: (Campaign & { client_name: string | null })[];
  clients: Client[];
  initial: { platform: string; status: string; clientId: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [platform, setPlatform] = React.useState(initial.platform);
  const [status, setStatus] = React.useState(initial.status);
  const [clientId, setClientId] = React.useState(initial.clientId);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Campaign | null>(null);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  // Deeplink: ?campaign=ID opens the sheet for that campaign.
  React.useEffect(() => {
    const id = searchParams.get("campaign");
    if (id && (!editing || editing.id !== id)) {
      const found = campaigns.find((c) => c.id === id);
      if (found) setEditing(found);
    }
  }, [searchParams, campaigns, editing]);

  // FAB deeplink: ?new=true opens the create dialog and strips the param.
  React.useEffect(() => {
    if (searchParams.get("new") === "true") {
      setCreateOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("new");
      const qs = params.toString();
      router.replace(qs ? `/campaigns?${qs}` : "/campaigns");
    }
  }, [searchParams, router]);

  const activeFilterCount =
    (platform !== ALL ? 1 : 0) +
    (status !== ALL ? 1 : 0) +
    (clientId !== ALL ? 1 : 0);

  function clearFilters() {
    setPlatform(ALL);
    setStatus(ALL);
    setClientId(ALL);
    router.push("/campaigns");
  }

  function syncFilters(next: { platform: string; status: string; clientId: string }) {
    const params = new URLSearchParams();
    if (next.platform !== ALL) params.set("platform", next.platform);
    if (next.status !== ALL) params.set("status", next.status);
    if (next.clientId !== ALL) params.set("client", next.clientId);
    const keepCampaign = searchParams.get("campaign");
    if (keepCampaign) params.set("campaign", keepCampaign);
    const qs = params.toString();
    router.push(qs ? `/campaigns?${qs}` : "/campaigns");
  }

  function closeSheet() {
    setEditing(null);
    setConfirmingDelete(false);
    // Strip ?campaign=
    const params = new URLSearchParams(searchParams.toString());
    params.delete("campaign");
    const qs = params.toString();
    router.replace(qs ? `/campaigns?${qs}` : "/campaigns");
  }

  async function onDelete() {
    if (!editing) return;
    const res = await deleteCampaignRow(editing.id);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    toast.success("הקמפיין נמחק");
    closeSheet();
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">קמפיינים</h1>
          <span className="text-sm text-[color:var(--color-ink-muted)]">
            {campaigns.length} סה״כ
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
          <Plus className="h-4 w-4" /> קמפיין חדש
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select
          value={platform}
          onValueChange={(v) => {
            setPlatform(v);
            syncFilters({ platform: v, status, clientId });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="פלטפורמה" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>כל הפלטפורמות</SelectItem>
            <SelectItem value="google">Google</SelectItem>
            <SelectItem value="facebook">Meta</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            syncFilters({ platform, status: v, clientId });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="סטטוס" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>כל הסטטוסים</SelectItem>
            <SelectItem value="פעיל">פעיל</SelectItem>
            <SelectItem value="בעבודה">בעבודה</SelectItem>
            <SelectItem value="מושהה">מושהה</SelectItem>
            <SelectItem value="הסתיים">הסתיים</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={clientId}
          onValueChange={(v) => {
            setClientId(v);
            syncFilters({ platform, status, clientId: v });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="לקוח" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>כל הלקוחות</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {campaigns.length === 0 ? (
        activeFilterCount > 0 ? (
          <EmptyState
            icon={<span>📢</span>}
            title="לא נמצאו קמפיינים תואמים"
            description="נסה לשנות את הפילטרים או לנקות אותם."
            action={
              <Button variant="outline" size="sm" onClick={clearFilters}>
                נקה פילטרים
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<span>📢</span>}
            title="אין קמפיינים עדיין"
            description="צור את הקמפיין הראשון."
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> קמפיין חדש
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
                  <TH>שם</TH>
                  <TH>לקוח</TH>
                  <TH>פלטפורמה</TH>
                  <TH>סטטוס</TH>
                  <TH>התחלה</TH>
                  <TH>תקציב שנוצל</TH>
                  <TH className="w-10" />
                </TR>
              </THead>
              <TBody>
                {campaigns.map((c) => (
                  <TR
                    key={c.id}
                    onClick={() => setEditing(c)}
                    className="cursor-pointer"
                  >
                    <TD className="font-medium">{c.name}</TD>
                    <TD className="text-[color:var(--color-ink-muted)]">
                      {c.client_name ?? "—"}
                    </TD>
                    <TD>
                      <PlatformBadge platform={c.platform} />
                    </TD>
                    <TD>
                      {c.status ? (
                        <Badge variant={c.status === "פעיל" ? "active" : "closed"}>
                          {c.status}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TD>
                    <TD className="text-[color:var(--color-ink-muted)]">
                      {fmtDate(c.start_date)}
                    </TD>
                    <TD className="text-[color:var(--color-ink-muted)]">
                      {fmtMoney(c.spent)}
                    </TD>
                    <TD className="w-10 text-end text-[color:var(--color-brand)] opacity-0 transition group-hover:opacity-100">
                      <ChevronLeft className="ms-auto h-4 w-4" />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>קמפיין חדש</DialogTitle>
            <DialogDescription>חובה: שם ופלטפורמה.</DialogDescription>
          </DialogHeader>
          <CampaignForm clients={clients} onDone={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit sheet */}
      <Sheet open={!!editing} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent side="left" className="flex flex-col">
          {editing && (
            <>
              <SheetHeader>
                <SheetTitle>עריכת קמפיין</SheetTitle>
                <SheetDescription>
                  {editing.external_campaign_id
                    ? `ID חיצוני: ${editing.external_campaign_id}`
                    : "אין ID חיצוני"}
                </SheetDescription>
              </SheetHeader>
              <CampaignForm
                key={editing.id}
                campaign={editing}
                clients={clients}
                onDone={closeSheet}
              />
              <div className="border-t border-[color:var(--color-hairline)] pt-3">
                {confirmingDelete ? (
                  <div className="flex flex-col gap-2 rounded-md bg-red-50 p-3 text-right">
                    <p className="text-sm text-red-700">
                      למחוק את הקמפיין לצמיתות?
                    </p>
                    <div className="flex flex-row-reverse gap-2">
                      <Button variant="danger" size="sm" onClick={onDelete}>
                        מחק
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmingDelete(false)}
                      >
                        ביטול
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmingDelete(true)}
                    className="text-red-600"
                  >
                    מחיקה
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const cls =
    platform === "google"
      ? "bg-[#4285f4]/10 text-[#1a73e8]"
      : platform === "facebook"
        ? "bg-[#1877f2]/10 text-[#0a4ea8]"
        : platform === "tiktok"
          ? "bg-black/10 text-black"
          : "bg-black/5 text-[color:var(--color-ink-muted)]";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {PLATFORM_LABELS[platform] ?? platform}
    </span>
  );
}
