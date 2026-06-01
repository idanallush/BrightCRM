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
  createClientRow,
  updateClientRow,
  type ClientInput,
} from "./actions";
import type { Client, TeamMember } from "@/lib/data";

const HEALTH_OPTIONS: { value: ClientInput["health"]; label: string }[] = [
  { value: null, label: "ללא" },
  { value: "בריא", label: "בריא" },
  { value: "אסטרטגיה צריכה", label: "אסטרטגיה צריכה" },
  { value: "קריטי", label: "קריטי" },
];

const ONBOARDING_OPTIONS: { value: ClientInput["onboarding_status"]; label: string }[] = [
  { value: null, label: "ללא" },
  { value: "בתהליך קליטה", label: "בתהליך קליטה" },
  { value: "באוויר", label: "באוויר" },
  { value: "בהשהייה", label: "בהשהייה" },
];

const DIGITAL_ASSET_OPTIONS = [
  "אתר", "עמוד עסקי פייסבוק", "חשבון אינסטגרם", "וואטסאפ עסקי",
  "רשימת תפוצה", "חשבון פרסום מטא", "מערכת ניהול שיחות", "אוטומציות קיימות",
];

const CAMPAIGN_PLATFORM_OPTIONS = [
  "Meta | Facebook ads", "Google Ads", "TikTok Ads", "LinkedIn Ads",
];

const NONE = "__none__";

