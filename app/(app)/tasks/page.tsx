import { getClients, getTasks, getTeam } from "@/lib/data";
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

  const [tasks, clients, team] = await Promise.all([
    getTasks({ status, clientId, assigneeId, overdue }),
    getClients(),
    getTeam(),
  ]);

  return (
    <TasksClient
      tasks={tasks}
      clients={clients}
      team={team}
      initialFilters={{
        status: status ?? "__all__",
        clientId: clientId ?? "__all__",
        assigneeId: assigneeId ?? "__all__",
        overdue,
      }}
      initialOpenTaskId={searchParams.task ?? null}
    />
  );
}
