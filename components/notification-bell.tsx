"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, AtSign, ArrowLeftRight, MessageSquare, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

type Notification = { id: string; type: string; task_id: string | null; content: string; read: boolean; created_at: string; from_name: string | null };

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "עכשיו";
  if (mins < 60) return `לפני ${mins} דק'`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `לפני ${h} שע'`;
  return `לפני ${Math.floor(h / 24)} ימים`;
}
const TYPE_ICON: Record<string, React.ReactNode> = {
  mention: <AtSign className="h-4 w-4 text-primary" />, status_change: <ArrowLeftRight className="h-4 w-4 text-st-working" />,
  comment: <MessageSquare className="h-4 w-4 text-st-incoming" />, assignment: <CheckCheck className="h-4 w-4 text-st-done" />,
};

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => { fetchNotifications(); }, []);
  React.useEffect(() => { function onClick(e: MouseEvent) { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); } window.addEventListener("mousedown", onClick); return () => window.removeEventListener("mousedown", onClick); }, []);

  async function fetchNotifications() {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user?.email) return;
    const { data: member } = await sb.from("team_members").select("id").eq("email", user.email).maybeSingle();
    if (!member) return;
    const { data } = await sb.from("notifications").select("id, type, task_id, content, read, created_at, from_user:team_members!notifications_from_user_id_fkey(full_name)").eq("user_id", member.id).order("created_at", { ascending: false }).limit(10);
    if (data) { const mapped = (data as any[]).map((n) => ({ id: n.id, type: n.type, task_id: n.task_id, content: n.content, read: n.read, created_at: n.created_at, from_name: n.from_user?.full_name ?? null })); setNotifications(mapped); setUnreadCount(mapped.filter((n) => !n.read).length); }
  }

  async function markAllRead() {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user?.email) return;
    const { data: member } = await sb.from("team_members").select("id").eq("email", user.email).maybeSingle();
    if (!member) return;
    await sb.from("notifications").update({ read: true }).eq("user_id", member.id).eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))); setUnreadCount(0);
  }

  return (
    <div ref={wrapRef} className="relative">
      <button type="button" onClick={() => { setOpen((v) => !v); if (!open) fetchNotifications(); }}
        className="relative flex h-9 w-9 items-center justify-center rounded-sm text-slate transition-colors duration-150 hover:bg-surface hover:text-ink">
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && <span className="absolute -top-0.5 -start-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-overdue px-1 text-[10px] font-bold text-white">{unreadCount}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}
            className="absolute start-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-hairline bg-canvas shadow-modal">
            <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
              <span className="text-body-sm font-semibold text-ink">התראות</span>
              {unreadCount > 0 && <button type="button" onClick={markAllRead} className="text-caption text-link transition-colors hover:text-link-pressed">סמן הכל כנקרא</button>}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? <div className="p-6 text-center text-caption text-stone">אין התראות</div> :
                notifications.map((n, i) => (
                  <motion.button key={n.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} type="button"
                    onClick={() => { setOpen(false); if (n.task_id) router.push(`/tasks?task=${n.task_id}`); }}
                    className={cn("flex w-full items-start gap-3 px-4 py-3 text-right transition-colors hover:bg-surface", !n.read && "bg-tint-lavender/30")}>
                    <div className="mt-0.5 shrink-0">{TYPE_ICON[n.type] ?? <Bell className="h-4 w-4 text-stone" />}</div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-caption", n.read ? "text-slate" : "font-semibold text-ink")}>{n.content}</p>
                      <span className="text-[11px] text-stone">{timeAgo(n.created_at)}</span>
                    </div>
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </motion.button>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
