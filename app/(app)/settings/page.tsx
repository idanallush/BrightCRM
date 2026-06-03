import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  MessageCircle,
  Mic,
  CheckCircle,
  Users,
  Settings,
  Mail,
} from "lucide-react";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { TeamManager, EmailLog } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  const email = user?.email ?? "";
  const fullName = user?.user_metadata?.full_name ?? email;

  const { data: member } = await sb
    .from("team_members")
    .select("id, full_name, role, email, whatsapp_phone")
    .eq("email", email)
    .maybeSingle();

  const { data: allMembers } = await sb
    .from("team_members")
    .select("id, full_name, role, email, whatsapp_phone, active, notify_email, notify_whatsapp")
    .order("full_name");

  const { data: emailLogs } = await sb
    .from("email_log")
    .select("id, recipients, subject, email_type, status, error_message, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const whatsappConnected = !!member?.whatsapp_phone;

  return (
    <StaggerContainer className="flex flex-col gap-5" stagger={0.07}>
      <StaggerItem>
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-ink-muted" />
        <h1 className="text-2xl font-bold text-ink">הגדרות</h1>
      </div>
      </StaggerItem>

      {/* Account */}
      <StaggerItem>
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-base font-bold text-ink">חשבון</h2>
        </div>
        <div className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-base font-semibold text-ink">
              {fullName.split(/\s+/).map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[15px] font-semibold text-ink">{fullName}</span>
              <span className="text-caption text-ink-secondary">{email}</span>
              {member?.role && <span className="text-caption text-ink-muted">{member.role}</span>}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-surface p-3">
            <Phone className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <span className="text-sm font-medium text-ink">WhatsApp</span>
              <span className="mr-2 text-caption text-ink-secondary">
                {whatsappConnected ? "מחובר" : "לא מחובר"}
              </span>
            </div>
            <Badge variant={whatsappConnected ? "done" : "neutral"}>
              {whatsappConnected ? "פעיל" : "לא פעיל"}
            </Badge>
          </div>
        </div>
      </div>
      </StaggerItem>

      {/* WhatsApp Guide */}
      <StaggerItem>
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-base font-bold text-ink">מדריך חיבור WhatsApp</h2>
        </div>
        <div className="p-4">
          <div className="flex flex-col gap-4">
            <Step num={1} icon={<Phone className="h-5 w-5 text-primary" />}
              title="שלח הודעה למספר הבוט"
              desc="שלח הודעה כלשהי למספר ה-WhatsApp של BrightCRM" />
            <Step num={2} icon={<MessageCircle className="h-5 w-5 text-primary" />}
              title="שלח את המייל שלך ב-Bright"
              desc={`הבוט יבקש את כתובת המייל שלך, למשל: ${email}`} />
            <Step num={3} icon={<CheckCircle className="h-5 w-5 text-success" />}
              title="קיבלת אישור? מעולה!"
              desc="עכשיו אפשר לשלוח הודעות טקסט או קוליות כדי לפתוח משימות" />
          </div>

          <div className="mt-6 rounded-xl border border-border bg-surface p-4">
            <h4 className="mb-2 text-sm font-semibold text-ink">טיפים לשימוש יעיל</h4>
            <ul className="flex flex-col gap-2 text-caption text-ink-secondary">
              <li className="flex items-start gap-2">
                <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted" />
                <span>&quot;פוטוטבע - להכין באנרים לקמפיין חדש עד יום חמישי&quot;</span>
              </li>
              <li className="flex items-start gap-2">
                <Mic className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted" />
                <span>שלח הקלטה קולית - ה-AI מתמלל ומזהה את הלקוח אוטומטית</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted" />
                <span>תמיד תקבל הודעת אישור לפני שהמשימה נשמרת</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      </StaggerItem>

      {/* Team */}
      <StaggerItem>
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Users className="h-4 w-4 text-ink-secondary" />
          <h2 className="text-base font-bold text-ink">ניהול צוות</h2>
        </div>
        <TeamManager members={(allMembers ?? []) as any} />
      </div>
      </StaggerItem>

      {/* Email Log */}
      <StaggerItem>
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Mail className="h-4 w-4 text-ink-secondary" />
          <h2 className="text-base font-bold text-ink">לוג מיילים</h2>
          <span className="rounded-full bg-surface px-2 py-0.5 text-caption font-medium text-ink-secondary">
            {(emailLogs ?? []).length}
          </span>
        </div>
        <EmailLog logs={(emailLogs ?? []) as any} />
      </div>
      </StaggerItem>
    </StaggerContainer>
  );
}

function Step({ num, icon, title, desc }: {
  num: number; icon: React.ReactNode; title: string; desc: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-caption font-semibold text-ink">
        {num}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-ink">{title}</span>
        </div>
        <p className="mt-0.5 text-caption text-ink-secondary">{desc}</p>
      </div>
    </div>
  );
}
