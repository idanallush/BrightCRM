import { createClient } from "@/lib/supabase/server";
import { AiChat } from "@/components/dashboard/ai-chat";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col md:h-[calc(100vh-5rem)]">
      <AiChat userEmail={user?.email ?? ""} fullPage />
    </div>
  );
}
