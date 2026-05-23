"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, CheckSquare, Users, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/tasks?new=true", label: "משימה חדשה", Icon: CheckSquare },
  { href: "/clients?new=true", label: "לקוח חדש", Icon: Users },
  { href: "/campaigns?new=true", label: "קמפיין חדש", Icon: Megaphone },
];

export function QuickAdd() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <div
      ref={wrapRef}
      className="fixed bottom-6 start-6 z-40 flex flex-col items-start gap-2"
    >
      {/* Menu */}
      <div
        className={cn(
          "flex origin-bottom-right flex-col gap-1 rounded-xl border border-gray-200 bg-white p-2 shadow-lg transition-all duration-200",
          open
            ? "scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0",
        )}
      >
        {ITEMS.map(({ href, label, Icon }) => (
          <button
            key={href}
            type="button"
            onClick={() => go(href)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-right text-sm text-ink transition-all duration-200 hover:bg-gray-50"
          >
            <Icon className="h-4 w-4 text-ink-muted" />
            {label}
          </button>
        ))}
      </div>

      {/* FAB */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="יצירה מהירה"
        aria-label="יצירה מהירה"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg transition-all duration-200 hover:bg-brand-focus hover:shadow-xl active:scale-95"
      >
        <Plus
          className={cn(
            "h-6 w-6 transition-transform duration-200",
            open && "rotate-45",
          )}
        />
      </button>
    </div>
  );
}
