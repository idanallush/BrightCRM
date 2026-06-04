"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function ClientLogo({
  logoUrl,
  logoStoragePath,
  name,
  size = "md",
  className,
}: {
  logoUrl: string | null | undefined;
  logoStoragePath?: string | null | undefined;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const [resolvedUrl, setResolvedUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!logoStoragePath) {
      setResolvedUrl(null);
      return;
    }
    let cancelled = false;
    import("@/app/actions/attachments").then(({ getSignedThumbnailUrl }) =>
      getSignedThumbnailUrl(logoStoragePath).then((url) => {
        if (!cancelled && url) setResolvedUrl(url);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [logoStoragePath]);

  const sizeClasses = {
    sm: "h-5 w-5 text-[9px]",
    md: "h-7 w-7 text-xs",
    lg: "h-10 w-10 text-sm",
  };

  const s = sizeClasses[size];
  const initial = name.charAt(0).toUpperCase();
  const displayUrl = resolvedUrl || logoUrl;

  if (displayUrl && !failed) {
    return (
      <img
        src={displayUrl}
        alt={name}
        className={cn(
          `${s} shrink-0 rounded-full object-cover bg-surface`,
          className,
        )}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      className={cn(
        `flex ${s} shrink-0 items-center justify-center rounded-full bg-surface font-bold text-ink`,
        className,
      )}
    >
      {initial}
    </span>
  );
}
