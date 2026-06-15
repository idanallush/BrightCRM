"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MentionTextarea } from "@/components/mention-textarea";
import { renderDescriptionContent } from "./comment-helpers";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { cn, getInitials } from "@/lib/utils";
import { createTask, updateTask, createTag, updateTag, type TaskInput } from "./actions";
import { uploadAttachment } from "@/app/actions/attachments";
import { STATUS_LIGHT } from "@/components/ui/badge";
import type { Client, Tag, TaskWithRelations, TeamMember } from "@/lib/data";
import { ClientCombobox, GENERAL_OPTION } from "@/components/client-combobox";
import { AssigneeDropdown } from "./assignee-dropdown";
import { TagSelector } from "./tag-selector";
import { Repeat, File as FileIcon, X } from "lucide-react";
import { usePasteImage } from "@/lib/use-paste-image";
import { formatRecurrenceDescription } from "@/lib/recurring";
import type { RecurrenceRule } from "@/lib/recurring";

const STATUS_OPTIONS: { value: TaskInput["status"]; label: string }[] = [
  { value: "מחכה לטיפול", label: "ממתין" },
  { value: "נכנס לעבודה", label: "נכנס לעבודה" },
  { value: "בעבודה סטודיו", label: "בעבודה סטודיו" },
  { value: "בעבודה ספק חיצוני", label: "בעבודה ספק חיצוני" },
  { value: "אישור לקוח", label: "אישור לקוח" },
  { value: "בוצע", label: "בוצע" },
];

