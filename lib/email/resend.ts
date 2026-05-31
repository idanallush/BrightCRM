import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const DEFAULT_FROM = "BrightCRM <notifications@b-bright.co.il>";

export async function sendEmail(
  to: string[],
  subject: string,
  html: string,
) {
  const from = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM;

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("[Email] Send failed:", error);
    throw new Error(`Email send failed: ${error.message}`);
  }

  return data;
}
