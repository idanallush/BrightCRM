import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isBrightEmail } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { ShellProvider } from "./shell-context";
import { Toaster } from "@/components/ui/toaster";
import { QuickAdd } from "@/components/quick-add";
import { MobileNav } from "@/components/mobile-nav";

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
      <div className="flex min-h-screen bg-surface-bg">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header userLabel={userLabel} />
          <main className="flex-1 overflow-x-auto p-4 pb-20 md:p-6 md:pb-6">
            {children}
          </main>
        </div>
        <QuickAdd />
        <MobileNav />
        <Toaster />
      </div>
    </ShellProvider>
  );
}
