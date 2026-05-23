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
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 10 }} transition={{ duration: 0.15 }}
            className="flex flex-col gap-0.5 rounded-lg border border-hairline bg-canvas p-1.5 shadow-modal">
            {ITEMS.map(({ href, label, Icon }) => (
              <button key={href} type="button" onClick={() => { setOpen(false); router.push(href); }}
                className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-right text-body-sm text-ink transition-colors duration-150 hover:bg-surface">{Icon && <Icon className="h-4 w-4 text-slate" />}{label}</button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button type="button" onClick={() => setOpen((v) => !v)} title="יצירה מהירה" aria-label="יצירה מהירה" whileTap={{ scale: 0.92 }}
        className="flex h-12 w-12 items-center justify-center rounded-md bg-accent text-ink-deep shadow-card transition-all duration-150 hover:bg-accent-hover">
        <Plus className={cn("h-5 w-5 transition-transform duration-200", open && "rotate-45")} />
      </motion.button>
    </div>
  );
}
