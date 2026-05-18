import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isBrightEmail } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { Toaster } from "@/components/ui/toaster";
import { QuickAdd } from "@/components/quick-add";

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
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header userLabel={userLabel} />
        <main className="flex-1 overflow-x-auto p-5 md:p-8">{children}</main>
      </div>
      <QuickAdd />
      <Toaster />
    </div>
  );
}
