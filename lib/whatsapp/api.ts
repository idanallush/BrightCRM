import crypto from "crypto";

const API_VERSION = "v21.0";

function apiUrl(path: string) {
  return `https://graph.facebook.com/${API_VERSION}/${path}`;
}

function phoneNumberId() {
  return process.env.WA_PHONE_NUMBER_ID!;
}

function accessToken() {
  return process.env.WA_ACCESS_TOKEN!;
}

async function callMessagesApi(body: Record<string, unknown>) {
  const res = await fetch(apiUrl(`${phoneNumberId()}/messages`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken()}`,
    },
    body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
  });
  const data = await res.json();
  if (data.error) {
    console.error("[WhatsApp] API error:", data.error);
  }
  return data;
}

export async function sendTextMessage(to: string, text: string) {
  return callMessagesApi({
    to,
    type: "text",
    text: { body: text },
  });
}

export type ReplyButton = {
  id: string;
  title: string;
};

export async function sendInteractiveButtons(
  to: string,
  bodyText: string,
  buttons: ReplyButton[],
) {
  return callMessagesApi({
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: buttons.map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  });
}

export async function downloadMedia(mediaId: string): Promise<Buffer> {
  // Step 1: get the media URL
  const metaRes = await fetch(apiUrl(mediaId), {
    headers: { Authorization: `Bearer ${accessToken()}` },
  });
  const meta = await metaRes.json();

  if (!meta.url) {
    throw new Error(`Failed to get media URL: ${JSON.stringify(meta)}`);
  }

  // Step 2: download the actual file
  const fileRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${accessToken()}` },
  });
  const arrayBuffer = await fileRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function verifySignature(
  rawBody: string,
  signatureHeader: string,
): boolean {
  const appSecret = process.env.WA_APP_SECRET;
  if (!appSecret) return false;

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");

  const received = signatureHeader.replace("sha256=", "");

  if (expected.length !== received.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(received, "hex"),
  );
}

export async function markAsRead(messageId: string) {
  return callMessagesApi({
    status: "read",
    message_id: messageId,
  });
}
