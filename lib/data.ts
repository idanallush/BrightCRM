import { createClient } from "@/lib/supabase/server";

export type Task = {
  id: string;
  title: string;
  client_id: string;
  description: string | null;
  status: "בעבודה" | "בוצע" | "סגור";
  start_date: string;
  due_date: string | null;
  created_by_id: string | null;
  source: "web" | "telegram" | "import";
  created_at: string;
  updated_at: string;
};

export type Client = {
  id: string;
  name: string;
  contact_name: string | null;
  account_manager_id: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  health: "בריא" | "אסטרטגיה צריכה" | "קריטי" | null;
};

export type TeamMember = {
  id: string;
  full_name: string;
  role: string | null;
  email: string;
  active: boolean;
};

export type TaskWithRelations = Task & {
  client: { id: string; name: string } | null;
  assignees: { id: string; full_name: string }[];
};

export async function getTasks(filters?: {
  status?: string;
  clientId?: string;
  assigneeId?: string;
}): Promise<TaskWithRelations[]> {
  const sb = createClient();
  let q = sb
    .from("tasks")
    .select(
      "id,title,client_id,description,status,start_date,due_date,created_by_id,source,created_at,updated_at,client:clients(id,name),assignees:task_assignees(member:team_members(id,full_name))",
    )
    .order("due_date", { ascending: true, nullsFirst: false });

  if (filters?.status) q = q.eq("status", filters.status);
  if (filters?.clientId) q = q.eq("client_id", filters.clientId);

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []).map((row: any) => ({
    ...row,
    client: row.client ?? null,
    assignees: (row.assignees ?? []).map((a: any) => a.member).filter(Boolean),
  })) as TaskWithRelations[];

  if (filters?.assigneeId) {
    return rows.filter((t) =>
      t.assignees.some((a) => a.id === filters.assigneeId),
    );
  }
  return rows;
}

export async function getClients(): Promise<Client[]> {
  const sb = createClient();
  const { data, error } = await sb
    .from("clients")
    .select("id,name,contact_name,account_manager_id,phone,email,website_url,health")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Client[];
}

export async function getTeam(): Promise<TeamMember[]> {
  const sb = createClient();
  const { data, error } = await sb
    .from("team_members")
    .select("id,full_name,role,email,active")
    .eq("active", true)
    .order("full_name");
  if (error) throw error;
  return (data ?? []) as TeamMember[];
}

export type DashboardCounts = {
  openTasks: number;
  totalClients: number;
  activeCampaigns: number;
  overdueTasks: number;
};

export async function getDashboardCounts(): Promise<DashboardCounts> {
  const sb = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [open, clients, campaigns, overdue] = await Promise.all([
    sb.from("tasks").select("*", { count: "exact", head: true }).eq("status", "בעבודה"),
    sb.from("clients").select("*", { count: "exact", head: true }),
    sb.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "פעיל"),
    sb.from("tasks").select("*", { count: "exact", head: true }).eq("status", "בעבודה").lt("due_date", today),
  ]);

  return {
    openTasks: open.count ?? 0,
    totalClients: clients.count ?? 0,
    activeCampaigns: campaigns.count ?? 0,
    overdueTasks: overdue.count ?? 0,
  };
}

export async function getRecentTasks(limit = 5) {
  const sb = createClient();
  const { data } = await sb
    .from("tasks")
    .select("id,title,status,due_date,client:clients(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    status: r.status as string,
    due_date: r.due_date as string | null,
    client: (r.client ?? null) as { name: string } | null,
  }));
}

export async function getCriticalClients() {
  const sb = createClient();
  const { data } = await sb
    .from("clients")
    .select("id,name,health,manager:team_members!clients_account_manager_id_fkey(full_name)")
    .eq("health", "קריטי")
    .order("name");
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    health: r.health as string,
    manager: (r.manager ?? null) as { full_name: string } | null,
  }));
}
