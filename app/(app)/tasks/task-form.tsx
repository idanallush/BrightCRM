"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { createTask, updateTask, type TaskInput } from "./actions";
import type { Client, TaskWithRelations, TeamMember } from "@/lib/data";

const STATUSES: TaskInput["status"][] = ["בעבודה", "בוצע", "סגור"];

export function TaskForm({
  task,
  clients,
  team,
  onDone,
}: {
  task?: TaskWithRelations;
  clients: Client[];
  team: TeamMember[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const [title, setTitle] = React.useState(task?.title ?? "");
  const [clientId, setClientId] = React.useState(task?.client_id ?? clients[0]?.id ?? "");
  const [description, setDescription] = React.useState(task?.description ?? "");
  const [status, setStatus] = React.useState<TaskInput["status"]>(
    (task?.status as TaskInput["status"]) ?? "בעבודה",
  );
  const [dueDate, setDueDate] = React.useState(task?.due_date ?? "");
  const [assigneeIds, setAssigneeIds] = React.useState<string[]>(
    task?.assignees.map((a) => a.id) ?? [],
  );

  function toggleAssignee(id: string) {
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("חסרה כותרת");
      return;
    }
    if (!clientId) {
      toast.error("בחר לקוח");
      return;
    }
    setPending(true);
    const payload: TaskInput = {
      title: title.trim(),
      client_id: clientId,
      description: description.trim() || null,
      status,
      due_date: dueDate || null,
      assignee_ids: assigneeIds,
    };
    const res = task ? await updateTask(task.id, payload) : await createTask(payload);
    setPending(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    toast.success(task ? "המשימה עודכנה" : "המשימה נוצרה");
    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 pb-1">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">כותרת</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="מה צריך לעשות?"
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>לקוח</Label>
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger>
            <SelectValue placeholder="בחר לקוח" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">תיאור</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="פרטים נוספים (לא חובה)"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>סטטוס</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as TaskInput["status"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="due">תאריך יעד</Label>
          <Input
            id="due"
            type="date"
            value={dueDate ?? ""}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>אחראים</Label>
        <div className="flex flex-wrap gap-2">
          {team.map((m) => {
            const active = assigneeIds.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleAssignee(m.id)}
                className={
                  active
                    ? "rounded-full bg-[color:var(--color-brand)] px-3 py-1 text-xs text-white"
                    : "rounded-full border border-[color:var(--color-hairline)] bg-white px-3 py-1 text-xs text-[color:var(--color-ink)] hover:bg-black/5"
                }
              >
                {m.full_name}
              </button>
            );
          })}
        </div>
      </div>

      </div>
      <div className="mt-3 flex shrink-0 flex-row-reverse gap-2 border-t border-[color:var(--color-hairline)] pt-3">
        <Button type="submit" disabled={pending}>
          {pending ? "שומר..." : task ? "שמירה" : "צור משימה"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
          ביטול
        </Button>
      </div>
    </form>
  );
}
