import { createClient } from "@/lib/supabase/server";

// Helper: Supabase's select parser infers join relations as arrays without
// Database-typed generics. This cast treats each row as a generic record so
// the explicit .map() transformations below can access properties freely.
type DbRow = Record<string, unknown>;
function asRows(data: unknown): DbRow[] {
  return (data ?? []) as DbRow[];
}

export type Task = {
  id: string;
  title: string;
  client_id: string | null;
  description: string | null;
  status: "מחכה לטיפול" | "נכנס לעבודה" | "בעבודה" | "אישור לקוח" | "בוצע";
  start_date: string;
  due_date: string | null;
  created_by_id: string | null;
  source: "web" | "telegram" | "whatsapp" | "import";
  completed_at: string | null;
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
  logo_url: string | null;
  logo_storage_path: string | null;
  brief: string | null;
  onboarding_status: "בתהליך קליטה" | "באוויר" | "בהשהייה" | null;
  onboarding_date: string | null;
  competitors: string | null;
  target_audience: string | null;
  core_message: string | null;
  campaign_goal: string | null;
  differentiation: string | null;
  digital_assets: string[];
  previous_campaigns: string[];
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
  whatsapp_phone?: string | null;
  avatar_url?: string | null;
  notify_email?: boolean;
  notify_whatsapp?: boolean;
};

export type Tag = {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
};

export type TaskWithRelations = Task & {
  client: { id: string; name: string } | null;
  assignees: { id: string; full_name: string; avatar_url?: string | null }[];
  watchers: { id: string; full_name: string; avatar_url?: string | null }[];
  creator: { id: string; full_name: string; avatar_url?: string | null } | null;
  tags: Tag[];
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
      "id,title,client_id,description,status,start_date,due_date,created_by_id,source,completed_at,created_at,updated_at,client:clients(id,name),assignees:task_assignees(member:team_members(id,full_name,avatar_url)),watchers:task_watchers(member:team_members(id,full_name,avatar_url)),creator:team_members!tasks_created_by_id_fkey(id,full_name,avatar_url),task_tags(tag:tags(id,name,color,created_at))",
    )
    .order("due_date", { ascending: true, nullsFirst: false });

  if (filters?.status) {
    const statuses = filters.status.split(",");
    q = statuses.length > 1 ? q.in("status", statuses) : q.eq("status", filters.status);
  }
  if (filters?.clientId === "__general__") {
    q = q.is("client_id", null);
  } else if (filters?.clientId) {
    q = q.eq("client_id", filters.clientId);
  }
  if (filters?.overdue) {
    const today = new Date().toISOString().slice(0, 10);
    q = q.in("status", ["מחכה לטיפול", "נכנס לעבודה", "בעבודה"]).lt("due_date", today);
  }

  const { data, error } = await q;
  if (error) throw error;

  const rows = asRows(data).map((row) => {
    const assigneeList = (row.assignees ?? []) as { member?: { id: string; full_name: string; avatar_url?: string | null } | null }[];
    const watcherList = (row.watchers ?? []) as { member?: { id: string; full_name: string; avatar_url?: string | null } | null }[];
    const tagList = (row.task_tags ?? []) as { tag?: { id: string; name: string; color: string; created_at: string } | null }[];
    return {
      id: row.id as string,
      title: row.title as string,
      client_id: row.client_id as string | null,
      description: row.description as string | null,
      status: row.status as string,
      start_date: row.start_date as string | null,
      due_date: row.due_date as string | null,
      created_by_id: row.created_by_id as string | null,
      source: row.source as string | null,
      completed_at: (row.completed_at as string | null) ?? null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      client: (row.client as { id: string; name: string } | null) ?? null,
      assignees: assigneeList.map((a) => a.member).filter(Boolean) as { id: string; full_name: string; avatar_url?: string | null }[],
      watchers: watcherList.map((w) => w.member).filter(Boolean) as { id: string; full_name: string; avatar_url?: string | null }[],
      creator: (row.creator as { id: string; full_name: string; avatar_url?: string | null } | null) ?? null,
      tags: tagList.map((tt) => tt.tag).filter(Boolean) as Tag[],
    };
  }) as TaskWithRelations[];

  if (filters?.assigneeId) {
    return rows.filter((t) =>
      t.assignees.some((a) => a.id === filters.assigneeId) ||
      t.watchers.some((w) => w.id === filters.assigneeId),
    );
  }
  return rows;
}

