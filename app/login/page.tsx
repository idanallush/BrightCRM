"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { BRIGHT_DOMAIN } from "@/lib/utils";

function LoginInner() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  async function signIn() {
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: { hd: BRIGHT_DOMAIN, prompt: "select_account" },
      },
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-sm rounded-xl border border-hairline bg-canvas p-8 text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-white">
            B
          </span>
          <h1 className="font-display text-xl font-semibold tracking-display text-ink">
            BrightCRM
          </h1>
        </div>
        <p className="mb-8 text-sm text-ink-muted">
          התחברות עם חשבון Google של Bright
        </p>

        <button
          type="button"
          onClick={signIn}
          className="w-full rounded-md bg-primary py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary-active active:scale-[0.97]"
        >
          התחברות עם Google
        </button>

        {error === "domain" && (
          <p className="mt-6 text-sm text-status-overdue">
            התחברות מותרת רק לחשבונות {`@${BRIGHT_DOMAIN}`}
          </p>
        )}
        {error === "oauth" && (
          <p className="mt-6 text-sm text-status-overdue">
            ההתחברות נכשלה. נסה שוב.
          </p>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
