/**
 * One-shot CSV → Supabase import.
 *
 * Idempotent: per table, checks if any rows already exist and skips that
 * table if so. To re-import a single table, truncate it manually in Supabase.
 *
 * Run: `npm run import`
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Hardcoded skips (see CLAUDE.md "הכרעות סכמה שאושרו"):
 *   - credentials table: never imported
 *   - team rows "Internal action", "Mr.NotDan Mayzlish", "Table Sync":
 *     imported with active=false (they appear in Tasks as openers, so we
 *     need the FK target, but they're not real users)
 *   - task status mapping (CSV → schema's 3 values):
 *       הסתיים → בוצע
 *       בוטל   → סגור
 *       all other values (incl. מחכה לטיפול, נכנס לעבודה, תקוע,
 *       ממתין ללקוח, אישור לקוח, בעבודה אצל ספק, empty) → בעבודה
 *   - all tasks get source='import'
 */

import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import * as fs from "node:fs";
import * as path from "node:path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error(
    "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

const CSV_DIR = path.resolve(process.cwd(), "csv tables");

const INACTIVE_TEAM = new Set([
  "Internal action",
  "Mr.NotDan Mayzlish",
  "Table Sync",
]);

type Report = {
  table: string;
  inserted: number;
  skipped: number;
  reasons: Record<string, number>;
};

const reports: Report[] = [];

function bump(r: Report, reason: string) {
  r.skipped++;
  r.reasons[reason] = (r.reasons[reason] ?? 0) + 1;
}

function readCsv(filename: string): Record<string, string>[] {
  const full = path.join(CSV_DIR, filename);
  const raw = fs.readFileSync(full, "utf-8").replace(/^﻿/, "");
  return parse(raw, { columns: true, skip_empty_lines: true, bom: true });
}

function s(v: string | undefined | null): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t === "" ? null : t;
}