const CLIENT_COLS =
  "id,name,contact_name,account_manager_id,phone,email,website_url,budget_note,drive_url,facebook_ads_url,google_ads_url,cms_url,analytics_url,health,logo_url,logo_storage_path,brief,onboarding_status,onboarding_date,competitors,target_audience,core_message,campaign_goal,differentiation,digital_assets,previous_campaigns";

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
  return asRows(data).map((c) => ({
    ...(c as unknown as Client),
    manager_name: (c.manager as { full_name?: string } | null)?.full_name ?? null,
  }));
}

export async function getCampaignsByClient(clientId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from("campaigns")
    .select("id,name,platform,status,start_date,spent,external_campaign_id,created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error('[getCampaignsByClient] failed:', error);
    throw error;
  }
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

  const { data, error } = await q;
  if (error) {
    console.error('[getAttachments] failed:', error);
    throw error;
  }
  return asRows(data).map((a) => ({
    id: a.id as string,
    file_name: a.file_name as string,
    file_size: (a.file_size as number | null) ?? null,
    content_type: (a.content_type as string | null) ?? null,
    storage_path: a.storage_path as string,
    client_id: (a.client_id as string | null) ?? null,
    task_id: (a.task_id as string | null) ?? null,
    uploaded_by: (a.uploaded_by as string | null) ?? null,
    uploader_name: (a.uploader as { full_name?: string } | null)?.full_name ?? null,
    created_at: a.created_at as string,
  }));
}

export async function getOpenTaskCountsByClient(): Promise<Record<string, number>> {
  const sb = createClient();
  const { data, error } = await sb.rpc("get_open_task_counts_by_client");
  if (error) {
    console.error('[getOpenTaskCountsByClient] failed:', error);
    throw error;
  }
  const map: Record<string, number> = {};
  for (const row of (data ?? []) as { client_id: string; count: number }[]) {
    map[row.client_id] = row.count;
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
  if (tasksRes.error) {
    console.error('[searchAll] tasks query failed:', tasksRes.error);
    throw tasksRes.error;
  }
  if (clientsRes.error) {
    console.error('[searchAll] clients query failed:', clientsRes.error);
    throw clientsRes.error;
  }
  if (campaignsRes.error) {
    console.error('[searchAll] campaigns query failed:', campaignsRes.error);
    throw campaignsRes.error;
  }
  return {
    tasks: asRows(tasksRes.data).map((t) => ({
      id: t.id as string,
      title: t.title as string,
      client_name: (t.client as { name?: string } | null)?.name ?? null,
    })),
    clients: asRows(clientsRes.data).map((c) => ({
      id: c.id as string,
      name: c.name as string,
    })),
    campaigns: asRows(campaignsRes.data).map((c) => ({
      id: c.id as string,
      name: c.name as string,
      client_name: (c.client as { name?: string } | null)?.name ?? null,
    })),
  };
}

export async function getTasksByClient(clientId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from("tasks")
    .select("id,title,status,due_date")
    .eq("client_id", clientId)
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) {
    console.error('[getTasksByClient] failed:', error);
    throw error;
  }
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
    .select("id,full_name,role,email,active,whatsapp_phone,avatar_url")
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
  watching: number;
};

