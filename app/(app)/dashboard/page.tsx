import Link from "next/link";
import {
  CheckSquare, Users, AlertTriangle, Send, Globe, Clock, Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";
import { getDashboardCounts, getMyTasks, getRecentTasksDetailed } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { DashboardAnimations } from "./dashboard-animations";
import { AiChat } from "@/components/dashboard/ai-chat";

export const dynamic = "force-dynamic";

function relativeDate(iso: string | null): { text: string; overdue: boolean } {
  if (!iso) return { text: "ללא דדליין", overdue: false };
  const diffDays = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diffDays < 0) return { text: `באיחור של ${Math.abs(diffDays)} ימים`, overdue: true };
  if (diffDays === 0) return { text: "היום", overdue: false };
  if (diffDays === 1) return { text: "מחר", overdue: false };
  return { text: `עוד ${diffDays} ימים`, overdue: false };
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "עכשיו";
  if (mins < 60) return `לפני ${mins} דק'`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `לפני ${h} שע'`;
  return `לפני ${Math.floor(h / 24)} ימים`;
}

const STATUS_BORDER: Record<string, string> = {
  "מחכה לטיפול": "border-r-amber-500",
  "נכנס לעבודה": "border-r-blue-500",
  "בעבודה": "border-r-purple-500",
  "אישור לקוח": "border-r-orange-500",
  "אישור מנהל": "border-r-pink-500",
};

function activityLabel(source: string, createdBy: string | null) {
  if (source === "import") return { text: "יובא מ-Airtable:", avatar: "AT", bg: "bg-gray-100", color: "text-gray-400" };
  if (source === "telegram") {
    const name = createdBy ?? "טלגרם";
    const initials = createdBy ? createdBy.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "TG";
    return { text: `${name} פתח:`, avatar: initials, bg: "bg-purple-100", color: "text-purple-600" };
  }
  const name = createdBy ?? "משתמש";
  const initials = createdBy ? createdBy.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "??";
  return { text: `${name} פתח:`, avatar: initials, bg: "bg-blue-100", color: "text-blue-600" };
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
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">דשבורד</h1>

      {/* Stats */}
      <DashboardAnimations>
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard href="/tasks" topBorder="border-t-blue-500" iconBg="bg-blue-100" iconColor="text-blue-600"
            Icon={CheckSquare} label="משימות פתוחות" value={counts.openTasks} />
          <StatCard href="/tasks?overdue=true" topBorder="border-t-red-500" iconBg={hasOverdue ? "bg-red-100" : "bg-gray-100"} iconColor={hasOverdue ? "text-red-600" : "text-gray-400"}
            Icon={AlertTriangle} label="עבר דדליין" value={counts.overdueTasks}
            valueColor={hasOverdue ? "text-red-600" : undefined} cardBg={hasOverdue ? "bg-red-50/50" : undefined} />
          <StatCard href="/clients" topBorder="border-t-teal-500" iconBg="bg-teal-100" iconColor="text-teal-600"
            Icon={Users} label="לקוחות פעילים" value={counts.totalClients} />
          <StatCard href="/tasks" topBorder="border-t-purple-500" iconBg="bg-purple-100" iconColor="text-purple-600"
            Icon={Send} label="מטלגרם החודש" value={counts.telegramThisMonth} />
        </section>
      </DashboardAnimations>

      {/* AI Chat */}
      <AiChat userEmail={user?.email ?? ""} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* My tasks */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-gray-200/60 bg-white p-6 shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">המשימות שלי</h2>
              <Link href="/tasks" className="text-caption font-medium text-gray-400 transition-colors hover:text-brand">לכל המשימות</Link>
            </div>
            {myTasks.length === 0 ? (
              <div className="py-8 text-center"><p className="text-sm text-gray-400">אין משימות פתוחות. נראה שהכל מסודר!</p></div>
            ) : (
              <div className="flex flex-col divide-y divide-gray-100">
                {myTasks.map((task) => {
                  const { text: dateText, overdue } = relativeDate(task.due_date);
                  const borderColor = STATUS_BORDER[task.status] ?? "border-r-gray-300";
                  return (
                    <Link key={task.id} href={`/tasks?task=${task.id}`}
                      className={`group flex items-center gap-3 border-r-[3px] py-3 pe-3 transition-all duration-200 hover:bg-gray-50 ${borderColor}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">{task.title}</p>
                          <Badge variant={statusVariant(task.status)} className="hidden sm:inline-flex">{task.status}</Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-gray-400">
                          {task.client_name && <span>{task.client_name}</span>}
                          <span className={overdue ? "font-medium text-red-500" : ""}>
                            <Clock className="mb-px ml-1 inline h-3 w-3" />{dateText}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200/60 bg-gray-50/50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">פעילות אחרונה</h2>
            {recent.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">אין פעילות אחרונה</p>
            ) : (
              <div className="flex flex-col divide-y divide-gray-200/60">
                {recent.map((task) => {
                  const a = activityLabel(task.source, task.created_by);
                  return (
                    <Link key={task.id} href={`/tasks?task=${task.id}`}
                      className="group flex items-start gap-3 py-3 transition-all duration-200 hover:bg-white/60 rounded-lg -mx-2 px-2">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${a.bg} text-[11px] font-semibold ${a.color}`}>{a.avatar}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-gray-900">
                          <span className="font-medium">{a.text}</span> <span className="text-gray-500">{task.title}</span>
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                          <span>{timeAgo(task.created_at)}</span>
                          {task.source === "telegram" && <Send className="h-3 w-3 text-purple-500" />}
                          {task.source === "web" && <Globe className="h-3 w-3" />}
                          {task.source === "import" && <Download className="h-3 w-3" />}
                        </div>
                      </div>
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

function StatCard({ href, topBorder, iconBg, iconColor, Icon, label, value, valueColor, cardBg }: {
  href: string; topBorder: string; iconBg: string; iconColor: string;
  Icon: React.ComponentType<{ className?: string }>; label: string; value: number;
  valueColor?: string; cardBg?: string;
}) {
  return (
    <Link href={href}>
      <div className={`rounded-xl border border-gray-100 bg-white shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg border-t-[3px] ${topBorder} ${cardBg ?? ""}`}>
        <div className="flex items-start justify-between p-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-caption font-medium text-gray-400">{label}</span>
            <span className={`text-4xl font-bold ${valueColor ?? "text-gray-900"}`}>{value}</span>
          </div>
          <div className={`rounded-full p-3 ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </div>
    </Link>
  );
}