/** Airtable date strings like "9/4/2025" → ISO date. */
function parseDate(v: string | null | undefined): string | null {
  const t = s(v);
  if (!t) return null;
  // Strip optional time suffix like " 8:38am".
  const datePart = t.split(/\s+/)[0];
  const m = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  const [, mm, dd, yyRaw] = m;
  const yy = yyRaw.length === 2 ? `20${yyRaw}` : yyRaw;
  return `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function parseDateTime(v: string | null | undefined): string | null {
  const t = s(v);
  if (!t) return null;
  // "9/3/2025 4:48pm" → ISO timestamptz (assume local)
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(am|pm)?)?$/i);
  if (!m) {
    // Fallback to date-only
    const d = parseDate(t);
    return d ? `${d}T00:00:00Z` : null;
  }
  const [, mm, dd, yyRaw, hh, mn, ap] = m;
  const yy = yyRaw.length === 2 ? `20${yyRaw}` : yyRaw;
  let hour = hh ? parseInt(hh, 10) : 0;
  if (ap?.toLowerCase() === "pm" && hour < 12) hour += 12;
  if (ap?.toLowerCase() === "am" && hour === 12) hour = 0;
  const minute = mn ?? "00";
  return `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T${String(hour).padStart(2, "0")}:${minute}:00`;
}

function parseMoney(v: string | null | undefined): number | null {
  const t = s(v);
  if (!t) return null;
  // "₪4546", "$4,546", "4546"
  const cleaned = t.replace(/[^\d.-]/g, "");
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizeStatus(v: string | null | undefined): string {
  const t = s(v);
  if (!t) return "בעבודה";
  if (t === "הסתיים") return "בוצע";
  if (t === "בוטל") return "סגור";
  if (["בעבודה", "בוצע", "סגור"].includes(t)) return t;
  return "בעבודה";
}

function normalizePlatform(v: string | null | undefined): string | null {
  const t = s(v)?.toLowerCase();
  if (!t) return null;
  if (t.includes("google")) return "google";
  if (t.includes("facebook") || t.includes("meta") || t.includes("instagram"))
    return "facebook";
  if (t.includes("tiktok")) return "tiktok";
  return null;
}

function normalizeHealth(v: string | null | undefined): string | null {
  const t = s(v);
  if (!t) return null;
  if (["בריא", "אסטרטגיה צריכה", "קריטי"].includes(t)) return t;
  return null;
}

function normalizeCampaignStatus(v: string | null | undefined): string | null {
  const t = s(v);
  if (!t) return null;
  if (["פעיל", "הסתיים", "בעבודה", "מושהה"].includes(t)) return t;
  return null;
}

async function tableEmpty(table: string): Promise<boolean> {
  const { count, error } = await sb
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return (count ?? 0) === 0;
}

// ---------- Importers ----------

async function importTeam(): Promise<Map<string, string>> {
  const r: Report = {
    table: "team_members",
    inserted: 0,
    skipped: 0,
    reasons: {},
  };
  const nameToId = new Map<string, string>();

  if (!(await tableEmpty("team_members"))) {
    console.log("• team_members already populated — fetching existing IDs");
    const { data } = await sb.from("team_members").select("id, full_name");
    data?.forEach((m) => nameToId.set(m.full_name, m.id));
    bumpAll(r, "table_already_populated", 1);
    reports.push(r);
    // Also map known aliases that appear in CSVs.
    addAliases(nameToId);
    return nameToId;
  }

  const rows = readCsv("צוות-צוות וונדר ויז'ן.csv");

  // Real members from the team CSV.
  const inserts = rows
    .map((row) => {
      const fullName = s(row["שם"]);
      const email = s(row["דוא״ל"]);
      if (!fullName || !email) {
        bump(r, "missing_name_or_email");
        return null;
      }
      return {
        full_name: fullName,
        role: s(row["תפקיד"]),
        email: email.toLowerCase(),
        active: true,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // Synthetic inactive rows so tasks opened by Airtable bots/automations
  // can still resolve their created_by_id FK.
  for (const name of INACTIVE_TEAM) {
    inserts.push({
      full_name: name,
      role: null,
      email: `inactive+${name.replace(/\s+/g, "_").toLowerCase()}@placeholder.invalid`,
      active: false,
    });
  }

  const { data, error } = await sb
    .from("team_members")
    .insert(inserts)
    .select("id, full_name");
  if (error) throw error;
  r.inserted = data?.length ?? 0;
  data?.forEach((m) => nameToId.set(m.full_name, m.id));
  reports.push(r);

  addAliases(nameToId);
  return nameToId;
}

function bumpAll(r: Report, reason: string, n: number) {
  r.skipped += n;
  r.reasons[reason] = (r.reasons[reason] ?? 0) + n;
}

/** The CSVs use a few stable spellings — map them to the canonical row. */
function addAliases(nameToId: Map<string, string>) {
  const alias = (variant: string, canonical: string) => {
    const id = nameToId.get(canonical);
    if (id && !nameToId.has(variant)) nameToId.set(variant, id);
  };
  // 'sharon Raz' in CSVs ↔ 'Sharon Raz | שרון רז' in team
  for (const [name, id] of Array.from(nameToId.entries())) {
    // Allow lookup by the English half of "English | Hebrew" names.
    const englishHalf = name.split("|")[0]?.trim();
    if (englishHalf && englishHalf !== name && !nameToId.has(englishHalf)) {
      nameToId.set(englishHalf, id);
    }
    const hebrewHalf = name.split("|")[1]?.trim();
    if (hebrewHalf && !nameToId.has(hebrewHalf)) {
      nameToId.set(hebrewHalf, id);
    }
  }
  alias("sharon Raz", "Sharon Raz | שרון רז");
}

async function importClients(
  team: Map<string, string>,
): Promise<Map<string, string>> {
  const r: Report = { table: "clients", inserted: 0, skipped: 0, reasons: {} };
  const nameToId = new Map<string, string>();

  if (!(await tableEmpty("clients"))) {
    console.log("• clients already populated — fetching existing IDs");
    const { data } = await sb.from("clients").select("id, name");
    data?.forEach((c) => nameToId.set(c.name, c.id));
    bumpAll(r, "table_already_populated", 1);
    reports.push(r);
    return nameToId;
  }

  const rows = readCsv("לקוחות-ניהול לקוח.csv");
  const inserts = rows
    .map((row) => {
      const name = s(row["שם לקוח"]);
      if (!name) {
        bump(r, "missing_name");
        return null;
      }
      const amRaw = s(row["מנהל לקוח"]);
      const amId = amRaw ? team.get(amRaw) ?? null : null;
      if (amRaw && !amId) bump(r, `unknown_account_manager:${amRaw}`);
      return {
        name,
        contact_name: s(row["איש קשר/מנהל שיווק"]),
        account_manager_id: amId,
        phone: s(row["טלפון"]),
        email: s(row["דוא״ל"]),
        website_url: s(row["לינק לאתר/דף נחיתה"]),
        budget_note: s(row["תקציב"]),
        drive_url: s(row["Drive"]),
        facebook_ads_url: s(row["Facebook Ads"]),
        google_ads_url: s(row["Google Ads"]),
        cms_url: s(row["CMS"]),
        analytics_url: s(row["Google Analytics"]),
        health: normalizeHealth(row["בריאות קמפיינים"]),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const { data, error } = await sb
    .from("clients")
    .insert(inserts)
    .select("id, name");
  if (error) throw error;
  r.inserted = data?.length ?? 0;
  data?.forEach((c) => nameToId.set(c.name, c.id));
  reports.push(r);
  return nameToId;
}

async function importTasks(
  clients: Map<string, string>,
  team: Map<string, string>,
) {
  const r: Report = { table: "tasks", inserted: 0, skipped: 0, reasons: {} };
  if (!(await tableEmpty("tasks"))) {
    bumpAll(r, "table_already_populated", 1);
    reports.push(r);
    return;
  }

  const rows = readCsv("משימות-פתיחת משימה.csv");
  const taskInserts: any[] = [];
  const pendingAssignees: { rowIndex: number; names: string[] }[] = [];

  rows.forEach((row, i) => {
    const title = s(row["משימה"]);
    const clientRaw = s(row["לקוח"]);
    if (!title) {
      bump(r, "missing_title");
      return;
    }
    if (!clientRaw) {
      bump(r, "missing_client");
      return;
    }
    const clientId = clients.get(clientRaw);
    if (!clientId) {
      bump(r, `unknown_client:${clientRaw}`);
      return;
    }
    const openerRaw = s(row["פותח המשימה"]);
    const createdById = openerRaw ? team.get(openerRaw) ?? null : null;
    if (openerRaw && !createdById) bump(r, `unknown_opener:${openerRaw}`);

    const assigneesRaw = s(row["בטיפול של"]);
    const assigneeNames = assigneesRaw
      ? assigneesRaw.split(",").map((n) => n.trim()).filter(Boolean)
      : [];
    pendingAssignees.push({ rowIndex: taskInserts.length, names: assigneeNames });

    taskInserts.push({
      title,
      client_id: clientId,
      description: s(row["תיאור"]),
      status: normalizeStatus(row["סטטוס משימה"]),
      start_date: parseDate(row["תאריך התחלה"]) ?? new Date().toISOString().slice(0, 10),
      due_date: parseDate(row["דדליין לסיום"]),
      created_by_id: createdById,
      source: "import",
    });
  });

  if (taskInserts.length === 0) {
    reports.push(r);
    return;
  }

  // Batch insert for speed.
  const inserted: { id: string }[] = [];
  const CHUNK = 100;
  for (let i = 0; i < taskInserts.length; i += CHUNK) {
    const chunk = taskInserts.slice(i, i + CHUNK);
    const { data, error } = await sb.from("tasks").insert(chunk).select("id");
    if (error) throw error;
    inserted.push(...(data ?? []));
  }
  r.inserted = inserted.length;

  // Now task_assignees.
  const ar: Report = {
    table: "task_assignees",
    inserted: 0,
    skipped: 0,
    reasons: {},
  };
  const assigneeInserts: { task_id: string; member_id: string }[] = [];
  pendingAssignees.forEach(({ rowIndex, names }) => {
    const taskId = inserted[rowIndex]?.id;
    if (!taskId) return;
    for (const name of names) {
      const memberId = team.get(name);
      if (!memberId) {
        bump(ar, `unknown_assignee:${name}`);
        continue;
      }
      assigneeInserts.push({ task_id: taskId, member_id: memberId });
    }
  });
  if (assigneeInserts.length > 0) {
    // dedupe (a row in CSV could repeat the same member)
    const seen = new Set<string>();
    const unique = assigneeInserts.filter((a) => {
      const k = `${a.task_id}:${a.member_id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    for (let i = 0; i < unique.length; i += CHUNK) {
      const chunk = unique.slice(i, i + CHUNK);
      const { data, error } = await sb
        .from("task_assignees")
        .insert(chunk)
        .select("task_id");
      if (error) throw error;
      ar.inserted += data?.length ?? 0;
    }
  }

  reports.push(r, ar);
}