export async function getDashboardCounts(memberId?: string): Promise<DashboardCounts> {
  const sb = createClient();
  const today = new Date().toISOString().slice(0, 10);

  // Watching count is always scoped to the member (0 when no member given).
  const watching = memberId ? await getWatchingCount(memberId) : 0;

  // When scoped to a member, first resolve the task ids assigned to them.
  let taskIds: string[] | null = null;
  if (memberId) {
    const { data: assigneeRows, error: assigneeError } = await sb
      .from("task_assignees")
      .select("task_id")
      .eq("member_id", memberId);
    if (assigneeError) {
      console.error('[getDashboardCounts] assignee query failed:', assigneeError);
      throw assigneeError;
    }
    taskIds = (assigneeRows ?? []).map((r: { task_id: string }) => r.task_id);
    // Member has no assigned tasks — return zeros (but keep watching count).
    if (taskIds.length === 0) {
      return { incoming: 0, working: 0, awaitingApproval: 0, overdueTasks: 0, watching };
    }
  }

  // Build count queries, optionally scoped to the member's task ids.
  const qBase = () => {
    const q = sb.from("tasks").select("*", { count: "exact", head: true });
    return taskIds ? q.in("id", taskIds) : q;
  };

  const [incoming, working, approval, overdue] = await Promise.all([
    qBase().eq("status", "מחכה לטיפול"),
    qBase().in("status", ["נכנס לעבודה", "בעבודה"]),
    qBase().eq("status", "אישור לקוח"),
    qBase()
      .in("status", ["מחכה לטיפול", "נכנס לעבודה", "בעבודה", "אישור לקוח"])
      .lt("due_date", today),
  ]);
  if (incoming.error) { console.error('[getDashboardCounts] incoming query failed:', incoming.error); throw incoming.error; }
  if (working.error) { console.error('[getDashboardCounts] working query failed:', working.error); throw working.error; }
  if (approval.error) { console.error('[getDashboardCounts] approval query failed:', approval.error); throw approval.error; }
  if (overdue.error) { console.error('[getDashboardCounts] overdue query failed:', overdue.error); throw overdue.error; }

  return {
    incoming: incoming.count ?? 0,
    working: working.count ?? 0,
    awaitingApproval: approval.count ?? 0,
    overdueTasks: overdue.count ?? 0,
    watching,
  };
}

// Count of open tasks the member watches (excludes done).
export async function getWatchingCount(memberId: string): Promise<number> {
  const sb = createClient();
  const { data: watchRows, error: watchError } = await sb
    .from("task_watchers")
    .select("task_id")
    .eq("member_id", memberId);
  if (watchError) {
    console.error('[getWatchingCount] watchers query failed:', watchError);
    throw watchError;
  }
  const taskIds = (watchRows ?? []).map((r: { task_id: string }) => r.task_id);
  if (taskIds.length === 0) return 0;
  const { count, error: countError } = await sb
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .in("id", taskIds)
    .in("status", ["מחכה לטיפול", "נכנס לעבודה", "בעבודה", "אישור לקוח"]);
  if (countError) {
    console.error('[getWatchingCount] count query failed:', countError);
    throw countError;
  }
  return count ?? 0;
}

// Open tasks a member watches — same shape as getMyTasks (for dashboard lists).
export async function getWatchedTasks(memberId: string) {
  const sb = createClient();

  const { data: watchRows, error: watchError } = await sb
    .from("task_watchers")
    .select("task_id")
    .eq("member_id", memberId);
  if (watchError) {
    console.error('[getWatchedTasks] watchers query failed:', watchError);
    throw watchError;
  }
  const taskIds = (watchRows ?? []).map((r: { task_id: string }) => r.task_id);
  if (taskIds.length === 0) return [];

  const { data, error } = await sb
    .from("tasks")
    .select("id,title,status,due_date,client:clients(name)")
    .in("id", taskIds)
    .in("status", ["מחכה לטיפול", "נכנס לעבודה", "בעבודה", "אישור לקוח"])
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) {
    console.error('[getWatchedTasks] tasks query failed:', error);
    throw error;
  }

  return asRows(data).map((t) => ({
    id: t.id as string,
    title: t.title as string,
    status: t.status as string,
    due_date: t.due_date as string | null,
    client_name: (t.client as { name?: string } | null)?.name ?? null,
  }));
}

export type StatTrend = { delta: number; period: "day" | "week" };

