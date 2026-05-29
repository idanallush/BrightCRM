import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Phone, Mail, User, CreditCard, Contact, FileText, ImageIcon, CalendarDays, Target, MessageSquare, Crosshair, Sparkles, Loader2, CheckCircle2, Monitor, Megaphone } from "lucide-react";
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
import { StaggerContainer, StaggerItem } from "@/components/motion";

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
    <StaggerContainer className="flex flex-col gap-6" stagger={0.07}>
      {/* Header */}
      <StaggerItem>
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-sidebar px-4 py-3">
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
      </StaggerItem>

      {/* Contact info */}
      <StaggerItem>
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
        <div className="bg-surface px-4 py-2.5">
          <span className="text-caption font-medium text-ink-secondary">פרטי קשר</span>
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {client.contact_name && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-pastel-blue">
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
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-pastel-purple">
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
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-pastel-teal">
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
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-pastel-coral">
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
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-pastel-yellow">
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
      </StaggerItem>

      {/* External links with brand logos */}
      {externalLinks.length > 0 && (
        <StaggerItem>
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
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
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface hover:shadow-elevation-1"
              >
                {l.icon}
                {l.label}
              </a>
            ))}
          </div>
        </div>
        </StaggerItem>
      )}

      {/* Onboarding / Characterization */}
      {(client.onboarding_status || client.onboarding_date || client.competitors || client.target_audience || client.core_message || client.campaign_goal || client.differentiation || (client.digital_assets?.length > 0) || (client.previous_campaigns?.length > 0)) && (
        <StaggerItem>
        <div id="onboarding" className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
          <div className="flex items-center justify-between bg-surface px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-ink-secondary" />
              <span className="text-caption font-medium text-ink-secondary">קליטה ואפיון</span>
            </div>
            {client.onboarding_status && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                client.onboarding_status === "בתהליך קליטה" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
              }`}>
                {client.onboarding_status === "בתהליך קליטה" ? <Loader2 className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                {client.onboarding_status}
              </span>
            )}
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {client.onboarding_date && (
                <div className="flex items-start gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-pastel-blue">
                    <CalendarDays className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-[11px] text-ink-muted">תאריך קליטה</div>
                    <div className="text-sm font-medium text-ink">{new Date(client.onboarding_date).toLocaleDateString("he-IL")}</div>
                  </div>
                </div>
              )}
              {client.competitors && (
                <div className="flex items-start gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-pastel-coral">
                    <Crosshair className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-[11px] text-ink-muted">מתחרים</div>
                    <div className="text-sm font-medium text-ink">{client.competitors}</div>
                  </div>
                </div>
              )}
              {client.core_message && (
                <div className="flex items-start gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-pastel-purple">
                    <MessageSquare className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-[11px] text-ink-muted">מסר מרכזי</div>
                    <div className="text-sm font-medium text-ink">{client.core_message}</div>
                  </div>
                </div>
              )}
              {client.differentiation && (
                <div className="flex items-start gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-pastel-yellow">
                    <Sparkles className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div>
                    <div className="text-[11px] text-ink-muted">בידול</div>
                    <div className="text-sm font-medium text-ink">{client.differentiation}</div>
                  </div>
                </div>
              )}
            </div>
            {client.target_audience && (
              <div className="mt-4 flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-pastel-teal">
                  <Target className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <div className="text-[11px] text-ink-muted">קהל יעד</div>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{client.target_audience}</div>
                </div>
              </div>
            )}
            {client.campaign_goal && (
              <div className="mt-4 flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-pastel-rose">
                  <Megaphone className="h-4 w-4 text-rose-600" />
                </div>
                <div>
                  <div className="text-[11px] text-ink-muted">מטרת הקמפיינים</div>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{client.campaign_goal}</div>
                </div>
              </div>
            )}
            {client.digital_assets?.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 flex items-center gap-2">
                  <Monitor className="h-3.5 w-3.5 text-ink-muted" />
                  <span className="text-[11px] text-ink-muted">נכסים דיגיטליים</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {client.digital_assets.map((a) => (
                    <span key={a} className="rounded-full bg-pastel-blue px-2.5 py-0.5 text-[11px] font-medium text-primary">{a}</span>
                  ))}
                </div>
              </div>
            )}
            {client.previous_campaigns?.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 flex items-center gap-2">
                  <Megaphone className="h-3.5 w-3.5 text-ink-muted" />
                  <span className="text-[11px] text-ink-muted">קמפיינים קודמים</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {client.previous_campaigns.map((p) => (
                    <span key={p} className="rounded-full bg-pastel-purple px-2.5 py-0.5 text-[11px] font-medium text-purple-700">{p}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        </StaggerItem>
      )}

      {/* Client Brief */}
      <StaggerItem>
      <div id="brief" className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
        <div className="flex items-center gap-2 bg-surface px-4 py-2.5">
          <FileText className="h-4 w-4 text-ink-secondary" />
          <span className="text-caption font-medium text-ink-secondary">בריף לקוח</span>
        </div>
        <div className="p-4">
          {client.brief ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{client.brief}</div>
          ) : (
            <div className="rounded-xl bg-surface p-6 text-center text-sm text-ink-muted">
              אין בריף עדיין. ערוך את הלקוח כדי להוסיף בריף.
            </div>
          )}
        </div>
      </div>
      </StaggerItem>

      {/* Tasks */}
      <StaggerItem>
        <ClientTasksSection tasks={tasks} clientId={client.id} />
      </StaggerItem>

      {/* Files */}
      <StaggerItem>
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
        <div className="flex items-center gap-2 bg-surface px-4 py-2.5">
          <ImageIcon className="h-4 w-4 text-ink-secondary" />
          <span className="text-caption font-medium text-ink-secondary">קבצים ({attachments.length})</span>
        </div>
        <div className="p-4">
          <FileUpload clientId={client.id} />
          <FileList attachments={attachments} thumbUrls={thumbs} />
        </div>
      </div>
      </StaggerItem>
    </StaggerContainer>
  );
}
