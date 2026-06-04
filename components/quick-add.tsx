"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Hint } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { quickParseTask, createTask } from "@/app/(app)/tasks/actions";
import { toast } from "@/components/ui/toaster";
import type { ParsedTask } from "@/lib/whatsapp/parse-task";

export function QuickAdd() {
  const router = useRouter();
  const [mode, setMode] = React.useState<"closed" | "menu" | "text" | "confirm">("closed");
  const [text, setText] = React.useState("");
  const [parsing, setParsing] = React.useState(false);
  const [parsed, setParsed] = React.useState<ParsedTask | null>(null);
  const [saving, setSaving] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) { if (!wrapRef.current?.contains(e.target as Node)) setMode("closed"); }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setMode("closed"); }
    window.addEventListener("mousedown", onClick); window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("mousedown", onClick); window.removeEventListener("keydown", onKey); };
  }, []);

  React.useEffect(() => {
    if (mode === "text") inputRef.current?.focus();
  }, [mode]);

  async function handleParse() {
    if (!text.trim()) return;
    setParsing(true);
    const res = await quickParseTask(text.trim());
    setParsing(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    setParsed(res.parsed);
    setMode("confirm");
  }

  async function handleConfirm() {
    if (!parsed) return;
    setSaving(true);
    const res = await createTask({
      title: parsed.title,
      client_id: parsed.client_id,
      description: parsed.description || null,
      status: "מחכה לטיפול",
      due_date: parsed.due_date,
      assignee_ids: parsed.assignee_id ? [parsed.assignee_id] : [],
      tag_ids: [],
    });
    setSaving(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    toast.success("המשימה נוצרה");
    setText("");
    setParsed(null);
    setMode("closed");
    router.refresh();
  }

  function openTextMode() {
    setText("");
    setParsed(null);
    setMode("text");
  }

  return (
    <div ref={wrapRef} className="fixed bottom-24 end-5 z-50 flex flex-col items-end gap-2 md:bottom-6">
      <AnimatePresence>
        {/* Menu */}
        {mode === "menu" && (
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ duration: 0.12 }}
            className="flex flex-col gap-0.5 rounded-xl border border-border bg-white p-1.5 shadow-elevation-3">
            <button type="button" onClick={openTextMode}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-right text-body-sm text-ink transition-colors hover:bg-surface">
              <Plus className="h-4 w-4 text-ink-muted" />משימה מהירה
            </button>
            <button type="button" onClick={() => { setMode("closed"); router.push("/tasks?new=true"); }}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-right text-body-sm text-ink-secondary transition-colors hover:bg-surface">
              <Plus className="h-4 w-4 text-ink-muted" />טופס מלא
            </button>
            <button type="button" onClick={() => { setMode("closed"); router.push("/clients?new=true"); }}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-right text-body-sm text-ink-secondary transition-colors hover:bg-surface">
              <Users className="h-4 w-4 text-ink-muted" />לקוח חדש
            </button>
          </motion.div>
        )}

        {/* Text input mode */}
        {mode === "text" && (
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ duration: 0.12 }}
            className="w-96 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-border bg-white p-4 shadow-elevation-3 sm:w-[28rem]">
            <p className="mb-2 text-caption text-ink-secondary">כתוב מה צריך לעשות, כמו בטלגרם:</p>
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && text.trim() && !parsing) handleParse(); }}
              placeholder={'לדוגמה: "להכין באנרים לפולר, דדליין יום ראשון"'}
              disabled={parsing}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            />
            <div className="mt-3 flex justify-between">
              <Button size="sm" onClick={handleParse} disabled={!text.trim() || parsing}>
                {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : "פענח"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setMode("closed")}>ביטול</Button>
            </div>
          </motion.div>
        )}

        {/* Confirm parsed result */}
        {mode === "confirm" && parsed && (
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ duration: 0.12 }}
            className="w-96 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-border bg-white p-4 shadow-elevation-3 sm:w-[28rem]">
            <p className="mb-2 text-caption font-medium text-ink">זה מה שהבנתי:</p>
            <div className="flex flex-col gap-1.5 text-sm">
              <Row label="משימה" value={parsed.title} />
              <Row label="לקוח" value={parsed.client_name} />
              {parsed.creator_id && parsed.creator_id !== parsed.assignee_id ? (
                <>
                  <Row label="פותח" value={parsed.creator_name} />
                  <Row label="מבצע" value={parsed.assignee_name} />
                </>
              ) : (
                <Row label="אחראי" value={parsed.assignee_name} />
              )}
              <Row label="דדליין" value={parsed.due_date ? new Date(parsed.due_date).toLocaleDateString("he-IL") : "ללא"} />
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={handleConfirm} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> אשר</>}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setMode("text")}>
                <X className="h-4 w-4" /> תקן
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Hint label="יצירה מהירה" side="top" delay={400}>
        <motion.button type="button" onClick={() => setMode((m) => m === "closed" ? "menu" : "closed")} aria-label="יצירה מהירה" whileTap={{ scale: 0.93 }}
          className="flex h-12 flex-row-reverse items-center gap-2 rounded-full bg-accent px-4 text-ink shadow-elevation-2 transition-colors hover:bg-accent/85">
          <Plus className={cn("h-5 w-5 shrink-0 transition-transform duration-150", mode !== "closed" && "rotate-45")} strokeWidth={2.5} />
          <span className="hidden text-sm font-medium md:inline">הוספה מהירה</span>
        </motion.button>
      </Hint>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0 text-ink-muted">{label}:</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
