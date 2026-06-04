"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

function getIsraeliWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function getMessage(count: number): string {
  const day = new Date().getDay();
  const dayMessages: Record<number, string> = {
    0: "שבוע טרי! קדימה 🌅",
    3: "חצי שבוע, חצי דרך! ⚡",
    4: "סיום חזק לשבוע! 🎯",
    5: "סוגרים שבוע כמו אלופים 🏅",
  };
  if (count === 0) return dayMessages[day] ?? "שבוע חדש, הכל אפשרי! 🚀";
  if (count <= 2) return dayMessages[day] ?? "יאללה, התחלת לזוז! 💪";
  if (count <= 4) return "אתה על גלגל! 🔥";
  if (count <= 7) return "מכונת ביצוע! אין עליך 🏆";
  if (count <= 10) return "אגדה חיה. פשוט אגדה. 👑";
  return "בלתי ניתן לעצירה! 🦸";
}

const REFRESH_MS = 5 * 60 * 1000;

function AnimatedCheck({ animate }: { animate: boolean }) {
  return (
    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
      <motion.div
        className="absolute inset-0 rounded-full bg-success/20"
        initial={false}
        animate={animate ? { scale: [1, 1.3, 1] } : {}}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="relative z-10">
        <motion.path
          d="M5 13l4 4L19 7"
          stroke="#00C875"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        />
      </svg>
    </div>
  );
}

export function SidebarWeeklyStats({ collapsed }: { collapsed: boolean }) {
  const [count, setCount] = React.useState<number | null>(null);
  const [bump, setBump] = React.useState(0);

  const fetchCount = React.useCallback(async () => {
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user?.email) return;
      const { data: member } = await sb
        .from("team_members")
        .select("id")
        .eq("email", user.email)
        .maybeSingle();
      if (!member) return;

      const { start, end } = getIsraeliWeekRange();
      const { count: c } = await sb
        .from("task_assignees")
        .select("task:tasks!inner(id)", { count: "exact", head: true })
        .eq("member_id", member.id)
        .eq("tasks.status", "בוצע")
        .gte("tasks.updated_at", start)
        .lte("tasks.updated_at", end);

      setCount((prev) => {
        const next = c ?? 0;
        if (prev !== null && next !== prev) setBump((b) => b + 1);
        return next;
      });
    } catch {
      // silent fail
    }
  }, []);

  React.useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchCount]);

  if (count === null) return null;

  const message = getMessage(count);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 border-t border-sidebar-border px-1 pt-3 pb-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success/20">
          <span className="text-xs font-bold text-success">{count}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-sidebar-border px-3 pt-3 pb-2">
      <div className="rounded-xl bg-white/5 px-3 py-3">
        <div className="flex items-center gap-3">
          <AnimatedCheck key={bump} animate={bump > 0} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[11px] text-white/40">משימות שבוצעו</span>
            <div className="flex items-baseline gap-1.5">
              <motion.span
                key={count}
                initial={bump > 0 ? { scale: 1.4, color: "#00C875" } : false}
                animate={{ scale: 1, color: "rgba(255,255,255,0.9)" }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="text-xl font-bold leading-none text-white/90"
              >
                {count}
              </motion.span>
              <span className="text-[11px] text-white/40">השבוע</span>
            </div>
          </div>
        </div>
        <motion.p
          key={message}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mt-2 text-[12px] leading-snug text-white/50"
        >
          {message}
        </motion.p>
      </div>
    </div>
  );
}
