"use client";

import * as React from "react";
import { cn, getInitials, avatarColor } from "@/lib/utils";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZES: Record<AvatarSize, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-xs",
  lg: "h-11 w-11 text-sm",
  xl: "h-16 w-16 text-lg",
};

export function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  ring = false,
  className,
}: {
  name: string | null | undefined;
  avatarUrl?: string | null;
  size?: AvatarSize;
  ring?: boolean;
  className?: string;
}) {
  const [broken, setBroken] = React.useState(false);
  const showImage = !!avatarUrl && !broken;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white",
        SIZES[size],
        ring && "ring-2 ring-white",
        !showImage && avatarColor(name),
        className,
      )}
      aria-label={name ?? undefined}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl as string}
          alt={name ?? ""}
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}

// Overlapping stack of avatars (e.g. multiple assignees).
export function AvatarStack({
  people,
  size = "sm",
  max = 3,
  className,
}: {
  people: { full_name: string; avatar_url?: string | null }[];
  size?: AvatarSize;
  max?: number;
  className?: string;
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className={cn("flex items-center -space-x-2 space-x-reverse", className)}>
      {shown.map((p, i) => (
        <UserAvatar key={i} name={p.full_name} avatarUrl={p.avatar_url} size={size} ring />
      ))}
      {extra > 0 && (
        <span
          className={cn(
            "relative inline-flex shrink-0 items-center justify-center rounded-full bg-surface-soft font-semibold text-ink-secondary ring-2 ring-white",
            SIZES[size],
          )}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}
