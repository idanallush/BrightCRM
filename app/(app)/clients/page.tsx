import { createClient } from "@/lib/supabase/server";
import {
  getClientsWithManager,
  getOpenTaskCountsByClient,
  getTeam,
} from "@/lib/data";
import { ClientsClient } from "./clients-client";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();

  // Get current user's team member ID
  const { data: member } = await sb
    .from("team_members")
    .select("id")
    .eq("email", user?.email ?? "")
    .maybeSingle();

  const [clients, team, openTaskCounts] = await Promise.all([
    getClientsWithManager(),
    getTeam(),
    getOpenTaskCountsByClient(),
  ]);

  return (
    <ClientsClient
      clients={clients}
      team={team}
      openTaskCounts={openTaskCounts}
      currentMemberId={member?.id ?? null}
    />
  );
}
