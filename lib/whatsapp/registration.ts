import { createAdminClient } from "@/lib/supabase/admin";
import { sendTextMessage } from "./api";

type TeamMember = {
  id: string;
  full_name: string;
  email: string;
  whatsapp_phone: string | null;
};

export async function getRegisteredMember(
  phone: string,
): Promise<TeamMember | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("team_members")
    .select("id, full_name, email, whatsapp_phone")
    .eq("whatsapp_phone", phone)
    .eq("active", true)
    .maybeSingle();
  return data;
}

export async function handleRegistration(
  phone: string,
  messageText: string,
): Promise<boolean> {
  const db = createAdminClient();

  const { data: pending } = await db
    .from("whatsapp_pending_registrations")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (!pending) {
    await db.from("whatsapp_pending_registrations").insert({ phone });
    await sendTextMessage(
      phone,
      "שלום! כדי להשתמש בבוט, שלח/י את כתובת המייל שלך ב-Bright",
    );
    return false;
  }

  const email = messageText.trim().toLowerCase();

  if (!email.includes("@")) {
    await sendTextMessage(phone, "זה לא נראה כמו כתובת מייל. נסה שוב.");
    return false;
  }

  if (!email.endsWith("@b-bright.co.il")) {
    await sendTextMessage(
      phone,
      "המייל לא נמצא במערכת. נסה שוב או פנה למנהל",
    );
    return false;
  }

  const { data: member } = await db
    .from("team_members")
    .select("id, full_name")
    .eq("email", email)
    .eq("active", true)
    .maybeSingle();

  if (!member) {
    await sendTextMessage(
      phone,
      "המייל לא נמצא במערכת. נסה שוב או פנה למנהל",
    );
    return false;
  }

  await db
    .from("team_members")
    .update({ whatsapp_phone: phone })
    .eq("id", member.id);

  await db
    .from("whatsapp_pending_registrations")
    .delete()
    .eq("phone", phone);

  await sendTextMessage(
    phone,
    `נרשמת בהצלחה, ${member.full_name}! אפשר להתחיל לפתוח משימות.`,
  );
  return true;
}
