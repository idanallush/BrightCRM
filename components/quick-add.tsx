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
      className="fixed bottom-20 start-6 z-40 flex flex-col items-start gap-2 md:bottom-6"
    >
      <div
        className={cn(
          "flex origin-bottom-right flex-col gap-0.5 rounded-lg border border-hairline bg-canvas p-1.5 shadow-card transition-all duration-200",
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
            className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-right text-sm text-ink transition-colors duration-150 hover:bg-surface-card"
          >
            <Icon className="h-4 w-4 text-ink-muted" />
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="יצירה מהירה"
        aria-label="יצירה מהירה"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-subtle transition-all duration-150 hover:bg-primary-active active:scale-95"
      >
        <Plus
          className={cn(
            "h-5 w-5 transition-transform duration-200",
            open && "rotate-45",
          )}
        />
      </button>
    </div>
  );
}
