# BrightCRM

Next.js 14 + Supabase. כלי CRM פנימי לסוכנות Bright. ראה `CLAUDE.md` להחלטות, `ANALYSIS.md` לסכמת הייבוא.

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
     ל-Internal (b-bright.co.il only). זה shore-up נוסף ל-`hd` ב-OAuth call.

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
   או הדבק ידנית את שני קבצי ה-SQL מ-`supabase/migrations/` ב-SQL Editor של Supabase.

5. **ייבוא חד-פעמי מ-CSV**
   ```bash
   npm run import
   ```
   הסקריפט idempotent: ריצה שנייה מדלגת על טבלאות שיש בהן רשומות.

6. **dev**
   ```bash
   npm run dev
   ```
   פתח http://localhost:3000 → redirect ל-`/login`.

## מבנה

```
app/                  Next.js routes
  login/              דף התחברות עם Google (RTL)
  auth/callback/      OAuth callback, בודק דומיין @b-bright.co.il
lib/supabase/         clients ל-browser / server / middleware
supabase/migrations/  סכמה + RLS
scripts/import-airtable.ts   הסקריפט שמייבא מה-CSV
csv tables/           הייצוא המקורי מ-Airtable (לא נדחף ל-DB אחרי הייבוא)
airtable/             צילומי מסך של הממשק המקורי (לתיעוד)
```

## מה לא בנוי בשלב הזה

UI מעבר ל-login. שכבה 1 (Telegram) ושכבה 3 (UI) — שלבים נפרדים, לפי `CLAUDE.md`.