async function importCampaigns(clients: Map<string, string>) {
  const r: Report = { table: "campaigns", inserted: 0, skipped: 0, reasons: {} };
  if (!(await tableEmpty("campaigns"))) {
    bumpAll(r, "table_already_populated", 1);
    reports.push(r);
    return;
  }

  const rows = readCsv("קמפיינים-כל הקמפיינים.csv");
  const inserts: any[] = [];

  rows.forEach((row) => {
    const name = s(row["שם קמפיין"]);
    const platform = normalizePlatform(row["פלטפורמה"]);
    if (!name) {
      bump(r, "missing_name");
      return;
    }
    if (!platform) {
      bump(r, "unknown_or_missing_platform");
      return;
    }
    const clientRaw = s(row["לקוח"]);
    const clientId = clientRaw ? clients.get(clientRaw) ?? null : null;
    if (clientRaw && !clientId) bump(r, `unknown_client:${clientRaw}`);

    inserts.push({
      name,
      client_id: clientId,
      platform,
      status: normalizeCampaignStatus(row["סטטוס"]),
      start_date: parseDate(row["תאריך התחלה"]),
      spent: parseMoney(row["תקציב שנוצל"]),
      external_campaign_id: s(row["Campaign ID"]),
    });
  });

  const CHUNK = 100;
  for (let i = 0; i < inserts.length; i += CHUNK) {
    const chunk = inserts.slice(i, i + CHUNK);
    const { data, error } = await sb
      .from("campaigns")
      .insert(chunk)
      .select("id");
    if (error) throw error;
    r.inserted += data?.length ?? 0;
  }
  reports.push(r);
}

