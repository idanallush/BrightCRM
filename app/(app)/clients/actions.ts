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
