# BrightCRM — ניתוח Airtable קיים (שלב 0)

מסמך זה ממפה את 13 הטבלאות שיוצאו מ-Airtable, את שיעור המילוי בפועל של כל שדה, ואת הצעת סכמת ה-Postgres שתחליף אותן. **לא נכתב קוד עדיין.**

המקורות: CSV ב-`csv tables/` + צילומי מסך של ה-UI ב-`airtable/`.

הערה על ספירת שורות: `wc -l` סופר שורות פיזיות, אבל הרבה שדות (תיאור, סיכום פגישה, אסטרטגיה) מכילים שורות חדשות מוטמעות. הספירות בהמשך הן **רשומות אמיתיות** אחרי פרסור CSV תקין.

---

## 1. רשימת טבלאות ושדות

### 1.1 לקוחות (`לקוחות-ניהול לקוח.csv`) — 36 רשומות

| שדה | סוג | מילוי | הערה |
|---|---|---|---|
| שם לקוח | text (PK טבעי) | 100% | לרוב פורמט `עברית \| English` |
| איש קשר/מנהל שיווק | text | 89% | |
| מנהל לקוח | linked → צוות | 100% | enum קטן (4 ערכים) |
| טלפון | phone | 75% | |
| דוא״ל | email | 75% | |
| לינק לאתר/דף נחיתה | url | 75% | |
| תקציב | text | 39% | מעורב: `"20,000 ₪"`, `30k-50k $`, חופשי |
| חומרים | url/text | 11% | **לזריקה** |
| Drive | url | 31% | |
| Facebook Ads | url | 58% | |
| Google Ads | url | 42% | |
| CMS | url | 28% | |
| Google Analytics | url | 31% | |
| בריאות קמפיינים | single-select | 78% | ערכים מהצילום: `בריא`, `אסטרטגיה צריכה`, `קריטי`, `Uncategorized` |

### 1.2 צוות (`צוות-צוות וונדר ויז'ן.csv`) — 5 רשומות

| שדה | סוג | מילוי |
|---|---|---|
| שם | text (PK) | 100% |
| תפקיד | text | 100% |
| שיוך משתמש | text (User in Airtable) | 80% |
| דוא״ל | email | 100% |

הצילום של פילטר ההקצאות חושף את הרשימה בפועל: `Idan Alush`, `Ben Shalev`, `Dan Mayzlish`, `sharon Raz`, `Internal action`, `Mr.NotDan Mayzlish`, `Table Sync`. שני האחרונים כנראה אוטומציות/אוטומטיים — לא משתמשים אמיתיים.

### 1.3 משימות (`משימות-פתיחת משימה.csv`) — 244 רשומות

| שדה | סוג | מילוי | הערה |
|---|---|---|---|
| משימה | text (כותרת) | 95% | |
| לקוח | linked → לקוחות | 100% | |
| תיאור | long text | 43% | |
| בטיפול של | multi-link → צוות | 66% | רבות בלי owner |
| סטטוס משימה | single-select | 98% | ערכים: `בעבודה`, `בוצע`, `סגור`, `הסתיים` |
| קבצים להעלאה | attachments | 7% | **לזריקה** |
| תאריך התחלה | date | 100% | |
| דדליין לסיום | date | 71% | |
| פותח המשימה | created-by | 100% | |
| תאריך עריכה אחרונה | last-modified | 98% | מערכת |
| משימה עבור קמפיין | linked → קמפיינים | 1% | **לזריקה** |
| לקוח מתוך קמפיין | lookup | 1% | **לזריקה** |
| סיום משימה בפועל | date | 0% | **לזריקה** |
| ספק | linked → ספקים | 3% | שולי — לבחון איחוד |
| לקוחות copy | duplicate | 0% | **לזריקה** |
| פרויקטים | linked → פרויקטים | 12% | שולי |

### 1.4 קמפיינים (`קמפיינים-כל הקמפיינים.csv`) — 339 רשומות

