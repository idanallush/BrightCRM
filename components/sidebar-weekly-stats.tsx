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

const REFRESH_MS = 5 * 60 * 1000;

function AnimatedCheck({ animate }: { animate: boolean }) {
  return (
    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
      {/* Background circle */}
      <motion.div
        className="absolute inset-0 rounded-full bg-success/20"
        initial={false}
        animate={animate ? { scale: [1, 1.3, 1] } : {}}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
      {/* Check SVG with draw animation */}
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

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 border-t border-sidebar-border px-1 pt-3 pb-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/20">
          <span className="text-xs font-bold text-success">{count}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-sidebar-border px-3 pt-3 pb-1">
      <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
        <AnimatedCheck key={bump} animate={bump > 0} />
        <div className="flex min-w-0 flex-col">
          <span className="text-[11px] text-white/40">משימות שבוצעו</span>
          <motion.span
            key={count}
            initial={bump > 0 ? { scale: 1.4, color: "#00C875" } : false}
            animate={{ scale: 1, color: "rgba(255,255,255,0.9)" }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="text-lg font-bold leading-tight text-white/90"
          >
            {count}
          </motion.span>
        </div>
      </div>
    </div>
  );
}
