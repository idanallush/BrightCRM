import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("he-IL") : "—";

const PLATFORM_LABELS: Record<string, string> = {
  google: "Google",
  facebook: "Meta",
  tiktok: "TikTok",
};

export default async function CampaignsPage() {
  const sb = createClient();
  const { data } = await sb
    .from("campaigns")
    .select("id,name,platform,status,start_date,spent,client:clients(name)")
    .order("start_date", { ascending: false, nullsFirst: false });

  const campaigns = ((data ?? []) as any[]).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    platform: c.platform as string,
    status: c.status as string | null,
    start_date: c.start_date as string | null,
    spent: c.spent as number | null,
    client: (c.client ?? null) as { name: string } | null,
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">קמפיינים</h1>
        <span className="text-sm text-[color:var(--color-ink-muted)]">
          {campaigns.length} סה״כ
        </span>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>שם</TH>
                <TH>לקוח</TH>
                <TH>פלטפורמה</TH>
                <TH>סטטוס</TH>
                <TH>התחלה</TH>
                <TH>תקציב שנוצל</TH>
              </TR>
            </THead>
            <TBody>
              {campaigns.map((c) => (
                <TR key={c.id}>
                  <TD className="font-medium">{c.name}</TD>
                  <TD className="text-[color:var(--color-ink-muted)]">
                    {c.client?.name ?? "—"}
                  </TD>
                  <TD className="text-[color:var(--color-ink-muted)]">
                    {PLATFORM_LABELS[c.platform] ?? c.platform}
                  </TD>
                  <TD>
                    {c.status ? (
                      <Badge variant={c.status === "פעיל" ? "active" : "closed"}>
                        {c.status}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD className="text-[color:var(--color-ink-muted)]">
                    {fmtDate(c.start_date)}
                  </TD>
                  <TD className="text-[color:var(--color-ink-muted)]">
                    {c.spent != null ? `₪${c.spent.toLocaleString("he-IL")}` : "—"}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-[color:var(--color-ink-muted)]">
        עריכת קמפיינים תתווסף בשלב הבא (3B). כרגע — תצוגה בלבד.
      </p>
    </div>
  );
}
