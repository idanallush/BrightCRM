"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { uploadAttachment } from "@/app/actions/attachments";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT =
  "image/jpeg,image/png,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.ms-excel";

export function FileUpload({
  clientId,
  taskId,
  onUploaded,
}: {
  clientId?: string;
  taskId?: string;
  /** Called after each successful upload. Use to refetch in client contexts. */
  onUploaded?: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    for (const file of list) {
      if (file.size > MAX_BYTES) {
        toast.error(`"${file.name}" גדול מ-10MB`);
        continue;
      }
      setPending(true);
      // We don't have a real upload-progress event from the server action
      // (the file is streamed to the server). Show an indeterminate-ish bar
      // that walks toward 90% and snaps to 100% when the action resolves.
      setProgress(5);
      const tick = setInterval(
        () => setProgress((p) => (p < 90 ? p + 5 : p)),
        180,
      );

      const fd = new FormData();
      fd.append("file", file);
      if (clientId) fd.append("clientId", clientId);
      if (taskId) fd.append("taskId", taskId);
      const res = await uploadAttachment(fd);

      clearInterval(tick);
      setProgress(100);
      setPending(false);
      setTimeout(() => setProgress(0), 400);

      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success(`"${file.name}" הועלה`);
        router.refresh();
        onUploaded?.();
      }
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-[18px] border-2 border-dashed p-6 text-center transition",
          dragOver
            ? "border-[color:var(--color-brand)] bg-[color:var(--color-brand)]/5"
            : "border-[color:var(--color-hairline)] bg-white",
        )}
      >
        <Upload className="h-6 w-6 text-[color:var(--color-ink-muted)]" />
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          גרור קובץ לכאן או
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> מעלה...
            </>
          ) : (
            "בחר קובץ"
          )}
        </Button>
        <p className="text-xs text-[color:var(--color-ink-muted)]">
          תמונות (jpg/png/webp), PDF, docx, xlsx · עד 10MB
        </p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPT}
          multiple
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {progress > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/5">
          <div
            className="h-full bg-[color:var(--color-brand)] transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
