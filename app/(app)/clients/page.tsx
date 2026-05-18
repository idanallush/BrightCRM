import { getClientsWithManager, getTeam } from "@/lib/data";
import { ClientsClient } from "./clients-client";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const [clients, team] = await Promise.all([getClientsWithManager(), getTeam()]);
  return <ClientsClient clients={clients} team={team} />;
}
