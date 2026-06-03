import { NextRequest, NextResponse } from "next/server";
import { notifyOverdueByEmail } from "@/lib/email/notify";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Verify Vercel Cron secret — fail closed if not configured
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Skip weekend (Fri/Sat in Israel)
  const now = new Date();
  const israelHour = now.getUTCHours() + 3;
  const israelDay = israelHour >= 24 ? (now.getUTCDay() + 1) % 7 : now.getUTCDay();
  if (israelDay === 5 || israelDay === 6) {
    return NextResponse.json({ skipped: true, reason: "weekend" });
  }

  try {
    const result = await notifyOverdueByEmail();
    console.log("[Cron] Overdue email:", result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[Cron] Overdue email failed:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
