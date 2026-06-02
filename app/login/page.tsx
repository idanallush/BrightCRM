"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { BRIGHT_DOMAIN } from "@/lib/utils";
import { Logo } from "@/components/logo";

function LoginInner() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  async function signIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { hd: BRIGHT_DOMAIN, prompt: "select_account" } },
    });
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-8 text-center shadow-elevation-3">
        <div className="mb-2 flex items-center justify-center">
          <Logo size="lg" dark={false} />
        </div>
        <p className="mb-8 text-body-sm text-ink-secondary">התחברות עם חשבון Google של Bright</p>
        <button type="button" onClick={signIn} className="w-full rounded-full bg-accent py-3 text-button text-ink transition-[color,background-color,transform] duration-150 hover:bg-accent/85 active:scale-[0.97]">
          התחברות עם Google
        </button>
        {error === "domain" && <p className="mt-6 text-body-sm text-overdue">התחברות מותרת רק לחשבונות {`@${BRIGHT_DOMAIN}`}</p>}
        {error === "oauth" && <p className="mt-6 text-body-sm text-overdue">ההתחברות נכשלה. נסה שוב.</p>}
      </div>
    </main>
  );
}

export default function LoginPage() { return <Suspense><LoginInner /></Suspense>; }
