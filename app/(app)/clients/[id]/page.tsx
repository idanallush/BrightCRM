import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge, healthVariant, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getAttachmentsForClient, getCampaignsByClient, getClient, getTasksByClient, getTeam,
} from "@/lib/data";
import { getSignedThumbnailUrl } from "@/app/actions/attachments";
import { FileList } from "@/components/file-list";
import { FileUpload } from "@/components/file-upload";
import { EditClientButton, DeleteClientButton } from "./edit-button";

export const dynamic = "force-dynamic";

const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("he-IL") : "\u2014";
const fmtMoney = (n: number | null) =>
  n == null ? "\u2014" : new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", minimumFractionDigits: 2 }).format(n);

const PLATFORM_LABELS: Record<string, string> = { google: "Google", facebook: "Meta", tiktok: "TikTok" };

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const [client, tasks, campaigns, team, attachments] = await Promise.all([
    getClient(params.id), getTasksByClient(params.id), getCampaignsByClient(params.id), getTeam(), getAttachmentsForClient(params.id),
  ]);
  if (!client) notFound();

  const thumbs: Record<string, string | null> = {};
  await Promise.all(
    attachments.filter((a) => a.content_type?.startsWith("image/")).map(async (a) => {
      thumbs[a.storage_path] = await getSignedThumbnailUrl(a.storage_path);
    }),
  );

  const manager = team.find((m) => m.id === client.account_manager_id);
  const healthV = healthVariant(client.health);

  const externalLinks: { label: string; url: string }[] = [];
  if (client.drive_url) externalLinks.push({ label: "Drive", url: client.drive_url });
  if (client.facebook_ads_url) externalLinks.push({ label: "Facebook Ads", url: client.facebook_ads_url });
  if (client.google_ads_url) externalLinks.push({ label: "Google Ads", url: client.google_ads_url });
  if (client.cms_url) externalLinks.push({ label: "CMS", url: client.cms_url });
  if (client.analytics_url) externalLinks.push({ label: "Google Analytics", url: client.analytics_url });
  if (client.website_url) externalLinks.push({ label: "אתר/דף נחיתה", url: client.website_url });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-ink-muted transition-colors hover:text-ink">
            <ArrowRight className="h-4 w-4" /> חזרה
          </Link>
          <h1 className="font-display text-xl font-semibold tracking-display text-ink md:text-2xl">{client.name}</h1>
          {healthV && client.health && <Badge variant={healthV}>{client.health}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <DeleteClientButton client={client} />
          <EditClientButton client={client} team={team} />
        </div>
      </div>

      <div className="rounded-lg bg-surface-card p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Field label="איש קשר" value={client.contact_name} />
          <Field label="מנהל לקוח" value={manager?.full_name ?? null} />
          <Field label="תקציב" value={client.budget_note} />
          <Field label="טלפון" value={client.phone} />
          <Field label="אימייל" value={client.email} />
        </div>
      </div>

      {externalLinks.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-ink">קישורים</h3>
          <div className="flex flex-wrap gap-2">
            {externalLinks.map((l) => (
              <Button key={l.label} variant="secondary" size="sm" asChild>
                <a href={l.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> {l.label}
                </a>
              </Button>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-ink">משימות ({tasks.length})</h3>
          <Link href={`/tasks?client=${client.id}`} className="text-xs font-medium text-ink-muted transition-colors hover:text-ink">לכל המשימות</Link>
        </div>
        {tasks.length === 0 ? (
          <EmptyBox text="אין משימות ללקוח." />
        ) : (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <THead><TR className="hover:bg-transparent"><TH>כותרת</TH><TH>סטטוס</TH><TH className="hidden sm:table-cell">תאריך יעד</TH></TR></THead>
                <TBody>
                  {tasks.map((t) => (
                    <TR key={t.id} className="cursor-pointer">
                      <TD className="font-medium"><Link href={`/tasks?task=${t.id}`} className="block transition-colors hover:text-accent">{t.title}</Link></TD>
                      <TD><Badge variant={statusVariant(t.status)}>{t.status}</Badge></TD>
                      <TD className="hidden text-ink-muted sm:table-cell">{fmtDate(t.due_date)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-ink">קמפיינים ({campaigns.length})</h3>
          <Link href={`/campaigns?client=${client.id}`} className="text-xs font-medium text-ink-muted transition-colors hover:text-ink">לכל הקמפיינים</Link>
        </div>
        {campaigns.length === 0 ? (
          <EmptyBox text="אין קמפיינים ללקוח." />
        ) : (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <THead><TR className="hover:bg-transparent"><TH>שם</TH><TH>פלטפורמה</TH><TH className="hidden sm:table-cell">סטטוס</TH><TH className="hidden md:table-cell">התחלה</TH><TH className="hidden md:table-cell">תקציב שנוצל</TH></TR></THead>
                <TBody>
                  {campaigns.map((c) => (
                    <TR key={c.id}>
                      <TD className="font-medium"><Link href={`/campaigns?campaign=${c.id}`} className="block transition-colors hover:text-accent">{c.name}</Link></TD>
                      <TD><PlatformBadge platform={c.platform} /></TD>
                      <TD className="hidden sm:table-cell">{c.status ? <Badge variant={c.status === "פעיל" ? "active" : "closed"}>{c.status}</Badge> : "\u2014"}</TD>
                      <TD className="hidden text-ink-muted md:table-cell">{fmtDate(c.start_date)}</TD>
                      <TD className="hidden text-ink-muted md:table-cell">{fmtMoney(c.spent)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-ink">קבצים ({attachments.length})</h3>
        <FileUpload clientId={client.id} />
        <FileList attachments={attachments} thumbUrls={thumbs} />
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className="text-sm text-ink">{value ?? "\u2014"}</span>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return <div className="rounded-lg bg-surface-card p-6 text-center text-sm text-ink-muted">{text}</div>;
}

function PlatformBadge({ platform }: { platform: string }) {
  const cls = platform === "google" ? "bg-accent/10 text-accent"
    : platform === "facebook" ? "bg-badge-violet/10 text-badge-violet"
    : platform === "tiktok" ? "bg-surface-card text-ink"
    : "bg-surface-card text-ink-muted";
  return <span className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium ${cls}`}>{PLATFORM_LABELS[platform] ?? platform}</span>;
}
