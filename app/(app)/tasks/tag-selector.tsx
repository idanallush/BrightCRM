"use client";

import * as React from "react";
import { Check, Plus, X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Hint } from "@/components/ui/tooltip";
import type { Tag } from "@/lib/data";

const TAG_COLOR_OPTIONS = ["#E0E0E6", "#DCE4FF", "#D0F0E8", "#EDE0FF", "#FFF4CC", "#FFE0D0", "#FFE4E8"];
const DEFAULT_NEW_TAG_COLOR = "#E0E0E6";

export function TagSelector({
  tags, selected, onToggle, onCreateTag, onUpdateTag,
}: {
  tags: Tag[];
  selected: string[];
  onToggle: (id: string) => void;
  onCreateTag: (name: string, color: string) => void;
  onUpdateTag: (tagId: string, fields: { name?: string; color?: string }) => void;
}) {
  const [showInput, setShowInput] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newColor, setNewColor] = React.useState("#E0E0E6");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editColor, setEditColor] = React.useState("");

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (tags.some((t) => t.name === trimmed)) {
      // Already exists, just select it
      const existing = tags.find((t) => t.name === trimmed);
      if (existing && !selected.includes(existing.id)) onToggle(existing.id);
    } else {
      onCreateTag(trimmed, newColor);
    }
    setNewName("");
    setNewColor("#E0E0E6");
    setShowInput(false);
  }

  function startEditing(tag: Tag) {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color ?? DEFAULT_NEW_TAG_COLOR);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditName("");
    setEditColor("");
  }

  function commitEditing() {
    if (!editingId) return;
    const trimmed = editName.trim();
    if (!trimmed) { cancelEditing(); return; }
    onUpdateTag(editingId, { name: trimmed, color: editColor });
    cancelEditing();
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const active = selected.includes(tag.id);
        const bg = tag.color ?? DEFAULT_NEW_TAG_COLOR;

        // Inline editor for this tag
        if (editingId === tag.id) {
          return (
            <div key={tag.id} className="flex flex-col gap-1.5 rounded-xl border border-border bg-white p-2 shadow-elevation-2">
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); commitEditing(); }
                  if (e.key === "Escape") cancelEditing();
                }}
                className="h-6 w-28 rounded-lg border border-border bg-surface px-2 text-xs outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex flex-wrap gap-1">
                {TAG_COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditColor(c)}
                    className={cn(
                      "h-5 w-5 rounded-full border-2 transition-transform",
                      editColor === c ? "scale-110 border-ink" : "border-transparent hover:scale-105",
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={commitEditing} className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-hover">
                  <Check className="h-3 w-3" />
                </button>
                <button type="button" onClick={cancelEditing} className="flex h-5 w-5 items-center justify-center rounded-full text-ink-muted hover:bg-surface">
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        }

        return (
          <div key={tag.id} className="group relative inline-flex">
            <button
              type="button"
              onClick={() => onToggle(tag.id)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-[color,background-color,box-shadow,opacity] duration-200",
                active ? "ring-2 ring-primary ring-offset-1 shadow-sm" : "opacity-60 hover:opacity-100",
              )}
              style={{ backgroundColor: bg, color: "#050038" }}
            >
              {tag.name}
              {active && <X className="h-3 w-3" />}
            </button>
            {/* Edit icon — appears on hover */}
            <Hint label="ערוך תגית" side="top">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); startEditing(tag); }}
                className="absolute -top-1.5 -end-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-white shadow-elevation-2 ring-1 ring-border group-hover:flex"
              >
                <Pencil className="h-2.5 w-2.5 text-ink-muted" />
              </button>
            </Hint>
          </div>
        );
      })}
      {showInput ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } if (e.key === "Escape") { setShowInput(false); setNewColor("#E0E0E6"); } }}
              placeholder="שם התגית..."
              className="h-7 w-24 rounded-full border border-border bg-white px-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
            />
            <button type="button" onClick={handleAdd} className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-hover">
              <Check className="h-3 w-3" />
            </button>
            <button type="button" onClick={() => { setShowInput(false); setNewName(""); setNewColor("#E0E0E6"); }} className="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted hover:bg-surface">
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            {TAG_COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={cn(
                  "h-5 w-5 rounded-full transition-[transform,box-shadow]",
                  newColor === c ? "ring-2 ring-primary ring-offset-1" : "hover:scale-110",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowInput(true)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-ink-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <Plus className="h-3 w-3" />
          חדשה
        </button>
      )}
    </div>
  );
}
