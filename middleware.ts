import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Server-to-server routes — no user session, skip auth
  if (
    request.nextUrl.pathname.startsWith("/api/telegram/") ||
    request.nextUrl.pathname.startsWith("/api/cron/")
  ) {
    return NextResponse.next();
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
