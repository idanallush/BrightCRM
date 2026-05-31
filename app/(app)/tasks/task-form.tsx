"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { createTask, updateTask, createTag, type TaskInput } from "./actions";
import type { Client, Tag, TaskWithRelations, TeamMember } from "@/lib/data";

const STATUS_OPTIONS: { value: TaskInput["status"]; label: string; color: string; textColor: string }[] = [
  { value: "מחכה לטיפול", label: "ממתין", color: "#FDAB3D", textColor: "#fff" },
  { value: "נכנס לעבודה", label: "נכנס לעבודה", color: "#4262FF", textColor: "#fff" },
  { value: "בעבודה", label: "בעבודה", color: "#A25DDC", textColor: "#fff" },
  { value: "אישור לקוח", label: "אישור לקוח", color: "#FFCB00", textColor: "#050038" },
  { value: "בוצע", label: "בוצע", color: "#00C875", textColor: "#fff" },
];

const NONE = "__none__";

function getInitials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const DEFAULT_TAG_COLORS = ["#DCE4FF", "#D0F0E8", "#EDE0FF", "#FFF4CC", "#FFE0D0", "#FFE4E8"];

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
  const [tagIds, setTagIds] = React.useState<string[]>(
    task?.tags?.map((t) => t.id) ?? [],
  );
  const [availableTags, setAvailableTags] = React.useState<Tag[]>(initialTags);

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleTag(id: string) {
    setTagIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleCreateTag(name: string) {
    const color = DEFAULT_TAG_COLORS[availableTags.length % DEFAULT_TAG_COLORS.length];
    const res = await createTag(name, color);
    if ("error" in res) { toast.error(res.error); return; }
    const newTag = res.tag as Tag;
    setAvailableTags((prev) => [...prev, newTag]);
    setTagIds((prev) => [...prev, newTag.id]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error("חסרה כותרת"); return; }
    if (!clientId) { toast.error("בחר לקוח"); return; }
    setPending(true);
    const payload: TaskInput = {
      title: title.trim(), client_id: clientId, description: description.trim() || null,
      status, due_date: dueDate || null, assignee_ids: assigneeIds, tag_ids: tagIds,
    };
    const res = task ? await updateTask(task.id, payload) : await createTask(payload);
    setPending(false);
    if ("error" in res) { toast.error(res.error); return; }
    toast.success(task ? "המשימה עודכנה" : "המשימה נוצרה");
    router.refresh();
    onDone();
  }

  const selectedStatus = STATUS_OPTIONS.find((o) => o.value === status);

  return (
    <form onSubmit={onSubmit} className={compact ? "flex flex-col" : "flex min-h-0 flex-1 flex-col"}>
      <div className={compact ? "flex flex-col gap-3" : "-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 pb-1"}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">כותרת</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="מה צריך לעשות?" autoFocus={!compact} />
        </div>

        {compact ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label>לקוח</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="בחר לקוח" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label>סטטוס</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as TaskInput["status"])}>
                  <SelectTrigger className="h-8 text-xs">
                    <div className="flex items-center gap-1.5">
                      {selectedStatus && (
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: selectedStatus.color }} />
                      )}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: opt.color }} />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="due">תאריך יעד</Label>
                <Input id="due" type="date" className="h-8 text-xs" value={dueDate ?? ""} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label>אחראים</Label>
                <AssigneeDropdown team={team} selected={assigneeIds} onToggle={toggleAssignee} />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label>תגיות</Label>
              <TagSelector tags={availableTags} selected={tagIds} onToggle={toggleTag} onCreateTag={handleCreateTag} />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="description">תיאור</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="פרטים נוספים (לא חובה)" rows={2} className="text-xs" />
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
                {STATUS_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setStatus(opt.value)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-caption font-medium transition-[color,background-color,opacity,box-shadow] duration-200",
                      status === opt.value ? "shadow-sm ring-2 ring-offset-1" : "opacity-60 hover:opacity-100",
                    )}
                    style={{
                      backgroundColor: opt.color,
                      color: opt.textColor,
                      ...(status === opt.value ? { ringColor: opt.color } : {}),
                    }}>
                    {opt.label}
                  </button>
                ))}
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
                        active ? "bg-white/20 text-white" : "bg-pastel-blue text-primary",
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
              <TagSelector tags={availableTags} selected={tagIds} onToggle={toggleTag} onCreateTag={handleCreateTag} />
            </div>
          </>
        )}
      </div>

      <div className={cn("flex shrink-0 gap-2 border-t border-border pt-3", compact ? "mt-3 flex-row-reverse" : "mt-3 flex-row-reverse")}>
        <Button type="submit" disabled={pending}>
          {pending ? "שומר..." : task ? "שמירה" : "צור משימה"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>ביטול</Button>
      </div>
    </form>
  );
}

function AssigneeDropdown({
  team, selected, onToggle,
}: {
  team: TeamMember[];
  selected: string[];
  onToggle: (id: string) => void;
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
        className="flex h-8 w-full items-center justify-between rounded-xl border border-border bg-white px-2 text-xs text-ink transition-colors hover:bg-surface"
      >
        <span className="truncate">
          {names.length === 0 ? "בחר אחראים" : names.length === 1 ? names[0] : `${names.length} אחראים`}
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
                className="flex w-full items-center gap-2 px-2.5 py-1.5 text-xs text-ink transition-colors hover:bg-surface"
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
  tags, selected, onToggle, onCreateTag,
}: {
  tags: Tag[];
  selected: string[];
  onToggle: (id: string) => void;
  onCreateTag: (name: string) => void;
}) {
  const [showInput, setShowInput] = React.useState(false);
  const [newName, setNewName] = React.useState("");

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (tags.some((t) => t.name === trimmed)) {
      // Already exists, just select it
      const existing = tags.find((t) => t.name === trimmed);
      if (existing && !selected.includes(existing.id)) onToggle(existing.id);
    } else {
      onCreateTag(trimmed);
    }
    setNewName("");
    setShowInput(false);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const active = selected.includes(tag.id);
        const bg = tag.color ?? "#DCE4FF";
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => onToggle(tag.id)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200",
              active ? "ring-2 ring-primary ring-offset-1 shadow-sm" : "opacity-60 hover:opacity-100",
            )}
            style={{ backgroundColor: bg, color: "#050038" }}
          >
            {tag.name}
            {active && <X className="h-3 w-3" />}
          </button>
        );
      })}
      {showInput ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } if (e.key === "Escape") setShowInput(false); }}
            placeholder="שם התגית..."
            className="h-7 w-24 rounded-full border border-border bg-white px-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
          />
          <button type="button" onClick={handleAdd} className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-hover">
            <Check className="h-3 w-3" />
          </button>
          <button type="button" onClick={() => { setShowInput(false); setNewName(""); }} className="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted hover:bg-surface">
            <X className="h-3 w-3" />
          </button>
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
