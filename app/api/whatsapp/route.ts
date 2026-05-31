import { NextRequest, NextResponse } from "next/server";
import {
  verifySignature,
  sendTextMessage,
  markAsRead,
} from "@/lib/whatsapp/api";
import {
  getRegisteredMember,
  handleRegistration,
} from "@/lib/whatsapp/registration";
import { parseTaskFromText } from "@/lib/whatsapp/parse-task";
import { transcribeVoice } from "@/lib/whatsapp/voice";
import {
  sendTaskConfirmation,
  confirmTask,
  cancelPendingTask,
  setEditState,
  getPendingEditState,
  handleEditMessage,
} from "@/lib/whatsapp/confirmation";
import type { ParsedTask } from "@/lib/whatsapp/parse-task";

// Webhook verification (Meta sends GET to verify endpoint ownership)
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WA_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Incoming messages
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Verify HMAC signature
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  if (signature && !verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);

  console.log("[WhatsApp] Webhook received, processing synchronously before response");

  try {
    await processWebhook(body);
  } catch (err) {
    console.error("[WhatsApp] Error processing webhook:", err);
  }

  return NextResponse.json({ ok: true });
}

async function processWebhook(body: any) {
  console.log("[WhatsApp] processWebhook called, object:", body.object);
  if (body.object !== "whatsapp_business_account") {
    console.log("[WhatsApp] Ignoring non-whatsapp object");
    return;
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;

      const value = change.value;
      if (!value?.messages) {
        console.log("[WhatsApp] No messages in change value, skipping");
        continue;
      }

      console.log(`[WhatsApp] Processing ${value.messages.length} message(s)`);

      for (const message of value.messages) {
        try {
          console.log(`[WhatsApp] Handling message type=${message.type} from=${message.from} id=${message.id}`);
          await handleIncomingMessage(message);
          console.log(`[WhatsApp] Message ${message.id} processed successfully`);
        } catch (err) {
          console.error("[WhatsApp] Error handling message:", err);
          const phone = message.from;
          if (phone) {
            await sendTextMessage(
              phone,
              "אירעה שגיאה. נסה שוב מאוחר יותר.",
            ).catch(() => {});
          }
        }
      }
    }
  }
}

async function handleIncomingMessage(message: any) {
  const phone: string = message.from;
  const messageType: string = message.type;

  if (message.id) {
    markAsRead(message.id).catch(() => {});
  }

  if (messageType === "interactive") {
    const buttonReply = message.interactive?.button_reply;
    if (buttonReply) {
      console.log(`[WhatsApp] Button reply: ${buttonReply.id}`);
      await handleButtonReply(phone, buttonReply.id);
    }
    return;
  }

  console.log(`[WhatsApp] Checking registration for ${phone}`);
  const member = await getRegisteredMember(phone);

  if (!member) {
    console.log(`[WhatsApp] Unregistered user ${phone}, handling registration`);
    if (messageType === "text") {
      await handleRegistration(phone, message.text?.body?.trim() ?? "");
    } else {
      await sendTextMessage(
        phone,
        "שלום! כדי להשתמש בבוט, שלח/י את כתובת המייל שלך ב-Bright",
      );
    }
    return;
  }

  console.log(`[WhatsApp] Registered member: ${member.full_name} (${member.id})`);
  const sender = { id: member.id, full_name: member.full_name };

  const editState = await getPendingEditState(phone);
  if (editState && messageType === "text") {
    console.log(`[WhatsApp] Handling pending edit for task ${editState.id}`);
    const text = message.text?.body?.trim();
    if (text) {
      await handleEditMessage(
        phone,
        editState.id,
        text,
        editState.parsed_data as ParsedTask,
      );
    }
    return;
  }

  if (messageType === "audio") {
    const mediaId = message.audio?.id;
    if (!mediaId) return;

    console.log(`[WhatsApp] Voice message, media_id=${mediaId}, starting transcription`);
    await sendTextMessage(phone, "מתמלל את ההקלטה...");

    try {
      const transcription = await transcribeVoice(mediaId);
      console.log(`[WhatsApp] Transcription result: "${transcription.slice(0, 100)}..."`);

      if (!transcription.trim()) {
        await sendTextMessage(phone, "לא הצלחתי לתמלל את ההקלטה. נסה שוב.");
        return;
      }

      await sendTextMessage(phone, `תמלול: "${transcription}"`);
      await handleTaskText(phone, sender, transcription);
    } catch (err) {
      console.error("[WhatsApp] Voice transcription error:", err);
      await sendTextMessage(
        phone,
        "שגיאה בתמלול ההקלטה. נסה לשלוח הודעת טקסט במקום.",
      );
    }
    return;
  }

  if (messageType === "text") {
    const text = message.text?.body?.trim();
    if (!text) return;
    console.log(`[WhatsApp] Text message: "${text.slice(0, 100)}"`);
    await handleTaskText(phone, sender, text);
  }
}

async function handleTaskText(
  phone: string,
  sender: { id: string; full_name: string },
  text: string,
) {
  try {
    console.log(`[WhatsApp] Parsing task text via Claude API...`);
    const parsed = await parseTaskFromText(text, sender);
    console.log(`[WhatsApp] Parsed task:`, JSON.stringify(parsed, null, 2));
    console.log(`[WhatsApp] Sending confirmation message...`);
    await sendTaskConfirmation(phone, parsed);
    console.log(`[WhatsApp] Confirmation sent successfully`);
  } catch (err) {
    console.error("[WhatsApp] Parse/confirm error:", err);
    await sendTextMessage(
      phone,
      'לא הצלחתי לפענח את ההודעה. נסה לנסח מחדש, למשל:\n"פוטוטבע - להכין באנרים לקמפיין חדש עד יום חמישי"',
    );
  }
}

async function handleButtonReply(phone: string, buttonId: string) {
  // Format: "action:pendingTaskId"
  const colonIndex = buttonId.indexOf(":");
  if (colonIndex === -1) return;

  const action = buttonId.slice(0, colonIndex);
  const pendingTaskId = buttonId.slice(colonIndex + 1);

  if (action === "confirm") {
    try {
      await confirmTask(pendingTaskId);
      await sendTextMessage(phone, "המשימה נוצרה בהצלחה!");
    } catch (err) {
      console.error("[WhatsApp] Confirm error:", err);
      await sendTextMessage(phone, "שגיאה ביצירת המשימה. נסה שוב.");
    }
  } else if (action === "edit") {
    await setEditState(pendingTaskId);
    await sendTextMessage(
      phone,
      'מה לשנות? כתוב למשל:\nכותרת: הכותרת החדשה\nלקוח: שם הלקוח\nאחראי: שם האחראי\nדדליין: מחר',
    );
  } else if (action === "cancel") {
    await cancelPendingTask(phone, pendingTaskId);
  }
}
