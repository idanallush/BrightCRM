"use client";

import * as React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { Mail, Phone, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar, type AvatarSize } from "@/components/user-avatar";

export type HoverMember = {
  id?: string;
  full_name: string;
  role?: string | null;
  email?: string | null;
  whatsapp_phone?: string | null;
  avatar_url?: string | null;
};

const HoverCard = HoverCardPrimitive.Root;
const HoverCardTrigger = HoverCardPrimitive.Trigger;

function HoverCardContent({
  className,
  align = "center",
  sideOffset = 8,
  ...props
}: React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>) {
  return (
    <HoverCardPrimitive.Portal>
      <HoverCardPrimitive.Content
        dir="rtl"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-[70] w-64 rounded-2xl border border-border bg-white p-4 text-right shadow-elevation-4 outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  );
}

/**
 * Wrap any element to show a Monday-style user card on hover.
 */
export function UserHoverCard({
  member,
  children,
  openDelay = 200,
}: {
  member: HoverMember;
  children: React.ReactNode;
  openDelay?: number;
}) {
  return (
    <HoverCard openDelay={openDelay} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent>
        <div className="flex items-center gap-3">
          <UserAvatar name={member.full_name} avatarUrl={member.avatar_url} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-body-sm font-semibold text-ink">{member.full_name}</p>
            {member.role && <p className="truncate text-caption text-ink-secondary">{member.role}</p>}
          </div>
        </div>
        {(member.email || member.whatsapp_phone) && (
          <div className="mt-3 space-y-1.5 border-t border-border pt-3">
            {member.role && (
              <Detail icon={<Briefcase className="h-3.5 w-3.5" />} value={member.role} />
            )}
            {member.email && (
              <Detail
                icon={<Mail className="h-3.5 w-3.5" />}
                value={
                  <a href={`mailto:${member.email}`} className="hover:text-link hover:underline" dir="ltr">
                    {member.email}
                  </a>
                }
              />
            )}
            {member.whatsapp_phone && (
              <Detail icon={<Phone className="h-3.5 w-3.5" />} value={<span dir="ltr">{member.whatsapp_phone}</span>} />
            )}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

function Detail({ icon, value }: { icon: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-caption text-ink-secondary">
      <span className="shrink-0 text-ink-muted">{icon}</span>
      <span className="truncate">{value}</span>
    </div>
  );
}

/**
 * Default way to render a user: avatar (+ optional name) with a hover card.
 */
export function UserChip({
  member,
  size = "sm",
  withName = false,
  className,
}: {
  member: HoverMember;
  size?: AvatarSize;
  withName?: boolean;
  className?: string;
}) {
  return (
    <UserHoverCard member={member}>
      <span className={cn("inline-flex cursor-default items-center gap-2 align-middle", className)}>
        <UserAvatar name={member.full_name} avatarUrl={member.avatar_url} size={size} />
        {withName && <span className="truncate text-body-sm text-ink">{member.full_name}</span>}
      </span>
    </UserHoverCard>
  );
}
