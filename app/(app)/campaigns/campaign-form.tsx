"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import {
  createCampaignRow,
  updateCampaignRow,
  type CampaignInput,
} from "./actions";
import type { Campaign, Client } from "@/lib/data";

const PLATFORMS: CampaignInput["platform"][] = ["google", "facebook", "tiktok"];
const PLATFORM_LABELS: Record<CampaignInput["platform"], string> = {
  google: "Google",
  facebook: "Meta",
  tiktok: "TikTok",
};
const STATUSES: NonNullable<CampaignInput["status"]>[] = [
  "פעיל",
  "בעבודה",
  "מושהה",
  "הסתיים",
];
const NONE = "__none__";

export function CampaignForm({
  campaign,
  clients,
  onDone,
}: {
  campaign?: Campaign;
  clients: Client[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const [form, setForm] = React.useState<CampaignInput>({
    name: campaign?.name ?? "",
    client_id: campaign?.client_id ?? null,
    platform: (campaign?.platform as CampaignInput["platform"]) ?? "google",
    status: (campaign?.status as CampaignInput["status"]) ?? null,
    start_date: campaign?.start_date ?? null,
    spent: campaign?.spent ?? null,
    external_campaign_id: campaign?.external_campaign_id ?? null,
  });

  function set<K extends keyof CampaignInput>(k: K, v: CampaignInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("חסר שם קמפיין");
      return;
    }
    setPending(true);
    const res = campaign
      ? await updateCampaignRow(campaign.id, form)
      : await createCampaignRow(form);
    setPending(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    toast.success(campaign ? "הקמפיין עודכן" : "הקמפיין נוצר");
    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto">
      <Field label="שם קמפיין">
        <Input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          autoFocus
        />
      </Field>

      <Field label="לקוח">
        <Select
          value={form.client_id ?? NONE}
          onValueChange={(v) => set("client_id", v === NONE ? null : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="ללא" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>ללא לקוח</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="פלטפורמה">
          <Select
            value={form.platform}
            onValueChange={(v) => set("platform", v as CampaignInput["platform"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((p) => (
                <SelectItem key={p} value={p}>
                  {PLATFORM_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="סטטוס">
          <Select
            value={form.status ?? NONE}
            onValueChange={(v) =>
              set("status", v === NONE ? null : (v as CampaignInput["status"]))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="ללא" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>ללא</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="תאריך התחלה">
          <Input
            type="date"
            value={form.start_date ?? ""}
            onChange={(e) => set("start_date", e.target.value || null)}
          />
        </Field>
        <Field label="תקציב שנוצל (₪)">
          <Input
            type="number"
            step="0.01"
            value={form.spent ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              set("spent", v === "" ? null : Number(v));
            }}
          />
        </Field>
      </div>

      <Field label="Campaign ID חיצוני">
        <Input
          value={form.external_campaign_id ?? ""}
          onChange={(e) => set("external_campaign_id", e.target.value)}
          placeholder="ID של Meta / Google"
        />
      </Field>

      <div className="mt-2 flex flex-row-reverse gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "שומר..." : campaign ? "שמירה" : "צור קמפיין"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
          ביטול
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
