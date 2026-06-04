"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Send, Paperclip, AtSign, File as FileIcon, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Hint } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toaster";
import { getInitials } from "@/lib/utils";
import type { TeamMember } from "@/lib/data";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT =
  "image/jpeg,image/png,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.ms-excel";

export function CommentInput({
  onSend,
  team,
  placeholder,
  compact,
}: {
  onSend: (text: string, mentions: string[], files: File[]) => Promise<void>;
  team: TeamMember[];
  placeholder?: string;
  compact?: boolean;
}) {
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [showMentions, setShowMentions] = React.useState(false);
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Local object URLs for image previews of pending files. Recreated on change, revoked on cleanup.
  const previews = React.useMemo(
    () => pendingFiles.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : null)),
    [pendingFiles],
  );
  React.useEffect(() => {
    return () => { previews.forEach((u) => u && URL.revokeObjectURL(u)); };
  }, [previews]);

  function handleTextChange(val: string) {
    setText(val);
    const lastAt = val.lastIndexOf("@");
    if (lastAt >= 0 && (lastAt === 0 || val[lastAt - 1] === " ")) {
      const query = val.slice(lastAt + 1);
      if (!query.includes(" ")) { setShowMentions(true); return; }
    }
    setShowMentions(false);
  }

  // Insert an "@" at the cursor (or end), focus the textarea, and open the mentions dropdown.
  // Same flow as typing "@" manually.
  function triggerMention() {
    const ta = textareaRef.current;
    const pos = ta ? ta.selectionStart : text.length;
    const before = text.slice(0, pos);
    const after = text.slice(pos);
    // Ensure the "@" begins a mention token (preceded by start-of-text or a space).
    const needsSpace = before.length > 0 && before[before.length - 1] !== " ";
    const insert = (needsSpace ? " @" : "@");
    const next = before + insert + after;
    setText(next);
    setShowMentions(true);
    requestAnimationFrame(() => {
      const caret = (before + insert).length;
      ta?.focus();
      ta?.setSelectionRange(caret, caret);
    });
  }

  function insertMention(member: TeamMember) {
    const mention = `@${member.full_name} `;
    const val = text.replace(/@\S*$/, mention);
    setText(val);
    setShowMentions(false);
    textareaRef.current?.focus();
  }

  function handleFileSelect(files: FileList | null) {
    if (!files) return;
    const list = Array.from(files);
    const valid: File[] = [];
    for (const f of list) {
      if (f.size > MAX_BYTES) {
        toast.error(`"${f.name}" גדול מ-10MB`);
      } else {
        valid.push(f);
      }
    }
    setPendingFiles((prev) => [...prev, ...valid]);
  }

  function removeFile(idx: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSend() {
    if ((!text.trim() && pendingFiles.length === 0) || sending) return;
    setSending(true);
    const mentionIds: string[] = [];
    for (const m of team) {
      if (text.includes(`@${m.full_name}`)) mentionIds.push(m.id);
    }
    try {
      await onSend(text.trim(), mentionIds, pendingFiles);
      setText("");
      setPendingFiles([]);
    } finally {
      setSending(false);
    }
  }

  const mentionQuery = text.slice(text.lastIndexOf("@") + 1).toLowerCase();
  const filteredMembers = showMentions
    ? team.filter((m) => m.full_name.toLowerCase().includes(mentionQuery))
    : [];

  const canSend = (text.trim() || pendingFiles.length > 0) && !sending;

  const [menuPos, setMenuPos] = React.useState<{ top: number; left: number; width: number } | null>(null);

  const showDropdown = showMentions && filteredMembers.length > 0;

  React.useLayoutEffect(() => {
    if (!showDropdown || !textareaRef.current) { setMenuPos(null); return; }
    const rect = textareaRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.top, left: rect.left, width: rect.width });
  }, [showDropdown, text]);

  return (
    <div className="relative">
      <div className="rounded-xl border border-border bg-white transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          placeholder={placeholder ?? "כתוב עדכון... (@ לאזכור)"}
          rows={compact ? 1 : 2}
          className="w-full resize-none rounded-t-xl bg-transparent px-3 pt-3 pb-1.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none"
        />

        {/* Pending files preview */}
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pb-1.5">
            {pendingFiles.map((f, i) => {
              const preview = previews[i];
              if (preview) {
                return (
                  <span key={i} className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt={f.name}
                      className="h-14 w-14 rounded-lg border border-border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute -end-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white shadow-elevation-2 hover:bg-ink-hover"
                      aria-label="הסר קובץ"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              }
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-ink-secondary"
                >
                  <FileIcon className="h-3.5 w-3.5 text-ink-muted" />
                  {f.name.length > 20 ? f.name.slice(0, 17) + "..." : f.name}
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="ms-0.5 text-ink-muted hover:text-ink"
                    aria-label="הסר קובץ"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between border-t border-border px-2 py-1.5">
          <div className="flex items-center gap-0.5">
            <Hint label="צרף קובץ">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink"
              >
                <Paperclip className="h-4 w-4" />
              </button>
            </Hint>
            <Hint label="תייג מישהו">
              <button
                type="button"
                onClick={triggerMention}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink"
              >
                <AtSign className="h-4 w-4" />
              </button>
            </Hint>
          </div>
          <Hint label="שלח">
            <Button
              onClick={handleSend}
              disabled={!canSend}
              className="h-8 gap-1.5 px-3 text-xs"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              שלח
            </Button>
          </Hint>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept={ACCEPT}
        multiple
        onChange={(e) => { handleFileSelect(e.target.files); if (e.target) e.target.value = ""; }}
      />

      {showDropdown && menuPos && createPortal(
        <div
          className="fixed z-[9999] w-52 rounded-xl border border-border bg-white p-1 shadow-elevation-3"
          style={{ top: menuPos.top - 4, left: menuPos.left, transform: "translateY(-100%)" }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {filteredMembers.map((m) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertMention(m); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink transition-colors hover:bg-surface"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface text-[10px] font-semibold text-ink">
                {getInitials(m.full_name)}
              </span>
              {m.full_name}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
