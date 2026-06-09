// TEMPORARY — remove after testing
import { NextRequest, NextResponse } from "next/server";
import { notifyTodayReminders } from "@/lib/email/notify";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const result = await notifyTodayReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[Test] notifyTodayReminders failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
