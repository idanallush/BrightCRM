import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge, healthVariant } from "@/components/ui/badge";
import { getClients } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">לקוחות</h1>
        <span className="text-sm text-[color:var(--color-ink-muted)]">
          {clients.length} סה״כ
        </span>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>שם לקוח</TH>
                <TH>איש קשר</TH>
                <TH>אימייל</TH>
                <TH>טלפון</TH>
                <TH>בריאות</TH>
              </TR>
            </THead>
            <TBody>
              {clients.map((c) => {
                const v = healthVariant(c.health);
                return (
                  <TR key={c.id}>
                    <TD className="font-medium">{c.name}</TD>
                    <TD className="text-[color:var(--color-ink-muted)]">
                      {c.contact_name ?? "—"}
                    </TD>
                    <TD className="text-[color:var(--color-ink-muted)]">
                      {c.email ?? "—"}
                    </TD>
                    <TD className="text-[color:var(--color-ink-muted)]">
                      {c.phone ?? "—"}
                    </TD>
                    <TD>{v && c.health ? <Badge variant={v}>{c.health}</Badge> : "—"}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-[color:var(--color-ink-muted)]">
        עריכת לקוחות תתווסף בשלב הבא (3B). כרגע — תצוגה בלבד.
      </p>
    </div>
  );
}