export async function getDashboardTrends(): Promise<{
  waiting: StatTrend;
  working: StatTrend;
  approval: StatTrend;
  overdue: StatTrend;
}> {
  const sb = createClient();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).toISOString();

  const [waitNew, waitOld, workNew, workOld, apprNew, apprOld, overdueNew, overdueOld] = await Promise.all([
    sb.from("tasks").select("*", { count: "exact", head: true }).eq("status", "מחכה לטיפול"),
    sb.from("tasks").select("*", { count: "exact", head: true }).eq("status", "מחכה לטיפול").lt("created_at", startOfToday),
    sb.from("tasks").select("*", { count: "exact", head: true }).eq("status", "בעבודה"),
    sb.from("tasks").select("*", { count: "exact", head: true }).eq("status", "בעבודה").lt("updated_at", startOfWeek),
    sb.from("tasks").select("*", { count: "exact", head: true }).in("status", ["אישור לקוח"]),
    sb.from("tasks").select("*", { count: "exact", head: true }).in("status", ["אישור לקוח"]).lt("updated_at", startOfToday),
    sb.from("tasks").select("*", { count: "exact", head: true }).in("status", ["מחכה לטיפול", "נכנס לעבודה", "בעבודה"]).lt("due_date", now.toISOString().slice(0, 10)),
    sb.from("tasks").select("*", { count: "exact", head: true }).in("status", ["מחכה לטיפול", "נכנס לעבודה", "בעבודה"]).lt("due_date", now.toISOString().slice(0, 10)).lt("updated_at", startOfWeek),
  ]);
  if (waitNew.error) { console.error('[getDashboardTrends] waitNew query failed:', waitNew.error); throw waitNew.error; }
  if (waitOld.error) { console.error('[getDashboardTrends] waitOld query failed:', waitOld.error); throw waitOld.error; }
  if (workNew.error) { console.error('[getDashboardTrends] workNew query failed:', workNew.error); throw workNew.error; }
  if (workOld.error) { console.error('[getDashboardTrends] workOld query failed:', workOld.error); throw workOld.error; }
  if (apprNew.error) { console.error('[getDashboardTrends] apprNew query failed:', apprNew.error); throw apprNew.error; }
  if (apprOld.error) { console.error('[getDashboardTrends] apprOld query failed:', apprOld.error); throw apprOld.error; }
  if (overdueNew.error) { console.error('[getDashboardTrends] overdueNew query failed:', overdueNew.error); throw overdueNew.error; }
  if (overdueOld.error) { console.error('[getDashboardTrends] overdueOld query failed:', overdueOld.error); throw overdueOld.error; }

  return {
    waiting: { delta: (waitNew.count ?? 0) - (waitOld.count ?? 0), period: "day" },
    working: { delta: (workNew.count ?? 0) - (workOld.count ?? 0), period: "week" },
    approval: { delta: (apprNew.count ?? 0) - (apprOld.count ?? 0), period: "day" },
    overdue: { delta: (overdueNew.count ?? 0) - (overdueOld.count ?? 0), period: "week" },
  };
}

export type SourceCounts = { whatsapp: number; web: number; import: number; total: number };

export async function getWeeklySourceCounts(): Promise<SourceCounts> {
  const sb = createClient();
  const { data, error } = await sb.rpc("get_weekly_source_counts");
  if (error) {
    console.error('[getWeeklySourceCounts] failed:', error);
    throw error;
  }
  const counts: SourceCounts = { whatsapp: 0, web: 0, import: 0, total: 0 };
  for (const row of (data ?? []) as { source: string; count: number }[]) {
    if (row.source === "whatsapp") counts.whatsapp += row.count;
    else if (row.source === "web") counts.web += row.count;
    else counts.import += row.count;
    counts.total += row.count;
  }
  return counts;
}

export async function getRecentTasks(limit = 5) {
  const sb = createClient();
  const { data, error } = await sb
    .from("tasks")
    .select("id,title,status,due_date,client:clients(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[getRecentTasks] failed:', error);
    throw error;
  }
  return asRows(data).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    status: r.status as string,
    due_date: r.due_date as string | null,
    client: (r.client as { name?: string } | null) ?? null,
  }));
}

