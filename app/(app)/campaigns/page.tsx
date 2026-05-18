import { createClient } from "@/lib/supabase/server";
import { getClients, type Campaign } from "@/lib/data";
import { CampaignsClient } from "./campaigns-client";

export const dynamic = "force-dynamic";

const ALL = "__all__";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: { platform?: string; status?: string; client?: string };
}) {
  const sb = createClient();
  let q = sb
    .from("campaigns")
    .select(
      "id,name,client_id,platform,status,start_date,spent,external_campaign_id,created_at,client:clients(name)",
    )
    .order("created_at", { ascending: false });

  if (searchParams.platform) q = q.eq("platform", searchParams.platform);
  if (searchParams.status) q = q.eq("status", searchParams.status);
  if (searchParams.client) q = q.eq("client_id", searchParams.client);

  const [{ data }, clients] = await Promise.all([q, getClients()]);

  const campaigns = ((data ?? []) as any[]).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    client_id: c.client_id as string | null,
    platform: c.platform as Campaign["platform"],
    status: c.status as Campaign["status"],
    start_date: c.start_date as string | null,
    spent: c.spent as number | null,
    external_campaign_id: c.external_campaign_id as string | null,
    created_at: c.created_at as string,
    client_name: (c.client?.name as string | undefined) ?? null,
  }));

  return (
    <CampaignsClient
      campaigns={campaigns}
      clients={clients}
      initial={{
        platform: searchParams.platform ?? ALL,
        status: searchParams.status ?? ALL,
        clientId: searchParams.client ?? ALL,
      }}
    />
  );
}
