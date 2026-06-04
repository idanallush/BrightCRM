"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { cn, getInitials } from "@/lib/utils";
import { createTask, updateTask, createTag, updateTag, type TaskInput } from "./actions";
import { STATUS_LIGHT } from "@/components/ui/badge";
import type { Client, Tag, TaskWithRelations, TeamMember } from "@/lib/data";
import { ClientLogo } from "@/components/client-logo";
import { AssigneeDropdown } from "./assignee-dropdown";
import { TagSelector } from "./tag-selector";

const STATUS_OPTIONS: { value: TaskInput["status"]; label: string }[] = [
  { value: "מחכה לטיפול", label: "ממתין" },
  { value: "נכנס לעבודה", label: "נכנס לעבודה" },
  { value: "אישור לקוח", label: "אישור לקוח" },
  { value: "בוצע", label: "בוצע" },
];

const NONE = "__none__";
const GENERAL = "__general__";


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
  const [clientId, setClientId] = React.useState(task ? (task.client_id ?? GENERAL) : (clients[0]?.id ?? ""));

  function handleClientChange(value: string) {
    setClientId(value);
    if (value === GENERAL) {
      setAssigneeIds(team.map((m) => m.id));
    }
  }
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
    const isGeneral = clientId === GENERAL;
    const payload: TaskInput = {
      title: finalTitle, client_id: isGeneral ? null : clientId, description: description.trim() || null,
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
              <Select value={clientId} onValueChange={handleClientChange}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="בחר לקוח" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={GENERAL}>
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent/30 text-[9px] font-bold text-ink">כל</span>
                      כללי (לכולם)
                    </div>
                  </SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <ClientLogoInline client={c} />
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
              <Select value={clientId} onValueChange={handleClientChange}>
                <SelectTrigger><SelectValue placeholder="בחר לקוח" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={GENERAL}>כללי (לכולם)</SelectItem>
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

function ClientLogoInline({ client }: { client?: Client }) {
  if (!client) return null;
  return <ClientLogo logoUrl={client.logo_url} logoStoragePath={client.logo_storage_path} name={client.name} size="sm" />;
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
          rows={5}
          className={cn("min-h-[150px] text-base", collapsed && "max-h-32 overflow-hidden")}
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

