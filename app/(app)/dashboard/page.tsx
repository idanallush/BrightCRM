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
  if (diffDays < 0) return { text: `באיחור של ${Math.abs(diffDays)} ימים`, overdue: true };
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
  const { data: { user } } = await sb.auth.getUser();
  const userEmail = user?.email ?? "";

  const [counts, myTasks, recent] = await Promise.all([
    getDashboardCounts(),
    getMyTasks(userEmail),
    getRecentTasksDetailed(5),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">דשבורד</h1>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="משימות פתוחות" value={counts.openTasks} Icon={CheckSquare} color="text-brand" bg="bg-brand-light" href="/tasks" />
        <StatCard label="עבר דדליין" value={counts.overdueTasks} Icon={AlertTriangle}
          color={counts.overdueTasks > 0 ? "text-overdue" : "text-ink-muted"} bg={counts.overdueTasks > 0 ? "bg-overdue-bg" : "bg-gray-50"}
          valueColor={counts.overdueTasks > 0 ? "text-overdue" : undefined} href="/tasks?overdue=true" />
        <StatCard label="לקוחות" value={counts.totalClients} Icon={Users} color="text-ink-secondary" bg="bg-gray-50" href="/clients" />
      </section>

      {/* Content */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>המשימות שלי</CardTitle>
            <Link href="/tasks" className="text-caption font-medium text-ink-secondary transition-colors hover:text-brand">לכל המשימות</Link>
          </CardHeader>
          <CardContent>
            {myTasks.length === 0 ? (
              <div className="py-8 text-center"><p className="text-sm text-ink-secondary">אין משימות פתוחות. יום שקט!</p></div>
            ) : (
              <div className="flex flex-col divide-y divide-gray-100">
                {myTasks.map((task) => {
                  const { text: dateText, overdue } = relativeDate(task.due_date);
                  return (
                    <Link key={task.id} href={`/tasks?task=${task.id}`}
                      className="group flex items-start gap-3 py-3 transition-colors duration-200 hover:bg-surface-hover -mx-2 px-2 rounded-lg">
                      <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${overdue ? "bg-overdue" : "bg-border"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink">{task.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-secondary">
                          {task.client_name && <span>{task.client_name}</span>}
                          <span className={overdue ? "font-medium text-overdue" : ""}>
                            <Clock className="mb-px ml-1 inline h-3 w-3" />{dateText}
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
          <CardHeader><CardTitle>פעילות אחרונה</CardTitle></CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-secondary">אין פעילות אחרונה</p>
            ) : (
              <div className="flex flex-col divide-y divide-gray-100">
                {recent.map((task) => (
                  <Link key={task.id} href={`/tasks?task=${task.id}`}
                    className="group flex items-start gap-3 py-3 transition-colors duration-200 hover:bg-surface-hover -mx-2 px-2 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{task.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-ink-secondary">
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

function StatCard({ label, value, Icon, color, bg, valueColor, href }: {
  label: string; value: number; Icon: React.ComponentType<{ className?: string }>;
  color: string; bg: string; valueColor?: string; href?: string;
}) {
  const inner = (
    <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
      <CardContent className="flex items-start justify-between p-4 md:p-5">
        <div className="flex flex-col gap-1">
          <span className="text-caption text-ink-secondary">{label}</span>
          <span className={`text-2xl font-semibold md:text-3xl ${valueColor ?? "text-ink"}`}>{value}</span>
        </div>
        <div className={`rounded-xl p-2.5 ${bg}`}><Icon className={`h-5 w-5 ${color}`} /></div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function SourceBadge({ source }: { source: string }) {
  if (source === "telegram") {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-medium text-brand">
        <Send className="h-3 w-3" /> Telegram
      </span>
    );
  }
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-ink-secondary">
      <Globe className="h-3 w-3" /> Web
    </span>
  );
}
