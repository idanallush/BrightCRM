"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, X, Check, Mail, Phone, MessageCircle, UserPlus, ChevronDown, ChevronUp, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { updateTeamMember, addTeamMember } from "./actions";

type Member = {
  id: string;
  full_name: string;
  role: string | null;
  email: string;
  whatsapp_phone: string | null;
  active: boolean;
  notify_email: boolean | null;
  notify_whatsapp: boolean | null;
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function Toggle({
  label,
  icon,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  icon?: React.ReactNode;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
      <span className="flex items-center gap-2 text-sm text-ink">
        {icon}
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50",
          checked ? "bg-primary" : "bg-border",
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow-elevation-1 transition-transform duration-150",
            checked ? "-translate-x-0.5" : "-translate-x-[22px]",
          )}
        />
      </button>
    </div>
  );
}

function MemberForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: {
    full_name: string;
    role: string;
    email: string;
    whatsapp_phone: string;
    active: boolean;
    notify_email: boolean;
    notify_whatsapp: boolean;
  };
  onSave: (data: typeof initial) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = React.useState(initial);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label className="text-ink-muted">שם מלא</Label>
          <Input
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            placeholder="שם מלא"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-ink-muted">תפקיד</Label>
          <Input
            value={form.role}
            onChange={(e) => set("role", e.target.value)}
            placeholder="לדוגמה: מנהל קמפיינים"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-ink-muted">אימייל</Label>
          <Input
            type="email"
            dir="ltr"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="user@b-bright.co.il"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-ink-muted">טלפון WhatsApp</Label>
          <Input
            dir="ltr"
            value={form.whatsapp_phone}
            onChange={(e) => set("whatsapp_phone", e.target.value)}
            placeholder="9725xxxxxxxx"
            inputMode="tel"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Toggle
          label="פעיל"
          checked={form.active}
          onChange={(v) => set("active", v)}
        />
        <Toggle
          label="התראות מייל"
          icon={<Mail className="h-3.5 w-3.5 text-ink-muted" />}
          checked={form.notify_email}
          onChange={(v) => set("notify_email", v)}
        />
        <Toggle
          label="התראות WhatsApp"
          icon={<MessageCircle className="h-3.5 w-3.5 text-ink-muted" />}
          checked={form.notify_whatsapp}
          onChange={(v) => set("notify_whatsapp", v)}
        />
      </div>

      <div className="flex flex-row-reverse gap-2 pt-1">
        <Button
          type="button"
          onClick={() => onSave(form)}
          disabled={saving}
        >
          <Check className="h-4 w-4" />
          {saving ? "שומר..." : "שמירה"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          ביטול
        </Button>
      </div>
    </div>
  );
}