export async function getRecentTasksDetailed(limit = 5) {
  const sb = createClient();
  const { data, error } = await sb
    .from("tasks")
    .select(
      "id,title,status,due_date,source,created_at,client:clients(name),assignees:task_assignees(member:team_members(full_name)),creator:team_members!tasks_created_by_id_fkey(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[getRecentTasksDetailed] failed:', error);
    throw error;
  }
  return asRows(data).map((r) => {
    const client = r.client as { name?: string } | null;
    const creator = r.creator as { full_name?: string } | null;
    const assigneeList = (r.assignees ?? []) as { member?: { full_name?: string } | null }[];
    return {
      id: r.id as string,
      title: r.title as string,
      status: r.status as string,
      due_date: r.due_date as string | null,
      source: r.source as string,
      created_at: r.created_at as string,
      client_name: client?.name ?? null,
      created_by:
        creator?.full_name ??
        assigneeList[0]?.member?.full_name ?? null,
    };
  });
}

export type ActivityItem =
  | {
      type: "task_created";
      id: string;
      task_id: string;
      task_title: string;
      source: string;
      created_at: string;
      user_name: string | null;
      user_avatar_url: string | null;
    }
  | {
      type: "comment";
      id: string;
      comment_id: string;
      task_id: string;
      task_title: string;
      content: string;
      created_at: string;
      user_name: string | null;
      user_avatar_url: string | null;
    };

export async function getRecentActivity(limit = 50): Promise<ActivityItem[]> {
  const sb = createClient();

  const [tasksRes, commentsRes] = await Promise.all([
    sb
      .from("tasks")
      .select(
        "id,title,source,created_at,creator:team_members!tasks_created_by_id_fkey(full_name,avatar_url)",
      )
      .order("created_at", { ascending: false })
      .limit(limit),
    sb
      .from("task_comments")
      .select(
        "id,content,created_at,task_id,author:team_members!task_comments_author_id_fkey(full_name,avatar_url),task:tasks!task_comments_task_id_fkey(id,title)",
      )
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);
  if (tasksRes.error) {
    console.error('[getRecentActivity] tasks query failed:', tasksRes.error);
    throw tasksRes.error;
  }
  if (commentsRes.error) {
    console.error('[getRecentActivity] comments query failed:', commentsRes.error);
    throw commentsRes.error;
  }

  const taskItems: ActivityItem[] = asRows(tasksRes.data).map((r) => {
    const creator = r.creator as { full_name?: string; avatar_url?: string | null } | null;
    return {
      type: "task_created" as const,
      id: `task-${r.id}`,
      task_id: r.id as string,
      task_title: r.title as string,
      source: r.source as string,
      created_at: r.created_at as string,
      user_name: creator?.full_name ?? null,
      user_avatar_url: creator?.avatar_url ?? null,
    };
  });

  const commentItems: ActivityItem[] = asRows(commentsRes.data).map((r) => {
    const author = r.author as { full_name?: string; avatar_url?: string | null } | null;
    const task = r.task as { id?: string; title?: string } | null;
    return {
      type: "comment" as const,
      id: `comment-${r.id}`,
      comment_id: r.id as string,
      task_id: task?.id ?? (r.task_id as string),
      task_title: task?.title ?? "משימה",
      content: r.content as string,
      created_at: r.created_at as string,
      user_name: author?.full_name ?? null,
      user_avatar_url: author?.avatar_url ?? null,
    };
  });

  return [...taskItems, ...commentItems]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

export async function getMyTasks(userEmail: string) {
  const sb = createClient();

  // Find team member by email
  const { data: member, error: memberError } = await sb
    .from("team_members")
    .select("id")
    .eq("email", userEmail)
    .maybeSingle();
  if (memberError) {
    console.error('[getMyTasks] member query failed:', memberError);
    throw memberError;
  }

  if (!member) return [];

  // Filter at DB level via inner join on task_assignees
  const { data: assignedRows, error: assignError } = await sb
    .from("task_assignees")
    .select("task:tasks!inner(id,title,status,due_date,client:clients(name))")
    .eq("member_id", member.id);
  if (assignError) {
    console.error('[getMyTasks] assigned tasks query failed:', assignError);
    throw assignError;
  }

  const openStatuses = new Set(["מחכה לטיפול", "נכנס לעבודה", "בעבודה", "אישור לקוח"]);
  return asRows(assignedRows)
    .map((r) => {
      const task = r.task as { id?: string; title?: string; status?: string; due_date?: string | null; client?: { name?: string } | null } | null;
      return task;
    })
    .filter((t): t is NonNullable<typeof t> => !!t && openStatuses.has(t.status ?? ""))
    .map((t) => ({
      id: t.id as string,
      title: t.title as string,
      status: t.status as string,
      due_date: (t.due_date as string | null) ?? null,
      client_name: t.client?.name ?? null,
    }))
    .sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    });
}