async function importMeetings(clients: Map<string, string>) {
  const r: Report = { table: "meetings", inserted: 0, skipped: 0, reasons: {} };
  if (!(await tableEmpty("meetings"))) {
    bumpAll(r, "table_already_populated", 1);
    reports.push(r);
    return;
  }

  const rows = readCsv("פגישות-פגישות.csv");
  const inserts: any[] = [];
  rows.forEach((row) => {
    const summary = s(row["תיעוד וסיכום פגישה"]);
    if (!summary) {
      bump(r, "missing_summary");
      return;
    }
    const clientRaw = s(row["לקוח"]);
    const clientId = clientRaw ? clients.get(clientRaw) ?? null : null;
    if (clientRaw && !clientId) bump(r, `unknown_client:${clientRaw}`);

    inserts.push({
      title: s(row["נושא הפגישה"]),
      meeting_at: parseDateTime(row["תאריך פגישה"]),
      client_id: clientId,
      attendees: s(row["היו בפגישה"]),
      summary,
    });
  });
  if (inserts.length > 0) {
    const { data, error } = await sb
      .from("meetings")
      .insert(inserts)
      .select("id");
    if (error) throw error;
    r.inserted = data?.length ?? 0;
  }
  reports.push(r);
}

async function importStrategies(clients: Map<string, string>) {
  const r: Report = {
    table: "client_strategies",
    inserted: 0,
    skipped: 0,
    reasons: {},
  };
  if (!(await tableEmpty("client_strategies"))) {
    bumpAll(r, "table_already_populated", 1);
    reports.push(r);
    return;
  }

  const rows = readCsv("טופס תכנון ואסטרטגיה-Grid view.csv");
  const inserts: any[] = [];
  rows.forEach((row) => {
    const clientRaw = s(row["שם לקוח"]);
    if (!clientRaw) {
      bump(r, "missing_client");
      return;
    }
    const clientId = clients.get(clientRaw);
    if (!clientId) {
      bump(r, `unknown_client:${clientRaw}`);
      return;
    }
    inserts.push({
      client_id: clientId,
      strategy: s(row["אסטרטגיה"]),
      kpis: s(row["KPI's"]),
      audiences: s(row["קהלים"]),
      messages_copy: s(row["מסרים וקופי"]),
      testing: s(row["על מה עושים טסטינג?"]),
      funnel_stages: s(row["שלבי הפאנל"]),
      timeline: s(row["לוחות זמנים"]),
    });
  });
  if (inserts.length > 0) {
    const { data, error } = await sb
      .from("client_strategies")
      .insert(inserts)
      .select("id");
    if (error) throw error;
    r.inserted = data?.length ?? 0;
  }
  reports.push(r);
}

