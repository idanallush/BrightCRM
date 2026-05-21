import { createAdminClient } from "@/lib/supabase/admin";
import { sendMessage } from "./api";

type TeamMember = {
  id: string;
  full_name: string;
  email: string;
  telegram_user_id: number | null;
};

/** Returns the team member if registered, null otherwise. */
export async function getRegisteredMember(
  telegramUserId: number,
): Promise<TeamMember | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("team_members")
    .select("id, full_name, email, telegram_user_id")
    .eq("telegram_user_id", telegramUserId)
    .eq("active", true)
    .maybeSingle();
  return data;
}

/**
 * Handles the registration flow for an unrecognized Telegram user.
 * Returns true if the user just completed registration (so we can
 * let them know they can start using the bot), false otherwise.
 */
export async function handleRegistration(
  telegramUserId: number,
  chatId: number,
  messageText: string,
): Promise<boolean> {
  const db = createAdminClient();

  // Check if there's already a pending registration for this user
  const { data: pending } = await db
    .from("telegram_pending_registrations")
    .select("id")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();

  if (!pending) {
    // First contact — ask for email and create pending registration
    await db.from("telegram_pending_registrations").insert({
      telegram_user_id: telegramUserId,
      chat_id: chatId,
    });
    await sendMessage(
      chatId,
      "שלום! כדי להשתמש בבוט, שלח/י את כתובת המייל שלך ב-Bright",
    );
    return false;
  }

  // User already asked — this message should be their email
  const email = messageText.trim().toLowerCase();

  if (!email.includes("@")) {
    await sendMessage(chatId, "זה לא נראה כמו כתובת מייל. נסה שוב.");
    return false;
  }

  // Must match an existing team_member with @b-bright.co.il domain
  if (!email.endsWith("@b-bright.co.il")) {
    await sendMessage(
      chatId,
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
    await sendMessage(
      chatId,
      "המייל לא נמצא במערכת. נסה שוב או פנה למנהל",
    );
    return false;
  }

  // Match found — link Telegram user to team member
  await db
    .from("team_members")
    .update({ telegram_user_id: telegramUserId })
    .eq("id", member.id);

  // Clean up pending registration
  await db
    .from("telegram_pending_registrations")
    .delete()
    .eq("telegram_user_id", telegramUserId);

  await sendMessage(
    chatId,
    `נרשמת בהצלחה, ${member.full_name}! אפשר להתחיל לפתוח משימות.`,
  );
  return true;
}
