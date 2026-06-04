import * as React from "react";
import { FileText, FileSpreadsheet, FileImage, File as FileIcon } from "lucide-react";
import type { CommentAttachment } from "./actions";

export function isImage(t: string | null) {
  return !!t && t.startsWith("image/");
}

function iconFor(t: string | null) {
  if (!t) return FileIcon;
  if (isImage(t)) return FileImage;
  if (t === "application/pdf") return FileText;
  if (t.includes("spreadsheet") || t.includes("excel")) return FileSpreadsheet;
  if (t.includes("word")) return FileText;
  return FileIcon;
}

// Escape a string for safe use inside a RegExp.
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Turn plain text into React nodes, wrapping URLs in clickable links.
const URL_PATTERN = /https?:\/\/[^\s<>"']+/;
const URL_SPLIT = /(https?:\/\/[^\s<>"']+)/g;

function renderTextWithLinks(text: string): React.ReactNode {
  const parts = text.split(URL_SPLIT);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (URL_PATTERN.test(part)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer"
          className="text-link underline hover:text-link/80 break-all" dir="ltr">
          {part}
        </a>
      );
    }
    return part;
  });
}

// Render comment content, turning known @mentions into inline blue chips.
// `names` are the full names that were mentioned (resolved from stored mention IDs).
// Line breaks are preserved. URLs are rendered as clickable links.
export function renderContentWithMentions(content: string, names: string[]): React.ReactNode {
  if (names.length === 0) return renderTextWithLinks(content);
  // Longest names first so e.g. "@דני לוי" wins over "@דני".
  const sorted = [...names].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`@(?:${sorted.map(escapeRegExp).join("|")})`, "g");
  const parts = content.split(pattern);
  const matches = content.match(pattern) ?? [];

  const nodes: React.ReactNode[] = [];
  parts.forEach((part, i) => {
    if (part) nodes.push(<React.Fragment key={`t${i}`}>{renderTextWithLinks(part)}</React.Fragment>);
    if (i < matches.length) {
      nodes.push(
        <span
          key={`m${i}`}
          className="rounded-full bg-blue-50 px-1.5 font-semibold text-blue-700"
        >
          {matches[i]}
        </span>,
      );
    }
  });
  return nodes;
}

// ---- Comment attachment display ----

export function CommentAttachmentList({
  attachments,
  thumbs,
}: {
  attachments: CommentAttachment[];
  thumbs: Record<string, string>;
}) {
  if (attachments.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {attachments.map((att) => {
        const thumb = isImage(att.content_type) ? thumbs[att.storage_path] : null;
        if (thumb) {
          return (
            <a key={att.id} href={thumb} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumb}
                alt={att.file_name}
                className="h-16 w-16 rounded-lg object-cover border border-border transition-opacity hover:opacity-80 cursor-pointer"
              />
            </a>
          );
        }
        const Icon = iconFor(att.content_type);
        const url = thumbs[att.storage_path];
        return (
          <a
            key={att.id}
            href={url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-border px-3 py-1 text-[11px] text-ink-secondary cursor-pointer hover:bg-surface/80 transition-colors"
          >
            <Icon className="h-3.5 w-3.5 text-ink-muted" />
            {att.file_name.length > 25 ? att.file_name.slice(0, 22) + "..." : att.file_name}
          </a>
        );
      })}
    </div>
  );
}
