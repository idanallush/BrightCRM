import Link from "next/link";
import {
  CheckSquare,
  Users,
  AlertTriangle,
  Globe,
  Send,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getDashboardCounts,
  getMyTasks,
  getRecentTasksDetailed,
} from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function relativeDate(iso: string | null): { text: string; overdue: boolean } {
  if (!iso) return { text: "ללא דדליין", overdue: false };
  const due = new Date(iso);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0)
    return { text: `באיחור של ${Math.abs(diffDays)} ימים`, overdue: true };
  if (diffDays === 0) return { text: "היום", overdue: false };
  if (diffDays === 1) return { text: "מחר", overdue: false };
  return { text: `עוד ${diffDays} ימים`, overdue: false };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "עכשיו";
  if (mins < 60) return `לפני ${mins} דקות`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} שעות`;
  const days = Math.floor(hours / 24);
  return `לפני ${days} ימים`;
}

export default async function DashboardPage() {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const userEmail = user?.email ?? "";

  const [counts, myTasks, recent] = await Promise.all([
    getDashboardCounts(),
    getMyTasks(userEmail),
    getRecentTasksDetailed(5),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-2xl font-semibold tracking-display text-ink md:text-3xl">
        דשבורד
      </h1>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="משימות פתוחות"
          value={counts.openTasks}
          Icon={CheckSquare}
          href="/tasks"
        />
        <StatCard
          label="עבר דדליין"
          value={counts.overdueTasks}
          Icon={AlertTriangle}
          accent={counts.overdueTasks > 0}
          href="/tasks?overdue=true"
        />
        <StatCard
          label="לקוחות"
          value={counts.totalClients}
          Icon={Users}
          href="/clients"
        />
      </section>

      {/* Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>המשימות שלי</CardTitle>
            <Link
              href="/tasks"
              className="text-xs font-medium text-ink-muted transition-colors hover:text-ink"
            >
              לכל המשימות
            </Link>
          </CardHeader>
          <CardContent>
            {myTasks.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-ink-muted">
                  אין משימות פתוחות. יום שקט!
                </p>
              </div>
            ) : (
              <div className="flex flex-col">
                {myTasks.map((task, i) => {
                  const { text: dateText, overdue } = relativeDate(
                    task.due_date,
                  );
                  return (
                    <Link
                      key={task.id}
                      href={`/tasks?task=${task.id}`}
                      className={`group flex items-start gap-3 py-3 transition-colors duration-150 hover:bg-surface-soft ${i > 0 ? "border-t border-hairline-soft" : ""}`}
                    >
                      <div
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${overdue ? "bg-status-overdue" : "bg-surface-strong"}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink">
                          {task.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                          {task.client_name && <span>{task.client_name}</span>}
                          <span
                            className={
                              overdue ? "font-medium text-status-overdue" : ""
                            }
                          >
                            <Clock className="mb-px ml-1 inline h-3 w-3" />
                            {dateText}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>פעילות אחרונה</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-muted">
                אין פעילות אחרונה
              </p>
            ) : (
              <div className="flex flex-col">
                {recent.map((task, i) => (
                  <Link
                    key={task.id}
                    href={`/tasks?task=${task.id}`}
                    className={`group flex items-start gap-3 py-3 transition-colors duration-150 hover:bg-surface-soft ${i > 0 ? "border-t border-hairline-soft" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {task.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                        {task.client_name && <span>{task.client_name}</span>}
                        {task.client_name && <span>·</span>}
                        <span>{timeAgo(task.created_at)}</span>
                      </div>
                    </div>
                    <SourceBadge source={task.source} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  Icon,
  accent = false,
  href,
}: {
  label: string;
  value: number;
  Icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
  href?: string;
}) {
  const inner = (
    <div className="rounded-lg bg-surface-card p-5 transition-colors duration-150">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-medium text-ink-muted">{label}</span>
          <span
            className={`font-display text-3xl font-semibold tracking-display ${accent ? "text-status-overdue" : "text-ink"}`}
          >
            {value}
          </span>
        </div>
        <Icon
          className={`h-5 w-5 ${accent ? "text-status-overdue" : "text-ink-muted"}`}
        />
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function SourceBadge({ source }: { source: string }) {
  if (source === "telegram") {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-pill bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent">
        <Send className="h-3 w-3" />
        Telegram
      </span>
    );
  }
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-pill bg-surface-card px-2.5 py-0.5 text-[11px] font-medium text-ink-muted">
      <Globe className="h-3 w-3" />
      Web
    </span>
  );
}