const NONE = "__none__";
const GENERAL = GENERAL_OPTION;


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

  // Pasted/queued image attachments — uploaded after the task is created/updated.
  const [pendingAttachments, setPendingAttachments] = React.useState<File[]>([]);
  const attachmentPreviews = React.useMemo(
    () => pendingAttachments.map((f) => URL.createObjectURL(f)),
    [pendingAttachments],
  );
  React.useEffect(() => {
    return () => { attachmentPreviews.forEach((u) => URL.revokeObjectURL(u)); };
  }, [attachmentPreviews]);

  const handlePasteDescription = usePasteImage({
    onImages: (files) => setPendingAttachments((prev) => [...prev, ...files]),
    onTooLarge: (f) => toast.error(`"${f.name}" גדול מ-10MB`),
    onUnsupported: (mime) => toast.error(`סוג תמונה לא נתמך: ${mime}`),
  });

  function removePending(idx: number) {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  // Recurrence state
  const existingRule = task?.recurrence_rule as RecurrenceRule | null;
  const [isRecurring, setIsRecurring] = React.useState(!!existingRule);
  const [recurrenceType, setRecurrenceType] = React.useState<RecurrenceRule["type"]>(existingRule?.type ?? "weekly");
  const [recurrenceDay, setRecurrenceDay] = React.useState(existingRule?.day ?? 0);
  const [recurrenceInterval, setRecurrenceInterval] = React.useState(existingRule?.interval ?? 7);
  const [recurrenceEndDate, setRecurrenceEndDate] = React.useState(existingRule?.end_date ?? "");

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
    const recurrenceRule: RecurrenceRule | null = isRecurring ? {
      type: recurrenceType,
      day: recurrenceType === "custom" ? 0 : recurrenceDay,
      interval: recurrenceType === "custom" ? recurrenceInterval : 1,
      end_date: recurrenceEndDate || null,
    } : null;
    const payload: TaskInput = {
      title: finalTitle, client_id: isGeneral ? null : clientId, description: description.trim() || null,
      status, due_date: dueDate || null, assignee_ids: assigneeIds, watcher_ids: watcherIds, tag_ids: tagIds,
      recurrence_rule: recurrenceRule,
    };
    const res = task ? await updateTask(task.id, payload) : await createTask(payload);
    if ("error" in res) { setPending(false); toast.error(res.error); return; }

    // Upload pasted/queued image attachments to the (now-existing) task.
    const taskId = task?.id ?? (res as { taskId?: string }).taskId;
    if (taskId && pendingAttachments.length > 0) {
      const results = await Promise.all(pendingAttachments.map(async (file) => {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("fileName", file.name);
        fd.append("taskId", taskId);
        return uploadAttachment(fd);
      }));
      const failed = results.filter((r) => "error" in r);
      if (failed.length > 0) {
        toast.error(`חלק מהקבצים לא הועלו (${failed.length})`);
      }
    }

    setPending(false);
    setPendingAttachments([]);
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
              <ClientCombobox
                value={clientId}
                onChange={handleClientChange}
                clients={clients}
                size="sm"
              />
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

            <RecurrenceSection
              compact
              isRecurring={isRecurring}
              setIsRecurring={setIsRecurring}
              recurrenceType={recurrenceType}
              setRecurrenceType={setRecurrenceType}
              recurrenceDay={recurrenceDay}
              setRecurrenceDay={setRecurrenceDay}
              recurrenceInterval={recurrenceInterval}
              setRecurrenceInterval={setRecurrenceInterval}
              recurrenceEndDate={recurrenceEndDate}
              setRecurrenceEndDate={setRecurrenceEndDate}
              dueDate={dueDate}
            />

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
              <CollapsibleTextarea id="description" value={description} onChange={setDescription} placeholder="הוסף תיאור..." team={team} isExisting={!!task} onPaste={handlePasteDescription} />
              <PendingAttachmentsPreview files={pendingAttachments} previews={attachmentPreviews} onRemove={removePending} uploading={pending} />
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <Label>לקוח</Label>
              <ClientCombobox
                value={clientId}
                onChange={handleClientChange}
                clients={clients}
              />
            </div>

            <DescriptionField
              value={description}
              onChange={setDescription}
              team={team}
              isExisting={!!task}
              onPaste={handlePasteDescription}
            />
            <PendingAttachmentsPreview files={pendingAttachments} previews={attachmentPreviews} onRemove={removePending} uploading={pending} />

            <div className="flex flex-col gap-1.5">
              <Label>סטטוס</Label>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((opt) => {
                  const light = STATUS_LIGHT[opt.value] ?? { bg: "#F7F7F8", text: "#1A1A1A", dot: "#C4C4C4" };
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

            <RecurrenceSection
              isRecurring={isRecurring}
              setIsRecurring={setIsRecurring}
              recurrenceType={recurrenceType}
              setRecurrenceType={setRecurrenceType}
              recurrenceDay={recurrenceDay}
              setRecurrenceDay={setRecurrenceDay}
              recurrenceInterval={recurrenceInterval}
              setRecurrenceInterval={setRecurrenceInterval}
              recurrenceEndDate={recurrenceEndDate}
              setRecurrenceEndDate={setRecurrenceEndDate}
              dueDate={dueDate}
            />

            <div className="flex flex-col gap-1.5">
              <Label>אחראים</Label>
              <div className="flex flex-wrap gap-2">
                {team.map((m) => {
                  const active = assigneeIds.includes(m.id);
                  return (
                    <button key={m.id} type="button" onClick={() => toggleAssignee(m.id)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-caption transition-[color,background-color,opacity,box-shadow] duration-200",
                        active ? "bg-link text-white" : "border border-border bg-white text-ink hover:bg-surface",
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

const WEEKDAY_LABELS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const RECURRENCE_TYPES: { value: RecurrenceRule["type"]; label: string }[] = [
  { value: "weekly", label: "שבועי" },
  { value: "monthly", label: "חודשי" },
  { value: "custom", label: "כל X ימים" },
];

function RecurrenceSection({
  compact,
  isRecurring,
  setIsRecurring,
  recurrenceType,
  setRecurrenceType,
  recurrenceDay,
  setRecurrenceDay,
  recurrenceInterval,
  setRecurrenceInterval,
  recurrenceEndDate,
  setRecurrenceEndDate,
  dueDate,
}: {
  compact?: boolean;
  isRecurring: boolean;
  setIsRecurring: (v: boolean) => void;
  recurrenceType: RecurrenceRule["type"];
  setRecurrenceType: (v: RecurrenceRule["type"]) => void;
  recurrenceDay: number;
  setRecurrenceDay: (v: number) => void;
  recurrenceInterval: number;
  setRecurrenceInterval: (v: number) => void;
  recurrenceEndDate: string;
  setRecurrenceEndDate: (v: string) => void;
  dueDate: string;
}) {
  const labelClass = compact ? "text-xs font-medium text-ink-secondary" : "";
  const gapClass = compact ? "gap-1" : "gap-1.5";

  // When due date changes and type is monthly, default day to due date's day
  React.useEffect(() => {
    if (recurrenceType === "monthly" && dueDate) {
      const d = new Date(dueDate);
      if (!isNaN(d.getTime())) setRecurrenceDay(d.getDate());
    }
  }, [dueDate, recurrenceType, setRecurrenceDay]);

  return (
    <div className={`flex flex-col ${gapClass}`}>
      <button
        type="button"
        onClick={() => setIsRecurring(!isRecurring)}
        className={cn(
          "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
          isRecurring
            ? "bg-link/10 text-link"
            : "border border-border bg-white text-ink-muted hover:bg-surface",
        )}
      >
        <Repeat className="h-4 w-4" />
        משימה חוזרת
      </button>

      {isRecurring && (
        <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface/50 p-3">
          {/* Type selector */}
          <div className="flex gap-1.5">
            {RECURRENCE_TYPES.map((rt) => (
              <button
                key={rt.value}
                type="button"
                onClick={() => setRecurrenceType(rt.value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  recurrenceType === rt.value
                    ? "bg-link text-white"
                    : "bg-white text-ink border border-border hover:bg-surface",
                )}
              >
                {rt.label}
              </button>
            ))}
          </div>

          {/* Weekly: day-of-week selector */}
          {recurrenceType === "weekly" && (
            <div className="flex gap-1">
              {WEEKDAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRecurrenceDay(i)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition",
                    recurrenceDay === i
                      ? "bg-link text-white"
                      : "bg-white text-ink border border-border hover:bg-surface",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Monthly: day of month */}
          {recurrenceType === "monthly" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-secondary">יום בחודש:</span>
              <Input
                type="number"
                min={1}
                max={31}
                value={recurrenceDay}
                onChange={(e) => setRecurrenceDay(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                className="h-8 w-16 text-center text-sm"
              />
            </div>
          )}

          {/* Custom: every X days */}
          {recurrenceType === "custom" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-secondary">כל</span>
              <Input
                type="number"
                min={1}
                value={recurrenceInterval}
                onChange={(e) => setRecurrenceInterval(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-8 w-16 text-center text-sm"
              />
              <span className="text-xs text-ink-secondary">ימים</span>
            </div>
          )}

          {/* End date (optional) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-secondary">עד תאריך:</span>
            <Input
              type="date"
              value={recurrenceEndDate}
              onChange={(e) => setRecurrenceEndDate(e.target.value)}
              className="h-8 text-sm"
              placeholder="ללא הגבלה"
            />
            {recurrenceEndDate && (
              <button type="button" onClick={() => setRecurrenceEndDate("")} className="text-xs text-ink-muted hover:text-ink">✕</button>
            )}
          </div>

          {/* Preview description */}
          <p className="text-xs text-ink-muted">
            {formatRecurrenceDescription({
              type: recurrenceType,
              day: recurrenceType === "custom" ? 0 : recurrenceDay,
              interval: recurrenceType === "custom" ? recurrenceInterval : 1,
              end_date: recurrenceEndDate || null,
            })}
          </p>
        </div>
      )}
    </div>
  );
}

function DescriptionField({
  value,
  onChange,
  team,
  isExisting,
  onPaste,
}: {
  value: string;
  onChange: (v: string) => void;
  team: TeamMember[];
  isExisting: boolean;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
}) {
  const [editing, setEditing] = React.useState(!isExisting);
  const teamNames = React.useMemo(() => team.map((m) => m.full_name), [team]);

  if (!editing && isExisting) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label>תיאור</Label>
        <div
          onClick={() => setEditing(true)}
          className="min-h-[2.75rem] cursor-pointer whitespace-pre-wrap rounded-lg border border-transparent p-3 text-body-sm text-ink transition-colors hover:border-border hover:bg-surface/50"
        >
          {value
            ? renderDescriptionContent(value, teamNames)
            : <span className="text-ink-muted">הוסף תיאור...</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="description">תיאור</Label>
      <MentionTextarea
        id="description"
        value={value}
        onChange={onChange}
        team={team}
        placeholder="פרטים נוספים (לא חובה). אפשר להדביק תמונות (Cmd/Ctrl+V)"
        autoFocus={isExisting}
        onBlur={isExisting ? () => setEditing(false) : undefined}
        onPaste={onPaste}
      />
    </div>
  );
}

function CollapsibleTextarea({
  id, value, onChange, placeholder, team, isExisting, onPaste,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  team: TeamMember[];
  isExisting: boolean;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
}) {
  const [editing, setEditing] = React.useState(!isExisting);
  const [expanded, setExpanded] = React.useState(false);
  const teamNames = React.useMemo(() => team.map((m) => m.full_name), [team]);
  const isLong = value.length > 300;
  const collapsed = isLong && !expanded;

  if (!editing && isExisting) {
    return (
      <div className="flex flex-col gap-1">
        <div
          onClick={() => setEditing(true)}
          className={cn(
            "cursor-pointer whitespace-pre-wrap rounded-lg border border-transparent p-3 text-body-sm text-ink transition-colors hover:border-border hover:bg-surface/50",
            collapsed && "max-h-32 overflow-hidden relative",
          )}
        >
          {value
            ? renderDescriptionContent(value, teamNames)
            : <span className="text-ink-muted">{placeholder}</span>}
          {collapsed && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-xl bg-gradient-to-t from-white to-transparent" />
          )}
        </div>
        {isLong && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            className="self-start text-xs font-medium text-link hover:underline"
          >
            {expanded ? "הצג פחות" : "קרא עוד"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <MentionTextarea
          id={id}
          value={value}
          onChange={onChange}
          team={team}
          placeholder={placeholder}
          rows={5}
          className={cn("min-h-[150px] text-base")}
          autoFocus={isExisting}
          onBlur={isExisting ? () => setEditing(false) : undefined}
          onPaste={onPaste}
        />
      </div>
    </div>
  );
}

function PendingAttachmentsPreview({
  files, previews, onRemove, uploading,
}: {
  files: File[];
  previews: string[];
  onRemove: (idx: number) => void;
  uploading: boolean;
}) {
  if (files.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {files.map((f, i) => (
        <span key={i} className="relative inline-block">
          {f.type.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previews[i]}
              alt={f.name}
              className={cn(
                "h-16 w-16 rounded-lg border border-border object-cover transition-opacity",
                uploading && "opacity-50",
              )}
            />
          ) : (
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-surface text-ink-muted">
              <FileIcon className="h-5 w-5" />
            </span>
          )}
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-link border-t-transparent" />
            </span>
          )}
          {!uploading && (
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute -end-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white shadow-elevation-2 hover:bg-ink-hover"
              aria-label="הסר קובץ"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
    </div>
  );
}

