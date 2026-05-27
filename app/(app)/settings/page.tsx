import { createClient } from "@/lib/supabase/server";
import { getTeam } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Send,
  MessageCircle,
  Mic,
  CheckCircle,
  Users,
  Settings,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  const email = user?.email ?? "";
  const fullName = user?.user_metadata?.full_name ?? email;

  const { data: member } = await sb
    .from("team_members")
    .select("id, full_name, role, email, telegram_user_id")
    .eq("email", email)
    .maybeSingle();

  const team = await getTeam();

  const { data: allMembers } = await sb
    .from("team_members")
    .select("id, full_name, role, email, telegram_user_id, active")
    .eq("active", true)
    .order("full_name");

  const telegramConnected = !!member?.telegram_user_id;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-ink-muted" />
        <h1 className="text-2xl font-bold text-ink">הגדרות</h1>
      </div>

      {/* Account */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
        <div className="bg-sidebar px-4 py-3">
          <h2 className="text-base font-bold text-white">חשבון</h2>
        </div>
        <div className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pastel-blue text-base font-semibold text-primary">
              {fullName.split(/\s+/).map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[15px] font-semibold text-ink">{fullName}</span>
              <span className="text-caption text-ink-secondary">{email}</span>
              {member?.role && <span className="text-caption text-ink-muted">{member.role}</span>}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-surface p-3">
            <Send className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <span className="text-sm font-medium text-ink">טלגרם</span>
              <span className="mr-2 text-caption text-ink-secondary">
                {telegramConnected ? "מחובר" : "לא מחובר"}
              </span>
            </div>
            <Badge variant={telegramConnected ? "done" : "neutral"}>
              {telegramConnected ? "פעיל" : "לא פעיל"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Telegram Guide */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
        <div className="bg-sidebar px-4 py-3">
          <h2 className="text-base font-bold text-white">מדריך חיבור טלגרם</h2>
        </div>
        <div className="p-4">
          <div className="flex flex-col gap-4">
            <Step num={1} icon={<MessageCircle className="h-5 w-5 text-primary" />}
              title="פתח את הבוט בטלגרם"
              desc="חפש @BrightCRM_bot בטלגרם ולחץ Start" />
            <Step num={2} icon={<Send className="h-5 w-5 text-primary" />}
              title="שלח הודעה כלשהי"
              desc="הבוט יבקש את כתובת המייל שלך" />
            <Step num={3} icon={<User className="h-5 w-5 text-primary" />}
              title="שלח את המייל שלך ב-Bright"
              desc={`למשל: ${email}`} />
            <Step num={4} icon={<CheckCircle className="h-5 w-5 text-success" />}
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

      {/* Team */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
        <div className="flex items-center gap-2 bg-sidebar px-4 py-3">
          <Users className="h-4 w-4 text-white/60" />
          <h2 className="text-base font-bold text-white">צוות</h2>
        </div>
        <div className="divide-y divide-border">
          {(allMembers ?? []).map((m: any) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pastel-blue text-[11px] font-semibold text-primary">
                {m.full_name.split(/\s+/).map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink">{m.full_name}</span>
                  {m.role && <span className="text-caption text-ink-muted">{m.role}</span>}
                </div>
                <span className="text-caption text-ink-secondary">{m.email}</span>
              </div>
              <div className="flex items-center gap-2">
                {m.telegram_user_id ? (
                  <Badge variant="done">Telegram</Badge>
                ) : (
                  <Badge variant="neutral">ללא טלגרם</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step({ num, icon, title, desc }: {
  num: number; icon: React.ReactNode; title: string; desc: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pastel-blue text-caption font-semibold text-primary">
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
