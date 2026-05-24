import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isBrightEmail } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { ShellProvider } from "./shell-context";
import { Toaster } from "@/components/ui/toaster";
import { QuickAdd } from "@/components/quick-add";
import { MobileNav } from "@/components/mobile-nav";
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

  const userLabel = user.user_metadata?.full_name || user.email || "";

  return (
    <ShellProvider>
      <div className="min-h-screen bg-surface">
        <Sidebar userLabel={userLabel} />
        <AppShellContent>
          <Header />
          <main className="mx-auto w-full max-w-7xl flex-1 p-4 pb-20 md:p-6 md:pb-6">
            {children}
          </main>
        </AppShellContent>
        <QuickAdd />
        <MobileNav />
        <Toaster />
      </div>
    </ShellProvider>
  );
}
