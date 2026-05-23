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
      options: { redirectTo, queryParams: { hd: BRIGHT_DOMAIN, prompt: "select_account" } },
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-bg px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
        <div className="mb-2 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-base font-bold text-white shadow-sm">
            B
          </span>
          <h1 className="text-xl font-semibold text-ink">BrightCRM</h1>
        </div>
        <p className="mb-8 text-sm text-ink-secondary">התחברות עם חשבון Google של Bright</p>
        <button
          type="button"
          onClick={signIn}
          className="w-full rounded-lg bg-brand py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-brand-hover active:scale-[0.97]"
        >
          התחברות עם Google
        </button>
        {error === "domain" && (
          <p className="mt-6 text-sm text-overdue">התחברות מותרת רק לחשבונות {`@${BRIGHT_DOMAIN}`}</p>
        )}
        {error === "oauth" && (
          <p className="mt-6 text-sm text-overdue">ההתחברות נכשלה. נסה שוב.</p>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense><LoginInner /></Suspense>;
}
