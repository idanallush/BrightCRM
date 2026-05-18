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
} from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
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
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("he-IL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

export function FileList({
  attachments,
  thumbUrls,
  onChange,
}: {
  attachments: Attachment[];
  /** Map of storage_path → signed thumbnail URL for image attachments. */
  thumbUrls?: Record<string, string | null>;
  /** Called after delete succeeds. Use to refetch in client contexts. */
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
    // Use a synthetic link click — works in both Safari and Chrome.
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

  if (attachments.length === 0) {
    return (
      <EmptyState
        icon={<span>📎</span>}
        title="אין קבצים מצורפים"
        description="גרור קובץ לאזור ההעלאה או לחץ 'בחר קובץ'."
      />
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-[color:var(--color-hairline)] rounded-[18px] border border-[color:var(--color-hairline)] bg-white">
      {attachments.map((a) => {
        const Icon = iconFor(a.content_type);
        const thumb =
          isImage(a.content_type) && thumbUrls?.[a.storage_path]
            ? thumbUrls[a.storage_path]
            : null;
        const isConfirming = confirmingId === a.id;
        return (
          <li key={a.id} className="flex items-center gap-3 p-3">
            <div className="shrink-0">
              {thumb ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={thumb}
                  alt=""
                  className="h-10 w-10 rounded-md object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-black/5">
                  <Icon className="h-5 w-5 text-[color:var(--color-ink-muted)]" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-[color:var(--color-ink)]">
                {a.file_name}
              </div>
              <div className="truncate text-xs text-[color:var(--color-ink-muted)]">
                {humanSize(a.file_size)} · {fmtDate(a.created_at)}
                {a.uploader_name ? ` · ${a.uploader_name}` : ""}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {isConfirming ? (
                <>
                  <span className="text-xs text-red-700">למחוק?</span>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onDelete(a.id)}
                  >
                    מחק
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmingId(null)}
                  >
                    ביטול
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="הורדה"
                    onClick={() => onDownload(a.id)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="מחיקה"
                    onClick={() => setConfirmingId(a.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
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
