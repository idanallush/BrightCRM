import { NextRequest, NextResponse } from "next/server";
import { checkAndNotifyOverdue } from "@/lib/notifications/overdue";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Verify Vercel Cron secret — fail closed if not configured
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await checkAndNotifyOverdue();
    console.log("[Cron] Overdue check:", result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[Cron] Overdue check failed:", err);
    return NextResponse.json(
      { error: "Failed to run overdue check" },
      { status: 500 },
    );
  }
}
