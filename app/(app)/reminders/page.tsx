import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { RemindersClient } from "./reminders-client";

export const dynamic = "force-dynamic";

function RemindersSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4" dir="rtl">
      <div className="flex items-center gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-24 animate-pulse rounded-xl bg-surface" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface" />
        ))}
      </div>
    </div>
  );
}

export default function RemindersPage({
  searchParams,
}: {
  searchParams: { scope?: string };
}) {
  return (
    <Suspense fallback={<RemindersSkeleton />}>
      <RemindersContent searchParams={searchParams} />
    </Suspense>
  );
}

async function RemindersContent({
  searchParams,
}: {
  searchParams: { scope?: string };
}) {
  const sb = createClient();

  const {
    data: { user },
  } = await sb.auth.getUser();

  let currentMemberId: string | undefined;
  if (user?.email) {
    const { data: member } = await sb
      .from("team_members")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();
    currentMemberId = member?.id ?? undefined;
  }

  // Fetch reminders: user's personal + all team reminders
  let q = sb
    .from("reminders")
    .select(
      "id, title, description, reminder_date, reminder_time, scope, is_completed, created_at, updated_at, creator:team_members!reminders_created_by_id_fkey(id, full_name)",
    )
    .order("reminder_date", { ascending: true });

  // Apply scope filter from searchParams
  const scopeFilter = searchParams.scope;
  if (scopeFilter === "personal" && currentMemberId) {
    q = q.eq("scope", "personal").eq("created_by_id", currentMemberId);
  } else if (scopeFilter === "team") {
    q = q.eq("scope", "team");
  } else if (currentMemberId) {
    // Default: user's personal + all team
    q = q.or(
      `and(scope.eq.personal,created_by_id.eq.${currentMemberId}),scope.eq.team`,
    );
  } else {
    q = q.eq("scope", "team");
  }

  const { data: remindersRaw, error } = await q;

  if (error) {
    console.error("Reminders fetch failed:", error);
  }

  const reminders = ((remindersRaw ?? []) as Record<string, unknown>[]).map(
    (r) => {
      const creator = r.creator as {
        id?: string;
        full_name?: string;
      } | null;
      return {
        id: r.id as string,
        title: r.title as string,
        description: r.description as string | null,
        reminder_date: r.reminder_date as string,
        reminder_time: r.reminder_time as string | null,
        scope: r.scope as "personal" | "team",
        is_completed: r.is_completed as boolean,
        created_at: r.created_at as string,
        updated_at: r.updated_at as string,
        created_by_id: creator?.id ?? null,
        created_by_name: creator?.full_name ?? null,
      };
    },
  );

  // Fetch team members for the form
  const { data: teamRaw } = await sb
    .from("team_members")
    .select("id, full_name")
    .order("full_name");

  const team = (teamRaw ?? []).map((m) => ({
    id: m.id as string,
    full_name: m.full_name as string,
  }));

  return (
    <RemindersClient
      reminders={reminders}
      team={team}
      currentMemberId={currentMemberId ?? null}
      initialScope={scopeFilter ?? "all"}
    />
  );
}
