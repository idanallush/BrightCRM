/**
 * Sets up the Telegram webhook to point to our API route.
 *
 * Usage:
 *   npx tsx scripts/setup-telegram-webhook.ts https://your-domain.com
 *
 * For local dev, use ngrok:
 *   ngrok http 3000
 *   npx tsx scripts/setup-telegram-webhook.ts https://abc123.ngrok.io
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const baseUrl = process.argv[2];

if (!baseUrl) {
  console.error("Usage: npx tsx scripts/setup-telegram-webhook.ts <BASE_URL>");
  console.error("Example: npx tsx scripts/setup-telegram-webhook.ts https://your-app.vercel.app");
  process.exit(1);
}

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is not set in .env.local");
  process.exit(1);
}

const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
if (!webhookSecret) {
  console.error("TELEGRAM_WEBHOOK_SECRET is not set in .env.local");
  process.exit(1);
}

const webhookUrl = `${baseUrl.replace(/\/$/, "")}/api/telegram/webhook`;

async function main() {
  const res = await fetch(
    `https://api.telegram.org/bot${token}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: webhookSecret,
        allowed_updates: ["message", "callback_query"],
      }),
    },
  );

  const data = await res.json();

  if (data.ok) {
    console.log(`Webhook set successfully: ${webhookUrl}`);
  } else {
    console.error("Failed to set webhook:", data);
    process.exit(1);
  }
}

main();
