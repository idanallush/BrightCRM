import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Phone, Mail, User, CreditCard, Contact, FileText, ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, healthVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GoogleAdsIcon, MetaAdsIcon, GoogleDriveIcon, GoogleAnalyticsIcon, CmsIcon, WebsiteIcon,
} from "@/components/brand-icons";
import {
  getAttachmentsForClient, getClient, getTasksByClient, getTeam,
} from "@/lib/data";
import { getSignedThumbnailUrl } from "@/app/actions/attachments";
import { FileList } from "@/components/file-list";
import { FileUpload } from "@/components/file-upload";
import { EditClientButton, DeleteClientButton } from "./edit-button";
import { ClientTasksSection } from "./client-tasks-section";

export const dynamic = "force-dynamic";

type LinkDef = { label: string; url: string; icon: React.ReactNode };

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

  const externalLinks: LinkDef[] = [];
  if (client.drive_url) externalLinks.push({ label: "Google Drive", url: client.drive_url, icon: <GoogleDriveIcon className="h-5 w-5" /> });
  if (client.facebook_ads_url) externalLinks.push({ label: "Meta Ads", url: client.facebook_ads_url, icon: <MetaAdsIcon className="h-5 w-5" /> });
  if (client.google_ads_url) externalLinks.push({ label: "Google Ads", url: client.google_ads_url, icon: <GoogleAdsIcon className="h-5 w-5" /> });
  if (client.cms_url) externalLinks.push({ label: "CMS", url: client.cms_url, icon: <CmsIcon className="h-5 w-5" /> });
  if (client.analytics_url) externalLinks.push({ label: "Analytics", url: client.analytics_url, icon: <GoogleAnalyticsIcon className="h-5 w-5" /> });
  if (client.website_url) externalLinks.push({ label: "אתר", url: client.website_url, icon: <WebsiteIcon className="h-5 w-5" /> });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-primary px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/clients" className="inline-flex items-center gap-1.5 text-caption text-white/70 transition-colors hover:text-white">
              <ArrowRight className="h-4 w-4" /> חזרה
            </Link>
            {client.logo_url ? (
              <img src={client.logo_url} alt={client.name} className="h-8 w-8 rounded-full object-cover bg-white" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
                {client.name.charAt(0)}
              </span>
            )}
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
      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        <div className="bg-surface px-4 py-2.5">
          <span className="text-caption font-medium text-ink-secondary">פרטי קשר</span>
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {client.contact_name && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <Contact className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-[11px] text-ink-muted">איש קשר</div>
                <div className="text-sm font-medium text-ink">{client.contact_name}</div>
              </div>
            </div>
          )}
          {manager && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50">
                <User className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <div className="text-[11px] text-ink-muted">מנהל לקוח</div>
                <div className="text-sm font-medium text-ink">{manager.full_name}</div>
              </div>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-50">
                <Phone className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <div className="text-[11px] text-ink-muted">טלפון</div>
                <div className="text-sm font-medium text-ink" dir="ltr">{client.phone}</div>
              </div>
            </div>
          )}
          {client.email && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50">
                <Mail className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <div className="text-[11px] text-ink-muted">אימייל</div>
                <div className="text-sm font-medium text-ink" dir="ltr">{client.email}</div>
              </div>
            </div>
          )}
          {client.budget_note && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-50">
                <CreditCard className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <div className="text-[11px] text-ink-muted">תקציב</div>
                <div className="text-sm font-medium text-ink">{client.budget_note}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* External links with brand logos */}
      {externalLinks.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
          <div className="bg-surface px-4 py-2.5">
            <span className="text-caption font-medium text-ink-secondary">קישורים חיצוניים</span>
          </div>
          <div className="flex flex-wrap gap-2 p-4">
            {externalLinks.map((l) => (
              <a
                key={l.label}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface hover:shadow-sm"
              >
                {l.icon}
                {l.label}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Client Brief */}
      <div id="brief" className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        <div className="flex items-center gap-2 bg-surface px-4 py-2.5">
          <FileText className="h-4 w-4 text-ink-secondary" />
          <span className="text-caption font-medium text-ink-secondary">בריף לקוח</span>
        </div>
        <div className="p-4">
          {client.brief ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{client.brief}</div>
          ) : (
            <div className="rounded-lg bg-surface p-6 text-center text-sm text-ink-muted">
              אין בריף עדיין. ערוך את הלקוח כדי להוסיף בריף.
            </div>
          )}
        </div>
      </div>

      {/* Tasks */}
      <ClientTasksSection tasks={tasks} clientId={client.id} />

      {/* Files */}
      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        <div className="flex items-center gap-2 bg-surface px-4 py-2.5">
          <ImageIcon className="h-4 w-4 text-ink-secondary" />
          <span className="text-caption font-medium text-ink-secondary">קבצים ({attachments.length})</span>
        </div>
        <div className="p-4">
          <FileUpload clientId={client.id} />
          <FileList attachments={attachments} thumbUrls={thumbs} />
        </div>
      </div>
    </div>
  );
}
