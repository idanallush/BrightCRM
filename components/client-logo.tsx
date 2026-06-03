"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function ClientLogo({
  logoUrl,
  name,
  size = "md",
  className,
}: {
  logoUrl: string | null | undefined;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);

  const sizeClasses = {
    sm: "h-5 w-5 text-[9px]",
    md: "h-7 w-7 text-xs",
    lg: "h-10 w-10 text-sm",
  };

  const s = sizeClasses[size];
  const initial = name.charAt(0).toUpperCase();

  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={cn(`${s} shrink-0 rounded-full object-cover bg-surface`, className)}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span className={cn(`flex ${s} shrink-0 items-center justify-center rounded-full bg-surface font-bold text-ink`, className)}>
      {initial}
    </span>
  );
}
