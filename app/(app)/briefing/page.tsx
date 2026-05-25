import { TrendingUp, TrendingDown, AlertTriangle, CheckSquare, DollarSign, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getClientsWithOpenTaskCounts } from "@/lib/data";
import { PageViewTracker } from "@/components/page-view-tracker";
import Link from "next/link";

export const dynamic = "force-dynamic";

const HEBREW_DAYS = ["יום ראשון", "יום שני", "יום שלישי", "יום רביעי", "יום חמישי", "יום שישי", "שבת"];

function todayHebrew(): string {
  const now = new Date();
  const day = HEBREW_DAYS[now.getDay()];
  const date = now.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
  return `${day}, ${date}`;
}

type Campaign = {
  client: string;
  name: string;
  spend: number;
  spendYesterday: number;
  cpa: number;
  cpaAvg7d: number;
  roas: number | null;
  conversions: number;
};

type Anomaly = {
  client: string;
  campaign: string;
  message: string;
  severity: "high" | "medium";
};

// ──────────────────────────────────────────────
// HARDCODED DATA — replace with real Ads Manager numbers
// ──────────────────────────────────────────────
const CAMPAIGNS: Campaign[] = [
  {
    client: "פוטוטבע",
    name: "Summer Sale – Conversions",
    spend: 1250,
    spendYesterday: 980,
    cpa: 42,
    cpaAvg7d: 38,
    roas: 3.2,
    conversions: 30,
  },
  {
    client: "שמרת הזורע",
    name: "Catalog – Living Room",
    spend: 890,
    spendYesterday: 920,
    cpa: 65,
    cpaAvg7d: 58,
    roas: 2.1,
    conversions: 14,
  },
  {
    client: "מילגה",
    name: "Leads – Modular Sofas",
    spend: 720,
    spendYesterday: 680,
    cpa: 28,
    cpaAvg7d: 31,
    roas: null,
    conversions: 26,
  },
  {
    client: "שנקר הנדסאים",
    name: "Registration – Fall Semester",
    spend: 540,
    spendYesterday: 560,
    cpa: 85,
    cpaAvg7d: 78,
    roas: null,
    conversions: 6,
  },
  {
    client: "חדוה ארז",
    name: "Leads – Physio Appointments",
    spend: 320,
    spendYesterday: 290,
    cpa: 22,
    cpaAvg7d: 25,
    roas: null,
    conversions: 15,
  },
];

const ANOMALIES: Anomaly[] = [
  {
    client: "פוטוטבע",
    campaign: "Summer Sale – Conversions",
    message: "הוצאה יומית עלתה ב-28% מול ממוצע שבועי. CPA עלה ב-11%.",
    severity: "high",
  },
  {
    client: "שנקר הנדסאים",
    campaign: "Registration – Fall Semester",
    message: "CPA של ₪85 — גבוה ב-9% מהממוצע השבועי. ביצועים יורדים.",
    severity: "medium",
  },
];
// ──────────────────────────────────────────────

function TrendBadge({ current, previous, inverse }: { current: number; previous: number; inverse?: boolean }) {
  const diff = current - previous;
  const pct = previous > 0 ? Math.round((diff / previous) * 100) : 0;
  if (pct === 0) return <span className="text-caption text-ink-muted">ללא שינוי</span>;
  const isUp = pct > 0;
  const isGood = inverse ? !isUp : isUp;
  return (
    <span className={`inline-flex items-center gap-1 text-caption font-medium ${isGood ? "text-success" : "text-overdue"}`}>
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isUp ? "+" : ""}{pct}%
    </span>
  );
}

function formatCurrency(n: number): string {
  return `₪${n.toLocaleString("he-IL")}`;
}

