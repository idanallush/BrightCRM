import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

const resend = new Resend(process.env.RESEND_API_KEY);

const DEFAULT_FROM = "BrightCRM <notifications@b-bright.co.il>";

export async function sendEmail(
  to: string[],
  subject: string,
  html: string,
  meta?: { type?: string; referenceId?: string },
) {
  const from = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM;

  console.log("[Email] Sending to:", to, "subject:", subject);

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
  });

  // Log to email_log table (fire-and-forget)
  try {
    const db = createAdminClient();
    await db.from("email_log").insert({
      recipients: to,
      subject,
      email_type: meta?.type ?? null,
      reference_id: meta?.referenceId ?? null,
      status: error ? "failed" : "sent",
      error_message: error?.message ?? null,
    });
  } catch (logErr) {
    console.error("[Email] Failed to write email_log:", logErr);
  }

  if (error) {
    console.error("[Email] Send failed:", error);
    throw new Error(`Email send failed: ${error.message}`);
  }

  console.log("[Email] Resend response:", data);
  return data;
}
