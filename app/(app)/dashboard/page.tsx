import Link from "next/link";
import { ListTodo, Users, Megaphone, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge, healthVariant, statusVariant } from "@/components/ui/badge";
import {
  getCriticalClients,
  getDashboardCounts,
  getRecentTasks,
} from "@/lib/data";

export const dynamic = "force-dynamic";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("he-IL") : "—";

export default async function DashboardPage() {
  const [counts, recent, critical] = await Promise.all([
    getDashboardCounts(),
    getRecentTasks(5),
    getCriticalClients(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">דשבורד</h1>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="משימות פתוחות"
          value={counts.openTasks}
          Icon={ListTodo}
          href="/tasks?status=בעבודה"
        />
        <Metric
          label="לקוחות"
          value={counts.totalClients}
          Icon={Users}
          href="/clients"
        />
        <Metric
          label="קמפיינים פעילים"
          value={counts.activeCampaigns}
          Icon={Megaphone}
          href="/campaigns?status=פעיל"
        />
        <Metric
          label="עבר הדדליין"
          value={counts.overdueTasks}
          Icon={AlertTriangle}
          accent={counts.overdueTasks > 0}
          href="/tasks?overdue=true"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>5 המשימות האחרונות שנפתחו</CardTitle>
            <Link
              href="/tasks"
              className="text-xs text-[color:var(--color-brand)] hover:underline"
            >
              לכל המשימות ←
            </Link>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-[color:var(--color-ink-muted)]">
                אין משימות עדיין.
              </p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>כותרת</TH>
                    <TH>לקוח</TH>
                    <TH>סטטוס</TH>
                    <TH>דדליין</TH>
                  </TR>
                </THead>
                <TBody>
                  {recent.map((t) => (
                    <TR key={t.id}>
                      <TD className="font-medium">
                        <Link
                          href={`/tasks?task=${t.id}`}
                          className="block hover:text-[color:var(--color-brand)]"
                        >
                          {t.title}
                        </Link>
                      </TD>
                      <TD className="text-[color:var(--color-ink-muted)]">
                        {t.client?.name ?? "—"}
                      </TD>
                      <TD>
                        <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                      </TD>
                      <TD className="text-[color:var(--color-ink-muted)]">
                        {fmtDate(t.due_date)}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>לקוחות בסטטוס קריטי</CardTitle>
            <Link
              href="/clients"
              className="text-xs text-[color:var(--color-brand)] hover:underline"
            >
              לכל הלקוחות ←
            </Link>
          </CardHeader>
          <CardContent>
            {critical.length === 0 ? (
              <p className="text-sm text-[color:var(--color-ink-muted)]">
                אין כרגע לקוחות בסטטוס קריטי. 🌤
              </p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>לקוח</TH>
                    <TH>בריאות</TH>
                    <TH>מנהל לקוח</TH>
                  </TR>
                </THead>
                <TBody>
                  {critical.map((c) => {
                    const v = healthVariant(c.health) ?? "neutral";
                    return (
                      <TR key={c.id}>
                        <TD className="font-medium">
                          <Link
                            href={`/clients/${c.id}`}
                            className="block hover:text-[color:var(--color-brand)]"
                          >
                            {c.name}
                          </Link>
                        </TD>
                        <TD>
                          <Badge variant={v}>{c.health}</Badge>
                        </TD>
                        <TD className="text-[color:var(--color-ink-muted)]">
                          {c.manager?.full_name ?? "—"}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  Icon,
  href,
  accent = false,
}: {
  label: string;
  value: number;
  Icon: React.ComponentType<{ className?: string }>;
  href?: string;
  accent?: boolean;
}) {
  const inner = (
    <Card className="h-full transition hover:border-[color:var(--color-brand)]/40">
      <CardContent className="flex items-start justify-between p-5">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-[color:var(--color-ink-muted)]">{label}</span>
          <span
            className={
              accent
                ? "text-3xl font-semibold tracking-tight text-[color:var(--color-health-critical)]"
                : "text-3xl font-semibold tracking-tight"
            }
          >
            {value}
          </span>
        </div>
        <Icon
          className={
            accent
              ? "h-5 w-5 text-[color:var(--color-health-critical)]"
              : "h-5 w-5 text-[color:var(--color-ink-muted)]"
          }
        />
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
