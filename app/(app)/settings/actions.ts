"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateTeamMember(
  memberId: string,
  input: {
    full_name: string;
    role: string | null;
    email: string;
    whatsapp_phone: string | null;
    active: boolean;
    notify_email: boolean;
    notify_whatsapp: boolean;
  },
) {
  if (!input.full_name.trim()) return { error: "חסר שם מלא" };
  if (!input.email.trim()) return { error: "חסר אימייל" };

  const sb = createClient();
  const { error } = await sb
    .from("team_members")
    .update({
      full_name: input.full_name.trim(),
      role: input.role?.trim() || null,
      email: input.email.trim(),
      whatsapp_phone: input.whatsapp_phone?.trim() || null,
      active: input.active,
      notify_email: input.notify_email,
      notify_whatsapp: input.notify_whatsapp,
    })
    .eq("id", memberId);

  if (error) return { error: `שמירה נכשלה: ${error.message}` };
  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true as const };
}

export async function addTeamMember(input: {
  full_name: string;
  role: string | null;
  email: string;
  whatsapp_phone: string | null;
}) {
  if (!input.full_name.trim()) return { error: "חסר שם מלא" };
  if (!input.email.trim()) return { error: "חסר אימייל" };

  const sb = createClient();
  const { error } = await sb.from("team_members").insert({
    full_name: input.full_name.trim(),
    role: input.role?.trim() || null,
    email: input.email.trim(),
    whatsapp_phone: input.whatsapp_phone?.trim() || null,
    active: true,
    notify_email: true,
    notify_whatsapp: true,
  });

  if (error) return { error: `הוספה נכשלה: ${error.message}` };
  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true as const };
}
