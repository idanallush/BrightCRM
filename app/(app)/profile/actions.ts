"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Resolve the current auth user and their team_members row (id only).
async function getCurrentMemberId(
  sb: ReturnType<typeof createClient>,
): Promise<{ memberId: string } | { error: string }> {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "לא מאומת" };

  const { data: member } = await sb
    .from("team_members")
    .select("id")
    .eq("email", user.email)
    .maybeSingle();

  if (!member) return { error: "לא נמצא משתמש מתאים" };
  return { memberId: member.id };
}

export async function updateProfile(input: {
  full_name: string;
  role: string | null;
  whatsapp_phone: string | null;
}) {
  if (!input.full_name.trim()) return { error: "חסר שם מלא" };

  const sb = createClient();
  const resolved = await getCurrentMemberId(sb);
  if ("error" in resolved) return { error: resolved.error };

  const { error } = await sb
    .from("team_members")
    .update({
      full_name: input.full_name.trim(),
      role: input.role?.trim() || null,
      whatsapp_phone: input.whatsapp_phone?.trim() || null,
    })
    .eq("id", resolved.memberId);

  if (error) return { error: `שמירה נכשלה: ${error.message}` };

  revalidatePath("/profile");
  revalidatePath("/");
  return { ok: true as const };
}

export async function uploadAvatar(formData: FormData) {
  const file = formData.get("file") as File | null;
  if (!file) return { error: "לא נשלח קובץ" };
  if (file.size > MAX_AVATAR_BYTES) return { error: "התמונה גדולה מ-5MB" };
  if (!ALLOWED_IMAGE_TYPES.includes(file.type))
    return { error: "יש להעלות תמונה בפורמט JPG, PNG או WEBP" };

  const sb = createClient();
  const resolved = await getCurrentMemberId(sb);
  if ("error" in resolved) return { error: resolved.error };

  const ext = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
    : "";
  const path = `${resolved.memberId}/${crypto.randomUUID()}${ext}`;

  const { error: upErr } = await sb.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return { error: `העלאה נכשלה: ${upErr.message}` };

  const {
    data: { publicUrl },
  } = sb.storage.from(AVATAR_BUCKET).getPublicUrl(path);

  const { error: dbErr } = await sb
    .from("team_members")
    .update({ avatar_url: publicUrl })
    .eq("id", resolved.memberId);
  if (dbErr) {
    // Roll back the uploaded object so we don't orphan storage.
    await sb.storage.from(AVATAR_BUCKET).remove([path]);
    return { error: `שמירת התמונה נכשלה: ${dbErr.message}` };
  }

  revalidatePath("/profile");
  revalidatePath("/");
  return { ok: true as const, url: publicUrl };
}

export async function updateNotificationPrefs(input: {
  notify_email: boolean;
  notify_whatsapp: boolean;
}) {
  const sb = createClient();
  const resolved = await getCurrentMemberId(sb);
  if ("error" in resolved) return { error: resolved.error };

  const { error } = await sb
    .from("team_members")
    .update({
      notify_email: input.notify_email,
      notify_whatsapp: input.notify_whatsapp,
    })
    .eq("id", resolved.memberId);

  if (error) return { error: `שמירה נכשלה: ${error.message}` };

  revalidatePath("/profile");
  return { ok: true as const };
}

export async function changePassword(newPassword: string) {
  if (newPassword.length < 8)
    return { error: "הסיסמה חייבת להכיל לפחות 8 תווים" };

  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "לא מאומת" };

  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) return { error: `עדכון הסיסמה נכשל: ${error.message}` };

  return { ok: true as const };
}
