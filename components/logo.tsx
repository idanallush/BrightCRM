import { cn } from "@/lib/utils";

/**
 * Bright TASKS logo.
 * "Bright" in white italic script + "TASKS" in ink on yellow pill.
 *
 * Sizes: sm (sidebar collapsed icon), md (sidebar expanded / login), lg (about page hero)
 */

type LogoSize = "sm" | "md" | "lg";

const SIZES: Record<LogoSize, { bright: string; pill: string; pillText: string; gap: string }> = {
  sm: { bright: "text-[0px]", pill: "px-1.5 py-0.5 rounded-lg", pillText: "text-[11px]", gap: "gap-0" },
  md: { bright: "text-lg", pill: "px-2 py-0.5 rounded-lg", pillText: "text-[13px]", gap: "gap-1.5" },
  lg: { bright: "text-2xl", pill: "px-2.5 py-1 rounded-xl", pillText: "text-base", gap: "gap-2" },
};

export function Logo({
  size = "md",
  dark = false,
  className,
}: {
  size?: LogoSize;
  /** dark = true renders "Bright" in white (for dark backgrounds). false = ink color. */
  dark?: boolean;
  className?: string;
}) {
  const s = SIZES[size];

  // sm = icon only (just the yellow TASKS pill)
  if (size === "sm") {
    return (
      <span className={cn("flex items-center", className)}>
        <span className={cn("inline-flex items-center justify-center bg-accent font-bold uppercase tracking-tight text-ink", s.pill, s.pillText)}>
          T
        </span>
      </span>
    );
  }

  return (
    <span dir="ltr" className={cn("inline-flex items-center", s.gap, className)}>
      <span
        className={cn(
          "font-bold italic leading-none",
          s.bright,
          dark ? "text-white" : "text-ink",
        )}
        style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
      >
        Bright
      </span>
      <span className={cn("inline-flex items-center bg-accent font-bold uppercase tracking-tight text-ink", s.pill, s.pillText)}>
        TASKS
      </span>
    </span>
  );
}

/** Compact logo mark for favicons / tiny spaces */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-body-sm font-bold text-ink", className)}>
      T
    </span>
  );
}
