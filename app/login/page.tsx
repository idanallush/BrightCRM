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
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { hd: BRIGHT_DOMAIN, prompt: "select_account" } },
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6">
      <div className="w-full max-w-sm rounded-lg border border-hairline bg-canvas p-8 text-center shadow-card">
        <div className="mb-2 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-body-md font-bold text-white">B</span>
          <h1 className="text-heading-4 text-ink">Bright<span className="text-accent">.</span>CRM</h1>
        </div>
        <p className="mb-8 text-body-sm text-slate">התחברות עם חשבון Google של Bright</p>
        <button type="button" onClick={signIn}
          className="w-full rounded-md bg-primary py-3 text-button font-medium text-white shadow-subtle transition-all duration-150 hover:bg-primary-pressed active:scale-[0.97]">
          התחברות עם Google
        </button>
        {error === "domain" && <p className="mt-6 text-body-sm text-overdue">התחברות מותרת רק לחשבונות {`@${BRIGHT_DOMAIN}`}</p>}
        {error === "oauth" && <p className="mt-6 text-body-sm text-overdue">ההתחברות נכשלה. נסה שוב.</p>}
      </div>
    </main>
  );
}

export default function LoginPage() { return <Suspense><LoginInner /></Suspense>; }
