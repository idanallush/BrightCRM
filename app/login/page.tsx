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
        queryParams: {
          // Restrict Google sign-in to the Bright G-Suite domain.
          hd: BRIGHT_DOMAIN,
          prompt: "select_account",
        },
      },
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-black/5 p-8 text-center">
        <h1 className="text-2xl font-semibold text-ink mb-2">BrightCRM</h1>
        <p className="text-sm text-ink/60 mb-8">
          התחברות עם חשבון Google של Bright
        </p>

        <button
          type="button"
          onClick={signIn}
          className="w-full rounded-full bg-brand text-white py-3 text-base font-medium transition active:scale-[0.97]"
        >
          התחברות עם Google
        </button>

        {error === "domain" && (
          <p className="mt-6 text-sm text-red-600">
            התחברות מותרת רק לחשבונות {`@${BRIGHT_DOMAIN}`}
          </p>
        )}
        {error === "oauth" && (
          <p className="mt-6 text-sm text-red-600">
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
