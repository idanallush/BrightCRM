import Link from "next/link";
import {
  Plus, Send, TrendingUp, TrendingDown, Clock, AlertTriangle,
  CheckCircle2, ArrowLeft, Users, Inbox, ListChecks,
} from "lucide-react";
import { StatusCell } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getDashboardCounts, getDashboardTrends, getMyTasks,
  getRecentTasksDetailed, getClientsWithOpenTaskCounts, getCriticalClients,
} from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { AiChat } from "@/components/dashboard/ai-chat";
import { MarkDoneButton } from "@/components/dashboard/mark-done-button";
import { DashboardSearch } from "@/components/dashboard/dashboard-search";
import {
  AnimatedDashboard, AnimatedSection, AnimatedStatCard, AnimatedNumber,
} from "@/components/dashboard/animated-layout";

export const dynamic = "force-dynamic";

const HEBREW_DAYS = ["יום ראשון", "יום שני", "יום שלישי", "יום רביעי", "יום חמישי", "יום שישי", "שבת"];

function formatHebrewDate(): string {
  const now = new Date();
  const day = HEBREW_DAYS[now.getDay()];
  const date = now.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
  return `${day}, ${date}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "ללא";
  return new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "long" });
}

function relativeDate(iso: string | null): { text: string; overdue: boolean } {
  if (!iso) return { text: "ללא", overdue: false };
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (d < 0) return { text: `באיחור ${Math.abs(d)} ימים`, overdue: true };
  if (d === 0) return { text: "היום", overdue: false };
  if (d === 1) return { text: "מחר", overdue: false };
  return { text: `עוד ${d} ימים`, overdue: false };
}

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "עכשיו";
  if (m < 60) return `לפני ${m} דק'`;
  const h = Math.floor(m / 60);
  if (h < 24) return `לפני ${h} שע'`;
  return `לפני ${Math.floor(h / 24)} ימים`;
}

function getFirstName(label: string): string {
  return label.split(/\s+/)[0] || label;
}

function getInitials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const STAT_CARDS = [
  { key: "waiting", trendKey: "waiting" as const, label: "ממתינות לטיפול", pastel: "bg-pastel-coral", color: "#FDAB3D", Icon: Inbox },
  { key: "working", trendKey: "working" as const, label: "בעבודה", pastel: "bg-pastel-purple", color: "#A25DDC", Icon: ListChecks },
  { key: "approval", trendKey: "approval" as const, label: "באישור לקוח", pastel: "bg-pastel-yellow", color: "#FFCB00", Icon: CheckCircle2 },
  { key: "overdue", trendKey: "overdue" as const, label: "באיחור", pastel: "bg-pastel-rose", color: "#E2445C", Icon: AlertTriangle },
] as const;

const HEALTH_COLORS: Record<string, string> = {
  "בריא": "#00C875",
  "אסטרטגיה צריכה": "#FDAB3D",
  "קריטי": "#E2445C",
};

const AVATAR_COLORS = ["#4262FF", "#A25DDC", "#00C875", "#FDAB3D", "#E2445C", "#FF642E"];

