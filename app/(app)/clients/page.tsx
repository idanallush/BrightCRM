import {
  getClientsWithManager,
  getOpenTaskCountsByClient,
  getTeam,
} from "@/lib/data";
import { ClientsClient } from "./clients-client";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
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
    />
  );
}