export default async function BriefingPage() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  const firstName = (user?.user_metadata?.full_name || user?.email || "").split(/\s+/)[0];

  const clientsOpen = await getClientsWithOpenTaskCounts();

  const totalSpend = CAMPAIGNS.reduce((s, c) => s + c.spend, 0);
  const totalConversions = CAMPAIGNS.reduce((s, c) => s + c.conversions, 0);

  return (
    <div className="flex flex-col gap-5">
      <PageViewTracker page="/briefing" />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink">סקירת בוקר</h1>
        <p className="mt-0.5 text-sm text-ink-secondary">{todayHebrew()}</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="הוצאה יומית" value={formatCurrency(totalSpend)} color="#0073EA" icon={<DollarSign className="h-4 w-4" />} />
        <SummaryCard label="המרות" value={String(totalConversions)} color="#00C875" icon={<BarChart3 className="h-4 w-4" />} />
        <SummaryCard label="אנומליות" value={String(ANOMALIES.length)} color={ANOMALIES.length > 0 ? "#E2445C" : "#00C875"} icon={<AlertTriangle className="h-4 w-4" />} />
        <SummaryCard label="לקוחות עם משימות" value={String(clientsOpen.length)} color="#FDAB3D" icon={<CheckSquare className="h-4 w-4" />} />
      </div>

      {/* Campaigns table */}
      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        <div className="flex items-center justify-between bg-primary px-4 py-3">
          <h2 className="text-base font-bold text-white">קמפיינים מובילים לפי הוצאה</h2>
          <span className="text-caption text-white/60">{CAMPAIGNS.length} קמפיינים</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-body-sm">
            <thead>
              <tr className="bg-surface text-caption text-ink-secondary">
                <th className="px-4 py-2.5 text-right font-medium">לקוח</th>
                <th className="px-4 py-2.5 text-right font-medium">קמפיין</th>
                <th className="px-4 py-2.5 text-right font-medium">הוצאה</th>
                <th className="px-4 py-2.5 text-center font-medium">מגמה</th>
                <th className="px-4 py-2.5 text-right font-medium">CPA</th>
                <th className="px-4 py-2.5 text-center font-medium">CPA מגמה</th>
                <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">ROAS</th>
                <th className="px-4 py-2.5 text-right font-medium">המרות</th>
              </tr>
            </thead>
            <tbody>
              {CAMPAIGNS.map((c, i) => (
                <tr key={i} className="border-b border-border transition-colors hover:bg-surface">
                  <td className="px-4 py-3 font-medium text-ink">{c.client}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-ink-secondary">{c.name}</td>
                  <td className="px-4 py-3 font-medium text-ink">{formatCurrency(c.spend)}</td>
                  <td className="px-4 py-3 text-center">
                    <TrendBadge current={c.spend} previous={c.spendYesterday} />
                  </td>
                  <td className="px-4 py-3 text-ink">{formatCurrency(c.cpa)}</td>
                  <td className="px-4 py-3 text-center">
                    <TrendBadge current={c.cpa} previous={c.cpaAvg7d} inverse />
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">{c.roas ? `x${c.roas.toFixed(1)}` : "—"}</td>
                  <td className="px-4 py-3 font-medium text-ink">{c.conversions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Anomalies */}
      {ANOMALIES.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
          <div className="flex items-center gap-2 bg-[#E2445C] px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-white" />
            <h2 className="text-base font-bold text-white">אנומליות</h2>
          </div>
          <div className="divide-y divide-border">
            {ANOMALIES.map((a, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${a.severity === "high" ? "bg-[#E2445C]" : "bg-[#FDAB3D]"}`}>
                  !
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ink">{a.client} — {a.campaign}</div>
                  <div className="mt-0.5 text-caption text-ink-secondary">{a.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open tasks per client */}
      {clientsOpen.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
          <div className="flex items-center gap-2 bg-sidebar px-4 py-3">
            <CheckSquare className="h-4 w-4 text-white/60" />
            <h2 className="text-base font-bold text-white">משימות פתוחות לפי לקוח</h2>
          </div>
          <div className="divide-y divide-border">
            {clientsOpen.map((c) => (
              <Link key={c.id} href={`/clients/${c.id}`}
                className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-surface">
                <span className="text-sm font-medium text-ink">{c.name}</span>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-caption font-semibold text-primary">
                  {c.open_count} משימות
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white p-4 shadow-sm"
      style={{ borderRightWidth: 4, borderRightColor: color }}>
      <div className="flex items-center justify-between">
        <span className="text-caption text-ink-secondary">{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="mt-1 text-3xl font-bold text-ink">{value}</div>
    </div>
  );
}
