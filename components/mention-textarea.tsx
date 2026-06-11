"use client";

import * as React from "react";
import { AtSign } from "lucide-react";
import { Hint } from "@/components/ui/tooltip";
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
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  function handleTextChange(val: string) {
    onChange(val);
    const lastAt = val.lastIndexOf("@");
    if (lastAt >= 0 && (lastAt === 0 || val[lastAt - 1] === " " || val[lastAt - 1] === "\n")) {
      const query = val.slice(lastAt + 1);
      if (!query.includes(" ") && !query.includes("\n")) {
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
  }

  function triggerMention() {
    const ta = textareaRef.current;
    const pos = ta ? ta.selectionStart : value.length;
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    const needsSpace = before.length > 0 && before[before.length - 1] !== " " && before[before.length - 1] !== "\n";
    const insert = needsSpace ? " @" : "@";
    const next = before + insert + after;
    onChange(next);
    setShowMentions(true);
    requestAnimationFrame(() => {
      const caret = (before + insert).length;
      ta?.focus();
      ta?.setSelectionRange(caret, caret);
    });
  }

  function insertMention(member: TeamMember) {
    const mention = `@${member.full_name} `;
    const val = value.replace(/@\S*$/, mention);
    onChange(val);
    setShowMentions(false);
    textareaRef.current?.focus();
  }

  const mentionQuery = value.slice(value.lastIndexOf("@") + 1).toLowerCase();
  const filteredMembers = showMentions
    ? team.filter((m) => m.full_name.toLowerCase().includes(mentionQuery))
    : [];
  const showDropdown = showMentions && filteredMembers.length > 0;

  return (
    <div className="relative">
      <div className="group">
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && showMentions) {
              setShowMentions(false);
            }
          }}
          placeholder={placeholder}
          rows={rows}
          className={cn(
            "w-full rounded-lg border border-border bg-white p-3 text-body-sm text-ink placeholder:text-ink-muted transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
            className,
          )}
        />
        <div className="absolute bottom-2 start-2 opacity-0 transition-opacity group-focus-within:opacity-100">
          <Hint label="תייג מישהו (@)">
            <button
              type="button"
              onClick={triggerMention}
              className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <AtSign className="h-3.5 w-3.5" />
            </button>
          </Hint>
        </div>
      </div>

      {showDropdown && (
        <div
          className="absolute top-full left-0 right-0 z-[100] mt-1 max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-xl"
          onMouseDown={(e) => e.preventDefault()}
        >
          {filteredMembers.map((m) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertMention(m); }}
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
