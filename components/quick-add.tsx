"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, CheckSquare, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const ITEMS = [
  { href: "/tasks?new=true", label: "משימה חדשה", Icon: CheckSquare },
  { href: "/clients?new=true", label: "לקוח חדש", Icon: Users },
];

export function QuickAdd() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    function onClick(e: MouseEvent) { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    window.addEventListener("mousedown", onClick); window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("mousedown", onClick); window.removeEventListener("keydown", onKey); };
  }, []);

  return (
    <div ref={wrapRef} className="fixed bottom-[4.5rem] start-5 z-40 flex flex-col items-start gap-2 md:bottom-6">
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ duration: 0.12 }}
            className="flex flex-col gap-0.5 rounded-lg border border-border bg-white p-1 shadow-lg">
            {ITEMS.map(({ href, label, Icon }) => (
              <button key={href} type="button" onClick={() => { setOpen(false); router.push(href); }}
                className="flex items-center gap-2 rounded px-3 py-2 text-right text-body-sm text-ink transition-colors hover:bg-gray-50">
                <Icon className="h-4 w-4 text-ink-muted" />{label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button type="button" onClick={() => setOpen((v) => !v)} title="יצירה מהירה" aria-label="יצירה מהירה" whileTap={{ scale: 0.93 }}
        className="flex h-11 w-11 items-center justify-center rounded-md bg-accent text-ink shadow-sm transition-colors hover:bg-accent-hover">
        <Plus className={cn("h-5 w-5 transition-transform duration-150", open && "rotate-45")} />
      </motion.button>
    </div>
  );
}
