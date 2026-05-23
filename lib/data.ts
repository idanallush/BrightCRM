import { createClient } from "@/lib/supabase/server";

export type Task = {
  id: string;
  title: string;
  client_id: string;
  description: string | null;
  status: "מחכה לטיפול" | "נכנס לעבודה" | "בעבודה" | "אישור לקוח" | "אישור מנהל" | "בוצע" | "בוטל";
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
  budget_note: string | null;
  drive_url: string | null;
  facebook_ads_url: string | null;
  google_ads_url: string | null;
  cms_url: string | null;
  analytics_url: string | null;
  health: "בריא" | "אסטרטגיה צריכה" | "קריטי" | null;
};

export type Campaign = {
  id: string;
  name: string;
  client_id: string | null;
  platform: "google" | "facebook" | "tiktok";
  status: "פעיל" | "הסתיים" | "בעבודה" | "מושהה" | null;
  start_date: string | null;
  spent: number | null;
  external_campaign_id: string | null;
  created_at: string;
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
  overdue?: boolean;
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
  if (filters?.overdue) {
    const today = new Date().toISOString().slice(0, 10);
    q = q.in("status", ["מחכה לטיפול", "נכנס לעבודה", "בעבודה"]).lt("due_date", today);
  }

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

const CLIENT_COLS =
  "id,name,contact_name,account_manager_id,phone,email,website_url,budget_note,drive_url,facebook_ads_url,google_ads_url,cms_url,analytics_url,health";

export async function getClients(): Promise<Client[]> {
  const sb = createClient();
  const { data, error } = await sb.from("clients").select(CLIENT_COLS).order("name");
  if (error) throw error;
  return (data ?? []) as unknown as Client[];
}

export async function getClient(id: string): Promise<Client | null> {
  const sb = createClient();
  const { data, error } = await sb
    .from("clients")
    .select(CLIENT_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as Client | null) ?? null;
}

export async function getClientsWithManager(): Promise<
  (Client & { manager_name: string | null })[]
> {
  const sb = createClient();
  const { data, error } = await sb
    .from("clients")
    .select(
      `${CLIENT_COLS},manager:team_members!clients_account_manager_id_fkey(full_name)`,
    )
    .order("name");
  if (error) throw error;
  return ((data ?? []) as any[]).map((c) => ({
    ...(c as Client),
    manager_name: (c.manager?.full_name as string | undefined) ?? null,
  }));
}

export async function getCampaignsByClient(clientId: string) {
  const sb = createClient();
  const { data } = await sb
    .from("campaigns")
    .select("id,name,platform,status,start_date,spent,external_campaign_id,created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Omit<Campaign, "client_id">[];
}

export async function getAttachmentsForClient(clientId: string) {
  return getAttachments({ clientId });
}

export async function getAttachmentsForTask(taskId: string) {
  return getAttachments({ taskId });
}

async function getAttachments(scope: { clientId?: string; taskId?: string }) {
  const sb = createClient();
  let q = sb
    .from("attachments")
    .select(
      "id,file_name,file_size,content_type,storage_path,client_id,task_id,uploaded_by,created_at,uploader:team_members!attachments_uploaded_by_fkey(full_name)",
    )
    .order("created_at", { ascending: false });
  if (scope.clientId) q = q.eq("client_id", scope.clientId);
  if (scope.taskId) q = q.eq("task_id", scope.taskId);

  const { data } = await q;
  return ((data ?? []) as any[]).map((a) => ({
    id: a.id as string,
    file_name: a.file_name as string,
    file_size: (a.file_size as number | null) ?? null,
    content_type: (a.content_type as string | null) ?? null,
    storage_path: a.storage_path as string,
    client_id: (a.client_id as string | null) ?? null,
    task_id: (a.task_id as string | null) ?? null,
    uploaded_by: (a.uploaded_by as string | null) ?? null,
    uploader_name: (a.uploader?.full_name as string | undefined) ?? null,
    created_at: a.created_at as string,
  }));
}

export async function getOpenTaskCountsByClient(): Promise<Record<string, number>> {
  const sb = createClient();
  const { data } = await sb
    .from("tasks")
    .select("client_id")
    .in("status", ["מחכה לטיפול", "נכנס לעבודה", "בעבודה", "אישור לקוח", "אישור מנהל"]);
  const map: Record<string, number> = {};
  for (const row of (data ?? []) as { client_id: string }[]) {
    map[row.client_id] = (map[row.client_id] ?? 0) + 1;
  }
  return map;
}

export type SearchResults = {
  tasks: { id: string; title: string; client_name: string | null }[];
  clients: { id: string; name: string }[];
  campaigns: { id: string; name: string; client_name: string | null }[];
};

export async function searchAll(query: string): Promise<SearchResults> {
  const q = query.trim();
  if (q.length < 2) return { tasks: [], clients: [], campaigns: [] };
  const sb = createClient();
  const like = `%${q}%`;
  const [tasksRes, clientsRes, campaignsRes] = await Promise.all([
    sb
      .from("tasks")
      .select("id,title,client:clients(name)")
      .or(`title.ilike.${like},description.ilike.${like}`)
      .limit(5),
    sb
      .from("clients")
      .select("id,name")
      .or(`name.ilike.${like},contact_name.ilike.${like}`)
      .order("name")
      .limit(5),
    sb
      .from("campaigns")
      .select("id,name,client:clients(name)")
      .ilike("name", like)
      .limit(5),
  ]);
  return {
    tasks: ((tasksRes.data ?? []) as any[]).map((t) => ({
      id: t.id as string,
      title: t.title as string,
      client_name: (t.client?.name as string | undefined) ?? null,
    })),
    clients: ((clientsRes.data ?? []) as any[]).map((c) => ({
      id: c.id as string,
      name: c.name as string,
    })),
    campaigns: ((campaignsRes.data ?? []) as any[]).map((c) => ({
      id: c.id as string,
      name: c.name as string,
      client_name: (c.client?.name as string | undefined) ?? null,
    })),
  };
}

export async function getTasksByClient(clientId: string) {
  const sb = createClient();
  const { data } = await sb
    .from("tasks")
    .select("id,title,status,due_date")
    .eq("client_id", clientId)
    .order("due_date", { ascending: true, nullsFirst: false });
  return (data ?? []) as {
    id: string;
    title: string;
    status: string;
    due_date: string | null;
  }[];
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
  incoming: number;
  working: number;
  awaitingApproval: number;
  overdueTasks: number;
};

export async function getDashboardCounts(dateFrom?: string): Promise<DashboardCounts> {
  const sb = createClient();
  const today = new Date().toISOString().slice(0, 10);

  let incomingQ = sb.from("tasks").select("*", { count: "exact", head: true }).eq("status", "נכנס לעבודה");
  let workingQ = sb.from("tasks").select("*", { count: "exact", head: true }).eq("status", "בעבודה");
  let approvalQ = sb.from("tasks").select("*", { count: "exact", head: true }).in("status", ["אישור לקוח", "אישור מנהל"]);

  if (dateFrom) {
    incomingQ = incomingQ.gte("created_at", dateFrom);
    workingQ = workingQ.gte("created_at", dateFrom);
    approvalQ = approvalQ.gte("created_at", dateFrom);
  }

  // Overdue always shows current state (not filtered by date)
  const overdueQ = sb.from("tasks").select("*", { count: "exact", head: true })
    .in("status", ["מחכה לטיפול", "נכנס לעבודה", "בעבודה"])
    .lt("due_date", today);

  const [incoming, working, approval, overdue] = await Promise.all([
    incomingQ, workingQ, approvalQ, overdueQ,
  ]);

  return {
    incoming: incoming.count ?? 0,
    working: working.count ?? 0,
    awaitingApproval: approval.count ?? 0,
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

export async function getRecentTasksDetailed(limit = 5) {
  const sb = createClient();
  const { data } = await sb
    .from("tasks")
    .select(
      "id,title,status,due_date,source,created_at,client:clients(name),assignees:task_assignees(member:team_members(full_name))",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    status: r.status as string,
    due_date: r.due_date as string | null,
    source: r.source as string,
    created_at: r.created_at as string,
    client_name: (r.client?.name as string | undefined) ?? null,
    created_by:
      (r.assignees?.[0]?.member?.full_name as string | undefined) ?? null,
  }));
}

export async function getMyTasks(userEmail: string) {
  const sb = createClient();

  // Find team member by email
  const { data: member } = await sb
    .from("team_members")
    .select("id")
    .eq("email", userEmail)
    .maybeSingle();

  if (!member) return [];

  const { data } = await sb
    .from("tasks")
    .select(
      "id,title,status,due_date,client:clients(name),assignees:task_assignees(member:team_members(id))",
    )
    .in("status", ["מחכה לטיפול", "נכנס לעבודה", "בעבודה", "אישור לקוח", "אישור מנהל"])
    .order("due_date", { ascending: true, nullsFirst: false });

  // Filter to only tasks assigned to this member
  return ((data ?? []) as any[])
    .filter((t: any) =>
      (t.assignees ?? []).some((a: any) => a.member?.id === member.id),
    )
    .map((t: any) => ({
      id: t.id as string,
      title: t.title as string,
      status: t.status as string,
      due_date: t.due_date as string | null,
      client_name: (t.client?.name as string | undefined) ?? null,
    }));
}

export async function getTaskComments(taskId: string) {
  const sb = createClient();
  const { data } = await sb
    .from("task_comments")
    .select("id,content,mentions,created_at,author:team_members!task_comments_author_id_fkey(id,full_name)")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  return ((data ?? []) as any[]).map((c) => ({
    id: c.id as string,
    content: c.content as string,
    mentions: (c.mentions ?? []) as string[],
    created_at: c.created_at as string,
    author_id: (c.author?.id as string | undefined) ?? null,
    author_name: (c.author?.full_name as string | undefined) ?? null,
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