export function ClientForm({
  client,
  team,
  onDone,
}: {
  client?: Client;
  team: TeamMember[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const [form, setForm] = React.useState<ClientInput>({
    name: client?.name ?? "",
    contact_name: client?.contact_name ?? "",
    account_manager_id: client?.account_manager_id ?? null,
    phone: client?.phone ?? "",
    email: client?.email ?? "",
    website_url: client?.website_url ?? "",
    budget_note: client?.budget_note ?? "",
    health: client?.health ?? null,
    drive_url: client?.drive_url ?? "",
    facebook_ads_url: client?.facebook_ads_url ?? "",
    google_ads_url: client?.google_ads_url ?? "",
    cms_url: client?.cms_url ?? "",
    analytics_url: client?.analytics_url ?? "",
    logo_url: client?.logo_url ?? "",
    brief: client?.brief ?? "",
    onboarding_status: client?.onboarding_status ?? null,
    onboarding_date: client?.onboarding_date ?? "",
    competitors: client?.competitors ?? "",
    target_audience: client?.target_audience ?? "",
    core_message: client?.core_message ?? "",
    campaign_goal: client?.campaign_goal ?? "",
    differentiation: client?.differentiation ?? "",
    digital_assets: client?.digital_assets ?? [],
    previous_campaigns: client?.previous_campaigns ?? [],
  });

  function set<K extends keyof ClientInput>(k: K, v: ClientInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("חסר שם לקוח");
      return;
    }
    setPending(true);
    const res = client
      ? await updateClientRow(client.id, form)
      : await createClientRow(form);
    setPending(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    toast.success(client ? "הלקוח עודכן" : "הלקוח נוצר");
    router.refresh();
    onDone();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 pb-1">
      <Section title="פרטים">
        <Field label="שם לקוח">
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="איש קשר">
          <Input
            value={form.contact_name ?? ""}
            onChange={(e) => set("contact_name", e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="טלפון">
            <Input
              value={form.phone ?? ""}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>
          <Field label="אימייל">
            <Input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>
        </div>
        <Field label="אתר/דף נחיתה">
          <Input
            dir="ltr"
            value={form.website_url ?? ""}
            onChange={(e) => set("website_url", e.target.value)}
            placeholder="https://..."
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="מנהל לקוח">
            <Select
              value={form.account_manager_id ?? NONE}
              onValueChange={(v) =>
                set("account_manager_id", v === NONE ? null : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="ללא" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>ללא</SelectItem>
                {team.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="בריאות">
            <Select
              value={form.health ?? NONE}
              onValueChange={(v) =>
                set("health", v === NONE ? null : (v as ClientInput["health"]))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="ללא" />
              </SelectTrigger>
              <SelectContent>
                {HEALTH_OPTIONS.map((o) => (
                  <SelectItem key={o.label} value={o.value ?? NONE}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="תקציב">
          <Input
            value={form.budget_note ?? ""}
            onChange={(e) => set("budget_note", e.target.value)}
            placeholder="20,000 ₪ / 30k-50k $ / טקסט חופשי"
          />
        </Field>
        <Field label="לוגו (URL)">
          <Input
            dir="ltr"
            value={form.logo_url ?? ""}
            onChange={(e) => set("logo_url", e.target.value)}
            placeholder="https://example.com/logo.png"
          />
        </Field>
      </Section>

      <Section title="קישורים">
        <Field label="Drive">
          <Input
            dir="ltr"
            value={form.drive_url ?? ""}
            onChange={(e) => set("drive_url", e.target.value)}
          />
        </Field>
        <Field label="Facebook Ads">
          <Input
            dir="ltr"
            value={form.facebook_ads_url ?? ""}
            onChange={(e) => set("facebook_ads_url", e.target.value)}
          />
        </Field>
        <Field label="Google Ads">
          <Input
            dir="ltr"
            value={form.google_ads_url ?? ""}
            onChange={(e) => set("google_ads_url", e.target.value)}
          />
        </Field>
        <Field label="CMS">
          <Input
            dir="ltr"
            value={form.cms_url ?? ""}
            onChange={(e) => set("cms_url", e.target.value)}
          />
        </Field>
        <Field label="Google Analytics">
          <Input
            dir="ltr"
            value={form.analytics_url ?? ""}
            onChange={(e) => set("analytics_url", e.target.value)}
          />
        </Field>
      </Section>

      <Section title="בריף לקוח">
        <Field label="בריף">
          <textarea
            value={form.brief ?? ""}
            onChange={(e) => set("brief", e.target.value)}
            placeholder="מידע כללי על הלקוח, מטרות, קהלים, מסרים מרכזיים..."
            rows={5}
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </Field>
      </Section>

      <Section title="קליטה ואפיון">
        <div className="grid grid-cols-2 gap-3">
          <Field label="סטטוס קליטה">
            <Select
              value={form.onboarding_status ?? NONE}
              onValueChange={(v) =>
                set("onboarding_status", v === NONE ? null : (v as ClientInput["onboarding_status"]))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="ללא" />
              </SelectTrigger>
              <SelectContent>
                {ONBOARDING_OPTIONS.map((o) => (
                  <SelectItem key={o.label} value={o.value ?? NONE}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="תאריך קליטה">
            <Input
              type="date"
              value={form.onboarding_date ?? ""}
              onChange={(e) => set("onboarding_date", e.target.value)}
            />
          </Field>
        </div>
        <Field label="מתחרים עיקריים">
          <Input
            value={form.competitors ?? ""}
            onChange={(e) => set("competitors", e.target.value)}
            placeholder="מופרדים בפסיק"
          />
        </Field>
        <Field label="קהל יעד">
          <textarea
            value={form.target_audience ?? ""}
            onChange={(e) => set("target_audience", e.target.value)}
            placeholder="תיאור קהלי היעד העיקריים"
            rows={3}
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </Field>
        <Field label="מסר מרכזי">
          <Input
            value={form.core_message ?? ""}
            onChange={(e) => set("core_message", e.target.value)}
            placeholder="המסר העיקרי של העסק"
          />
        </Field>
        <Field label="מטרת הקמפיינים">
          <textarea
            value={form.campaign_goal ?? ""}
            onChange={(e) => set("campaign_goal", e.target.value)}
            placeholder="המטרה העיקרית של הקמפיינים"
            rows={2}
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </Field>
        <Field label="בידול">
          <Input
            value={form.differentiation ?? ""}
            onChange={(e) => set("differentiation", e.target.value)}
            placeholder="מה מייחד את העסק"
          />
        </Field>
        <Field label="נכסים דיגיטליים">
          <div className="flex flex-wrap gap-2">
            {DIGITAL_ASSET_OPTIONS.map((asset) => (
              <label key={asset} className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={form.digital_assets.includes(asset)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      set("digital_assets", [...form.digital_assets, asset]);
                    } else {
                      set("digital_assets", form.digital_assets.filter((a) => a !== asset));
                    }
                  }}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                />
                <span className="text-sm text-ink">{asset}</span>
              </label>
            ))}
          </div>
        </Field>
        <Field label="קמפיינים קודמים">
          <div className="flex flex-wrap gap-2">
            {CAMPAIGN_PLATFORM_OPTIONS.map((platform) => (
              <label key={platform} className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={form.previous_campaigns.includes(platform)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      set("previous_campaigns", [...form.previous_campaigns, platform]);
                    } else {
                      set("previous_campaigns", form.previous_campaigns.filter((p) => p !== platform));
                    }
                  }}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                />
                <span className="text-sm text-ink">{platform}</span>
              </label>
            ))}
          </div>
        </Field>
      </Section>

      </div>
      <div className="mt-3 flex shrink-0 flex-row-reverse gap-2 border-t border-[color:var(--color-hairline)] pt-3">
        <Button type="submit" disabled={pending}>
          {pending ? "שומר..." : client ? "שמירה" : "צור לקוח"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
          ביטול
        </Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-sm font-semibold text-[color:var(--color-ink-muted)]">
        {title}
      </h4>
      {children}
    </div>
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
