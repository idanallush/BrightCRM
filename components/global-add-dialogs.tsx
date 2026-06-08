"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useGlobalDialog } from "@/app/(app)/shell-context";
import { createClient } from "@/lib/supabase/client";
import { TaskForm } from "@/app/(app)/tasks/task-form";
import { ClientForm } from "@/app/(app)/clients/client-form";
import type { Client, Tag, TeamMember } from "@/lib/data";

export function GlobalAddDialogs() {
  const router = useRouter();
  const { openDialog, setOpenDialog } = useGlobalDialog();
  const [clients, setClients] = React.useState<Client[]>([]);
  const [team, setTeam] = React.useState<TeamMember[]>([]);
  const [tags, setTags] = React.useState<Tag[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!openDialog || loaded) return;
    const sb = createClient();
    Promise.all([
      sb.from("clients").select("*,client_account_managers(member_id,team_members(id,full_name))").order("name"),
      sb.from("team_members").select("*").order("full_name"),
      sb.from("tags").select("*").order("name"),
    ]).then(([c, t, tg]) => {
      setClients((c.data ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        account_managers: ((row.client_account_managers as { team_members: { id: string; full_name: string } }[]) ?? [])
          .map((cam) => cam.team_members).filter(Boolean),
      })) as Client[]);
      setTeam((t.data ?? []) as TeamMember[]);
      setTags((tg.data ?? []) as Tag[]);
      setLoaded(true);
    });
  }, [openDialog, loaded]);

  function handleClose() {
    setOpenDialog(null);
    setLoaded(false);
  }

  function handleDone() {
    handleClose();
    router.refresh();
  }

  return (
    <>
      <Dialog open={openDialog === "task"} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>משימה חדשה</DialogTitle>
            <DialogDescription>שדות חובה: כותרת ולקוח.</DialogDescription>
          </DialogHeader>
          {loaded && (
            <TaskForm clients={clients} team={team} tags={tags} onDone={handleDone} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === "client"} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>לקוח חדש</DialogTitle>
            <DialogDescription>שדות חובה: שם בלבד.</DialogDescription>
          </DialogHeader>
          {loaded && (
            <ClientForm team={team} onDone={handleDone} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
