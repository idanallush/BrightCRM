"use client";

import * as React from "react";
import Link from "next/link";
import { Send, Bot, Loader2 } from "lucide-react";
import { Badge, statusVariant } from "@/components/ui/badge";
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
    <div className="rounded-xl border border-gray-200/60 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-light">
          <Bot className="h-4 w-4 text-brand" />
        </div>
        <h2 className="text-sm font-semibold text-gray-800">עוזר BrightCRM</h2>
      </div>

      {/* Quick actions */}
      <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {QUICK_ACTIONS.map((qa) => (
          <button
            key={qa.action}
            type="button"
            onClick={() => ask({ action: qa.action })}
            disabled={loading}
            className="whitespace-nowrap rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-600 transition-all duration-200 hover:bg-brand-light hover:text-brand disabled:opacity-50"
          >
            {qa.label}
          </button>
        ))}
      </div>

      {/* Input */}
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
          className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pe-12 ps-4 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={() => question.trim() && ask({ question: question.trim() })}
          disabled={!question.trim() || loading}
          className="absolute start-1 top-1/2 h-8 w-8 -translate-y-1/2 text-brand"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Response */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 py-4 text-sm text-gray-400"
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
            {/* Text */}
            <div className={`rounded-lg p-4 text-sm leading-relaxed ${response.error ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-700"}`}>
              <p className="whitespace-pre-wrap">{response.text}</p>
            </div>

            {/* Task results */}
            {response.tasks && response.tasks.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {response.tasks.map((t) => {
                  const today = new Date().toISOString().slice(0, 10);
                  const overdue = t.due_date && t.due_date < today;
                  return (
                    <Link
                      key={t.id}
                      href={`/tasks?task=${t.id}`}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-all duration-200 hover:shadow-sm"
                    >
                      <Badge variant={statusVariant(t.status)} className="shrink-0">
                        {t.status}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-gray-900">
                          {t.title}
                        </span>
                        {t.client_name && (
                          <span className="mr-2 text-caption text-gray-400">
                            {t.client_name}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-caption ${overdue ? "font-medium text-red-500" : "text-gray-400"}`}
                      >
                        {fmtDate(t.due_date)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Client results */}
            {response.clients && response.clients.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {response.clients.map((c) => (
                  <Link
                    key={c.id}
                    href={`/clients/${c.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm transition-all duration-200 hover:shadow-sm"
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        c.health === "קריטי"
                          ? "bg-red-500"
                          : c.health === "אסטרטגיה צריכה"
                            ? "bg-amber-500"
                            : "bg-green-500"
                      }`}
                    />
                    <span className="font-medium text-gray-900">{c.name}</span>
                    {c.health && (
                      <span className="text-caption text-gray-400">
                        {c.health}
                      </span>
                    )}
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
