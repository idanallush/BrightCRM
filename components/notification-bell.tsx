"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, AtSign, ArrowLeftRight, MessageSquare, CheckCheck } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

type Notification = { id: string; type: string; task_id: string | null; comment_id: string | null; content: string; read: boolean; created_at: string };

const TYPE_ICON: Record<string, React.ReactNode> = {
  mention: <AtSign className="h-3.5 w-3.5" />, status_change: <ArrowLeftRight className="h-3.5 w-3.5" />,
  comment: <MessageSquare className="h-3.5 w-3.5" />, assignment: <CheckCheck className="h-3.5 w-3.5" />,
};

export function NotificationBell({ dark = false }: { dark?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => { fetchNotifications(); }, []);
  React.useEffect(() => { function onClick(e: MouseEvent) { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); } window.addEventListener("mousedown", onClick); return () => window.removeEventListener("mousedown", onClick); }, []);

  async function fetchNotifications() {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser(); if (!user?.email) return;
    const { data: member } = await sb.from("team_members").select("id").eq("email", user.email).maybeSingle(); if (!member) return;
    const { data } = await sb.from("notifications").select("id, type, task_id, comment_id, content, read, created_at").eq("user_id", member.id).order("created_at", { ascending: false }).limit(10);
    if (data) { const mapped = data as Notification[]; setNotifications(mapped); setUnreadCount(mapped.filter((n) => !n.read).length); }
  }

  async function markAllRead() {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser(); if (!user?.email) return;
    const { data: member } = await sb.from("team_members").select("id").eq("email", user.email).maybeSingle(); if (!member) return;
    await sb.from("notifications").update({ read: true }).eq("user_id", member.id).eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))); setUnreadCount(0);
  }

  return (
    <div ref={wrapRef} className="relative">
      <button type="button" onClick={() => { setOpen((v) => !v); if (!open) fetchNotifications(); }}
        className={cn("relative flex h-8 w-8 items-center justify-center rounded-xl transition-colors", dark ? "text-white/40 hover:bg-white/5 hover:text-white/80" : "text-ink-muted hover:bg-surface hover:text-ink")}>
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && <span className="absolute -top-0.5 -start-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-ink">{unreadCount}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
            className="absolute start-0 top-full z-50 mt-1.5 w-72 overflow-hidden rounded-xl border border-border bg-white shadow-elevation-3">
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <span className="text-body-sm font-semibold text-ink">התראות</span>
              {unreadCount > 0 && <button type="button" onClick={markAllRead} className="text-caption text-link hover:underline">סמן כנקרא</button>}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? <div className="p-4 text-center text-caption text-ink-muted">אין התראות</div> :
                notifications.map((n) => (
                  <button key={n.id} type="button" onClick={() => { setOpen(false); if (n.task_id) router.push(`/tasks?task=${n.task_id}${n.comment_id ? `&comment=${n.comment_id}` : ""}`); }}
                    className={cn("flex w-full items-start gap-2.5 px-3 py-2.5 text-right transition-colors hover:bg-surface", !n.read && "bg-surface")}>
                    <div className="mt-0.5 shrink-0 text-ink-muted">{TYPE_ICON[n.type] ?? <Bell className="h-3.5 w-3.5" />}</div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-caption", n.read ? "text-ink-secondary" : "font-medium text-ink")}>{n.content}</p>
                      <span className="text-[11px] text-ink-muted">{timeAgo(n.created_at)}</span>
                    </div>
                    {!n.read && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                  </button>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
