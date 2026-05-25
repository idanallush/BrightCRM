import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink, Phone, Mail, User, CreditCard, Contact } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge, healthVariant, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getAttachmentsForClient, getClient, getTasksByClient, getTeam,
} from "@/lib/data";
import { getSignedThumbnailUrl } from "@/app/actions/attachments";
import { FileList } from "@/components/file-list";
import { FileUpload } from "@/components/file-upload";
import { EditClientButton, DeleteClientButton } from "./edit-button";
import { ClientTasksSection } from "./client-tasks-section";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const [client, tasks, team, attachments] = await Promise.all([
    getClient(params.id), getTasksByClient(params.id), getTeam(), getAttachmentsForClient(params.id),
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
      {/* Header */}
      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-primary px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/clients" className="inline-flex items-center gap-1.5 text-caption text-white/70 transition-colors hover:text-white">
              <ArrowRight className="h-4 w-4" /> חזרה
            </Link>
            <h1 className="text-base font-bold text-white">{client.name}</h1>
            {healthV && client.health && <Badge variant={healthV}>{client.health}</Badge>}
            {manager && <span className="text-caption text-white/70">{manager.full_name}</span>}
          </div>
          <div className="flex items-center gap-2">
            <DeleteClientButton client={client} />
            <EditClientButton client={client} team={team} />
          </div>
        </div>
      </div>

      {/* Contact info */}
      <div className="rounded-lg border border-border bg-white p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {client.contact_name && (
            <div className="flex items-center gap-2">
              <Contact className="h-4 w-4 shrink-0 text-ink-muted" />
              <div>
                <div className="text-[11px] text-ink-muted">איש קשר</div>
                <div className="text-sm text-ink">{client.contact_name}</div>
              </div>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-ink-muted" />
              <div>
                <div className="text-[11px] text-ink-muted">טלפון</div>
                <div className="text-sm text-ink" dir="ltr">{client.phone}</div>
              </div>
            </div>
          )}
          {client.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-ink-muted" />
              <div>
                <div className="text-[11px] text-ink-muted">אימייל</div>
                <div className="text-sm text-ink" dir="ltr">{client.email}</div>
              </div>
            </div>
          )}
          {client.budget_note && (
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 shrink-0 text-ink-muted" />
              <div>
                <div className="text-[11px] text-ink-muted">תקציב</div>
                <div className="text-sm text-ink">{client.budget_note}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Links */}
      {externalLinks.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-body-sm font-semibold text-ink">קישורים</h3>
          <div className="flex flex-wrap gap-2">
            {externalLinks.map((l) => (
              <Button key={l.label} variant="secondary" size="sm" asChild>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="gap-2">
                  <ExternalLink className="h-3.5 w-3.5" /> {l.label}
                </a>
              </Button>
            ))}
          </div>
        </section>
      )}

      {/* Tasks */}
      <ClientTasksSection tasks={tasks} clientId={client.id} />

      {/* Files */}
      <section className="flex flex-col gap-2">
        <h3 className="text-body-sm font-semibold text-ink">קבצים ({attachments.length})</h3>
        <FileUpload clientId={client.id} />
        <FileList attachments={attachments} thumbUrls={thumbs} />
      </section>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return <div className="rounded-lg bg-surface p-6 text-center text-sm text-ink-secondary">{text}</div>;
}

