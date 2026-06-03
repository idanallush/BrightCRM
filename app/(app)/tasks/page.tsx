import { getClients, getCommentCountsByTask, getTags, getTasks, getTeam } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { TasksClient } from "./tasks-client";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: {
    status?: string;
    client?: string;
    assignee?: string;
    overdue?: string;
    task?: string;
  };
}) {
  const status = searchParams.status;
  const clientId = searchParams.client;
  const assigneeId = searchParams.assignee;
  const overdue = searchParams.overdue === "true";

  // Resolve current user's member ID for default filter
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  let currentMemberId: string | undefined;
  if (user?.email) {
    const { data: member } = await sb
      .from("team_members")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();
    currentMemberId = member?.id ?? undefined;
  }

  // "__all__" means show everyone's tasks (used by email links and watched task clicks)
  const effectiveAssigneeId = assigneeId === "__all__" ? undefined : (assigneeId ?? currentMemberId);

  const [tasks, clients, team, commentCounts, tags] = await Promise.all([
    getTasks({ status, clientId: clientId ?? undefined, assigneeId: effectiveAssigneeId, overdue }),
    getClients(),
    getTeam(),
    getCommentCountsByTask(),
    getTags(),
  ]);

  return (
    <TasksClient
      tasks={tasks}
      clients={clients}
      team={team}
      tags={tags}
      commentCounts={commentCounts}
      currentMemberId={currentMemberId ?? null}
      initialFilters={{
        status: status ?? "__all__",
        clientId: clientId ?? "__all__",
        assigneeId: effectiveAssigneeId ?? "__all__",
        overdue,
      }}
      initialOpenTaskId={searchParams.task ?? null}
    />
  );
}
