"use client";

import * as React from "react";
import Link from "next/link";
import { Send, Bot, Loader2 } from "lucide-react";
import { StatusCell } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

type TaskResult = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  client_name: string | null;
};

type ClientResult = {
  id: string;
  name: string;
  health: string | null;
};

type ChatResponse = {
  text: string;
  tasks?: TaskResult[];
  clients?: ClientResult[];
  error?: string;
};

const QUICK_ACTIONS = [
  { label: "מה המשימות שלי להיום?", action: "today" },
  { label: "מה באיחור?", action: "overdue" },
  { label: "סיכום שבועי", action: "weekly" },
  { label: "משימות בלי דדליין", action: "no_deadline" },
  { label: "לקוחות שצריכים תשומת לב", action: "attention_clients" },
];

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("he-IL") : "ללא דדליין";

export function AiChat({ userEmail }: { userEmail: string }) {
  const [question, setQuestion] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [response, setResponse] = React.useState<ChatResponse | null>(null);

  async function ask(opts: { action?: string; question?: string }) {
    setLoading(true);
    setResponse(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...opts, userEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResponse({ text: data.error ?? "שגיאה", error: data.error });
      } else {
        setResponse(data);
      }
    } catch {
      setResponse({ text: "שגיאה בתקשורת. נסה שוב.", error: "network" });
    }
    setLoading(false);
    setQuestion("");
  }

  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Bot className="h-4 w-4 text-primary" />
        <h2 className="text-base font-bold text-ink">עוזר</h2>
      </div>

      <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {QUICK_ACTIONS.map((qa) => (
          <button
            key={qa.action}
            type="button"
            onClick={() => ask({ action: qa.action })}
            disabled={loading}
            className="whitespace-nowrap rounded-full bg-surface px-3.5 py-2 text-caption text-ink-secondary transition-colors hover:bg-surface-soft hover:text-ink disabled:opacity-50"
          >
            {qa.label}
          </button>
        ))}
      </div>

      <div className="relative mb-3">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && question.trim() && !loading) {
              ask({ question: question.trim() });
            }
          }}
          placeholder="שאל שאלה..."
          disabled={loading}
          className="h-10 w-full rounded-md border border-border bg-surface pe-12 ps-4 text-sm text-ink placeholder:text-ink-muted transition-colors focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
        />
        <Button
          size="icon"
          onClick={() => question.trim() && ask({ question: question.trim() })}
          disabled={!question.trim() || loading}
          className="absolute start-1 top-1/2 h-8 w-8 -translate-y-1/2"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 py-4 text-sm text-ink-secondary"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            חושב...
          </motion.div>
        )}

        {!loading && response && (
          <motion.div
            key="response"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className={`rounded-md p-4 text-sm leading-relaxed ${response.error ? "bg-red-50 text-overdue" : "bg-surface text-ink"}`}>
              <p className="whitespace-pre-wrap">{response.text}</p>
            </div>

            {response.tasks && response.tasks.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {response.tasks.map((t) => {
                  const today = new Date().toISOString().slice(0, 10);
                  const overdue = t.due_date && t.due_date < today;
                  return (
                    <Link
                      key={t.id}
                      href={`/tasks?task=${t.id}`}
                      className="flex items-center gap-3 rounded-md border border-border bg-white p-3 transition-colors duration-150 hover:bg-[#F5F6F8]"
                    >
                      <StatusCell status={t.status} className="shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-ink">{t.title}</span>
                        {t.client_name && (
                          <span className="me-2 text-caption text-ink-secondary">{t.client_name}</span>
                        )}
                      </div>
                      <span className={`text-caption ${overdue ? "font-medium text-overdue" : "text-ink-muted"}`}>
                        {fmtDate(t.due_date)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}

            {response.clients && response.clients.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {response.clients.map((c) => (
                  <Link
                    key={c.id}
                    href={`/clients/${c.id}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-sm transition-colors duration-150 hover:bg-[#F5F6F8]"
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        c.health === "קריטי" ? "bg-health-critical"
                          : c.health === "אסטרטגיה צריכה" ? "bg-health-strategy"
                            : "bg-health-good"
                      }`}
                    />
                    <span className="font-medium text-ink">{c.name}</span>
                    {c.health && <span className="text-caption text-ink-secondary">{c.health}</span>}
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