export function TeamManager({ members }: { members: Member[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [addingNew, setAddingNew] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  async function handleUpdate(memberId: string, data: {
    full_name: string;
    role: string;
    email: string;
    whatsapp_phone: string;
    active: boolean;
    notify_email: boolean;
    notify_whatsapp: boolean;
  }) {
    setSaving(true);
    const res = await updateTeamMember(memberId, {
      full_name: data.full_name,
      role: data.role || null,
      email: data.email,
      whatsapp_phone: data.whatsapp_phone || null,
      active: data.active,
      notify_email: data.notify_email,
      notify_whatsapp: data.notify_whatsapp,
    });
    setSaving(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    toast.success("המשתמש עודכן");
    setEditingId(null);
    router.refresh();
  }

  async function handleAdd(data: {
    full_name: string;
    role: string;
    email: string;
    whatsapp_phone: string;
    active: boolean;
    notify_email: boolean;
    notify_whatsapp: boolean;
  }) {
    setSaving(true);
    const res = await addTeamMember({
      full_name: data.full_name,
      role: data.role || null,
      email: data.email,
      whatsapp_phone: data.whatsapp_phone || null,
    });
    setSaving(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    toast.success("המשתמש נוסף");
    setAddingNew(false);
    router.refresh();
  }

  const [showInactive, setShowInactive] = React.useState(false);
  const activeMembers = members.filter((m) => m.active);
  const inactiveMembers = members.filter((m) => !m.active);
  const visibleMembers = showInactive ? members : activeMembers;

  return (
    <div className="divide-y divide-border">
      {visibleMembers.map((m) => (
        <div key={m.id}>
          {editingId === m.id ? (
            <div className="p-4">
              <MemberForm
                initial={{
                  full_name: m.full_name,
                  role: m.role ?? "",
                  email: m.email,
                  whatsapp_phone: m.whatsapp_phone ?? "",
                  active: m.active,
                  notify_email: m.notify_email ?? true,
                  notify_whatsapp: m.notify_whatsapp ?? true,
                }}
                onSave={(data) => handleUpdate(m.id, data)}
                onCancel={() => setEditingId(null)}
                saving={saving}
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-semibold",
                  m.active
                    ? "bg-surface text-ink"
                    : "bg-surface text-ink-muted",
                )}
              >
                {getInitials(m.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      m.active ? "text-ink" : "text-ink-muted line-through",
                    )}
                  >
                    {m.full_name}
                  </span>
                  {m.role && (
                    <span className="text-caption text-ink-muted">
                      {m.role}
                    </span>
                  )}
                </div>
                <span className="text-caption text-ink-secondary" dir="ltr">
                  {m.email}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {m.whatsapp_phone ? (
                  <Badge variant="done">WhatsApp</Badge>
                ) : (
                  <Badge variant="neutral">ללא WhatsApp</Badge>
                )}
                <Badge variant={m.active ? "done" : "neutral"}>
                  {m.active ? "פעיל" : "לא פעיל"}
                </Badge>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(m.id);
                    setAddingNew(false);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink"
                  aria-label={`ערוך ${m.full_name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Show/hide inactive members */}
      {inactiveMembers.length > 0 && (
        <div className="px-4 py-2">
          <button
            type="button"
            onClick={() => setShowInactive((v) => !v)}
            className="flex items-center gap-1.5 text-caption text-ink-muted transition-colors hover:text-ink"
          >
            {showInactive ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showInactive ? "הסתר לא פעילים" : `הצג ${inactiveMembers.length} לא פעילים`}
          </button>
        </div>
      )}

      {/* Add new member */}
      {addingNew ? (
        <div className="p-4">
          <MemberForm
            initial={{
              full_name: "",
              role: "",
              email: "",
              whatsapp_phone: "",
              active: true,
              notify_email: true,
              notify_whatsapp: true,
            }}
            onSave={handleAdd}
            onCancel={() => setAddingNew(false)}
            saving={saving}
          />
        </div>
      ) : (
        <div className="p-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setAddingNew(true);
              setEditingId(null);
            }}
          >
            <UserPlus className="h-4 w-4" />
            הוסף משתמש
          </Button>
        </div>
      )}
    </div>
  );
}

// ---- Email Log ----

type EmailLogEntry = {
  id: string;
  recipients: string[];
  subject: string;
  email_type: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
};

const TYPE_LABELS: Record<string, string> = {
  new_task: "משימה חדשה",
  comment: "תגובה",
  mention: "אזכור",
  overdue: "איחור",
  digest: "סיכום בוקר",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  return `${day}, ${time}`;
}

export function EmailLog({ logs }: { logs: EmailLogEntry[] }) {
  const [showAll, setShowAll] = React.useState(false);
  const displayed = showAll ? logs : logs.slice(0, 10);

  if (logs.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-ink-muted">
        אין מיילים שנשלחו עדיין
      </div>
    );
  }

  return (
    <div>
      <div className="divide-y divide-border">
        {displayed.map((log) => (
          <div key={log.id} className="flex items-center gap-3 px-4 py-2.5">
            <div className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
              log.status === "sent" ? "bg-st-done-bg text-st-done-text" : "bg-overdue-bg text-overdue",
            )}>
              {log.status === "sent"
                ? <CheckCircle className="h-3.5 w-3.5" />
                : <AlertTriangle className="h-3.5 w-3.5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-ink">{log.subject}</span>
                {log.email_type && (
                  <Badge variant="neutral">
                    {TYPE_LABELS[log.email_type] ?? log.email_type}
                  </Badge>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-caption text-ink-secondary">
                <span dir="ltr" className="truncate">{log.recipients.join(", ")}</span>
              </div>
              {log.error_message && (
                <div className="mt-0.5 text-caption text-overdue">{log.error_message}</div>
              )}
            </div>
            <span className="shrink-0 text-caption text-ink-muted">{formatDate(log.created_at)}</span>
          </div>
        ))}
      </div>
      {logs.length > 10 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-border px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-surface"
        >
          {showAll ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {showAll ? "הצג פחות" : `הצג עוד ${logs.length - 10} מיילים`}
        </button>
      )}
    </div>
  );
}
