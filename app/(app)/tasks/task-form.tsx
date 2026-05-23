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
import { cn } from "@/lib/utils";
import { createTask, updateTask, type TaskInput } from "./actions";
import type { Client, TaskWithRelations, TeamMember } from "@/lib/data";

const STATUS_OPTIONS: { value: TaskInput["status"]; label: string; dot: string }[] = [
  { value: "מחכה לטיפול", label: "ממתין", dot: "bg-st-waiting" },
  { value: "נכנס לעבודה", label: "נכנס לעבודה", dot: "bg-blue-500" },
  { value: "בעבודה", label: "בעבודה", dot: "bg-purple-500" },
  { value: "אישור לקוח", label: "אישור לקוח", dot: "bg-st-approval" },
  { value: "אישור מנהל", label: "אישור מנהל", dot: "bg-b-pink" },
  { value: "בוצע", label: "בוצע", dot: "bg-st-done" },
  { value: "בוטל", label: "בוטל", dot: "bg-stone" },
];

function getInitials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export function TaskForm({
  task, clients, team, onDone, compact = false,
}: {
  task?: TaskWithRelations;
  clients: Client[];
  team: TeamMember[];
  onDone: () => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const [title, setTitle] = React.useState(task?.title ?? "");
  const [clientId, setClientId] = React.useState(task?.client_id ?? clients[0]?.id ?? "");
  const [description, setDescription] = React.useState(task?.description ?? "");
  const [status, setStatus] = React.useState<TaskInput["status"]>(
    (task?.status as TaskInput["status"]) ?? "נכנס לעבודה",
  );
  const [dueDate, setDueDate] = React.useState(task?.due_date ?? "");
  const [assigneeIds, setAssigneeIds] = React.useState<string[]>(
    task?.assignees.map((a) => a.id) ?? [],
  );

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error("חסרה כותרת"); return; }
    if (!clientId) { toast.error("בחר לקוח"); return; }
    setPending(true);
    const payload: TaskInput = {
      title: title.trim(), client_id: clientId, description: description.trim() || null,
      status, due_date: dueDate || null, assignee_ids: assigneeIds,
    };
    const res = task ? await updateTask(task.id, payload) : await createTask(payload);
    setPending(false);
    if ("error" in res) { toast.error(res.error); return; }
    toast.success(task ? "המשימה עודכנה" : "המשימה נוצרה");
    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className={compact ? "flex flex-col" : "flex min-h-0 flex-1 flex-col"}>
      <div className={compact ? "flex flex-col gap-4" : "-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 pb-1"}>
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">כותרת</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="מה צריך לעשות?" autoFocus />
        </div>

        {/* Client */}
        <div className="flex flex-col gap-1.5">
          <Label>לקוח</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger><SelectValue placeholder="בחר לקוח" /></SelectTrigger>
            <SelectContent>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">תיאור</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="פרטים נוספים (לא חובה)" />
        </div>

        {/* Status — visual pills */}
        <div className="flex flex-col gap-1.5">
          <Label>סטטוס</Label>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((opt) => (
              <button key={opt.value} type="button" onClick={() => setStatus(opt.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-caption transition-all duration-200",
                  status === opt.value
                    ? "bg-ink-deep font-medium text-white shadow-subtle"
                    : "bg-surface text-slate hover:bg-gray-200",
                )}>
                <span className={cn("h-2 w-2 rounded-full", status === opt.value ? "bg-white" : opt.dot)} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Due date */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="due">תאריך יעד</Label>
          <Input id="due" type="date" value={dueDate ?? ""} onChange={(e) => setDueDate(e.target.value)} />
        </div>

        {/* Assignees */}
        <div className="flex flex-col gap-1.5">
          <Label>אחראים</Label>
          <div className="flex flex-wrap gap-2">
            {team.map((m) => {
              const active = assigneeIds.includes(m.id);
              return (
                <button key={m.id} type="button" onClick={() => toggleAssignee(m.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-caption transition-all duration-200",
                    active ? "bg-primary text-white shadow-subtle" : "border border-hairline bg-white text-ink hover:bg-surface-soft",
                  )}>
                  <span className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold",
                    active ? "bg-white/20 text-white" : "bg-tint-sky text-link",
                  )}>
                    {getInitials(m.full_name)}
                  </span>
                  {m.full_name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 flex shrink-0 flex-row-reverse gap-2 border-t border-hairline pt-3">
        <Button type="submit" disabled={pending}>
          {pending ? "שומר..." : task ? "שמירה" : "צור משימה"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>ביטול</Button>
      </div>
    </form>
  );
}
