"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, Briefcase, MessageCircle, Lock, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { UserAvatar } from "@/components/user-avatar";
import { ToggleRow } from "@/components/ui/toggle-row";
import { Section, Field } from "@/components/ui/form-section";
import {
  updateProfile,
  uploadAvatar,
  updateNotificationPrefs,
  changePassword,
} from "./actions";

type Member = {
  id: string;
  full_name: string | null;
  role: string | null;
  email: string | null;
  whatsapp_phone: string | null;
  avatar_url: string | null;
  notify_email: boolean;
  notify_whatsapp: boolean;
};

export function ProfileClient({ member }: { member: Member }) {
  const router = useRouter();

  // --- פרטים אישיים ---
  const [fullName, setFullName] = React.useState(member.full_name ?? "");
  const [role, setRole] = React.useState(member.role ?? "");
  const [phone, setPhone] = React.useState(member.whatsapp_phone ?? "");
  const [savingDetails, setSavingDetails] = React.useState(false);

  // --- תמונת פרופיל ---
  const [avatarUrl, setAvatarUrl] = React.useState(member.avatar_url);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // --- התראות ---
  const [notifyEmail, setNotifyEmail] = React.useState(member.notify_email);
  const [notifyWhatsapp, setNotifyWhatsapp] = React.useState(member.notify_whatsapp);
  const [savingPrefs, setSavingPrefs] = React.useState(false);

  // --- אבטחה ---
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [savingPassword, setSavingPassword] = React.useState(false);

  async function onSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("חסר שם מלא");
      return;
    }
    setSavingDetails(true);
    const res = await updateProfile({
      full_name: fullName,
      role: role || null,
      whatsapp_phone: phone || null,
    });
    setSavingDetails(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    toast.success("הפרטים נשמרו");
    router.refresh();
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);
    const res = await uploadAvatar(fd);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    setAvatarUrl(res.url ?? null);
    toast.success("התמונה עודכנה");
    router.refresh();
  }

  async function onSavePrefs(next: { notify_email: boolean; notify_whatsapp: boolean }) {
    // optimistic update
    setNotifyEmail(next.notify_email);
    setNotifyWhatsapp(next.notify_whatsapp);
    setSavingPrefs(true);
    const res = await updateNotificationPrefs(next);
    setSavingPrefs(false);
    if ("error" in res) {
      toast.error(res.error);
      // revert on failure
      setNotifyEmail(member.notify_email);
      setNotifyWhatsapp(member.notify_whatsapp);
      return;
    }
    toast.success("העדפות ההתראות נשמרו");
    router.refresh();
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("הסיסמה חייבת להכיל לפחות 8 תווים");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("הסיסמאות אינן תואמות");
      return;
    }
    setSavingPassword(true);
    const res = await changePassword(newPassword);
    setSavingPassword(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    toast.success("הסיסמה עודכנה");
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6" dir="rtl">
      <header>
        <h1 className="text-2xl font-bold text-ink">הפרופיל שלי</h1>
        <p className="mt-1 text-body-sm text-ink-muted">
          ניהול הפרטים האישיים, התמונה, ההתראות והאבטחה שלך.
        </p>
      </header>

      {/* תמונת פרופיל */}
      <Section title="תמונת פרופיל">
        <div className="flex items-center gap-5">
          <UserAvatar name={fullName || member.email} avatarUrl={avatarUrl} size="xl" />
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onPickFile}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {uploading ? "מעלה..." : "העלאת תמונה"}
            </Button>
            <p className="text-caption text-ink-muted">JPG, PNG או WEBP, עד 5MB.</p>
          </div>
        </div>
      </Section>

      {/* פרטים אישיים */}
      <Section title="פרטים אישיים">
        <form onSubmit={onSaveDetails} className="flex flex-col gap-4">
          <Field label="שם מלא" icon={<Briefcase className="h-4 w-4" />}>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="תפקיד">
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="לדוגמה: מנהל קמפיינים"
            />
          </Field>
          <Field label="טלפון וואטסאפ" icon={<Phone className="h-4 w-4" />}>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9725..."
              inputMode="tel"
            />
          </Field>
          <Field label="אימייל (כתובת ההתחברות)" icon={<Mail className="h-4 w-4" />}>
            <Input value={member.email ?? ""} readOnly disabled className="bg-surface text-ink-muted" />
          </Field>
          <div className="flex flex-row-reverse">
            <Button type="submit" disabled={savingDetails}>
              {savingDetails ? "שומר..." : "שמירת פרטים"}
            </Button>
          </div>
        </form>
      </Section>

      {/* התראות */}
      <Section title="התראות">
        <p className="mb-3 text-body-sm text-ink-muted">
          בחר היכן לקבל התראות על משימות חדשות, תגובות ואזכורים.
        </p>
        <div className="flex flex-col gap-2">
          <ToggleRow
            label="התראות במייל"
            icon={<Mail className="h-4 w-4" />}
            checked={notifyEmail}
            disabled={savingPrefs}
            onChange={(v) =>
              onSavePrefs({ notify_email: v, notify_whatsapp: notifyWhatsapp })
            }
          />
          <ToggleRow
            label="התראות בוואטסאפ"
            icon={<MessageCircle className="h-4 w-4" />}
            checked={notifyWhatsapp}
            disabled={savingPrefs}
            onChange={(v) =>
              onSavePrefs({ notify_email: notifyEmail, notify_whatsapp: v })
            }
          />
        </div>
      </Section>

      {/* אבטחה */}
      <Section title="אבטחה">
        <p className="mb-3 text-body-sm text-ink-muted">
          הגדרת סיסמה מאפשרת להתחבר עם אימייל וסיסמה בנוסף להתחברות עם Google.
        </p>
        <form onSubmit={onChangePassword} className="flex flex-col gap-4">
          <Field label="סיסמה חדשה" icon={<Lock className="h-4 w-4" />}>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="לפחות 8 תווים"
              autoComplete="new-password"
            />
          </Field>
          <Field label="אימות סיסמה">
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <div className="flex flex-row-reverse">
            <Button type="submit" disabled={savingPassword}>
              {savingPassword ? "שומר..." : "עדכון סיסמה"}
            </Button>
          </div>
        </form>
      </Section>
    </div>
  );
}