| שדה | סוג | מילוי | הערה |
|---|---|---|---|
| שם קמפיין | text | 99% | |
| לקוח | linked → לקוחות | 61% | |
| פלטפורמה | single-select | 99% | ערכים: `google`, `facebook`, `tiktok` |
| סטטוס | single-select | 61% | ערכים מצילום: `פעיל`, `הסתיים`, `בעבודה`, `מושהה` |
| תאריך התחלה | date | 100% | |
| תאריך סיום | date | 0% | **לזריקה** |
| משימות | linked → משימות | 1% | reverse של 1.3, מיותר |
| תקציב יומי | number | 0% | **לזריקה** |
| תקציב חודשי | number | 1% | **לזריקה** |
| תקציב שנוצל | currency | 68% | |
| אחוז ניצול | percent | 1% | **לזריקה** (חישוב) |
| תקציב יומי עד תאריך סיום | formula | 100% | NaN בכולם — **לזריקה** |
| פגישות | linked → פגישות | 0% | **לזריקה** |
| Campaign ID | text | 40% | מזהה חיצוני (Meta/Google) |
| Campaign Data Daily | attachment/sync | 0% | **לזריקה** |
| לקוחות copy | duplicate | 0% | **לזריקה** |
| לוג קמפיינים | linked → לוג | 0% | **לזריקה** (טבלת הלוג ריקה בפועל) |

### 1.5 פגישות (`פגישות-פגישות.csv`) — 21 רשומות

| שדה | סוג | מילוי |
|---|---|---|
| נושא הפגישה | text | 95% |
| תאריך פגישה | datetime | 90% |
| לקוח | linked → לקוחות | 90% |
| היו בפגישה | text/multi-link | 71% |
| תיעוד וסיכום פגישה | long text | 100% |
| מקושר לקמפיין | linked → קמפיינים | 0% **לזריקה** |
| לקוחות copy | duplicate | 0% **לזריקה** |

### 1.6 גישות וסיסמאות (`גישות וסיסמאות-כל הגישות.csv`) — 13 רשומות

| שדה | סוג | מילוי |
|---|---|---|
| לאן הגישה? | text | 100% |
| לינק | url | 100% |
| שם משתמש | text | 92% |
| סיסמה | text (plain) | 85% |
| לקוחות | linked → לקוחות | 100% |
| לקוחות copy | duplicate | 0% **לזריקה** |

**אזהרת אבטחה:** סיסמאות בטקסט גלוי. ב-Postgres להצפין (`pgcrypto`) או להחליט שזה לא נכנס למערכת — לטובת הצוות הקטן עדיף 1Password/Bitwarden, וזה לא נכנס לכלי בכלל.

### 1.7 ספקים (`ספקים-Grid view.csv`) — 5 רשומות

| שדה | סוג | מילוי |
|---|---|---|
| שם ספק | text | 100% |
| טלפון | phone | 0% |
| אימייל | email | 0% |
| כתובת | text | 0% |
| סוג שירות | single-select | 80% |
| קבצים / הסכמים | attachment | 0% |
| הערות | long text | 0% |
| סטטוס ספק | single-select | 100% (`פעיל`) |
| לקוחות קשורים | linked | 0% |
| משימות | linked | 60% (reverse) |
| הסכם עבודה | url | 20% |
| דוח מעקב שעות | url | 20% |
| לקוחות copy | duplicate | 0% |

5 ספקים בלבד, רוב השדות ריקים. **כדאי לזרוק את הטבלה כולה** ולהפוך לשדה טקסט חופשי על משימה אם בכלל.

### 1.8 מידע ותוכן (`מידע ותוכן-הכל.csv`) — 14 רשומות

| שדה | סוג | מילוי |
|---|---|---|
| סוג תוכן | text | 100% |
| נושא | text (tags משולבים) | 100% |
| לינק למקור | url | 100% |
| קובץ מקור | attachment | 7% **לזריקה** |
| הערות | long text | 50% |

