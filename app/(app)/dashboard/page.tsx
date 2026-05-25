import Link from "next/link";
import { Send, MessageSquare } from "lucide-react";
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

  return (
    <div className="flex flex-col gap-6">
      {/* Greeting + stats */}
      <div className="rounded-lg border border-border bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold text-ink">שלום, {firstName}</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          יש לך {myTasks.length} משימות פתוחות
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <span className="text-ink-secondary">
            <span className="text-lg font-bold text-st-working">{counts.working}</span> באוויר
          </span>
          <span className="text-ink-secondary">
            <span className="text-lg font-bold text-st-waiting">{counts.incoming}</span> נכנסו
          </span>
          <span className="text-ink-secondary">
            <span className="text-lg font-bold text-st-approval">{counts.awaitingApproval}</span> ממתינים לאישור
          </span>
          {counts.overdueTasks > 0 && (
            <span className="text-ink-secondary">
              <span className="text-lg font-bold text-overdue">{counts.overdueTasks}</span> באיחור
            </span>
          )}
        </div>

        {/* Source metrics — the success measure */}
        <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
          <MessageSquare className="h-4 w-4 text-ink-muted" />
          <span className="text-sm text-ink-secondary">
            השבוע:{" "}
            <span className="font-semibold text-primary">{sourceCounts.telegram}</span> מטלגרם,{" "}
            <span className="font-semibold text-ink">{sourceCounts.web}</span> מהממשק
            {sourceCounts.total > 0 && (
              <>
                {" "}{"\u00B7"}{" "}
                <span className={telegramPct >= 70 ? "font-semibold text-success" : "text-ink-secondary"}>
                  {telegramPct}% טלגרם
                </span>
                {telegramPct < 70 && <span className="text-ink-muted"> (יעד: 70%)</span>}
              </>
            )}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* My Tasks — board-style table (main content) */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-base font-bold text-ink">המשימות שלי</h2>
              <Link href="/tasks" className="text-caption text-primary hover:underline">לכל המשימות</Link>
            </div>
            {myTasks.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-ink-muted">אין משימות פתוחות</div>
            ) : (
              <table className="w-full text-right text-body-sm">
                <thead>
                  <tr className="bg-surface text-caption text-ink-secondary">
                    <th className="px-4 py-2.5 text-right font-medium">סטטוס</th>
                    <th className="px-4 py-2.5 text-right font-medium">משימה</th>
                    <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">לקוח</th>
                    <th className="px-4 py-2.5 text-right font-medium">דדליין</th>
                    <th className="w-10 px-2" />
                  </tr>
                </thead>
                <tbody>
                  {myTasks.map((t) => {
                    const { text: dateText, overdue } = relativeDate(t.due_date);
                    return (
                      <tr key={t.id} className="border-b border-border transition-colors hover:bg-[#F5F6F8]">
                        <td className="px-4 py-2.5"><StatusCell status={t.status} /></td>
                        <td className="px-4 py-2.5">
                          <Link href={`/tasks?task=${t.id}`} className="font-medium text-ink hover:text-primary">{t.title}</Link>
                        </td>
                        <td className="hidden px-4 py-2.5 text-ink-secondary sm:table-cell">{t.client_name ?? "\u2014"}</td>
                        <td className={`px-4 py-2.5 ${overdue ? "font-medium text-overdue" : "text-ink-secondary"}`}>{dateText}</td>
                        <td className="px-2 py-2.5 text-center">
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

        {/* Side: AI + Activity */}
        <div className="flex flex-col gap-4">
          <AiChat userEmail={user?.email ?? ""} />

          <div className="rounded-lg border border-border bg-white shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-base font-bold text-ink">פעילות אחרונה</h2>
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
                      className="flex items-center gap-2.5 border-b border-border px-4 py-2.5 transition-colors hover:bg-[#F5F6F8] last:border-b-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#CCEAFF] text-[10px] font-semibold text-primary">
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
