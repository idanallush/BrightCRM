import { cn } from "@/lib/utils";
import Image from "next/image";

/**
 * Bright TASKS logo — uses the actual brand PNG assets.
 * dark = white version (for dark backgrounds like sidebar).
 * light/default = dark version (for white/light backgrounds like login).
 */

type LogoSize = "sm" | "md" | "lg";

const HEIGHTS: Record<LogoSize, number> = {
  sm: 24,
  md: 32,
  lg: 44,
};

export function Logo({
  size = "md",
  dark = false,
  className,
}: {
  size?: LogoSize;
  /** dark = true uses the white logo (for dark backgrounds). */
  dark?: boolean;
  className?: string;
}) {
  const h = HEIGHTS[size];
  const src = dark ? "/logo-white.png" : "/logo-dark.png";

  return (
    <Image
      src={src}
      alt="Bright Tasks"
      height={h}
      width={Math.round(h * 3.5)}
      className={cn("h-auto object-contain", className)}
      style={{ height: h, width: "auto" }}
      priority
    />
  );
}
