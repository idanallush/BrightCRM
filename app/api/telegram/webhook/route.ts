import { NextRequest, NextResponse } from "next/server";
import {
  getRegisteredMember,
  handleRegistration,
} from "@/lib/telegram/registration";
import { parseTaskFromText } from "@/lib/telegram/parse-task";
import {
  sendTaskConfirmation,
  confirmTask,
  showReassignOptions,
  reassignPendingTask,
} from "@/lib/telegram/confirmation";
import { transcribeVoice } from "@/lib/telegram/voice";
import {
  sendMessage,
  answerCallbackQuery,
  editMessageReplyMarkup,
} from "@/lib/telegram/api";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = await request.json();

  try {
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    } else if (update.message) {
      await handleMessage(update.message);
    }
  } catch (err) {
    console.error("[Telegram] Error handling update:", err);
    const chatId =
      update.callback_query?.message?.chat?.id ?? update.message?.chat?.id;
    if (chatId) {
      await sendMessage(chatId, "אירעה שגיאה. נסה שוב מאוחר יותר.");
    }
  }

  // Always return 200 to Telegram so it doesn't retry
  return NextResponse.json({ ok: true });
}

async function handleMessage(message: {
  from: { id: number };
  chat: { id: number };
  text?: string;
  voice?: { file_id: string };
  audio?: { file_id: string };
}) {
  const telegramUserId = message.from.id;
  const chatId = message.chat.id;

  // Check registration first — voice and text both need it
  const member = await getRegisteredMember(telegramUserId);

  if (!member) {
    // Unregistered user — only handle text for email registration
    if (message.text) {
      await handleRegistration(telegramUserId, chatId, message.text.trim());
    } else {
      await sendMessage(
        chatId,
        "שלום! כדי להשתמש בבוט, שלח/י את כתובת המייל שלך ב-Bright",
      );
    }
    return;
  }

  // Registered user — handle voice/audio first, then text
  const sender = { id: member.id, full_name: member.full_name };

  if (message.voice || message.audio) {
    await handleVoiceMessage(chatId, telegramUserId, sender, message);
    return;
  }

  if (message.text) {
    const text = message.text.trim();
    if (!text || text === "/start") return;
    await handleTaskText(chatId, telegramUserId, sender, text);
  }
}

async function handleVoiceMessage(
  chatId: number,
  telegramUserId: number,
  sender: { id: string; full_name: string },
  message: { voice?: { file_id: string }; audio?: { file_id: string } },
) {
  const fileId = message.voice?.file_id ?? message.audio?.file_id;
  if (!fileId) return;

  await sendMessage(chatId, "🎤 מתמלל את ההקלטה...");

  try {
    const transcription = await transcribeVoice(fileId);

    if (!transcription.trim()) {
      await sendMessage(chatId, "לא הצלחתי לתמלל את ההקלטה. נסה שוב.");
      return;
    }

    await sendMessage(chatId, `📝 תמלול: "${transcription}"`);
    await handleTaskText(chatId, telegramUserId, sender, transcription);
  } catch (err) {
    console.error("[Telegram] Voice transcription error:", err);
    await sendMessage(
      chatId,
      "שגיאה בתמלול ההקלטה. נסה לשלוח הודעת טקסט במקום.",
    );
  }
}

async function handleTaskText(
  chatId: number,
  telegramUserId: number,
  sender: { id: string; full_name: string },
  text: string,
) {
  try {
    const parsed = await parseTaskFromText(text, sender);
    await sendTaskConfirmation(chatId, telegramUserId, parsed);
  } catch (err) {
    console.error("[Telegram] Parse/confirm error:", err);
    await sendMessage(
      chatId,
      'לא הצלחתי לפענח את ההודעה. נסה לנסח מחדש, למשל:\n"פוטוטבע - להכין באנרים לקמפיין חדש עד יום חמישי"',
    );
  }
}

async function handleCallbackQuery(callbackQuery: {
  id: string;
  from: { id: number };
  message: { chat: { id: number }; message_id: number };
  data: string;
}) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data;

  // Parse callback: "action:id" or "action:id:extra"
  const parts = data.split(":");
  const action = parts[0];
  const pendingTaskId = parts[1];

  if (action === "confirm") {
    await editMessageReplyMarkup(chatId, messageId);
    try {
      await confirmTask(pendingTaskId);
      await answerCallbackQuery(callbackQuery.id, "המשימה נוצרה!");
      await sendMessage(chatId, "✅ המשימה נוצרה בהצלחה");
    } catch (err) {
      console.error("[Telegram] Confirm error:", err);
      await answerCallbackQuery(callbackQuery.id);
      await sendMessage(chatId, "שגיאה ביצירת המשימה. נסה שוב.");
    }
  } else if (action === "edit") {
    await editMessageReplyMarkup(chatId, messageId);
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    await answerCallbackQuery(callbackQuery.id);
    await sendMessage(
      chatId,
      `המשימה לא נשמרה. ניתן ליצור אותה בממשק:\n${siteUrl}/tasks`,
    );

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const db = createAdminClient();
    await db.from("telegram_pending_tasks").delete().eq("id", pendingTaskId);
  } else if (action === "reassign") {
    await answerCallbackQuery(callbackQuery.id);
    await showReassignOptions(chatId, pendingTaskId);
  } else if (action === "assign") {
    // "assign:{pendingTaskId}:{memberId}"
    const memberId = parts[2];
    await editMessageReplyMarkup(chatId, messageId);
    await answerCallbackQuery(callbackQuery.id);
    await reassignPendingTask(
      chatId,
      callbackQuery.from.id,
      pendingTaskId,
      memberId,
    );
  } else {
    await answerCallbackQuery(callbackQuery.id);
  }
}
