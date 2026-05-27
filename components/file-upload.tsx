"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, Clipboard } from "lucide-react";
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
  onUploaded?: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [uploaded, setUploaded] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const handleFilesRef = React.useRef(handleFiles);
  handleFilesRef.current = handleFiles;

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0 || pending) return;

    const valid: File[] = [];
    for (const file of list) {
      if (file.size > MAX_BYTES) {
        toast.error(`"${file.name}" גדול מ-10MB`);
      } else {
        valid.push(file);
      }
    }
    if (valid.length === 0) return;

    setPending(true);
    setTotal(valid.length);
    setUploaded(0);

    const results = await Promise.allSettled(
      valid.map(async (file) => {
        const fd = new FormData();
        fd.append("file", file);
        if (clientId) fd.append("clientId", clientId);
        if (taskId) fd.append("taskId", taskId);
        const res = await uploadAttachment(fd);
        setUploaded((n) => n + 1);
        return { file, res };
      }),
    );

    let ok = 0;
    for (const r of results) {
      if (r.status === "fulfilled") {
        if ("error" in r.value.res) {
          toast.error(`${r.value.file.name}: ${r.value.res.error}`);
        } else {
          ok++;
        }
      }
    }

    if (ok > 0) {
      toast.success(ok === 1 ? "קובץ הועלה" : `${ok} קבצים הועלו`);
      router.refresh();
      onUploaded?.();
    }

    setPending(false);
    setTotal(0);
    setUploaded(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  React.useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active as HTMLElement)?.isContentEditable
      )
        return;

      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        handleFilesRef.current(files);
      }
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex items-center gap-2 rounded-xl border-2 border-dashed px-3 py-2 transition",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border bg-white",
        )}
      >
        <Upload className="h-4 w-4 shrink-0 text-ink-muted" />
        <span className="min-w-0 flex-1 text-xs text-ink-muted">
          גרור קבצים, הדבק תמונה (Ctrl+V), או
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-7 shrink-0 text-xs"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
        >
          {pending ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              {total > 1 ? `${uploaded}/${total}` : "מעלה..."}
            </>
          ) : (
            "בחר קבצים"
          )}
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPT}
          multiple
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {pending && total > 1 && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-black/5">
          <div
            className="h-full bg-primary transition-[width] duration-300"
            style={{ width: `${total > 0 ? (uploaded / total) * 100 : 0}%` }}
          />
        </div>
      )}
    </div>
  );
}
