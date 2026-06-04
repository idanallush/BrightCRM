"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ClientInput = {
  name: string;
  contact_name: string | null;
  account_manager_id: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  budget_note: string | null;
  health: "בריא" | "אסטרטגיה צריכה" | "קריטי" | null;
  drive_url: string | null;
  facebook_ads_url: string | null;
  google_ads_url: string | null;
  cms_url: string | null;
  analytics_url: string | null;
  logo_url: string | null;
  logo_storage_path: string | null;
  brief: string | null;
  onboarding_status: "בתהליך קליטה" | "באוויר" | "בהשהייה" | null;
  onboarding_date: string | null;
  competitors: string | null;
  target_audience: string | null;
  core_message: string | null;
  campaign_goal: string | null;
  differentiation: string | null;
  digital_assets: string[];
  previous_campaigns: string[];
};

function clean(input: ClientInput): ClientInput {
  return {
    ...input,
    name: input.name.trim(),
    contact_name: input.contact_name?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    website_url: input.website_url?.trim() || null,
    budget_note: input.budget_note?.trim() || null,
    drive_url: input.drive_url?.trim() || null,
    facebook_ads_url: input.facebook_ads_url?.trim() || null,
    google_ads_url: input.google_ads_url?.trim() || null,
    cms_url: input.cms_url?.trim() || null,
    analytics_url: input.analytics_url?.trim() || null,
    logo_url: input.logo_url?.trim() || null,
    logo_storage_path: input.logo_storage_path?.trim() || null,
    brief: input.brief?.trim() || null,
    onboarding_date: input.onboarding_date?.trim() || null,
    competitors: input.competitors?.trim() || null,
    target_audience: input.target_audience?.trim() || null,
    core_message: input.core_message?.trim() || null,
    campaign_goal: input.campaign_goal?.trim() || null,
    differentiation: input.differentiation?.trim() || null,
    digital_assets: input.digital_assets.filter((s) => s.trim()),
    previous_campaigns: input.previous_campaigns.filter((s) => s.trim()),
  };
}

export async function createClientRow(input: ClientInput) {
  const sb = createClient();
  const { data, error } = await sb
    .from("clients")
    .insert(clean(input))
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return { ok: true as const, id: data.id as string };
}

export async function updateClientRow(id: string, input: ClientInput) {
  const sb = createClient();
  const { error } = await sb.from("clients").update(clean(input)).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  revalidatePath("/dashboard");
  return { ok: true as const };
}

const LOGO_BUCKET = "attachments";
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export async function uploadClientLogo(clientId: string, formData: FormData) {
  const file = formData.get("file") as File | null;
  if (!file) return { error: "לא נשלח קובץ" };
  if (file.size > LOGO_MAX_BYTES) return { error: "הקובץ גדול מ-2MB" };
  if (!LOGO_ALLOWED.includes(file.type))
    return { error: "סוג קובץ לא נתמך. נדרש PNG, JPEG, WebP או SVG." };

  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "לא מאומת" };

  // Delete old logo if exists
  const { data: existing } = await sb
    .from("clients")
    .select("logo_storage_path")
    .eq("id", clientId)
    .single();
  if (existing?.logo_storage_path) {
    await sb.storage.from(LOGO_BUCKET).remove([existing.logo_storage_path]);
  }

  const ext = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
    : ".png";
  const path = `client/${clientId}/logo${ext}`;

  const { error: upErr } = await sb.storage
    .from(LOGO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (upErr) return { error: `העלאה נכשלה: ${upErr.message}` };

  const { error: updErr } = await sb
    .from("clients")
    .update({ logo_storage_path: path })
    .eq("id", clientId);
  if (updErr) return { error: updErr.message };

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { ok: true as const, path };
}

export async function deleteClientRow(id: string) {
  const sb = createClient();

  // Delete dependent records that don't have ON DELETE CASCADE on client_id.
  // Order matters: task_assignees/comments/notifications cascade from tasks,
  // so deleting tasks handles those. attachments.client_id already cascades.
  for (const table of ["tasks", "campaigns", "meetings", "client_strategies"]) {
    const { error } = await sb.from(table).delete().eq("client_id", id);
    if (error) return { error: error.message };
  }

  const { error } = await sb.from("clients").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/clients");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