זה בעצם bookmarks/snippets. שימוש קל.

### 1.9 פרויקטים (`פרויקטים-Grid view.csv`) — 7 רשומות

ריק כמעט לגמרי: שם 86%, סטטוס 14%, תקציב 0%, בריף 0%. **לזרוק את הטבלה.** השימוש האמיתי הוא בטבלת משימות.

### 1.10 דיווח שבועי (`דיווח שבועי-Grid view.csv`) — 3 רשומות, כולן ריקות

**לזרוק לגמרי.** רעיון שלא יצא לפועל.

### 1.11 לוג קמפיינים (`לוג קמפיינים-Grid view.csv`) — 1 רשומה

טבלה שנבנתה ולא אומצה. **לזרוק.** אם אופטימיזציות חשובות, רושמים אותן כמשימה.

### 1.12 טופס תכנון ואסטרטגיה (`טופס תכנון ואסטרטגיה-Grid view.csv`) — 3 רשומות

8/9 שדות מלאים ב-100% בכל 3 הרשומות. שדה `פלטפורמה` ריק תמיד. **לשמור** — תיעוד אסטרטגיה ללקוח, חתיכה אחת ארוכה לכל לקוח.

### 1.13 תיבת הצעות (`תיבת הצעות-Grid view.csv`) — 13 רשומות

| שדה | סוג | מילוי |
|---|---|---|
| הצעה | text | 100% |
| הערות | long text | 0% |
| מציע | text | 100% |
| נוצר ב | datetime | 100% |

לשקול: זה GitHub Issues פנימי. אפשר להוציא לכלי חיצוני, אבל זול לשמור.

---

## 2. סיכום שדות לזריקה (לפי CLAUDE.md סעיף 2)

**שדות שכמעט תמיד ריקים — לא עברו לכלי החדש:**

- כל ה-`לקוחות copy` בכל הטבלאות (0% בכל מקום, dupes מ-Airtable sync)
- משימות: `קבצים להעלאה` (7%), `משימה עבור קמפיין` (1%), `לקוח מתוך קמפיין` (1%), `סיום משימה בפועל` (0%), `ספק` (3%), `פרויקטים` (12%)
- קמפיינים: `תאריך סיום` (0%), `תקציב יומי` (0%), `תקציב חודשי` (1%), `אחוז ניצול` (1%), `תקציב יומי עד תאריך סיום` (100% NaN), `פגישות` (0%), `Campaign Data Daily` (0%), `לוג קמפיינים` (0%), `משימות` (1% — reverse)
- פגישות: `מקושר לקמפיין` (0%)
- לקוחות: `חומרים` (11%)
- מידע ותוכן: `קובץ מקור` (7%)

**טבלאות לזריקה לגמרי:**
- `פרויקטים` — 7 שורות, כמעט ריקות, חופפת ל"משימות"
- `דיווח שבועי` — 3 שורות, 100% ריקות
- `לוג קמפיינים` — שורה אחת, לא אומץ
- `ספקים` — 5 שורות עם רוב השדות ריקים. אם בכלל — שדה טקסט במשימה
- `גישות וסיסמאות` — להוציא לכלי ייעודי (1Password). לא לשמור סיסמאות בטקסט במערכת חדשה

**טבלאות לשמור:**
- `לקוחות` (קריטי)
- `צוות` (קטן, אבל נחוץ ל-`assignee`)
- `משימות` (הלב)
- `קמפיינים` (יש נתונים אמיתיים — שם, פלטפורמה, סטטוס, תקציב שנוצל, Campaign ID)
- `פגישות` (לוג סיכומי שיחה — קצר ושימושי)
- `מידע ותוכן` (bookmarks)
- `טופס תכנון ואסטרטגיה` (מסמך אסטרטגיה ללקוח)
- `תיבת הצעות` (זול לשמור)

