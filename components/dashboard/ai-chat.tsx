"use client";

import * as React from "react";
import Link from "next/link";
import { Send, Sparkles, ArrowLeft } from "lucide-react";
import { StatusCell } from "@/components/ui/badge";
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

// Ambient floating glow — the "mysterious atmosphere"
function AmbientGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <motion.div
        className="absolute -top-24 start-[-10%] h-72 w-72 rounded-full bg-primary/30 blur-[90px]"
        animate={{ x: [0, 40, -20, 0], y: [0, 30, -10, 0], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-15%] end-[-8%] h-80 w-80 rounded-full bg-accent/20 blur-[100px]"
        animate={{ x: [0, -30, 20, 0], y: [0, -20, 25, 0], opacity: [0.4, 0.65, 0.4] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-st-working/20 blur-[110px]"
        animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.55, 0.3] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

// The AI "presence" orb — pulses softly when idle, shimmers while thinking
function PresenceOrb({ thinking, size = "lg" }: { thinking: boolean; size?: "lg" | "sm" }) {
  const dim = size === "lg" ? "h-20 w-20" : "h-9 w-9";
  return (
    <div className={`relative grid place-items-center ${dim}`}>
      <motion.span
        className="absolute inset-0 rounded-full bg-primary/40 blur-xl"
        animate={
          thinking
            ? { scale: [1, 1.5, 1], opacity: [0.6, 0.95, 0.6] }
            : { scale: [1, 1.18, 1], opacity: [0.4, 0.7, 0.4] }
        }
        transition={{ duration: thinking ? 1.1 : 3.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        className="absolute inset-0 rounded-full border border-white/20"
        animate={thinking ? { scale: [1, 1.7], opacity: [0.6, 0] } : { opacity: 0 }}
        transition={thinking ? { duration: 1.4, repeat: Infinity, ease: "easeOut" } : { duration: 0.3 }}
      />
      <div
        className={`relative grid ${dim} place-items-center rounded-full bg-gradient-to-br from-primary via-st-working to-primary shadow-[0_0_30px_rgba(66,98,255,0.5)]`}
      >
        <motion.div
          animate={thinking ? { rotate: 360 } : { rotate: [0, 8, -8, 0] }}
          transition={
            thinking
              ? { duration: 2.4, repeat: Infinity, ease: "linear" }
              : { duration: 5, repeat: Infinity, ease: "easeInOut" }
          }
        >
          <Sparkles className={size === "lg" ? "h-8 w-8 text-white" : "h-4 w-4 text-white"} />
        </motion.div>
      </div>
    </div>
  );
}

// Mysterious "thinking" line — shimmering dots instead of a plain spinner
function ThinkingShimmer() {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <PresenceOrb thinking />
      <div className="flex items-center gap-2">
        <span className="bg-gradient-to-r from-white/40 via-white to-white/40 bg-[length:200%_100%] bg-clip-text text-sm font-medium text-transparent animate-shimmer">
          חושב על זה...
        </span>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-white/70"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AiChat({ userEmail, fullPage = false }: { userEmail: string; fullPage?: boolean }) {
  const [question, setQuestion] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [response, setResponse] = React.useState<ChatResponse | null>(null);
  const [asked, setAsked] = React.useState<string | null>(null);

  async function ask(opts: { action?: string; question?: string }) {
    setAsked(opts.question ?? QUICK_ACTIONS.find((q) => q.action === opts.action)?.label ?? null);
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

  const idle = !loading && !response;

  return (
    <div
      className={`relative isolate overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-sidebar via-[#15152e] to-[#0c0c1f] text-white shadow-elevation-4 ${
        fullPage ? "flex flex-1 flex-col" : ""
      }`}
    >
      <AmbientGlow />

      {/* subtle starfield / noise texture via radial dots */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.06) 1px, transparent 1px), radial-gradient(circle at 70% 60%, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "120px 120px, 90px 90px",
        }}
      />

      <div className={`relative z-10 flex flex-col ${fullPage ? "flex-1" : ""}`}>
        {/* Conversation / hero area */}
        <div className={`flex flex-col items-center px-4 pt-8 ${fullPage ? "flex-1 overflow-y-auto" : ""}`}>
          <AnimatePresence mode="wait">
            {idle && (
              <motion.div
                key="hero"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center gap-5 py-6 text-center"
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <PresenceOrb thinking={false} />
                </motion.div>
                <div className="max-w-md">
                  <h2 className="bg-gradient-to-r from-white via-white to-primary/70 bg-clip-text text-xl font-bold text-transparent">
                    עוזר ה‑AI שלך
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/55">
                    שאל אותי כל דבר על המשימות, הלקוחות והתעדוף שלך. אני כאן כדי לפענח את התמונה.
                  </p>
                </div>
              </motion.div>
            )}

            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex w-full max-w-2xl flex-col items-center"
              >
                {asked && (
                  <div className="mb-2 self-end">
                    <span className="inline-block rounded-2xl rounded-ee-sm bg-primary/30 px-4 py-2 text-sm text-white shadow-elevation-2 backdrop-blur-sm">
                      {asked}
                    </span>
                  </div>
                )}
                <ThinkingShimmer />
              </motion.div>
            )}

            {!loading && response && (
              <motion.div
                key="response"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="flex w-full max-w-2xl flex-col gap-4 pb-2"
              >
                {/* user question echo */}
                {asked && (
                  <div className="self-end">
                    <span className="inline-block rounded-2xl rounded-ee-sm bg-primary/30 px-4 py-2 text-sm text-white shadow-elevation-2 backdrop-blur-sm">
                      {asked}
                    </span>
                  </div>
                )}

                {/* AI answer bubble — centered presence + glass bubble */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    <PresenceOrb thinking={false} size="sm" />
                  </div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.05 }}
                    className={`relative flex-1 rounded-2xl rounded-es-sm border p-4 text-sm leading-relaxed backdrop-blur-md ${
                      response.error
                        ? "border-overdue/40 bg-overdue/15 text-rose-100"
                        : "border-white/10 bg-white/[0.07] text-white/90 shadow-[0_0_24px_rgba(66,98,255,0.15)]"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{response.text}</p>
                  </motion.div>
                </div>

                {/* Task result cards — same data, glass styling */}
                {response.tasks && response.tasks.length > 0 && (
                  <div className="flex flex-col gap-2 ps-12">
                    {response.tasks.map((t, i) => {
                      const today = new Date().toISOString().slice(0, 10);
                      const overdue = t.due_date && t.due_date < today;
                      return (
                        <motion.div
                          key={t.id}
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.25, delay: 0.1 + i * 0.05 }}
                        >
                          <Link
                            href={`/tasks?task=${t.id}`}
                            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] p-3 backdrop-blur-md transition-[color,background-color,border-color] duration-200 hover:border-primary/40 hover:bg-white/[0.1]"
                          >
                            <StatusCell status={t.status} className="shrink-0" />
                            <div className="min-w-0 flex-1">
                              <span className="text-sm font-medium text-white">{t.title}</span>
                              {t.client_name && (
                                <span className="me-2 text-caption text-white/50">{t.client_name}</span>
                              )}
                            </div>
                            <span className={`text-caption ${overdue ? "font-medium text-overdue" : "text-white/45"}`}>
                              {fmtDate(t.due_date)}
                            </span>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Client result chips — same data, glass styling */}
                {response.clients && response.clients.length > 0 && (
                  <div className="flex flex-wrap gap-2 ps-12">
                    {response.clients.map((c, i) => (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.25, delay: 0.1 + i * 0.04 }}
                      >
                        <Link
                          href={`/clients/${c.id}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm backdrop-blur-md transition-[color,background-color,border-color] duration-200 hover:border-primary/40 hover:bg-white/[0.1]"
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              c.health === "קריטי"
                                ? "bg-health-critical"
                                : c.health === "אסטרטגיה צריכה"
                                  ? "bg-health-strategy"
                                  : "bg-health-good"
                            }`}
                          />
                          <span className="font-medium text-white">{c.name}</span>
                          {c.health && <span className="text-caption text-white/50">{c.health}</span>}
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Composer area — pinned to bottom in fullPage */}
        <div className="mt-auto px-4 pb-5 pt-4">
          <div className="mx-auto w-full max-w-2xl">
            {/* Quick action chips */}
            <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {QUICK_ACTIONS.map((qa) => (
                <button
                  key={qa.action}
                  type="button"
                  onClick={() => ask({ action: qa.action })}
                  disabled={loading}
                  className="whitespace-nowrap rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-2 text-caption text-white/75 backdrop-blur-md transition-[color,background-color,border-color] duration-200 hover:border-primary/50 hover:bg-primary/20 hover:text-white disabled:opacity-40"
                >
                  {qa.label}
                </button>
              ))}
            </div>

            {/* Glowing input pill */}
            <div className="group relative">
              <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-r from-primary/40 via-st-working/30 to-accent/30 opacity-0 blur transition-opacity duration-300 group-focus-within:opacity-100" />
              <div className="relative flex items-center rounded-2xl border border-white/15 bg-white/[0.08] backdrop-blur-xl transition-colors focus-within:border-white/30">
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
                  aria-label="שאל שאלה"
                  disabled={loading}
                  className="h-12 w-full rounded-2xl bg-transparent pe-14 ps-4 text-sm text-white placeholder:text-white/40 focus:outline-none disabled:opacity-50"
                />
                <motion.button
                  type="button"
                  onClick={() => question.trim() && ask({ question: question.trim() })}
                  disabled={!question.trim() || loading}
                  aria-label="שלח"
                  whileTap={{ scale: 0.9 }}
                  className="absolute start-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl bg-gradient-to-br from-primary to-st-working text-white shadow-[0_0_18px_rgba(66,98,255,0.5)] transition-[box-shadow,opacity] duration-200 hover:shadow-[0_0_26px_rgba(66,98,255,0.75)] disabled:opacity-40 disabled:shadow-none"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {question.trim() ? (
                      <motion.span
                        key="send"
                        initial={{ opacity: 0, rotate: -30 }}
                        animate={{ opacity: 1, rotate: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        <Send className="h-4 w-4" />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="arrow"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
