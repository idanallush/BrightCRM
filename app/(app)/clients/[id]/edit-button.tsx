"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { ClientForm } from "../client-form";
import { deleteClientRow } from "../actions";
import type { Client, TeamMember } from "@/lib/data";

export function EditClientButton({
  client,
  team,
}: {
  client: Client;
  team: TeamMember[];
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" /> עריכה
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>עריכת לקוח</DialogTitle>
            <DialogDescription>שינויים נשמרים מיד אחרי "שמירה".</DialogDescription>
          </DialogHeader>
          <ClientForm client={client} team={team} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DeleteClientButton({ client }: { client: Client }) {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function onDelete() {
    setPending(true);
    const res = await deleteClientRow(client.id);
    setPending(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    toast.success("הלקוח נמחק");
    router.push("/clients");
  }

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(true)}
        className="text-red-600"
      >
        <Trash2 className="h-4 w-4" /> מחיקה
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-red-700">למחוק את הלקוח?</span>
      <Button variant="danger" size="sm" onClick={onDelete} disabled={pending}>
        {pending ? "מוחק..." : "מחק"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        ביטול
      </Button>
    </div>
  );
}
