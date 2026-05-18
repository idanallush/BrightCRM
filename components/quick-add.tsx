"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, ListTodo, Users, Megaphone } from "lucide-react";

const ITEMS = [
  { href: "/tasks?new=true", label: "משימה חדשה", Icon: ListTodo },
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
    <div ref={wrapRef} className="fixed bottom-6 start-6 z-40 flex flex-col items-start gap-2">
      {open && (
        <div className="flex flex-col gap-1.5 rounded-2xl border border-[color:var(--color-hairline)] bg-white p-2 shadow-xl">
          {ITEMS.map(({ href, label, Icon }) => (
            <button
              key={href}
              type="button"
              onClick={() => go(href)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-right text-sm text-[color:var(--color-ink)] transition hover:bg-black/[0.04]"
            >
              <Icon className="h-4 w-4 text-[color:var(--color-ink-muted)]" />
              {label}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="יצירה מהירה"
        aria-label="יצירה מהירה"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--color-brand)] text-white shadow-lg transition active:scale-95 hover:opacity-90"
      >
        <Plus className={open ? "h-5 w-5 rotate-45 transition" : "h-5 w-5 transition"} />
      </button>
    </div>
  );
}
