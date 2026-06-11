"use client";

import * as React from "react";
import { AtSign } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import type { TeamMember } from "@/lib/data";

export function MentionTextarea({
  value,
  onChange,
  team,
  placeholder,
  rows = 4,
  className,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  team: TeamMember[];
  placeholder?: string;
  rows?: number;
  className?: string;
  id?: string;
}) {
  const [showMentions, setShowMentions] = React.useState(false);
  const [mentionAtPos, setMentionAtPos] = React.useState<number | null>(null);
  const [focused, setFocused] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    const cursor = e.target.selectionStart;
    onChange(val);

    const before = val.slice(0, cursor);
    const atMatch = before.match(/@([^\s@]*)$/);
    if (atMatch) {
      setMentionAtPos(before.length - atMatch[0].length);
      setShowMentions(true);
    } else {
      setShowMentions(false);
      setMentionAtPos(null);
    }
  }

  function triggerMention() {
    const ta = textareaRef.current;
    const pos = ta ? ta.selectionStart : value.length;
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    const needsSpace = before.length > 0 && before[before.length - 1] !== " ";
    const insert = needsSpace ? " @" : "@";
    const next = before + insert + after;
    onChange(next);
    const atPos = (before + insert).length - 1;
    setMentionAtPos(atPos);
    setShowMentions(true);
    requestAnimationFrame(() => {
      const caret = atPos + 1;
      ta?.focus();
      ta?.setSelectionRange(caret, caret);
    });
  }

  function insertMention(member: TeamMember) {
    if (mentionAtPos === null) return;
    const before = value.slice(0, mentionAtPos);
    const afterAt = value.slice(mentionAtPos);
    const restMatch = afterAt.match(/^@[^\s]*/);
    const restStart = mentionAtPos + (restMatch ? restMatch[0].length : 1);
    const after = value.slice(restStart);
    const mention = `@${member.full_name} `;
    const next = before + mention + after;
    onChange(next);
    setShowMentions(false);
    setMentionAtPos(null);
    requestAnimationFrame(() => {
      const caret = (before + mention).length;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(caret, caret);
    });
  }

  const mentionQuery =
    showMentions && mentionAtPos !== null
      ? value.slice(mentionAtPos + 1, textareaRef.current?.selectionStart ?? value.length).toLowerCase()
      : "";

  const filteredMembers = showMentions
    ? team.filter((m) => m.full_name.toLowerCase().includes(mentionQuery))
    : [];

  const showDropdown = showMentions && filteredMembers.length > 0;

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && showMentions) {
            setShowMentions(false);
            setMentionAtPos(null);
          }
        }}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          "w-full rounded-lg border border-border bg-white p-3 text-body-sm text-ink placeholder:text-ink-muted transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
          className,
        )}
      />

      {focused && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            triggerMention();
          }}
          className="absolute bottom-2 start-2 flex h-6 w-6 items-center justify-center rounded text-ink-muted transition-colors hover:bg-surface hover:text-ink"
          aria-label="תייג מישהו"
        >
          <AtSign className="h-3.5 w-3.5" />
        </button>
      )}

      {showDropdown && (
        <div
          className="absolute top-full left-0 right-0 z-[100] mt-1 max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-xl"
          onMouseDown={(e) => e.preventDefault()}
        >
          {filteredMembers.map((m) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(m);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-right text-sm text-ink transition-colors hover:bg-gray-50"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-[10px] font-semibold text-ink">
                {getInitials(m.full_name)}
              </span>
              {m.full_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
