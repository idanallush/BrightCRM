# BrightCRM — Project Context

## מה זה הפרויקט

כלי CRM וניהול משימות פנימי לסוכנות Bright. מחליף שימוש קיים ב-Airtable.
הסיבה למעבר: Airtable יקר, ובעיקר — הצוות לא מצליח לעבוד איתו בעקביות
כי פתיחת משימה דורשת מחשב + פתיחת Airtable + מילוי פופאפ.

**הבעיה האמיתית שהכלי פותר היא חיכוך, לא חוסר פיצ'רים.**
כל החלטת עיצוב צריכה לשרת את זה: הדרך לפתוח משימה חייבת להיות
מהירה מספיק כדי להשתמש בה באמצע שיחה עם לקוח, מהטלפון, בלי מחשב.

## מי משתמש

2-4 אנשים בלבד (עידן, שרון, ועוד 1-2 שותפים).
**אין צורך ב-RBAC, role management, או multi-tenancy.**
כל משתמש רואה ועושה הכל. אל תבנה שכבת הרשאות מורכבת — זה בזבוז זמן בסקייל הזה.

## עקרונות מנחים — קרא לפני כל החלטה

1. **פשטות מנצחת עושר.** כלי רזה שמשתמשים בו עדיף על כלי עשיר שמתעלמים ממנו.
   אם פיצ'ר לא מוכרח — אל תבנה אותו.
2. **שדות שלא היו בשימוש ב-Airtable לא עוברים לכלי החדש.**
   ה-CSV מכיל שדות שכמעט תמיד ריקים. אלה פיצ'רים שהוגדרו ולא נוצלו. זרוק אותם.
3. **שכבת הקלט המהיר היא הלב.** היא נבנית ראשונה ועצמאית. אם היא עובדת,
   הפרויקט הצליח גם אם ה-UI עוד לא מושלם.
4. **אל תוסיף תשתית שלא הכרחית.** אין שמירת אודיו, אין realtime, אין storage
   אלא אם הוחלט במפורש.
5. **עצור לאישור בנקודות שצוינו.** אל תרוץ קדימה בלי אישור על הסכמה.

## Stack

- **Frontend/Backend:** Next.js 14 (App Router), TypeScript
- **DB:** Supabase (Postgres). free tier מספיק בנוחות לצוות בגודל הזה
- **Auth:** Supabase Auth עם Google provider, מוגבל לדומיין המייל של Bright
- **UI:** Tailwind + shadcn/ui, **RTL מלא בעברית** — זו דרישה, לא תוספת
- **פונטים:** DM Sans (primary) + Heebo (Hebrew fallback)
- **אנימציות:** Framer Motion
- **קלט מהיר:** WhatsApp Cloud API (Meta) — webhook ב-`/api/whatsapp`
- **תמלול:** Whisper API
- **פענוח טקסט למשימה מובנית:** Claude API (model: claude-opus-4-7)
- **התראות:** Vercel Cron + Resend
- **Hosting:** Vercel
- **אודיו:** לא נשמר. רק התמלול נכתב למשימה. אין Vercel Blob.

## Design System (Miro-Inspired, מעודכן 2026-05-27)

ה-UI בנוי על design system בהשראת Miro. הטוקנים מוגדרים ב-`tailwind.config.ts`.

### צבעים
- **Primary (Miro blue):** `#4262FF` — קישורים, focus rings, אלמנטים אינטראקטיביים
- **Accent (canary yellow):** `#FFD02F` — כפתורי CTA ראשיים, לוגו, active states
- **Ink:** `#050038` — טקסט ראשי, hover: `#1A1A4E`
- **Surface:** `#F7F7F8` — רקע כללי
- **Sidebar:** `#1B1B3A` — sidebar + כותרות sections
- **Border:** `#E0E0E6`
- **Pastel palette:** rose `#FFE4E8`, coral `#FFE0D0`, teal `#D0F0E8`,
  yellow `#FFF4CC`, blue `#DCE4FF`, purple `#EDE0FF`

### כפתורים
- **Primary:** `rounded-full bg-accent text-ink` — pill צהוב עם טקסט שחור
- **Secondary:** `rounded-full border-2` — pill outlined
- **Ghost:** `rounded-xl` — שקוף עם hover
- **Danger:** `rounded-full bg-overdue text-white`

### עיגולים (border-radius)
- כרטיסים גדולים: `rounded-2xl` (16px)
- כרטיסים קטנים / inputs: `rounded-xl` (12px)
- כפתורים ראשיים: `rounded-full` (pill)
- badges: `rounded-full`