export default async function DashboardPage() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  const userLabel = user?.user_metadata?.full_name || user?.email || "";
  const firstName = getFirstName(userLabel);

  const [counts, trends, myTasks, recent, clientsOpen, criticalClients] = await Promise.all([
    getDashboardCounts(),
    getDashboardTrends(),
    getMyTasks(user?.email ?? ""),
    getRecentTasksDetailed(5),
    getClientsWithOpenTaskCounts(),
    getCriticalClients(),
  ]);

  const statValues: Record<string, number> = {
    waiting: counts.incoming,
    working: counts.working,
    approval: counts.awaitingApproval,
    overdue: counts.overdueTasks,
  };

  const totalActive = counts.incoming + counts.working + counts.awaitingApproval;

  return (
    <AnimatedDashboard>
      {/* Welcome header */}
      <AnimatedSection>
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-sidebar px-5 py-5">
          <div>
            <h1 className="text-xl font-bold text-white">שלום, {firstName}</h1>
            <p className="mt-0.5 text-sm text-white/50">{formatHebrewDate()}</p>
          </div>
          <div className="flex items-center gap-2">
            <DashboardSearch />
            <Button asChild>
              <Link href="/tasks?new=true">
                <Plus className="h-4 w-4" /> משימה חדשה
              </Link>
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-6 px-5 py-3 text-sm">
          <span className="text-ink-secondary">
            יש לך <span className="font-semibold text-ink">{myTasks.length}</span> משימות פתוחות
          </span>
          {counts.overdueTasks > 0 && (
            <span className="text-overdue">
              <AlertTriangle className="me-1 inline h-3.5 w-3.5" />
              <span className="font-semibold">{counts.overdueTasks}</span> באיחור
            </span>
          )}
          <span className="text-ink-secondary">
            סה״כ <span className="font-semibold text-ink">{totalActive}</span> משימות פעילות
          </span>
        </div>
      </div>
      </AnimatedSection>

      {/* Stat cards — Miro pastel style */}
      <AnimatedSection>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STAT_CARDS.map((card) => {
          const value = statValues[card.key] ?? 0;
          const trend = trends[card.trendKey];
          const isNegativeMeaning = card.key === "overdue";
          const trendIsGood = isNegativeMeaning ? trend.delta <= 0 : trend.delta >= 0;
          const trendColor = trend.delta === 0 ? "text-ink-muted" : trendIsGood ? "text-success" : "text-overdue";
          const periodLabel = trend.period === "day" ? "מאתמול" : "השבוע";
          return (
            <AnimatedStatCard key={card.key}>
            <div className={`overflow-hidden rounded-2xl ${card.pastel} p-5 shadow-elevation-1 transition-shadow hover:shadow-elevation-2`}>
              <div className="flex items-center justify-between">
                <span className="text-caption font-medium text-ink/70">{card.label}</span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/60">
                  <card.Icon className="h-4.5 w-4.5" style={{ color: card.color }} />
                </div>
              </div>
              <div className="mt-3 text-3xl font-bold text-ink"><AnimatedNumber value={value} /></div>
              {trend.delta !== 0 && (
                <div className={`mt-1 flex items-center gap-1 text-caption ${trendColor}`}>
                  {trend.delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{trend.delta > 0 ? "+" : ""}{trend.delta} {periodLabel}</span>
                </div>
              )}
              {trend.delta === 0 && (
                <div className="mt-1 text-caption text-ink/40">ללא שינוי</div>
              )}
            </div>
            </AnimatedStatCard>
          );
        })}
      </div>
      </AnimatedSection>

      {/* Main content: Tasks + Sidebar */}
      <AnimatedSection>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* My Tasks */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
            <div className="flex items-center justify-between bg-sidebar px-5 py-3.5">
              <h2 className="text-base font-bold text-white">המשימות שלי</h2>
              <Link href="/tasks" className="flex items-center gap-1 text-caption text-white/60 transition-colors hover:text-white">
                כל המשימות <ArrowLeft className="h-3 w-3" />
              </Link>
            </div>
            {myTasks.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pastel-teal">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">אין משימות פתוחות</p>
                  <p className="mt-0.5 text-caption text-ink-muted">כל המשימות טופלו</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-right text-body-sm">
                <thead>
                  <tr className="bg-surface text-caption text-ink-secondary">
                    <th className="px-4 py-2.5 text-right font-medium">משימה</th>
                    <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">לקוח</th>
                    <th className="px-4 py-2.5 text-center font-medium">סטטוס</th>
                    <th className="px-4 py-2.5 text-right font-medium">דדליין</th>
                    <th className="w-10 px-2" />
                  </tr>
                </thead>
                <tbody>
                  {myTasks.map((t) => {
                    const { overdue } = relativeDate(t.due_date);
                    return (
                      <tr key={t.id} className="border-b border-border transition-colors hover:bg-surface">
                        <td className="px-4 py-3">
                          <Link href={`/tasks?task=${t.id}`} className="font-medium text-ink hover:text-primary">{t.title}</Link>
                        </td>
                        <td className="hidden px-4 py-3 text-ink-secondary sm:table-cell">{t.client_name ?? ""}</td>
                        <td className="px-4 py-3 text-center"><StatusCell status={t.status} /></td>
                        <td className={`px-4 py-3 ${overdue ? "font-medium text-overdue" : "text-ink-secondary"}`}>{fmtDate(t.due_date)}</td>
                        <td className="px-2 py-3 text-center">
                          <MarkDoneButton taskId={t.id} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Sidebar: Clients attention + Activity */}
        <div className="flex flex-col gap-4">
          {/* Clients needing attention */}
          {criticalClients.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
              <div className="flex items-center justify-between bg-pastel-rose px-4 py-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-overdue" />
                  <h2 className="text-base font-bold text-ink">דורשים תשומת לב</h2>
                </div>
              </div>
              <div className="divide-y divide-border">
                {criticalClients.map((c) => (
                  <Link key={c.id} href={`/clients/${c.id}`}
                    className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-surface">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pastel-rose text-xs font-semibold text-overdue">
                        {getInitials(c.name)}
                      </span>
                      <div>
                        <span className="text-sm font-medium text-ink">{c.name}</span>
                        {c.manager && <span className="me-2 text-caption text-ink-muted">{c.manager.full_name}</span>}
                      </div>
                    </div>
                    <span className="rounded-full px-2.5 py-0.5 text-caption font-medium text-white" style={{ backgroundColor: "#E2445C" }}>
                      {c.health}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent activity */}
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
            <div className="flex items-center justify-between bg-sidebar px-4 py-3">
              <h2 className="text-base font-bold text-white">פעילות אחרונה</h2>
              <Link href="/tasks" className="flex items-center gap-1 text-caption text-white/60 transition-colors hover:text-white">
                הכל <ArrowLeft className="h-3 w-3" />
              </Link>
            </div>
            {recent.length === 0 ? (
              <div className="px-4 py-6 text-center text-body-sm text-ink-muted">אין פעילות</div>
            ) : (
              <div>
                {recent.map((task) => {
                  const who = task.source === "import" ? "ייבוא" : (task.created_by ?? "משתמש");
                  const initials = task.source === "import" ? "AT" :
                    (task.created_by ? getInitials(task.created_by) : "??");
                  const colorIdx = task.id.charCodeAt(0) % AVATAR_COLORS.length;
                  return (
                    <Link key={task.id} href={`/tasks?task=${task.id}`}
                      className="flex items-center gap-2.5 border-b border-border px-4 py-3 transition-colors hover:bg-surface last:border-b-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                        style={{ backgroundColor: AVATAR_COLORS[colorIdx] }}>
                        {initials}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-body-sm">
                        <span className="font-medium text-ink">{who}</span>
                        {task.source !== "import" ? " פתח: " : ": "}
                        <span className="text-ink-secondary">{task.title}</span>
                      </span>
                      <span className="shrink-0 text-caption text-ink-muted">{timeAgo(task.created_at)}</span>
                      {task.source === "telegram" && <Send className="h-3 w-3 shrink-0 text-ink-muted" />}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Chat */}
          <AiChat userEmail={user?.email ?? ""} />
        </div>
      </div>
      </AnimatedSection>

      {/* Clients with open tasks */}
      {clientsOpen.length > 0 && (
        <AnimatedSection>
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
          <div className="flex items-center justify-between bg-sidebar px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-white/60" />
              <h2 className="text-base font-bold text-white">לקוחות עם משימות פתוחות</h2>
            </div>
            <Link href="/clients" className="flex items-center gap-1 text-caption text-white/60 transition-colors hover:text-white">
              כל הלקוחות <ArrowLeft className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {clientsOpen.map((c) => {
              const healthColor = c.health ? HEALTH_COLORS[c.health] : undefined;
              return (
                <Link key={c.id} href={`/clients/${c.id}`}
                  className="flex flex-col items-center gap-1.5 bg-white px-3 py-4 transition-colors hover:bg-surface">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pastel-blue text-sm font-semibold text-primary">
                    {getInitials(c.name)}
                  </span>
                  <span className="max-w-full truncate text-center text-sm font-medium text-ink">{c.name}</span>
                  <span className="rounded-full px-2.5 py-0.5 text-caption font-semibold text-white"
                    style={{ backgroundColor: healthColor ?? "#4262FF" }}>
                    {c.open_count} משימות
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
        </AnimatedSection>
      )}
    </AnimatedDashboard>
  );
}
