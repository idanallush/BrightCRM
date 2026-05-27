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
  ChevronLeft,
  ChevronRight,
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

/* ───── Lightbox Gallery ───── */

function ImageLightbox({
  images,
  startIndex,
  onClose,
}: {
  images: { url: string; name: string }[];
  startIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = React.useState(startIndex);
  const img = images[idx];

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIdx((i) => (i + 1) % images.length);
      if (e.key === "ArrowRight") setIdx((i) => (i - 1 + images.length) % images.length);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [images.length, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute left-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
          {idx + 1} / {images.length}
        </div>
      )}

      {/* Prev/Next */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setIdx((i) => (i + 1) % images.length); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setIdx((i) => (i - 1 + images.length) % images.length); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img.url}
        alt={img.name}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-elevation-5"
      />

      {/* Filename */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-sm text-white">
        {img.name}
      </div>
    </div>
  );
}

/* ───── FileList ───── */

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
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

  const imageAttachments = React.useMemo(
    () => attachments.filter((a) => isImage(a.content_type) && thumbUrls?.[a.storage_path]),
    [attachments, thumbUrls],
  );

  function openLightbox(attachment: Attachment) {
    const idx = imageAttachments.findIndex((a) => a.id === attachment.id);
    if (idx >= 0) setLightboxIndex(idx);
  }

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

  const lightboxImages = imageAttachments.map((a) => ({
    url: thumbUrls![a.storage_path]!,
    name: a.file_name,
  }));

  return (
    <>
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-white">
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
                    className="h-8 w-8 cursor-pointer rounded object-cover transition-opacity hover:opacity-80"
                    onClick={() => openLightbox(a)}
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

      {lightboxIndex !== null && (
        <ImageLightbox
          images={lightboxImages}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
