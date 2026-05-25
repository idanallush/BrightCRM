import Link from "next/link";
import { Send, MessageSquare, TrendingUp, Clock, AlertTriangle, CheckCircle2, ArrowLeft } from "lucide-react";
import { StatusCell } from "@/components/ui/badge";
import { getDashboardCounts, getMyTasks, getRecentTasksDetailed, getWeeklySourceCounts } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { AiChat } from "@/components/dashboard/ai-chat";
import { MarkDoneButton } from "@/components/dashboard/mark-done-button";

export const dynamic = "force-dynamic";

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
  { key: "waiting", label: "ממתין", color: "#FDAB3D", Icon: Clock },
  { key: "working", label: "בעבודה", color: "#A25DDC", Icon: TrendingUp },
  { key: "approval", label: "באישור", color: "#FFCB00", Icon: CheckCircle2 },
  { key: "overdue", label: "באיחור", color: "#E2445C", Icon: AlertTriangle },
] as const;

export default async function DashboardPage() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  const userLabel = user?.user_metadata?.full_name || user?.email || "";
  const firstName = getFirstName(userLabel);

  const [counts, myTasks, recent, sourceCounts] = await Promise.all([
    getDashboardCounts(),
    getMyTasks(user?.email ?? ""),
    getRecentTasksDetailed(5),
    getWeeklySourceCounts(),
  ]);

  const telegramPct = sourceCounts.total > 0
    ? Math.round((sourceCounts.telegram / sourceCounts.total) * 100)
    : 0;

  const statValues: Record<string, number> = {
    waiting: counts.incoming,
    working: counts.working,
    approval: counts.awaitingApproval,
    overdue: counts.overdueTasks,
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-ink">שלום, {firstName}</h1>
        <p className="mt-0.5 text-sm text-ink-secondary">
          יש לך {myTasks.length} משימות פתוחות
        </p>
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STAT_CARDS.map((card) => {
          const value = statValues[card.key] ?? 0;
          return (
            <div key={card.key} className="relative overflow-hidden rounded-lg border border-border bg-white p-4 shadow-sm"
              style={{ borderRightWidth: 4, borderRightColor: card.color }}>
              <div className="flex items-center justify-between">
                <span className="text-caption text-ink-secondary">{card.label}</span>
                <card.Icon className="h-4 w-4" style={{ color: card.color }} />
              </div>
              <div className="mt-1 text-3xl font-bold text-ink">{value}</div>
            </div>
          );
        })}
      </div>

      {/* Source metrics bar */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-white px-4 py-3 shadow-sm">
        <MessageSquare className="h-4 w-4 text-ink-muted" />
        <span className="text-sm text-ink-secondary">
          השבוע:{" "}
          <span className="font-semibold text-primary">{sourceCounts.telegram}</span> מטלגרם,{" "}
          <span className="font-semibold text-ink">{sourceCounts.web}</span> מהממשק
          {sourceCounts.total > 0 && (
            <>
              {" "}{"·"}{" "}
              <span className={telegramPct >= 70 ? "font-semibold text-success" : "text-ink-secondary"}>
                {telegramPct}% טלגרם
              </span>
              {telegramPct < 70 && <span className="text-ink-muted"> (יעד: 70%)</span>}
            </>
          )}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* My Tasks table */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
            <div className="flex items-center justify-between bg-primary px-4 py-3">
              <h2 className="text-base font-bold text-white">המשימות שלי</h2>
              <Link href="/tasks" className="flex items-center gap-1 text-caption text-white/80 transition-colors hover:text-white">
                לכל המשימות <ArrowLeft className="h-3 w-3" />
              </Link>
            </div>
            {myTasks.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-ink-muted">אין משימות פתוחות</div>
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
                    const { text: dateText, overdue } = relativeDate(t.due_date);
                    return (
                      <tr key={t.id} className="border-b border-border transition-colors hover:bg-surface">
                        <td className="px-4 py-3">
                          <Link href={`/tasks?task=${t.id}`} className="font-medium text-ink hover:text-primary">{t.title}</Link>
                        </td>
                        <td className="hidden px-4 py-3 text-ink-secondary sm:table-cell">{t.client_name ?? "—"}</td>
                        <td className="px-4 py-3 text-center"><StatusCell status={t.status} /></td>
                        <td className={`px-4 py-3 ${overdue ? "font-medium text-overdue" : "text-ink-secondary"}`}>{dateText}</td>
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

        {/* Side column: AI chat + Activity */}
        <div className="flex flex-col gap-4">
          <AiChat userEmail={user?.email ?? ""} />

          <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
            <div className="bg-sidebar px-4 py-3">
              <h2 className="text-base font-bold text-white">פעילות אחרונה</h2>
            </div>
            {recent.length === 0 ? (
              <div className="px-4 py-6 text-center text-body-sm text-ink-muted">אין פעילות</div>
            ) : (
              <div>
                {recent.map((task) => {
                  const who = task.source === "import" ? "ייבוא" : (task.created_by ?? "משתמש");
                  const initials = task.source === "import" ? "AT" :
                    (task.created_by ? getInitials(task.created_by) : "??");
                  const AVATAR_COLORS = ["#0073EA", "#A25DDC", "#00C875", "#FDAB3D", "#E2445C", "#FF642E"];
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
        </div>
      </div>
    </div>
  );
}