export async function getTaskComments(taskId: string) {
  const sb = createClient();
  const { data, error } = await sb
    .from("task_comments")
    .select("id,content,mentions,created_at,author:team_members!task_comments_author_id_fkey(id,full_name,avatar_url)")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error('[getTaskComments] failed:', error);
    throw error;
  }
  return asRows(data).map((c) => {
    const author = c.author as { id?: string; full_name?: string; avatar_url?: string | null } | null;
    return {
      id: c.id as string,
      content: c.content as string,
      mentions: (c.mentions ?? []) as string[],
      created_at: c.created_at as string,
      author_id: author?.id ?? null,
      author_name: author?.full_name ?? null,
      author_avatar_url: author?.avatar_url ?? null,
    };
  });
}

export async function getCommentCountsByTask(): Promise<Record<string, number>> {
  const sb = createClient();
  // Use RPC with GROUP BY in PostgreSQL instead of pulling all rows into JS
  // Pass a sentinel empty array — the RPC counts all when task_ids is empty
  // We select all distinct task_ids first as the filter
  const { data: taskIdRows, error: tErr } = await sb
    .from("tasks")
    .select("id");
  if (tErr) {
    console.error('[getCommentCountsByTask] task_ids query failed:', tErr);
    throw tErr;
  }
  const ids = (taskIdRows ?? []).map((r: { id: string }) => r.id);
  if (ids.length === 0) return {};

  const { data, error } = await sb.rpc("get_comment_counts_by_tasks", {
    task_ids: ids,
  });
  if (error) {
    console.error('[getCommentCountsByTask] failed:', error);
    throw error;
  }
  const map: Record<string, number> = {};
  for (const row of (data ?? []) as { task_id: string; count: number }[]) {
    map[row.task_id] = row.count;
  }
  return map;
}

export async function getClientsWithOpenTaskCounts(): Promise<
  { id: string; name: string; health: string | null; logo_url: string | null; logo_storage_path: string | null; open_count: number }[]
> {
  const sb = createClient();
  const [clientsRes, countsData] = await Promise.all([
    sb.from("clients").select("id,name,health,logo_url,logo_storage_path").order("name"),
    sb.rpc("get_open_task_counts_by_client"),
  ]);
  if (clientsRes.error) {
    console.error('[getClientsWithOpenTaskCounts] clients query failed:', clientsRes.error);
    throw clientsRes.error;
  }
  if (countsData.error) {
    console.error('[getClientsWithOpenTaskCounts] counts RPC failed:', countsData.error);
    throw countsData.error;
  }
  const counts: Record<string, number> = {};
  for (const row of (countsData.data ?? []) as { client_id: string; count: number }[]) {
    counts[row.client_id] = row.count;
  }
  return (clientsRes.data ?? [])
    .map((c) => ({
      id: c.id,
      name: c.name,
      health: c.health ?? null,
      logo_url: c.logo_url ?? null,
      logo_storage_path: c.logo_storage_path ?? null,
      open_count: counts[c.id] ?? 0,
    }))
    .filter((c) => c.open_count > 0)
    .sort((a, b) => b.open_count - a.open_count);
}

export async function getTags(): Promise<Tag[]> {
  const sb = createClient();
  const { data, error } = await sb
    .from("tags")
    .select("id,name,color,created_at")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Tag[];
}

export async function getCriticalClients() {
  const sb = createClient();
  const { data, error } = await sb
    .from("clients")
    .select("id,name,health,manager:team_members!clients_account_manager_id_fkey(full_name)")
    .eq("health", "קריטי")
    .order("name");
  if (error) {
    console.error('[getCriticalClients] failed:', error);
    throw error;
  }
  return asRows(data).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    health: r.health as string,
    manager: (r.manager as { full_name: string } | null) ?? null,
  }));
}
