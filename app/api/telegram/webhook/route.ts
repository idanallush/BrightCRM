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
  showEditMenu,
  showClientOptions,
  setEditState,
  updatePendingField,
  updatePendingClient,
  cancelPendingTask,
  getPendingEditState,
  parseHebrewDate,
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

    // Check if user has a pending task waiting for text input (edit flow)
    const editState = await getPendingEditState(telegramUserId);
    if (editState) {
      await handleFieldEdit(chatId, editState, text);
      return;
    }

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

/** Handles a text message that updates a field being edited on a pending task. */
async function handleFieldEdit(
  chatId: number,
  editState: { id: string; edit_field: string | null },
  text: string,
) {
  const field = editState.edit_field;
  const pendingId = editState.id;

  if (field === "title") {
    await updatePendingField(chatId, pendingId, "title", text);
  } else if (field === "due_date") {
    const parsed = parseHebrewDate(text);
    if (!parsed) {
      await sendMessage(
        chatId,
        "לא הצלחתי לפענח את התאריך. נסה שוב, למשל: מחר, יום ראשון, 05/06/2026",
      );
      return;
    }
    await updatePendingField(chatId, pendingId, "due_date", parsed);
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
  } else if (action === "edit_menu") {
    // Show field selection menu
    await editMessageReplyMarkup(chatId, messageId);
    await answerCallbackQuery(callbackQuery.id);
    await showEditMenu(chatId, pendingTaskId);
  } else if (action === "edit_client") {
    // Show client list buttons
    await editMessageReplyMarkup(chatId, messageId);
    await answerCallbackQuery(callbackQuery.id);
    await showClientOptions(chatId, pendingTaskId);
  } else if (action === "edit_assignee") {
    // Reuse existing reassign flow
    await editMessageReplyMarkup(chatId, messageId);
    await answerCallbackQuery(callbackQuery.id);
    await showReassignOptions(chatId, pendingTaskId);
  } else if (action === "edit_title") {
    // Set state so next text message updates the title
    await editMessageReplyMarkup(chatId, messageId);
    await answerCallbackQuery(callbackQuery.id);
    await setEditState(pendingTaskId, "title");
    await sendMessage(chatId, "שלח כותרת חדשה:");
  } else if (action === "edit_due") {
    // Set state so next text message updates the due date
    await editMessageReplyMarkup(chatId, messageId);
    await answerCallbackQuery(callbackQuery.id);
    await setEditState(pendingTaskId, "due_date");
    await sendMessage(
      chatId,
      "שלח תאריך חדש (למשל: מחר, יום ראשון, 05/06/2026):",
    );
  } else if (action === "select_client") {
    // "select_client:{pendingTaskId}:{clientId}"
    const clientId = parts[2];
    await editMessageReplyMarkup(chatId, messageId);
    await answerCallbackQuery(callbackQuery.id);
    await updatePendingClient(chatId, pendingTaskId, clientId);
  } else if (action === "cancel_edit") {
    // Delete the pending task
    await editMessageReplyMarkup(chatId, messageId);
    await answerCallbackQuery(callbackQuery.id);
    await cancelPendingTask(chatId, pendingTaskId);
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
