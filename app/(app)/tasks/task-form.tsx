"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check, Plus, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { createTask, updateTask, createTag, updateTag, type TaskInput } from "./actions";
import { Hint } from "@/components/ui/tooltip";
import { STATUS_LIGHT } from "@/components/ui/badge";
import type { Client, Tag, TaskWithRelations, TeamMember } from "@/lib/data";

const STATUS_OPTIONS: { value: TaskInput["status"]; label: string }[] = [
  { value: "מחכה לטיפול", label: "ממתין" },
  { value: "נכנס לעבודה", label: "נכנס לעבודה" },
  { value: "בעבודה", label: "בעבודה" },
  { value: "אישור לקוח", label: "אישור לקוח" },
  { value: "בוצע", label: "בוצע" },
];

const NONE = "__none__";

function getInitials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const TAG_COLOR_OPTIONS = ["#E0E0E6", "#DCE4FF", "#D0F0E8", "#EDE0FF", "#FFF4CC", "#FFE0D0", "#FFE4E8"];
const DEFAULT_NEW_TAG_COLOR = "#E0E0E6";

export function TaskForm({
  task, clients, team, tags: initialTags, onDone, compact = false,
}: {
  task?: TaskWithRelations;
  clients: Client[];
  team: TeamMember[];
  tags: Tag[];
  onDone: () => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const [title, setTitle] = React.useState(task?.title ?? "");
  const [clientId, setClientId] = React.useState(task?.client_id ?? clients[0]?.id ?? "");
  const [description, setDescription] = React.useState(task?.description ?? "");
  const [status, setStatus] = React.useState<TaskInput["status"]>(
    (task?.status as TaskInput["status"]) ?? "מחכה לטיפול",
  );
  const [dueDate, setDueDate] = React.useState(task?.due_date ?? "");
  const [assigneeIds, setAssigneeIds] = React.useState<string[]>(
    task?.assignees.map((a) => a.id) ?? [],
  );
  const [watcherIds, setWatcherIds] = React.useState<string[]>(
    task?.watchers?.map((w) => w.id) ?? [],
  );
  const [tagIds, setTagIds] = React.useState<string[]>(
    task?.tags?.map((t) => t.id) ?? [],
  );
  const [availableTags, setAvailableTags] = React.useState<Tag[]>(initialTags);

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleWatcher(id: string) {
    setWatcherIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleTag(id: string) {
    setTagIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleCreateTag(name: string, color: string) {
    const res = await createTag(name, color);
    if ("error" in res) { toast.error(res.error); return; }
    const newTag = res.tag as Tag;
    setAvailableTags((prev) => [...prev, newTag]);
    setTagIds((prev) => [...prev, newTag.id]);
  }

  async function handleUpdateTag(tagId: string, fields: { name?: string; color?: string }) {
    const res = await updateTag(tagId, fields);
    if ("error" in res) { toast.error(res.error); return; }
    const updated = res.tag as Tag;
    setAvailableTags((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Compact form has no title field; for an existing task use the (panel-maintained) task title.
    const finalTitle = (compact && task) ? task.title.trim() : title.trim();
    if (!finalTitle) { toast.error("חסרה כותרת"); return; }
    if (!clientId) { toast.error("בחר לקוח"); return; }
    setPending(true);
    const payload: TaskInput = {
      title: finalTitle, client_id: clientId, description: description.trim() || null,
      status, due_date: dueDate || null, assignee_ids: assigneeIds, watcher_ids: watcherIds, tag_ids: tagIds,
    };
    const res = task ? await updateTask(task.id, payload) : await createTask(payload);
    setPending(false);
    if ("error" in res) { toast.error(res.error); return; }
    toast.success(task ? "המשימה עודכנה" : "המשימה נוצרה");
    router.refresh();
    onDone();
  }

  const selectedStatus = STATUS_OPTIONS.find((o) => o.value === status);
  const selectedClient = clients.find((c) => c.id === clientId);

  return (
    <form onSubmit={onSubmit} className={compact ? "flex flex-col" : "flex min-h-0 flex-1 flex-col"}>
      <div className={compact ? "flex flex-col gap-3" : "-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 pb-1"}>
        {!compact && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">כותרת</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="מה צריך לעשות?" autoFocus />
          </div>
        )}

        {compact ? (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-secondary">לקוח</span>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="בחר לקוח" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <ClientLogo client={c} />
                        {c.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-secondary">סטטוס</span>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskInput["status"])}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => {
                    const light = STATUS_LIGHT[opt.value];
                    return (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: light?.dot ?? "#C4C4C4" }} />
                          {opt.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-secondary">תאריך יעד</span>
              <Input id="due" type="date" className="h-9 text-sm" value={dueDate ?? ""} onChange={(e) => setDueDate(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-secondary">אחראים</span>
              <AssigneeDropdown team={team} selected={assigneeIds} onToggle={toggleAssignee} />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-secondary">במעקב</span>
              <AssigneeDropdown team={team} selected={watcherIds} onToggle={toggleWatcher} noun="במעקב" />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-ink-secondary">תגיות</span>
              <TagSelector tags={availableTags} selected={tagIds} onToggle={toggleTag} onCreateTag={handleCreateTag} onUpdateTag={handleUpdateTag} />
            </div>

            <div className="flex flex-col gap-1">
              <CollapsibleTextarea id="description" value={description} onChange={setDescription} placeholder="הוסף תיאור..." />
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <Label>לקוח</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="בחר לקוח" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">תיאור</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="פרטים נוספים (לא חובה)" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>סטטוס</Label>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((opt) => {
                  const light = STATUS_LIGHT[opt.value] ?? { bg: "#F7F7F8", text: "#050038", dot: "#C4C4C4" };
                  const isActive = status === opt.value;
                  return (
                    <button key={opt.value} type="button" onClick={() => setStatus(opt.value)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-caption font-medium transition-[color,background-color,box-shadow,opacity] duration-200",
                        isActive ? "shadow-sm ring-2 ring-offset-1" : "opacity-60 hover:opacity-100",
                      )}
                      style={{
                        backgroundColor: light.bg,
                        color: light.text,
                        ...(isActive ? { ringColor: light.dot } : {}),
                      }}>
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: light.dot }} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="due">תאריך יעד</Label>
              <Input id="due" type="date" value={dueDate ?? ""} onChange={(e) => setDueDate(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>אחראים</Label>
              <div className="flex flex-wrap gap-2">
                {team.map((m) => {
                  const active = assigneeIds.includes(m.id);
                  return (
                    <button key={m.id} type="button" onClick={() => toggleAssignee(m.id)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-caption transition-[color,background-color,opacity,box-shadow] duration-200",
                        active ? "bg-primary text-white" : "border border-border bg-white text-ink hover:bg-surface",
                      )}>
                      <span className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold",
                        active ? "bg-white/20 text-white" : "bg-surface text-ink",
                      )}>
                        {getInitials(m.full_name)}
                      </span>
                      {m.full_name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>במעקב</Label>
              <div className="flex flex-wrap gap-2">
                {team.map((m) => {
                  const active = watcherIds.includes(m.id);
                  return (
                    <button key={m.id} type="button" onClick={() => toggleWatcher(m.id)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-caption transition-[color,background-color,opacity,box-shadow] duration-200",
                        active ? "bg-ink text-white" : "border border-border bg-white text-ink hover:bg-surface",
                      )}>
                      <span className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold",
                        active ? "bg-white/20 text-white" : "bg-surface-soft text-ink-secondary",
                      )}>
                        {getInitials(m.full_name)}
                      </span>
                      {m.full_name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>תגיות</Label>
              <TagSelector tags={availableTags} selected={tagIds} onToggle={toggleTag} onCreateTag={handleCreateTag} onUpdateTag={handleUpdateTag} />
            </div>
          </>
        )}
      </div>

      <div className={cn("flex shrink-0 gap-2 border-t border-border pt-3", compact ? "mt-3 flex-row-reverse" : "mt-3 flex-row-reverse")}>
        <Button type="submit" loading={pending}>
          {task ? "שמירה" : "צור משימה"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>ביטול</Button>
      </div>
    </form>
  );
}

function ClientLogo({ client }: { client?: Client }) {
  if (!client) return null;
  if (client.logo_url) {
    return <img src={client.logo_url} alt="" className="h-5 w-5 shrink-0 rounded object-cover" />;
  }
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-surface text-[9px] font-semibold text-ink">
      {getInitials(client.name)}
    </span>
  );
}

// Description input that caps height + shows a fade and "read more" toggle when the text is long.
function CollapsibleTextarea({
  id, value, onChange, placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const isLong = value.length > 300;
  const collapsed = isLong && !expanded;

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className={cn("text-xs", collapsed && "max-h-24 overflow-hidden")}
        />
        {collapsed && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-xl bg-gradient-to-t from-white to-transparent" />
        )}
      </div>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="self-start text-xs font-medium text-primary hover:underline"
        >
          {expanded ? "הצג פחות" : "קרא עוד"}
        </button>
      )}
    </div>
  );
}

function AssigneeDropdown({
  team, selected, onToggle, noun = "אחראים",
}: {
  team: TeamMember[];
  selected: string[];
  onToggle: (id: string) => void;
  noun?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const names = selected.map((id) => team.find((m) => m.id === id)?.full_name).filter(Boolean);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-9 w-full items-center justify-between rounded-xl border border-border bg-white px-2 text-sm text-ink transition-colors hover:bg-surface"
      >
        <span className="truncate">
          {names.length === 0 ? `בחר ${noun}` : names.length === 1 ? names[0] : `${names.length} ${noun}`}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
      </button>
      {open && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-xl border border-border bg-white py-1 shadow-elevation-3">
          {team.map((m) => {
            const active = selected.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onToggle(m.id)}
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-sm text-ink transition-colors hover:bg-surface"
              >
                <span className={cn(
                  "flex h-4 w-4 items-center justify-center rounded border",
                  active ? "border-primary bg-primary text-white" : "border-border bg-white",
                )}>
                  {active && <Check className="h-3 w-3" />}
                </span>
                {m.full_name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TagSelector({
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
