import Link from "next/link";
import {
  CheckSquare,
  Users,
  Megaphone,
  AlertTriangle,
  Globe,
  Send,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";
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
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-ink md:text-2xl">דשבורד</h1>

      {/* Stats cards */}
      <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard
          label="משימות פתוחות"
          value={counts.openTasks}
          Icon={CheckSquare}
          color="text-brand"
          bgColor="bg-brand-light"
          href="/tasks?status=בעבודה"
        />
        <StatCard
          label="עבר דדליין"
          value={counts.overdueTasks}
          Icon={AlertTriangle}
          color={counts.overdueTasks > 0 ? "text-red-600" : "text-ink-muted"}
          bgColor={counts.overdueTasks > 0 ? "bg-red-50" : "bg-gray-100"}
          valueColor={counts.overdueTasks > 0 ? "text-red-600" : undefined}
          href="/tasks?overdue=true"
        />
        <StatCard
          label="לקוחות"
          value={counts.totalClients}
          Icon={Users}
          color="text-ink-muted"
          bgColor="bg-gray-100"
          href="/clients"
        />
        <StatCard
          label="קמפיינים פעילים"
          value={counts.activeCampaigns}
          Icon={Megaphone}
          color="text-green-600"
          bgColor="bg-green-50"
          href="/campaigns?status=פעיל"
        />
      </section>

      {/* Main content */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-5">
        {/* My tasks - 60% */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>המשימות שלי</CardTitle>
            <Link
              href="/tasks"
              className="text-xs text-brand transition-colors hover:text-brand-focus"
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
              <div className="flex flex-col gap-2">
                {myTasks.map((task) => {
                  const { text: dateText, overdue } = relativeDate(
                    task.due_date,
                  );
                  return (
                    <Link
                      key={task.id}
                      href={`/tasks?task=${task.id}`}
                      className="group flex items-start gap-3 rounded-lg border border-transparent p-3 transition-all duration-200 hover:border-gray-200 hover:bg-gray-50"
                    >
                      <div
                        className={`mt-1 h-8 w-1 shrink-0 rounded-full ${overdue ? "bg-red-500" : "bg-brand"}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink group-hover:text-brand">
                          {task.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                          {task.client_name && <span>{task.client_name}</span>}
                          <span
                            className={
                              overdue
                                ? "font-medium text-red-600"
                                : "text-ink-muted"
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

        {/* Recent activity - 40% */}
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
              <div className="flex flex-col gap-3">
                {recent.map((task) => (
                  <Link
                    key={task.id}
                    href={`/tasks?task=${task.id}`}
                    className="group flex items-start gap-3 rounded-lg p-2 transition-all duration-200 hover:bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink group-hover:text-brand">
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
  color,
  bgColor,
  valueColor,
  href,
}: {
  label: string;
  value: number;
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  valueColor?: string;
  href?: string;
}) {
  const inner = (
    <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
      <CardContent className="flex items-start justify-between p-4 md:p-5">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-ink-muted md:text-sm">{label}</span>
          <span
            className={`text-2xl font-bold tracking-tight md:text-3xl ${valueColor ?? "text-ink"}`}
          >
            {value}
          </span>
        </div>
        <div className={`rounded-lg p-2 ${bgColor}`}>
          <Icon className={`h-4 w-4 md:h-5 md:w-5 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function SourceBadge({ source }: { source: string }) {
  if (source === "telegram") {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
        <Send className="h-3 w-3" />
        Telegram
      </span>
    );
  }
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-ink-muted">
      <Globe className="h-3 w-3" />
      Web
    </span>
  );
}
