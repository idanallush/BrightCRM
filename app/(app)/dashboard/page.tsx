import Link from "next/link";
import {
  CheckSquare,
  Users,
  AlertTriangle,
  Send,
  Globe,
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
import { DashboardAnimations } from "./dashboard-animations";

export const dynamic = "force-dynamic";

function relativeDate(iso: string | null): { text: string; overdue: boolean } {
  if (!iso) return { text: "ללא דדליין", overdue: false };
  const due = new Date(iso);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0) return { text: `באיחור של ${Math.abs(diffDays)} ימים`, overdue: true };
  if (diffDays === 0) return { text: "היום", overdue: false };
  if (diffDays === 1) return { text: "מחר", overdue: false };
  return { text: `עוד ${diffDays} ימים`, overdue: false };
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "עכשיו";
  if (mins < 60) return `לפני ${mins} דקות`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} שעות`;
  return `לפני ${Math.floor(hours / 24)} ימים`;
}

const STATUS_BORDER: Record<string, string> = {
  "מחכה לטיפול": "border-r-st-waiting",
  "נכנס לעבודה": "border-r-st-incoming",
  "בעבודה": "border-r-st-working",
  "אישור לקוח": "border-r-st-approval",
  "אישור מנהל": "border-r-st-manager",
};

export default async function DashboardPage() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();

  const [counts, myTasks, recent] = await Promise.all([
    getDashboardCounts(),
    getMyTasks(user?.email ?? ""),
    getRecentTasksDetailed(8),
  ]);

  const stats = [
    { label: "משימות פתוחות", value: counts.openTasks, Icon: CheckSquare, color: "text-brand", bg: "bg-brand-light", href: "/tasks" },
    { label: "עבר דדליין", value: counts.overdueTasks, Icon: AlertTriangle,
      color: counts.overdueTasks > 0 ? "text-overdue" : "text-ink-muted",
      bg: counts.overdueTasks > 0 ? "bg-overdue-bg" : "bg-gray-50",
      valueColor: counts.overdueTasks > 0 ? "text-overdue" : undefined,
      href: "/tasks?overdue=true" },
    { label: "לקוחות פעילים", value: counts.totalClients, Icon: Users, color: "text-ink-secondary", bg: "bg-gray-50", href: "/clients" },
    { label: "מטלגרם החודש", value: counts.telegramThisMonth, Icon: Send, color: "text-st-working", bg: "bg-purple-50", href: "/tasks" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">דשבורד</h1>

      {/* Stats */}
      <DashboardAnimations>
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => (
            <Link key={s.label} href={s.href}>
              <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
                <CardContent className="flex items-start justify-between p-4 md:p-5">
                  <div className="flex flex-col gap-1">
                    <span className="text-caption text-ink-secondary">{s.label}</span>
                    <span className={`text-2xl font-semibold md:text-3xl ${s.valueColor ?? "text-ink"}`}>{s.value}</span>
                  </div>
                  <div className={`rounded-xl p-2.5 ${s.bg}`}>
                    <s.Icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>
      </DashboardAnimations>

      {/* Main content */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* My tasks */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>המשימות שלי</CardTitle>
            <Link href="/tasks" className="text-caption font-medium text-ink-secondary transition-colors hover:text-brand">
              לכל המשימות
            </Link>
          </CardHeader>
          <CardContent>
            {myTasks.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-ink-secondary">אין משימות פתוחות. נראה שהכל מסודר!</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-gray-100">
                {myTasks.map((task) => {
                  const { text: dateText, overdue } = relativeDate(task.due_date);
                  const borderColor = STATUS_BORDER[task.status] ?? "border-r-border";
                  return (
                    <Link key={task.id} href={`/tasks?task=${task.id}`}
                      className={`group flex items-center gap-3 border-r-[3px] py-3 pe-3 transition-colors duration-200 hover:bg-surface-hover ${borderColor}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-ink">{task.title}</p>
                          <Badge variant={statusVariant(task.status)} className="hidden sm:inline-flex">{task.status}</Badge>
                        </div>
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

        {/* Recent activity */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>פעילות אחרונה</CardTitle></CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-secondary">אין פעילות אחרונה</p>
            ) : (
              <div className="flex flex-col divide-y divide-gray-100">
                {recent.map((task) => {
                  const initials = task.created_by
                    ? task.created_by.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2)
                    : "?";
                  return (
                    <Link key={task.id} href={`/tasks?task=${task.id}`}
                      className="group flex items-start gap-3 py-3 transition-colors duration-200 hover:bg-surface-hover">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-light text-[11px] font-semibold text-brand">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ink">
                          <span className="font-medium">{task.created_by ?? "מישהו"}</span>
                          {" פתח: "}
                          <span className="text-ink-secondary">{task.title}</span>
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-caption text-ink-muted">
                          <span>{timeAgo(task.created_at)}</span>
                          {task.source === "telegram" && <Send className="h-3 w-3 text-brand" />}
                          {task.source === "web" && <Globe className="h-3 w-3" />}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
