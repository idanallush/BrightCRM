"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function TasksError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Tasks error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-elevation-2">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <span className="text-2xl">!</span>
        </div>
        <h2 className="text-lg font-bold text-ink">לא הצלחנו לטעון את המשימות</h2>
        <p className="mt-2 text-sm text-ink-secondary">
          אירעה שגיאה בלתי צפויה. נסו לרענן את הדף.
        </p>
        <button
          onClick={reset}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-accent/90"
        >
          <RefreshCw className="h-4 w-4" />
          נסה שוב
        </button>
      </div>
    </div>
  );
}
