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

### נקודות כניסה ליצירת משימה/לקוח

כל הנתיבים מגיעים ל-Supabase `tasks` + `task_assignees`, ושולחים email notification:

1. **WhatsApp** (הלב): `app/api/whatsapp/route.ts` → `lib/whatsapp/parse-task.ts` (Claude AI parse) → `lib/whatsapp/confirmation.ts` (אישור/ערוך/בטל) → writes to DB → `notifyNewTask()`
2. **Web quick-add** (FAB, mobile): `components/quick-add.tsx` → `quickParseTask()` server action → `createTask()` in `app/(app)/tasks/actions.ts` → `notifyNewTask()`
3. **Sidebar "הוספה" button** (global): opens a dropdown menu with "משימה חדשה" / "לקוח חדש". Triggers `GlobalDialogContext` from `shell-context.tsx` → opens `TaskForm` or `ClientForm` in a modal on the current page (no redirect). Data fetched client-side via `components/global-add-dialogs.tsx`.
4. **Page-level "+ חדש" buttons**: each page toolbar has its own button that opens the same dialog locally via page state.

### Global dialog system

`shell-context.tsx` exposes `useGlobalDialog()` → `{ openDialog, setOpenDialog }` where dialog is `"task" | "client" | null`. `components/global-add-dialogs.tsx` renders both Dialog modals at the layout level, fetching clients/team/tags from Supabase on demand. After save, calls `router.refresh()` to update server component data.

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
- `notify.ts` — trigger functions: `notifyNewTask()`, `notifyNewComment()`, `notifyMentions()`, `notifyOverdueByEmail()`, `notifyTodayReminders()`

כל ההתראות fire-and-forget (לא חוסמות). `notification_log` table מונע כפילויות ב-overdue emails.

### Cron jobs (`vercel.json`)

| Path | Schedule | What |
|------|----------|------|
| `/api/cron/overdue` | `0 7 * * *` | WhatsApp overdue alerts |
| `/api/cron/morning-digest` | `0 6 * * 0-4` (Sun-Thu) | Email morning digest per member |
| `/api/cron/overdue-email` | `0 7 * * 0-4` (Sun-Thu) | Email overdue alerts with dedup |
| `/api/cron/recurring` | `0 5 * * *` | Create tasks from recurring rules |

כל cron route בודק `CRON_SECRET` header. ה-middleware (`middleware.ts`) מדלג על auth עבור `/api/cron/` ו-`/api/whatsapp`.

### WhatsApp flow (`lib/whatsapp/`)

- `api.ts` — Meta Cloud API wrapper (sendTextMessage, sendInteractiveButtons)
- `voice.ts` — download audio → Whisper transcription
- `parse-task.ts` — Claude API converts free text to structured `ParsedTask`
- `registration.ts` — self-registration: new user sends email → matched to `team_members`
- `confirmation.ts` — sends confirm/edit/cancel buttons, stores pending task in `whatsapp_pending_tasks`

## סכמת DB — טבלאות מפתח

`clients`, `team_members`, `tasks`, `task_assignees`, `task_comments`, `notifications`, `notification_log`, `campaigns`, `tags`, `task_tags`, `attachments`, `comment_attachments`, `reminders`, `reminder_recipients`

**סטטוס משימה (5 ערכים מוגדרים ב-CHECK constraint):**
`מחכה לטיפול` → `נכנס לעבודה` → `בעבודה` → `אישור לקוח` → `בוצע`

- PK = uuid (`gen_random_uuid()`)
- `tasks.source` = `web` | `whatsapp` | `telegram` | `import`
- Migrations in `supabase/migrations/`, naming: `YYYYMMDDHHMMSS_description.sql`
- Schema reference: `ANALYSIS.md`

### Reminders (`reminders`)

תזכורות אישיות או צוותיות עם תאריך. API routes ב-`app/api/reminders/`.

