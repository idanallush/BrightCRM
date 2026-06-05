import { Suspense } from "react";
import Link from "next/link";
import {
  Plus, Phone, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle2, ArrowLeft, Users, Inbox, ListChecks, Eye,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getDashboardCounts, getDashboardTrends, getMyTasks,
  getRecentTasksDetailed, getClientsWithOpenTaskCounts, getCriticalClients,
  getCommentCountsByTask,
  type DashboardCounts,
} from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { DashboardSearch } from "@/components/dashboard/dashboard-search";
import {
  AnimatedDashboard, AnimatedSection, AnimatedNumber,
} from "@/components/dashboard/animated-layout";
import { MyTasksSection } from "@/components/dashboard/my-tasks-section";
import { ClientLogo } from "@/components/client-logo";
import { getInitials, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

const HEBREW_DAYS = ["יום ראשון", "יום שני", "יום שלישי", "יום רביעי", "יום חמישי", "יום שישי", "שבת"];

function formatHebrewDate(): string {
  const now = new Date();
  const day = HEBREW_DAYS[now.getDay()];
  const date = now.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
  return `${day}, ${date}`;
}

function getFirstName(label: string): string {
  return label.split(/\s+/)[0] || label;
}

const STAT_CARDS = [
  { key: "waiting", trendKey: "waiting" as const, label: "ממתינות לטיפול", color: "#FDAB3D", Icon: Inbox, href: "/tasks?status=מחכה לטיפול" },
  { key: "working", trendKey: "working" as const, label: "בעבודה", color: "#A25DDC", Icon: ListChecks, href: "/tasks?status=נכנס לעבודה,בעבודה" },
  { key: "approval", trendKey: "approval" as const, label: "באישור לקוח", color: "#FFCB00", Icon: CheckCircle2, href: "/tasks?status=אישור לקוח" },
  { key: "overdue", trendKey: "overdue" as const, label: "באיחור", color: "#E2445C", Icon: AlertTriangle, href: "/tasks?overdue=true" },
] as const;


function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-4" dir="rtl">
      <div className="h-28 animate-pulse rounded-2xl bg-surface" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface" />
        ))}
      </div>
      <div className="h-14 animate-pulse rounded-2xl bg-surface" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="h-64 animate-pulse rounded-2xl bg-surface lg:col-span-2" />
        <div className="h-64 animate-pulse rounded-2xl bg-surface" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  const userLabel = user?.user_metadata?.full_name || user?.email || "";
  const firstName = getFirstName(userLabel);

  // Resolve the current user's team_member id so dashboard counts are per-user.
  const userEmail = user?.email ?? "";
  let currentMemberId: string | undefined;
  if (userEmail) {
    const { data: memberRow } = await sb
      .from("team_members")
      .select("id")
      .eq("email", userEmail)
      .maybeSingle();
    currentMemberId = memberRow?.id ?? undefined;
  }

  let counts: DashboardCounts = { incoming: 0, working: 0, awaitingApproval: 0, overdueTasks: 0, watching: 0 };
  let trends: Awaited<ReturnType<typeof getDashboardTrends>> = {
    waiting: { delta: 0, period: "day" }, working: { delta: 0, period: "day" },
    approval: { delta: 0, period: "day" }, overdue: { delta: 0, period: "day" },
  };
  let myTasks: Awaited<ReturnType<typeof getMyTasks>> = [];
  let recent: Awaited<ReturnType<typeof getRecentTasksDetailed>> = [];
  let clientsOpen: Awaited<ReturnType<typeof getClientsWithOpenTaskCounts>> = [];
  let criticalClients: Awaited<ReturnType<typeof getCriticalClients>> = [];
  let commentCounts: Record<string, number> = {};

  try {
    [counts, trends, myTasks, recent, clientsOpen, criticalClients, commentCounts] = await Promise.all([
      getDashboardCounts(currentMemberId),
      getDashboardTrends(),
      getMyTasks(userEmail),
      getRecentTasksDetailed(5),
      getClientsWithOpenTaskCounts(),
      getCriticalClients(),
      getCommentCountsByTask(),
    ]);
  } catch (err) {
    console.error("Dashboard data fetch failed:", err);
  }

  const statValues: Record<string, number> = {
    waiting: counts.incoming,
    working: counts.working,
    approval: counts.awaitingApproval,
    overdue: counts.overdueTasks,
  };

  const totalActive = counts.incoming + counts.working + counts.awaitingApproval;

  return (
    <AnimatedDashboard>
      {/* Compact toolbar */}
      <AnimatedSection>
      <div className="flex items-center gap-2 rounded-2xl bg-[#1A1A1A] px-3 py-2 shadow-elevation-1">
        <Button asChild size="sm">
          <Link href="/tasks?new=true">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">חדש</span>
          </Link>
        </Button>

        <div className="h-5 w-px shrink-0 bg-[#333]" />

        <span className="text-sm font-bold text-white">שלום, {firstName}</span>
        <span className="hidden text-caption text-[#9CA3AF] sm:inline">{formatHebrewDate()}</span>

        <div className="h-5 w-px shrink-0 bg-[#333]" />

        <div className="flex items-center gap-4 text-caption">
          <span className="text-[#9CA3AF]">
            <span className="font-semibold text-white">{myTasks.length}</span> פתוחות
          </span>
          {counts.overdueTasks > 0 && (
            <span className="text-overdue">
              <AlertTriangle className="me-1 inline h-3.5 w-3.5" />
              <span className="font-semibold">{counts.overdueTasks}</span> באיחור
            </span>
          )}
          <span className="hidden text-[#9CA3AF] sm:inline">
            סה״כ <span className="font-semibold text-white">{totalActive}</span> פעילות
          </span>
        </div>

        <div className="flex-1" />

        <DashboardSearch dark />
      </div>
      </AnimatedSection>

      {/* Stat strip — סקירה */}
      <AnimatedSection>
      <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-elevation-1">
        <div className="flex min-w-max items-stretch divide-x divide-x-reverse divide-border">
          {/* Header */}
          <div className="flex shrink-0 items-center gap-2.5 px-5 py-4">
            <LayoutDashboard className="h-5 w-5 text-ink-secondary" />
            <span className="text-base font-bold text-ink">סקירה</span>
          </div>
          {/* Stat items */}
          {STAT_CARDS.map((card) => {
            const value = statValues[card.key] ?? 0;
            const trend = trends[card.trendKey];
            const isNegativeMeaning = card.key === "overdue";
            const trendIsGood = isNegativeMeaning ? trend.delta <= 0 : trend.delta >= 0;
            const trendColor = trend.delta === 0 ? "text-ink-muted" : trendIsGood ? "text-success" : "text-overdue";
            const periodLabel = trend.period === "day" ? "מאתמול" : "השבוע";
            return (
              <Link key={card.key} href={card.href} className="flex shrink-0 items-center gap-3 px-5 py-4 transition-colors hover:bg-surface">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: card.color + "15" }}>
                  <card.Icon className="h-5 w-5" style={{ color: card.color }} />
                </div>
                <div className="flex flex-col">
                  <span className="text-caption text-ink-muted">{card.label}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-ink"><AnimatedNumber value={value} /></span>
                    {trend.delta !== 0 && (
                      <span className={`flex items-center gap-0.5 text-caption ${trendColor}`}>
                        {trend.delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {trend.delta > 0 ? "+" : ""}{trend.delta} {periodLabel}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
          {/* Watching */}
          <Link href="/tasks" className="flex shrink-0 items-center gap-3 px-5 py-4 transition-colors hover:bg-surface">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface">
              <Eye className="h-5 w-5 text-ink-secondary" />
            </div>
            <div className="flex flex-col">
              <span className="text-caption text-ink-muted">אני עוקב</span>
              <span className="text-2xl font-bold text-ink"><AnimatedNumber value={counts.watching} /></span>
            </div>
          </Link>
        </div>
      </div>
      </AnimatedSection>

      {/* Main content: Tasks + Sidebar */}
      <AnimatedSection>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* My Tasks — emphasized */}
        <div className="lg:col-span-2">
          <MyTasksSection tasks={myTasks} commentCounts={commentCounts} />
        </div>

        {/* Sidebar: Clients attention + Activity */}
        <div className="flex flex-col gap-4">
          {/* Clients needing attention */}
          {criticalClients.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
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
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-xs font-semibold text-ink">
                        {getInitials(c.name)}
                      </span>
                      <div>
                        <span className="text-sm font-medium text-ink">{c.name}</span>
                        {c.manager && <span className="me-2 text-caption text-ink-muted">{c.manager.full_name}</span>}
                      </div>
                    </div>
                    <span className="rounded-full bg-surface px-2.5 py-0.5 text-caption font-medium text-ink-secondary">
                      {c.health}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent activity */}
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-base font-bold text-ink">פעילות אחרונה</h2>
              <Link href="/activity" className="flex items-center gap-1 text-caption text-ink-secondary transition-colors hover:text-ink">
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
                  return (
                    <Link key={task.id} href={`/tasks?task=${task.id}`}
                      className="flex items-center gap-2.5 border-b border-border px-4 py-3 transition-colors hover:bg-surface last:border-b-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-[11px] font-semibold text-ink">
                        {initials}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-body-sm">
                        <span className="font-medium text-ink">{who}</span>
                        {task.source !== "import" ? " פתח: " : ": "}
                        <span className="text-ink-secondary">{task.title}</span>
                      </span>
                      <span className="shrink-0 text-caption text-ink-muted">{timeAgo(task.created_at)}</span>
                      {task.source === "whatsapp" && <Phone className="h-3 w-3 shrink-0 text-ink-muted" />}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
      </AnimatedSection>

      {/* Clients with open tasks — horizontal scroll */}
      {clientsOpen.length > 0 && (
        <AnimatedSection>
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-ink-secondary" />
              <h2 className="text-base font-bold text-ink">לקוחות עם משימות פתוחות</h2>
            </div>
            <Link href="/clients" className="flex items-center gap-1 text-caption text-ink-secondary transition-colors hover:text-ink">
              כל הלקוחות <ArrowLeft className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <div className="flex min-w-max items-stretch divide-x divide-x-reverse divide-border pe-20">
              {clientsOpen.map((c) => (
                <Link key={c.id} href={`/clients/${c.id}`}
                  className="flex shrink-0 flex-col items-center gap-1.5 px-5 py-4 transition-colors hover:bg-surface">
                  <ClientLogo logoUrl={c.logo_url} logoStoragePath={c.logo_storage_path} name={c.name} size="lg" />
                  <span className="max-w-[120px] truncate text-center text-sm font-medium text-ink">{c.name}</span>
                  <span className="rounded-full bg-surface px-2.5 py-0.5 text-caption font-semibold text-ink-secondary">
                    {c.open_count} {c.open_count === 1 ? "משימה" : "משימות"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
        </AnimatedSection>
      )}
    </AnimatedDashboard>
  );
}
