# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## מה זה הפרויקט

כלי CRM וניהול משימות פנימי לסוכנות Bright (2-4 משתמשים). מחליף Airtable.
**הבעיה שהכלי פותר היא חיכוך, לא חוסר פיצ'רים.** כל החלטה צריכה לשרת זריזות קלט.
אין RBAC, אין multi-tenancy. כל משתמש מאומת מדומיין `b-bright.co.il` רואה הכל.

Production URL: `https://bright-crm-three.vercel.app`

## פקודות

```bash
npm run dev          # Next.js dev server on :3000
npm run build        # production build (TypeScript check included)
npm run lint         # ESLint
npm run test         # vitest run (all tests)
npx vitest run path  # single test file
npm run import       # one-time Airtable CSV import (idempotent)
npm run db:push      # supabase db push (requires supabase link first)
```

טסטים משתמשים ב-vitest עם `environment: "node"`. הגדרות ב-`vitest.config.ts`.
אין lint-on-commit hook. תמיד תריץ `npm run build` לפני push כדי לוודא שהטייפים עוברים.

## Stack

- **Framework:** Next.js 14 (App Router), TypeScript, deployed on Vercel
- **DB:** Supabase (Postgres), RLS enabled, simple policy: `is_bright_member()` = allow all
- **Auth:** Supabase Auth + Google OAuth, domain-restricted to `b-bright.co.il`
- **UI:** Tailwind + shadcn/ui, RTL Hebrew, Framer Motion, DM Sans + Heebo fonts
- **WhatsApp bot:** WhatsApp Cloud API webhook at `/api/whatsapp`
- **AI:** Claude API (`claude-opus-4-7`) for task parsing, Whisper API for voice transcription
- **Email:** Resend for transactional emails (notifications, digest)
- **Cron:** Vercel Cron jobs defined in `vercel.json`

## ארכיטקטורה

### שלוש נקודות כניסה ליצירת משימה

כל שלושת הנתיבים מגיעים ל-Supabase `tasks` + `task_assignees`, ושולחים email notification:

1. **WhatsApp** (הלב): `app/api/whatsapp/route.ts` → `lib/whatsapp/parse-task.ts` (Claude AI parse) → `lib/whatsapp/confirmation.ts` (אישור/ערוך/בטל) → writes to DB → `notifyNewTask()`
2. **Web quick-add** (FAB): `components/quick-add.tsx` → `quickParseTask()` server action → `createTask()` in `app/(app)/tasks/actions.ts` → `notifyNewTask()`
3. **Web full form**: same `createTask()` server action path

### Supabase clients — שלושה סוגים, אל תערבב

- `lib/supabase/client.ts` — browser client, `createBrowserClient()`
- `lib/supabase/server.ts` — server components/actions, `createClient()` (uses cookies)
- `lib/supabase/admin.ts` — service role, bypasses RLS. **Only for webhooks, crons, scripts.**

### Data access layer

`lib/data.ts` מרכז את כל השאילתות — `getTasks()`, `getClients()`, `getTeam()`, `getTaskComments()`, etc.
Server components call these directly. Client components use server actions from `app/(app)/tasks/actions.ts`.

### Pages — App Router pattern

`app/(app)/` layout wraps all authenticated pages with sidebar + header + auth check.
Pages are server components that fetch data, then pass to `*-client.tsx` client components.
Example: `tasks/page.tsx` (server, fetches) → `tasks/tasks-client.tsx` (client, renders).

### Email notifications (`lib/email/`)

- `resend.ts` — Resend client wrapper, sends via `RESEND_API_KEY`
- `templates.ts` — 5 Hebrew RTL email templates (new task, comment, mention, overdue, morning digest)
- `notify.ts` — trigger functions: `notifyNewTask()`, `notifyNewComment()`, `notifyMentions()`, `notifyOverdueByEmail()`

כל ההתראות fire-and-forget (לא חוסמות). `notification_log` table מונע כפילויות ב-overdue emails.

### Cron jobs (`vercel.json`)

| Path | Schedule | What |
|------|----------|------|
| `/api/cron/overdue` | `0 7 * * *` | WhatsApp overdue alerts |
| `/api/cron/morning-digest` | `0 6 * * 0-4` (Sun-Thu) | Email morning digest per member |
| `/api/cron/overdue-email` | `0 7 * * 0-4` (Sun-Thu) | Email overdue alerts with dedup |

כל cron route בודק `CRON_SECRET` header. ה-middleware (`middleware.ts`) מדלג על auth עבור `/api/cron/` ו-`/api/whatsapp`.

### WhatsApp flow (`lib/whatsapp/`)

- `api.ts` — Meta Cloud API wrapper (sendTextMessage, sendInteractiveButtons)
- `voice.ts` — download audio → Whisper transcription
- `parse-task.ts` — Claude API converts free text to structured `ParsedTask`
- `registration.ts` — self-registration: new user sends email → matched to `team_members`
- `confirmation.ts` — sends confirm/edit/cancel buttons, stores pending task in `whatsapp_pending_tasks`

## סכמת DB — טבלאות מפתח

`clients`, `team_members`, `tasks`, `task_assignees`, `task_comments`, `notifications`, `notification_log`, `campaigns`, `tags`, `task_tags`, `attachments`, `comment_attachments`

**סטטוס משימה (5 ערכים מוגדרים ב-CHECK constraint):**
`מחכה לטיפול` → `נכנס לעבודה` → `בעבודה` → `אישור לקוח` → `בוצע`

- PK = uuid (`gen_random_uuid()`)
- `tasks.source` = `web` | `whatsapp` | `telegram` | `import`
- Migrations in `supabase/migrations/`, naming: `YYYYMMDDHHMMSS_description.sql`
- Schema reference: `ANALYSIS.md`

## Design system

מוגדר ב-`tailwind.config.ts`. בהשראת Miro.

- Primary: `#4262FF` (blue), Accent: `#FFD02F` (yellow CTAs), Ink: `#050038`, Surface: `#F7F7F8`
- Sidebar: `#1B1B3A` (dark). Section headers use `bg-sidebar`, not primary.
- Buttons: primary = `rounded-full bg-accent text-ink` (pill), danger = `rounded-full bg-overdue text-white`
- Cards: `rounded-2xl`, inputs: `rounded-xl`, badges: `rounded-full`
- 5 elevation levels: `shadow-elevation-1` through `shadow-elevation-5`
- Stat cards use pastel backgrounds (rose, coral, teal, yellow, blue, purple)
- Header: `backdrop-blur-md` glass effect
- FAB: yellow circle bottom-right

## כללי עבודה

- **כל טקסט בממשק בעברית, RTL.** Code, variable names, comments stay in English.
- **Migrations:** always create a SQL file in `supabase/migrations/`. Never make schema changes only in the dashboard.
- **RLS policy:** simple — `is_bright_member()` grants full access. Don't build complex permission layers.
- **פשטות:** prefer readable over clever. This is maintained by a small team. If a feature isn't essential, don't build it.
- **Env vars:** see `.env.example`. Key ones: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `WA_*` (WhatsApp), `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET`.
