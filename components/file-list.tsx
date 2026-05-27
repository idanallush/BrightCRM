"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileImage,
  File as FileIcon,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import {
  deleteAttachment,
  getSignedDownloadUrl,
  type Attachment,
} from "@/app/actions/attachments";

function isImage(t: string | null) {
  return !!t && t.startsWith("image/");
}

function iconFor(t: string | null) {
  if (!t) return FileIcon;
  if (isImage(t)) return FileImage;
  if (t === "application/pdf") return FileText;
  if (t.includes("spreadsheet") || t.includes("excel")) return FileSpreadsheet;
  if (t.includes("word")) return FileText;
  return FileIcon;
}

function humanSize(bytes: number | null) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function FileList({
  attachments,
  thumbUrls,
  onChange,
}: {
  attachments: Attachment[];
  thumbUrls?: Record<string, string | null>;
  onChange?: () => void;
}) {
  const router = useRouter();
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);

  async function onDownload(id: string) {
    const res = await getSignedDownloadUrl(id);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    const a = document.createElement("a");
    a.href = res.url;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function onDelete(id: string) {
    const res = await deleteAttachment(id);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    toast.success("הקובץ נמחק");
    setConfirmingId(null);
    router.refresh();
    onChange?.();
  }

  if (attachments.length === 0) return null;

  return (
    <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-white">
      {attachments.map((a) => {
        const Icon = iconFor(a.content_type);
        const thumb =
          isImage(a.content_type) && thumbUrls?.[a.storage_path]
            ? thumbUrls[a.storage_path]
            : null;
        const isConfirming = confirmingId === a.id;
        return (
          <li key={a.id} className="flex items-center gap-2 px-2.5 py-1.5">
            <div className="shrink-0">
              {thumb ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={thumb}
                  alt=""
                  className="h-8 w-8 rounded object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded bg-surface">
                  <Icon className="h-4 w-4 text-ink-muted" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-ink">
                {a.file_name}
              </div>
              <div className="truncate text-[11px] text-ink-muted">
                {humanSize(a.file_size)}
                {a.uploader_name ? ` · ${a.uploader_name}` : ""}
              </div>
            </div>

            <div className="flex shrink-0 items-center">
              {isConfirming ? (
                <>
                  <Button
                    variant="danger"
                    size="sm"
                    className="h-6 text-[11px]"
                    onClick={() => onDelete(a.id)}
                  >
                    מחק
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setConfirmingId(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title="הורדה"
                    onClick={() => onDownload(a.id)}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500"
                    title="מחיקה"
                    onClick={() => setConfirmingId(a.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
