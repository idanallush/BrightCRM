import Link from "next/link";
import { ArrowLeft, Phone, Globe, MessageSquare, Plus } from "lucide-react";
import { getRecentActivity, type ActivityItem } from "@/lib/data";
import { UserAvatar } from "@/components/user-avatar";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

function SourceIcon({ source }: { source: string }) {
  if (source === "whatsapp") return <Phone className="h-3 w-3 text-green-600" />;
  if (source === "web") return <Globe className="h-3 w-3 text-ink-muted" />;
  return null;
}

function ActivityEntry({ item }: { item: ActivityItem }) {
  const isComment = item.type === "comment";

  return (
    <Link
      href={`/tasks?task=${item.task_id}`}
      className="flex gap-3 rounded-2xl border border-border bg-white px-4 py-3.5 shadow-elevation-1 transition-shadow hover:shadow-elevation-2"
    >
      <UserAvatar
        name={item.user_name ?? "?"}
        avatarUrl={item.user_avatar_url}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="text-body-sm text-ink">
          <span className="font-semibold">{item.user_name ?? "משתמש"}</span>{" "}
          {isComment ? (
            <>
              <span className="text-ink-secondary">הגיב/ה על</span>{" "}
              <span className="font-medium text-primary">{item.task_title}</span>
            </>
          ) : (
            <>
              <span className="text-ink-secondary">יצר/ה משימה</span>{" "}
              <span className="font-medium text-primary">{item.task_title}</span>
            </>
          )}
        </p>
        {isComment && (
          <p className="mt-1 truncate text-caption text-ink-muted" dir="auto">
            {item.content.length > 120
              ? item.content.slice(0, 120) + "..."
              : item.content}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-2 text-caption text-ink-muted">
          <span>{timeAgo(item.created_at)}</span>
          {isComment ? (
            <MessageSquare className="h-3 w-3" />
          ) : (
            <SourceIcon source={(item as Extract<ActivityItem, { type: "task_created" }>).source} />
          )}
        </div>
      </div>
    </Link>
  );
}

export default async function ActivityPage() {
  const activity = await getRecentActivity(50);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">פעילות אחרונה</h1>
          <p className="mt-0.5 text-caption text-ink-secondary">
            משימות חדשות ותגובות אחרונות
          </p>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-caption text-ink-secondary transition-colors hover:text-ink"
        >
          דשבורד <ArrowLeft className="h-3 w-3" />
        </Link>
      </div>

      {/* Feed */}
      {activity.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white px-4 py-12 text-center shadow-elevation-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface">
            <Plus className="h-6 w-6 text-ink-muted" />
          </div>
          <p className="text-sm text-ink-muted">אין פעילות עדיין</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {activity.map((item) => (
            <ActivityEntry key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