async function importContent() {
  const r: Report = {
    table: "content_resources",
    inserted: 0,
    skipped: 0,
    reasons: {},
  };
  if (!(await tableEmpty("content_resources"))) {
    bumpAll(r, "table_already_populated", 1);
    reports.push(r);
    return;
  }

  const rows = readCsv("מידע ותוכן-הכל.csv");
  const inserts: any[] = [];
  rows.forEach((row) => {
    const kind = s(row["סוג תוכן"]);
    const url = s(row["לינק למקור"]);
    if (!kind || !url) {
      bump(r, "missing_kind_or_url");
      return;
    }
    inserts.push({
      kind,
      topic: s(row["נושא"]),
      source_url: url,
      notes: s(row["הערות"]),
    });
  });
  if (inserts.length > 0) {
    const { data, error } = await sb
      .from("content_resources")
      .insert(inserts)
      .select("id");
    if (error) throw error;
    r.inserted = data?.length ?? 0;
  }
  reports.push(r);
}

async function importSuggestions() {
  const r: Report = {
    table: "suggestions",
    inserted: 0,
    skipped: 0,
    reasons: {},
  };
  if (!(await tableEmpty("suggestions"))) {
    bumpAll(r, "table_already_populated", 1);
    reports.push(r);
    return;
  }
  const rows = readCsv("תיבת הצעות-Grid view.csv");
  const inserts: any[] = [];
  rows.forEach((row) => {
    const text = s(row["הצעה"]);
    if (!text) {
      bump(r, "missing_text");
      return;
    }
    inserts.push({
      suggestion: text,
      notes: s(row["הערות"]),
      suggester: s(row["מציע"]),
    });
  });
  if (inserts.length > 0) {
    const { data, error } = await sb
      .from("suggestions")
      .insert(inserts)
      .select("id");
    if (error) throw error;
    r.inserted = data?.length ?? 0;
  }
  reports.push(r);
}

// ---------- Main ----------

async function main() {
  console.log("BrightCRM CSV import\n────────────────────");
  console.log(`Reading from: ${CSV_DIR}\n`);

  const team = await importTeam();
  const clients = await importClients(team);
  await importTasks(clients, team);
  await importCampaigns(clients);
  await importMeetings(clients);
  await importStrategies(clients);
  await importContent();
  await importSuggestions();

  console.log("\n────────────────────");
  console.log("Report\n");
  for (const r of reports) {
    console.log(`${r.table.padEnd(22)} inserted=${r.inserted}  skipped=${r.skipped}`);
    for (const [reason, n] of Object.entries(r.reasons)) {
      console.log(`    └─ ${reason} × ${n}`);
    }
  }
  console.log("\nDeliberately NOT imported:");
  console.log("    credentials  (security — never enters the system)");
  console.log("    vendors      (5 rows, mostly empty — dropped)");
  console.log("    projects     (7 rows, dropped — tasks already link to clients)");
  console.log("    weekly_reports (0 real rows)");
  console.log("    campaign_log   (1 row, abandoned)");
}

main().catch((e) => {
  console.error("\nIMPORT FAILED:", e?.message ?? e);
  if (e?.details) console.error(e.details);
  process.exit(1);
});
