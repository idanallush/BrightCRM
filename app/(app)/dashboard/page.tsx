import Link from "next/link";
import { Inbox, Zap, Clock, AlertTriangle, Globe, Send, Download } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { getDashboardCounts, getMyTasks, getRecentTasksDetailed } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { AiChat } from "@/components/dashboard/ai-chat";

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

export default async function DashboardPage() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();

  const [counts, myTasks, recent] = await Promise.all([
    getDashboardCounts(),
    getMyTasks(user?.email ?? ""),
    getRecentTasksDetailed(8),
  ]);

  const hasOverdue = counts.overdueTasks > 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-ink">דשבורד</h1>

      {/* Stats — 4 flat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="נכנסו לעבודה" value={counts.incoming} Icon={Inbox} />
        <StatCard label="באוויר" value={counts.working} Icon={Zap} />
        <StatCard label="ממתינים לאישור" value={counts.awaitingApproval} Icon={Clock} />
        <StatCard label="עבר דדליין" value={counts.overdueTasks} Icon={AlertTriangle}
          danger={hasOverdue} />
      </div>

      {/* AI Chat */}
      <AiChat userEmail={user?.email ?? ""} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* My tasks — clean table */}
        <div className="lg:col-span-3">
          <div className="rounded-lg border border-border bg-white">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">המשימות שלי</h2>
              <Link href="/tasks" className="text-caption text-ink-muted hover:text-ink">לכל המשימות</Link>
            </div>
            {myTasks.length === 0 ? (
              <div className="px-4 py-8 text-center text-body-sm text-ink-muted">אין משימות פתוחות</div>
            ) : (
              <table className="w-full text-right text-body-sm">
                <thead>
                  <tr className="border-b border-border text-caption text-ink-muted">
                    <th className="px-4 py-2 text-right font-medium">סטטוס</th>
                    <th className="px-4 py-2 text-right font-medium">משימה</th>
                    <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">לקוח</th>
                    <th className="px-4 py-2 text-right font-medium">דדליין</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {myTasks.map((t) => {
                    const { text: dateText, overdue } = relativeDate(t.due_date);
                    return (
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5"><StatusBadge status={t.status} /></td>
                        <td className="px-4 py-2.5">
                          <Link href={`/tasks?task=${t.id}`} className="font-medium text-ink hover:underline">{t.title}</Link>
                        </td>
                        <td className="hidden px-4 py-2.5 text-ink-muted sm:table-cell">{t.client_name ?? "—"}</td>
                        <td className={`px-4 py-2.5 ${overdue ? "font-medium text-overdue" : "text-ink-muted"}`}>{dateText}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Activity — compact */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border bg-white">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">פעילות אחרונה</h2>
            </div>
            {recent.length === 0 ? (
              <div className="px-4 py-6 text-center text-body-sm text-ink-muted">אין פעילות</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recent.map((task) => {
                  const who = task.source === "import" ? "ייבוא" : (task.created_by ?? "משתמש");
                  const initials = task.source === "import" ? "AT" :
                    (task.created_by ? task.created_by.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "??");
                  return (
                    <Link key={task.id} href={`/tasks?task=${task.id}`}
                      className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-ink-secondary">
                        {initials}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-body-sm">
                        <span className="font-medium text-ink">{who}</span>
                        {task.source !== "import" && " פתח: "}
                        {task.source === "import" && ": "}
                        <span className="text-ink-muted">{task.title}</span>
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

function StatCard({ label, value, Icon, danger = false }: {
  label: string; value: number; Icon: React.ComponentType<{ className?: string }>; danger?: boolean;
}) {
  return (
    <div className={`rounded-lg border border-border bg-white p-4 ${danger ? "border-red-200" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-caption text-ink-muted">{label}</span>
        <Icon className={`h-4 w-4 ${danger ? "text-overdue" : "text-ink-muted"}`} />
      </div>
      <div className={`mt-1 text-2xl font-semibold ${danger ? "text-overdue" : "text-ink"}`}>{value}</div>
    </div>
  );
}
