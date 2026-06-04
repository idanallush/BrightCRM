"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

export function WeeklyMotivator() {
  const [count, setCount] = React.useState<number | null>(null);
  const [prevCount, setPrevCount] = React.useState<number | null>(null);

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
        setPrevCount(prev);
        return c ?? 0;
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

  const didChange = prevCount !== null && prevCount !== count;

  return (
    <div className="hidden items-center gap-2 md:flex">
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={didChange ? { scale: 1.3, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1"
        >
          <span className="text-sm font-bold text-ink">{count}</span>
          <Check className="h-3.5 w-3.5 text-ink" strokeWidth={3} />
        </motion.div>
      </AnimatePresence>
      <span className="text-caption text-ink-muted">{getMessage(count)}</span>
    </div>
  );
}
