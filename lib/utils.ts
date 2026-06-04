import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const BRIGHT_DOMAIN = "b-bright.co.il";

export function isBrightEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(`@${BRIGHT_DOMAIN}`);
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic avatar color from a name — stable per user, picked from a tasteful palette.
const AVATAR_COLORS = [
  "bg-[#1A1A1A]", "bg-[#A25DDC]", "bg-[#00C875]", "bg-[#FF642E]",
  "bg-[#E2445C]", "bg-[#0AA5C2]", "bg-[#7E5BEF]", "bg-[#1FAD66]",
];

export function avatarColor(seed: string | null | undefined): string {
  const s = seed ?? "";
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** Relative date label with overdue flag + Tailwind class hint. */
export function relativeDate(iso: string | null): { text: string; overdue: boolean; className: string } {
  if (!iso) return { text: "ללא דדליין", overdue: false, className: "text-ink-muted italic" };
  const diffDays = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diffDays < 0) return { text: `באיחור ${Math.abs(diffDays)} ימים`, overdue: true, className: "text-overdue font-medium" };
  if (diffDays === 0) return { text: "היום", overdue: false, className: "text-st-waiting font-medium" };
  if (diffDays === 1) return { text: "מחר", overdue: false, className: "text-ink" };
  return { text: `עוד ${diffDays} ימים`, overdue: false, className: "text-ink-secondary" };
}

/** Human-friendly "time ago" label in Hebrew. */
export function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "עכשיו";
  if (m < 60) return `לפני ${m} דק'`;
  const h = Math.floor(m / 60);
  if (h < 24) return `לפני ${h} שע'`;
  return `לפני ${Math.floor(h / 24)} ימים`;
}
