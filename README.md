# BrightCRM

Next.js 14 + Supabase. כלי CRM וניהול משימות פנימי לסוכנות Bright.

ראה `CLAUDE.md` להחלטות ארכיטקטורה, `ANALYSIS.md` לסכמת הייבוא מ-Airtable.

## Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **DB:** Supabase (Postgres) + RLS
- **Auth:** Supabase Auth + Google OAuth (מוגבל לדומיין b-bright.co.il)
- **AI:** Claude API (פענוח משימות), Whisper API (תמלול הקלטות)
- **Bot:** Telegram Bot (קלט מהיר)
- **Hosting:** Vercel
- **Design:** Miro-inspired design system (DM Sans, canary yellow CTAs, pastel cards)

## Setup (פעם אחת)

1. **צור פרויקט Supabase**
   - https://supabase.com → New Project
   - שמור את `Project URL`, `anon key`, `service_role key`.

2. **הגדר Google OAuth ב-Supabase**
   - Dashboard → Authentication → Providers → Google → Enable.
   - הזן `Client ID` / `Client Secret` מ-Google Cloud Console
     (OAuth 2.0 Client ID type "Web application").
   - ב-Google Cloud, הוסף `Authorized redirect URI`:
     `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
   - מומלץ ב-Google Workspace: הגבל את ה-OAuth Consent Screen
     ל-Internal (b-bright.co.il only).

3. **`.env.local`**
   ```bash
   cp .env.example .env.local
   # ערוך עם הערכים מהדשבורד.
   ```

4. **הרץ migrations**
   ```bash
   npx supabase link --project-ref YOUR-PROJECT-REF
   npx supabase db push
   ```
   או הדבק ידנית את קבצי ה-SQL מ-`supabase/migrations/` ב-SQL Editor של Supabase לפי סדר השמות.

5. **צור Storage bucket בשם `attachments`** (חד-פעמי, חובה לפני העלאת קבצים)
   - Dashboard → Storage → New bucket
   - Name: `attachments`
   - Public: **off** (אנחנו משתמשים ב-signed URLs)
   - המדיניות שב-migration (`20260519000001_attachments.sql`) תתפוס אוטומטית.

6. **ייבוא חד-פעמי מ-CSV**
   ```bash
   npm run import
   ```
   הסקריפט idempotent: ריצה שנייה מדלגת על טבלאות שיש בהן רשומות.

7. **dev**
   ```bash
   npm run dev
   ```
   פתח http://localhost:3000 → redirect ל-`/login`.

## מבנה

```
app/                        Next.js routes
  (app)/                    Layout עם sidebar, header, auth
    dashboard/              דשבורד ראשי
    tasks/                  ניהול משימות (טבלה/קנבן/לוח שנה)
    clients/                ניהול לקוחות + דף לקוח
    settings/               הגדרות + חיבור טלגרם
    about/                  אודות
  login/                    דף התחברות עם Google
  auth/callback/            OAuth callback
  api/telegram/webhook      Telegram bot webhook
  api/chat/                 AI chat endpoint
  api/cron/overdue          Vercel cron להתראות דדליין
components/
  ui/                       shadcn/ui + design system overrides
  dashboard/                רכיבי דשבורד (AI chat, search, stats)
  brand-icons.tsx           אייקוני Meta/Google/Drive/Analytics/CMS
  quick-add.tsx             FAB להוספה מהירה
  file-upload.tsx           העלאת קבצים
  file-list.tsx             רשימת קבצים + lightbox
  global-search.tsx         חיפוש גלובלי (Cmd+K)
  notification-bell.tsx     התראות
lib/
  supabase/                 Supabase clients (browser/server/middleware)
  data.ts                   Data access layer
  telegram/                 Telegram bot logic + AI parsing
supabase/migrations/        סכמה + RLS
scripts/import-airtable.ts  ייבוא מ-Airtable CSV
tailwind.config.ts          Design system tokens
```

## פיצ'רים

- דשבורד עם סטטיסטיקות, משימות פתוחות, פעילות אחרונה, לקוחות קריטיים
- ניהול משימות: טבלה / קנבן / לוח שנה, פילטרים, תגובות עם @mention
- ניהול לקוחות: פרטי קשר, קישורים חיצוניים, בריף, קבצים
- בוט טלגרם: טקסט או הקלטה קולית → AI parse → משימה
- Quick-add: הוספה מהירה עם AI או טופס מלא
- AI Chat: חיפוש חכם בדשבורד
- העלאת קבצים: drag & drop, paste, lightbox gallery
- התראות: דדליין שעבר (Vercel Cron + Resend)
- חיפוש גלובלי (Cmd+K)

