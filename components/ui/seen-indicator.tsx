"use client"

import React from "react"
import { Eye } from "lucide-react"
import { UserAvatar } from "@/components/user-avatar"
import { timeAgo } from "@/lib/utils"

interface Viewer {
  full_name: string
  avatar_url: string | null
  viewed_at: string
}

interface SeenIndicatorProps {
  viewers: Viewer[] | undefined
  size?: "sm" | "md"
}

export function SeenIndicator({ viewers, size = "sm" }: SeenIndicatorProps) {
  if (!viewers || viewers.length === 0) return null

  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"
  const countClass = size === "sm" ? "text-xs" : "text-sm"

  return (
    <div className="group/seen-ind relative inline-flex items-center gap-1">
      <Eye className={`${iconClass} text-ink-muted`} />
      <span className={`${countClass} text-ink-muted`}>{viewers.length}</span>

      <div className="pointer-events-none absolute start-0 top-full z-50 mt-1.5 w-48 rounded-xl border border-border bg-white p-2.5 opacity-0 shadow-elevation-3 transition group-hover/seen-ind:pointer-events-auto group-hover/seen-ind:opacity-100">
        <div className="flex flex-col gap-1.5">
          {viewers.map((viewer) => (
            <div
              key={`${viewer.full_name}-${viewer.viewed_at}`}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-1.5">
                <UserAvatar
                  name={viewer.full_name}
                  avatarUrl={viewer.avatar_url}
                  size="xs"
                />
                <span className="text-xs font-medium text-ink">
                  {viewer.full_name}
                </span>
              </div>
              <span className="text-[10px] text-ink-muted">
                {timeAgo(viewer.viewed_at)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
