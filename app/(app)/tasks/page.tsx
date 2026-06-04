import { Suspense } from "react";
import { getClients, getCommentCountsByTask, getTags, getTasks, getTeam } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { TasksClient } from "./tasks-client";

export const dynamic = "force-dynamic";

function TasksSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4" dir="rtl">
      <div className="flex items-center gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-24 animate-pulse rounded-xl bg-surface" />
        ))}
      </div>
      <div className="flex flex-col gap-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-surface" />
        ))}
      </div>
    </div>
  );
}

export default function TasksPage({
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
  return (
    <Suspense fallback={<TasksSkeleton />}>
      <TasksContent searchParams={searchParams} />
    </Suspense>
  );
}

async function TasksContent({
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

  let tasks: Awaited<ReturnType<typeof getTasks>> = [];
  let clients: Awaited<ReturnType<typeof getClients>> = [];
  let team: Awaited<ReturnType<typeof getTeam>> = [];
  let commentCounts: Record<string, number> = {};
  let tags: Awaited<ReturnType<typeof getTags>> = [];

  try {
    [tasks, clients, team, commentCounts, tags] = await Promise.all([
      getTasks({ status, clientId: clientId ?? undefined, assigneeId: effectiveAssigneeId, overdue }),
      getClients(),
      getTeam(),
      getCommentCountsByTask(),
      getTags(),
    ]);
  } catch (err) {
    console.error("Tasks data fetch failed:", err);
  }

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
