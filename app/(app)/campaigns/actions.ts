"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CampaignInput = {
  name: string;
  client_id: string | null;
  platform: "google" | "facebook" | "tiktok";
  status: "פעיל" | "הסתיים" | "בעבודה" | "מושהה" | null;
  start_date: string | null;
  spent: number | null;
  external_campaign_id: string | null;
};

function clean(input: CampaignInput): CampaignInput {
  return {
    ...input,
    name: input.name.trim(),
    external_campaign_id: input.external_campaign_id?.trim() || null,
  };
}

export async function createCampaignRow(input: CampaignInput) {
  const sb = createClient();
  const { data, error } = await sb
    .from("campaigns")
    .insert(clean(input))
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/campaigns");
  revalidatePath("/dashboard");
  if (input.client_id) revalidatePath(`/clients/${input.client_id}`);
  return { ok: true as const, id: data.id as string };
}

export async function updateCampaignRow(id: string, input: CampaignInput) {
  const sb = createClient();
  const { error } = await sb.from("campaigns").update(clean(input)).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/campaigns");
  revalidatePath("/dashboard");
  if (input.client_id) revalidatePath(`/clients/${input.client_id}`);
  return { ok: true as const };
}

export async function deleteCampaignRow(id: string) {
  const sb = createClient();
  const { error } = await sb.from("campaigns").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/campaigns");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