- `scope`: `personal` (רק היוצר רואה) | `team` (כל הצוות, או נמענים ספציפיים)
- `reminder_date`: תאריך התזכורת, `reminder_time`: שעה (אופציונלי, לשימוש עתידי)
- `is_completed`: סימון כבוצע
- `created_by_id` → `team_members(id)`
- `reminder_recipients`: junction table (`reminder_id`, `member_id`) — נמענים ספציפיים לתזכורת צוותית. ריק = כל הצוות.
- Email notifications: נשלחות דרך morning digest cron (`notifyTodayReminders()`), recipient-aware
- Today endpoint: `GET /api/reminders/today` — תזכורות פעילות להיום (לבאנר בממשק), מסנן לפי נמענים
- Dashboard widget: `components/dashboard/upcoming-reminders.tsx` — 5 תזכורות קרובות עם popup לרשימה מלאה

## Design system

מוגדר ב-`tailwind.config.ts`.

- Ink: `#1A1A1A` (primary text), `#6B7280` (secondary), `#9CA3AF` (muted)
- Accent: `#FFD02F` (yellow CTAs), Link: `#3B82F6` (blue, for links/tags/toggles only)
- Surface: `#F7F7F8`, Sidebar: `#1A1A1A`
- **Page-level toolbars**: dark background `bg-[#1A1A1A]` with white/light text, `#333` dividers, `#2A2A2A` search inputs. Dropdowns open in light mode (only the trigger bar is dark).
- Buttons: primary = `rounded-full bg-accent text-ink` (pill), danger = `rounded-full bg-overdue text-white`
- Cards: `rounded-2xl`, inputs: `rounded-xl`, badges: `rounded-full`
- 5 elevation levels: `shadow-elevation-1` through `shadow-elevation-5`
- Active states in toolbars use `bg-white/15 text-white` (not blue). Filter count badges use `bg-accent text-ink`.
- FAB: yellow circle bottom-right (mobile only)

### Badge / pill pattern — Studio Light

Status and health badges use **light bg + dark text** (not saturated solid color). Tokens in `tailwind.config.ts`:

- Status: `bg-st-{status}-bg` + `text-st-{status}-text` (e.g. `bg-st-waiting-bg text-st-waiting-text`)
- Health: `bg-health-{level}-bg` + `text-health-{level}-text` (e.g. `bg-health-good-bg text-health-good-text`)
- For small colored dots use the saturated token: `bg-st-waiting` / `bg-health-good`
- Source of truth: `components/ui/badge.tsx` — `STATUS_LIGHT` export for inline style use, `StatusCell`/`HealthCell` for rendered pills.

### TaskForm — compact vs. full mode

`app/(app)/tasks/task-form.tsx` renders differently based on the `compact` prop:

- `compact=false` (default): full dialog layout, title field visible, all fields scrollable inside `DialogContent`
- `compact=true`: side-panel edit mode (no title field, dropdown-based assignees, collapsible description)

Both modes expose all fields (כותרת, לקוח, תיאור, סטטוס, תאריך יעד, אחראים, במעקב, תגיות). In the dialog the lower fields are below the fold — the inner `overflow-y-auto` div handles scrolling, not the dialog itself.

### Button `asChild` + Slot constraint

`components/ui/button.tsx` uses Radix `Slot` when `asChild=true`. **Slot requires exactly one React child.** Never pass a conditional element alongside `children`:

```tsx
// ❌ crashes — Slot receives [false, element] = 2 children
<Comp>{loading && <Spinner />}{children}</Comp>

// ✅ correct — compute content before rendering
const content = asChild ? children : <>{loading && <Spinner />}{children}</>;
<Comp>{content}</Comp>
```

### RTL gotchas

- URL inputs must have `dir="ltr"` — without it the URL renders reversed in RTL context.
- All `<input type="url">`, `<input type="email">`, phone numbers, and external link fields need `dir="ltr"`.
- Dialogs/Sheets that contain meaningful content require an accessible title: use `<SheetTitle className="sr-only">` if no visible header exists.

## כללי עבודה

- **כל טקסט בממשק בעברית, RTL.** Code, variable names, comments stay in English.
- **Migrations:** always create a SQL file in `supabase/migrations/`. Never make schema changes only in the dashboard.
- **RLS policy:** simple — `is_bright_member()` grants full access. Don't build complex permission layers.
- **פשטות:** prefer readable over clever. This is maintained by a small team. If a feature isn't essential, don't build it.
- **Env vars:** see `.env.example`. Key ones: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `WA_*` (WhatsApp), `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `CRON_SECRET`.