---

## 3. הצעת סכמת Postgres

עקרונות:
- שמות טבלאות/עמודות באנגלית, snake_case. תוכן עברי כמובן.
- מפתחות `bigserial` או `uuid`. אני מציע **`uuid` עם `gen_random_uuid()`** — נוח ל-Telegram ול-API חיצוני.
- שדות תאריך → `date` או `timestamptz` לפי הצורך. שעות פגישה הן `timestamptz`.
- `single-select` של Airtable → `text` עם `CHECK` במקום `enum`, כי הערכים מתפתחים בקלות.
- `multi-link` של Airtable → טבלת קשר (`task_assignees`).
- RLS: כל משתמש מאומת מהדומיין רואה הכל (לפי CLAUDE.md).

### 3.1 `clients`

```sql
create table clients (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,           -- "פוטוטבע | Phototeva"
  contact_name  text,                            -- איש קשר/מנהל שיווק
  account_manager_id uuid references team_members(id),
  phone         text,
  email         text,
  website_url   text,
  budget_note   text,                            -- חופשי, לא מספר. "20,000 ₪" / "30k-50k $"
  drive_url     text,
  facebook_ads_url text,
  google_ads_url text,
  cms_url       text,
  analytics_url text,
  health        text check (health in ('בריא','אסטרטגיה צריכה','קריטי')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

זרקתי: `חומרים` (11%), `לקוחות copy`.

### 3.2 `team_members`

```sql
create table team_members (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,                     -- "Idan Alush"
  role        text,                              -- "קמפיינר"
  email       text not null unique,
  auth_user_id uuid unique,                      -- ↔ Supabase auth.users.id, ממולא בלוגין ראשון
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
```

`Internal action`, `Mr.NotDan Mayzlish`, `Table Sync` — לא מייבאים. אם בכל זאת מופיעים בייבוא, שמים `active=false`.

### 3.3 `tasks`

```sql
create table tasks (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,                  -- "משימה"
  client_id      uuid not null references clients(id),
  description    text,
  status         text not null default 'בעבודה'
                 check (status in ('בעבודה','בוצע','סגור')),
  start_date     date not null default current_date,
  due_date       date,
  created_by_id  uuid references team_members(id),  -- "פותח המשימה"
  source         text not null default 'web'
                 check (source in ('web','telegram','import')),  -- חדש, לטובת analytics
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index tasks_client_idx on tasks(client_id);
create index tasks_status_open_idx on tasks(status) where status = 'בעבודה';
create index tasks_due_idx on tasks(due_date) where due_date is not null;
```

`הסתיים` במקור מנורמל ל-`בוצע` בייבוא.

### 3.4 `task_assignees` (multi-link)

```sql
create table task_assignees (
  task_id   uuid not null references tasks(id) on delete cascade,
  member_id uuid not null references team_members(id) on delete restrict,
  primary key (task_id, member_id)
);
```

זרקתי ממשימות: `קבצים להעלאה`, `משימה עבור קמפיין`, `לקוח מתוך קמפיין`, `סיום משימה בפועל`, `ספק`, `פרויקטים`, `לקוחות copy`, `תאריך עריכה אחרונה` (יש לנו `updated_at`).

### 3.5 `campaigns`

```sql
create table campaigns (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  client_id      uuid references clients(id),    -- 39% במקור חסרים, לכן nullable
  platform       text not null
                 check (platform in ('google','facebook','tiktok')),
  status         text check (status in ('פעיל','הסתיים','בעבודה','מושהה')),
  start_date     date,
  spent          numeric(12,2),                  -- "תקציב שנוצל"
  external_campaign_id text,                     -- "Campaign ID" של Meta/Google
  created_at     timestamptz not null default now()
);

create index campaigns_client_idx on campaigns(client_id);
```

זרקתי: `תאריך סיום`, `תקציב יומי`, `תקציב חודשי`, `אחוז ניצול`, `תקציב יומי עד תאריך סיום`, `פגישות`, `Campaign Data Daily`, `לוג קמפיינים`, `משימות` (reverse), `לקוחות copy`.

### 3.6 `meetings`

```sql
create table meetings (
  id           uuid primary key default gen_random_uuid(),
  title        text,
  meeting_at   timestamptz,
  client_id    uuid references clients(id),
  attendees    text,                              -- "היו בפגישה" — טקסט חופשי, לא נורמלי
  summary      text not null,                     -- "תיעוד וסיכום פגישה"
  created_at   timestamptz not null default now()
);

create index meetings_client_idx on meetings(client_id);
```

`attendees` נשאר טקסט: 21 רשומות, ערך מעורב (`Idan Alush`, `עודד ורועי`), לא שווה לנרמל. אם בעתיד יהיה צורך — אפשר להוסיף `meeting_attendees` חמשרושיים.

### 3.7 `client_strategies`

```sql
create table client_strategies (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null unique references clients(id),  -- one per client
  strategy       text,
  kpis           text,
  audiences      text,
  messages_copy  text,
  testing        text,
  funnel_stages  text,
  timeline       text,
  updated_at     timestamptz not null default now()
);
```

זרקתי `פלטפורמה` (ריק תמיד).

### 3.8 `content_resources` (מידע ותוכן)

```sql
create table content_resources (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null,                     -- "סוג תוכן"
  topic       text,                              -- tags משולבים, להשאיר טקסט
  source_url  text not null,
  notes       text,
  created_at  timestamptz not null default now()
);
```

זרקתי `קובץ מקור` (7%).

### 3.9 `suggestions` (תיבת הצעות)

```sql
create table suggestions (
  id          uuid primary key default gen_random_uuid(),
  suggestion  text not null,
  notes       text,
  suggester   text,                              -- שם חופשי, אין FK ל-team_members
  created_at  timestamptz not null default now()
);
```

### לא נבנות (טבלאות שזורקים)

- `vendors` — 5 שורות, נטוש. אם יעלה הצורך, להוסיף שדה `vendor_note text` ב-`tasks`.
- `projects` — 7 שורות, נטוש. משימה כבר מקושרת ללקוח.
- `weekly_reports` — 100% ריק.
- `campaign_log` — שורה אחת.
- `credentials` — סיכון אבטחה, להחצין ל-1Password.

---

## 4. החלטות פתוחות לאישור

1. **PK בטבלת `clients`:** UUID, אבל לשמור `name` כייחודי לטובת lookup מטלגרם ("פתח משימה לפוטוטבע"). מקובל?
2. **סטטוס משימה:** הצעתי 3 ערכים בלבד (`בעבודה`/`בוצע`/`סגור`). ב-CSV יש גם `הסתיים` — אאחד אותו עם `בוצע` בייבוא. מקובל?
3. **`account_manager_id`:** FK בודד ב-`clients`. ב-Airtable זה היה שדה טקסט. בדקתי — 36/36 מלאים בערך אחד מתוך {`sharon Raz`, `Idan Alush`, `Ben Shalev`, `Dan Mayzlish`}. אם מאשר — אנרמל בייבוא.
4. **סיסמאות:** ההמלצה שלי לא להעביר את `credentials` בכלל. רוצה לבטל?
5. **`source` במשימות:** הוספתי שדה חדש שלא היה ב-Airtable (`web`/`telegram`/`import`), כי אתה הולך לעבוד מטלגרם ויהיה שימושי לדעת באנליטיקה. סבבה?
6. **`vendors`/`projects`/`vendor_note`:** הצעה לזרוק לגמרי. אם יש מקרה שאתה מכיר שזה כן צריך לחיות — תגיד.

**עוצר לאישור לפני שאני ממשיך לסקאפולד Next.js + migrations.**
