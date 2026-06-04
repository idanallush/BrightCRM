"use client";

import { useState, useRef } from "react";
import {
  MessageSquarePlus,
  X,
  Upload,
  Loader2,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { submitFeedback } from "@/app/(app)/feedback-action";
import { createClient } from "@/lib/supabase/client";
import { usePathname } from "next/navigation";

type Category = "באג" | "שיפור" | "פיצ׳ר חדש";

const CATEGORIES: { label: string; value: Category }[] = [
  { label: "באג 🐛", value: "באג" },
  { label: "שיפור ✨", value: "שיפור" },
  { label: "פיצ׳ר חדש 🚀", value: "פיצ׳ר חדש" },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [message, setMessage] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [filePreview, setFilePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  function reset() {
    setCategory(null);
    setMessage("");
    setFileUrl("");
    setFileName("");
    setFilePreview("");
    setUploading(false);
    setSubmitting(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("הקובץ גדול מ-5MB");
      return;
    }

    setUploading(true);
    setFileName(file.name);

    // Show preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }

    try {
      const sb = createClient();
      const path = `feedback/${Date.now()}_${file.name}`;
      const { error } = await sb.storage.from("attachments").upload(path, file);

      if (error) throw error;

      const { data: urlData } = sb.storage
        .from("attachments")
        .getPublicUrl(path);
      setFileUrl(urlData.publicUrl);
    } catch (err) {
      console.error("[Feedback] Upload failed:", err);
      toast.error("העלאת הקובץ נכשלה");
      setFileName("");
      setFilePreview("");
    } finally {
      setUploading(false);
      // Reset file input so the same file can be re-selected
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit() {
    if (!category || !message.trim()) return;

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("category", category);
      fd.set("message", message);
      fd.set("pageUrl", pathname);
      if (fileUrl) fd.set("fileUrl", fileUrl);

      const result = await submitFeedback(fd);

      if ("error" in result) {
        toast.error(result.error || "שליחה נכשלה, נסו שוב");
      } else {
        toast.success("תודה! הדיווח נשלח בהצלחה");
        handleOpenChange(false);
      }
    } catch {
      toast.error("שליחה נכשלה, נסו שוב");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-40 end-5 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-elevation-3 transition hover:scale-105 md:bottom-20"
        aria-label="שליחת משוב"
      >
        <MessageSquarePlus className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogTitle>דיווח ומשוב</DialogTitle>
          <DialogDescription>
            נתקלתם בבאג? רוצים לשפר, לתקן או להוסיף פיצ׳ר חדש? רשמו לי הכל
            כאן
          </DialogDescription>

          <div className="flex flex-col gap-4">
            {/* Category selector */}
            <div className="flex gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                    category === cat.value
                      ? "bg-primary text-white"
                      : "border border-border bg-surface text-ink"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Message textarea */}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="תארו מה קרה או מה הייתם רוצים..."
              rows={3}
              className="w-full resize-y rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />

            {/* File upload */}
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-sm text-ink-muted transition hover:border-primary hover:text-primary disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                הוסיפו תמונה או קובץ
              </button>

              {fileName && (
                <div className="mt-2 flex items-center gap-2 text-sm text-ink-secondary">
                  {filePreview ? (
                    <img
                      src={filePreview}
                      alt="preview"
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                  <span className="truncate">{fileName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFileUrl("");
                      setFileName("");
                      setFilePreview("");
                    }}
                    className="mr-auto text-ink-muted hover:text-ink"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={!category || !message.trim() || submitting}
              className="w-full rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "שליחה"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
