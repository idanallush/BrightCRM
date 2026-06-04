"use server";

import { sendEmail } from "@/lib/email/resend";
import { createClient } from "@/lib/supabase/server";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function submitFeedback(formData: FormData) {
  try {
    const category = formData.get("category") as string;
    const message = formData.get("message") as string;
    const pageUrl = formData.get("pageUrl") as string;
    const fileUrl = (formData.get("fileUrl") as string) || "";

    if (!category || !message) {
      return { error: "חסרים שדות חובה" };
    }

    const sb = createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();

    if (!user?.email) {
      return { error: "לא מחובר" };
    }

    const { data: member } = await sb
      .from("team_members")
      .select("full_name")
      .eq("email", user.email)
      .maybeSingle();

    const senderName = member?.full_name || user.email;
    const escapedMessage = escapeHtml(message);
    const escapedCategory = escapeHtml(category);
    const escapedPageUrl = escapeHtml(pageUrl);

    const subject = `[BrightCRM Feedback] ${category} — from ${senderName}`;

    const fileSection = fileUrl
      ? `<p style="margin:8px 0;"><strong>קובץ מצורף:</strong> <a href="${escapeHtml(fileUrl)}" style="color:#1A1A1A;">צפייה בקובץ</a></p>`
      : "";

    const html = `
      <div dir="rtl" style="font-family:Heebo,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1A1A1A;">
        <h2 style="margin:0 0 16px;font-size:18px;color:#1A1A1A;">${escapedCategory}</h2>
        <p style="margin:8px 0;white-space:pre-wrap;line-height:1.6;">${escapedMessage}</p>
        <hr style="border:none;border-top:1px solid #e5e5e5;margin:16px 0;" />
        <p style="margin:8px 0;font-size:14px;color:#666;">
          <strong>שולח:</strong> ${escapeHtml(senderName)} (${escapeHtml(user.email)})
        </p>
        <p style="margin:8px 0;font-size:14px;color:#666;">
          <strong>עמוד:</strong> ${escapedPageUrl}
        </p>
        ${fileSection}
      </div>
    `.trim();

    await sendEmail(["idan@b-bright.co.il"], subject, html, {
      type: "feedback",
    });

    return { success: true };
  } catch (err) {
    console.error("[Feedback] Failed to submit:", err);
    return { error: "שגיאה בשליחה" };
  }
}
