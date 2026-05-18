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

const NONE = "__none__";

export function ClientForm({
  client,
  team,
  onDone,
}: {
  client?: Client & {
    budget_note?: string | null;
    drive_url?: string | null;
    facebook_ads_url?: string | null;
    google_ads_url?: string | null;
    cms_url?: string | null;
    analytics_url?: string | null;
  };
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
      className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1"
    >
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
      </Section>

      <Section title="קישורים">
        <Field label="Drive">
          <Input
            value={form.drive_url ?? ""}
            onChange={(e) => set("drive_url", e.target.value)}
          />
        </Field>
        <Field label="Facebook Ads">
          <Input
            value={form.facebook_ads_url ?? ""}
            onChange={(e) => set("facebook_ads_url", e.target.value)}
          />
        </Field>
        <Field label="Google Ads">
          <Input
            value={form.google_ads_url ?? ""}
            onChange={(e) => set("google_ads_url", e.target.value)}
          />
        </Field>
        <Field label="CMS">
          <Input
            value={form.cms_url ?? ""}
            onChange={(e) => set("cms_url", e.target.value)}
          />
        </Field>
        <Field label="Google Analytics">
          <Input
            value={form.analytics_url ?? ""}
            onChange={(e) => set("analytics_url", e.target.value)}
          />
        </Field>
      </Section>

      <div className="mt-2 flex flex-row-reverse gap-2 pt-2">
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