### Elevation (shadows)
5 רמות מ-`shadow-elevation-1` (שטוח) עד `shadow-elevation-5` (modal).

### כללי עיצוב
- **כותרות sections** משתמשות ב-`bg-sidebar` (כהה), לא ב-primary
- **כרטיסי סטטיסטיקה** משתמשים ברקעי pastel (לא בר צבע תחתון)
- **Header** עם `backdrop-blur-md` (glass effect)
- **FAB** עגול צהוב (`bg-accent`) בפינה ימנית תחתונה

## כללי עבודה ל-Claude Code

- **Migrations: השתמש ב-Supabase migrations (קבצי SQL מסודרים בתיקיית
  `supabase/migrations`).** אל תבצע שינויי סכמה ידניים ב-dashboard בלי
  migration מקביל — זה מוציא את הסביבות מסנכרון.
- השתמש ב-Supabase JS client (`@supabase/supabase-js`). RLS מופעל,
  אבל מדיניות פשוטה — כל משתמש מאומת מהדומיין רואה הכל (צוות של 4).
- אל תכתוב קוד בפרומפט 0 (שלב הניתוח). רק קריאה וניתוח.
- שמור כל פלט ניתוח לקובץ `ANALYSIS.md` ועצור לאישור.
- כתוב טסטים לזרימת הקלט מ-WhatsApp לפני שאתה ממשיך הלאה.
- כל טקסט בממשק בעברית, RTL. בדוק שזה נכון ויזואלית, לא רק ב-CSS.
- העדף קוד קריא ופשוט על קוד "חכם". צוות קטן יתחזק את זה.

## ארכיטקטורה — שלוש שכבות עצמאיות

### שכבה 1 — קלט מהיר (נבנית ראשונה, הלב)
WhatsApp Cloud API → הודעת טקסט או הקלטה קולית → אם הקלטה: Whisper מתמלל →
Claude API ממיר ל-JSON מובנה (client, task_type, assignee, priority,
due_date, description) → הודעת אישור ב-WhatsApp עם כפתורי אשר/ערוך/בטל →
אחרי אישור המשימה נכתבת ל-Supabase.

חשוב: כשקוראים ל-Claude API לפענוח, יש להעביר לו את רשימת הלקוחות
והעובדים מה-DB כקונטקסט, כדי שיתאים שם לקוח/אחראי נכון ולא ימציא.

### שכבה 2 — DB + לוגיקה
Supabase עם הסכמה שתחולץ מה-CSV ותאושר. כאן גם ה-cron jobs להתראות.

### שכבה 3 — UI
Next.js. נבנית אחרונה. בלי שכבה 1 אין לה ערך.

## רצף בנייה (אל תדלג שלבים)

0. ניתוח CSV + צילומי מסך → ANALYSIS.md → עצור לאישור
1. סקאפולד Next.js + Supabase + Supabase Auth + סקריפט import מ-CSV
2. שכבת קלט WhatsApp (הלב) + טסטים
3. UI
4. התראות (Vercel Cron + Resend) + אוטומציות

## הכרעות סכמה שאושרו (מקור אמת — אל תסטה)

מבוסס על ANALYSIS.md ואישור מפורש של עידן:

- **מ-13 טבלאות Airtable → 7 משמעותיות.** נשמרות: clients, team_members,
  tasks, task_assignees, campaigns, meetings, client_strategies,
  content_resources. נזרקות לגמרי: projects, weekly_reports,
  campaign_log, vendors, credentials.
- **credentials לא נכנס למערכת בשום צורה.** סיסמאות לא נשמרות בטקסט.
  ייצוא חד-פעמי ידני ל-1Password/Bitwarden מחוץ לכלי.
- **סטטוס משימה: 5 ערכים** (מעודכן 2026-05-25 לאחר QA — הותאם למצב בפועל ב-UI).
  סדר ה-lifecycle:
  1. `מחכה לטיפול` — ברירת המחדל לכל משימה חדשה (web quick-add, WhatsApp, טופס מלא).
     המשימה נוצרה אבל עוד לא ניגשו אליה.
  2. `נכנס לעבודה` — נלקחה לתור עבודה.
  3. `בעבודה` — בעבודה אקטיבית.
  4. `אישור לקוח` — ממתינה לאישור הלקוח.
  5. `בוצע` — נסגרה.

  בייבוא ההיסטורי מ-Airtable: כל המשימות הקיימות נכנסו כ-`בעבודה`,
  ו-`הסתיים` → `בוצע`. הסטטוסים `סגור` ו-`אישור מנהל` הוסרו מהספק
  (לא היו בשימוש משמעותי). אם תרצה לסגור משימה — `בוצע` הוא המסוף.


