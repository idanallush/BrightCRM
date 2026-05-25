"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { updateTaskStatus } from "@/app/(app)/tasks/actions";
import { toast } from "@/components/ui/toaster";
import { useRouter } from "next/navigation";

export function MarkDoneButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setPending(true);
    const res = await updateTaskStatus(taskId, "בוצע");
    if ("error" in res) {
      toast.error(res.error);
      setPending(false);
      return;
    }
    toast.success("סומן כבוצע");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      title="סמן כבוצע"
      className="rounded-md p-1 text-ink-muted transition-colors hover:bg-[#00C875]/10 hover:text-[#00C875] disabled:opacity-50"
    >
      <Check className="h-4 w-4" />
    </button>
  );
}
