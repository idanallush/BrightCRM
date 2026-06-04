import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isBrightEmail } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { ShellProvider } from "./shell-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { QuickAdd } from "@/components/quick-add";
import { MobileNav } from "@/components/mobile-nav";
import { FeedbackButton } from "@/components/feedback-button";
import { AppShellContent } from "./app-shell-content";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user || !isBrightEmail(user.email)) {
    redirect("/login");
  }

  const { data: member } = await sb
    .from("team_members")
    .select("full_name, avatar_url")
    .eq("email", user.email)
    .maybeSingle();

  const userLabel = member?.full_name || user.user_metadata?.full_name || user.email || "";
  const userAvatarUrl = member?.avatar_url ?? null;

  return (
    <ShellProvider>
      <TooltipProvider delayDuration={200} skipDelayDuration={300}>
        <div className="min-h-screen bg-surface">
          <Sidebar userLabel={userLabel} userAvatarUrl={userAvatarUrl} />
          <AppShellContent>
            <Header />
            <main className="mx-auto w-full max-w-7xl flex-1 p-4 pb-20 md:p-6 md:pb-6">
              {children}
            </main>
          </AppShellContent>
          <QuickAdd />
          <FeedbackButton />
          <MobileNav />
          <Toaster />
        </div>
      </TooltipProvider>
    </ShellProvider>
  );
}