- **PK = uuid עם gen_random_uuid()**. clients.name נשאר unique ל-lookup מ-WhatsApp.
- **account_manager מנורמל ל-FK** (36/36 מלאים בערך נקי).
- **שדה `source` ב-tasks** (web/whatsapp/telegram/import) — זה מד ההצלחה
  של הפרויקט, לא analytics. אם רוב המשימות `whatsapp` — החיכוך נשבר.
- **suggestions: נשמר בסכמה אבל לא ב-UI הראשי.** מסומן כארכיון,
  מסך נפרד/משני בלבד. לא בניווט הראשי.

## הכרעות WhatsApp + התראות (אושרו)

1. **assignee:** ברירת מחדל = מי שכתב/הקליט את ההודעה. בלי
   שאלה חוסמת — מי שצריך לשייך לאחר עורך דרך כפתור "ערוך".
   כל שאלה חוסמת היא חיכוך, וזה בדיוק מה שהרג את Airtable.
2. **חוסר ודאות:** הבוט תמיד שולח הודעת "זה מה שהבנתי" עם
   הפרטים (לקוח/אחראי/דדליין/תיאור) + כפתורי אשר/ערוך/בטל
   (WhatsApp interactive reply buttons, מקסימום 3 כפתורים).
   רק אחרי אישור כותב ל-DB. אף משימה לא נכתבת בלי אישור מפורש.
3. **הרשאת בוט:** רישום עצמי בפעם הראשונה. משתמש חדש שכותב
   לבוט → הבוט מבקש את כתובת המייל שלו → אם תואמת team_member
   קיים בדומיין Bright, נשמר whatsapp_phone ↔ team_member.
   אם לא תואם — נדחה. רק 4 (או מי שב-team_members) יכולים לפתוח.
4. **התראות — שלב 1: רק "עבר דדליין".** משימה בסטטוס
   בעבודה שה-due_date שלה עבר. התראה אחת, חדה, יומית דרך WhatsApp.
   "מתקרב לדדליין" לא נבנה בשלב 1 — יתווסף רק אחרי שמוכח
   שהצוות מגיב להתראה הראשונה.

## פיצ'רים שנבנו (מעודכן 2026-05-27)

### UI כללי
- דשבורד עם כרטיסי סטטיסטיקה, המשימות שלי, פעילות אחרונה, לקוחות קריטיים
- AI Chat בדשבורד (חיפוש חכם עם Claude)
- חיפוש גלובלי (`Cmd+K`) — משימות + לקוחות
- התראות in-app (notification bell)
- Quick-add FAB — הוספת משימה מהירה עם AI parse, או טופס מלא

### משימות
- תצוגת טבלה / קנבן / לוח שנה
- פילטרים: סטטוס, לקוח, אחראי, עבר דדליין
- פאנל עריכת משימה (Sheet) עם סטטוס, אחראים, תיאור, קבצים, תגובות
- תגובות עם @mention לחברי צוות
- Drag & Drop בקנבן
- סימון "בוצע" מהיר

### לקוחות
- טבלת לקוחות עם בריאות, מנהל, קישורים חיצוניים
- דף לקוח עם פרטי קשר, קישורים (Drive/Meta/Google/CMS/Analytics), בריף, משימות, קבצים
- אייקוני brand (Google Ads, Meta, Drive, Analytics, CMS, Website)
- לוגו לקוח (URL)
- בריף לקוח (טקסט חופשי)

### קבצים
- העלאת קבצים (drag & drop, paste, multi-file parallel)
- Lightbox gallery עם ניווט מקלדת
- thumbnails לתמונות עם signed URLs

### הגדרות
- פרופיל משתמש, סטטוס חיבור WhatsApp
- מדריך חיבור WhatsApp
- רשימת צוות

## מה הכלי הזה לא

לא Airtable חדש ועשיר. לא מערכת enterprise. לא פלטפורמה גמישה לכל תרחיש.
זה כלי ממוקד לצוות של 4 אנשים שצריך לפתוח ולנהל משימות בלי חיכוך.
כל הוספה שמסבכת את זה — דחה אותה.
