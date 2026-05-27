# BrightCRM Design System (Miro-Inspired)

מעודכן: 2026-05-27

Design system בהשראת Miro. כל הטוקנים מוגדרים ב-`tailwind.config.ts`.
רכיבי UI מבוססים על shadcn/ui עם overrides ב-`components/ui/`.

---

## Colors

### Brand
- **Primary (Miro blue):** `#4262FF` — links, focus rings, interactive elements
- **Accent (canary yellow):** `#FFD02F` — primary CTA buttons, logo, active states in sidebar

### Surface
- **Ink:** `#050038` — primary text color (deep navy, not pure black)
- **Ink hover:** `#1A1A4E`
- **Surface:** `#F7F7F8` — page background
- **Sidebar:** `#1B1B3A` — sidebar background + section headers
- **Border:** `#E0E0E6`
- **White:** `#FFFFFF` — card backgrounds

### Status
- **Success:** `#00C875`
- **Warning/Incoming:** `#FDAB3D`
- **Overdue:** `#E2445C`
- **Done:** `#00C875`
- **Neutral:** `#C4C4C4`

### Pastel Palette (feature cards, stat cards, avatars)
| Token | Hex | Use |
|---|---|---|
| `pastel-rose` | `#FFE4E8` | overdue stats, critical clients |
| `pastel-coral` | `#FFE0D0` | email icon bg, stat card |
| `pastel-teal` | `#D0F0E8` | success/done states, empty states |
| `pastel-yellow` | `#FFF4CC` | budget/warning, stat card |
| `pastel-blue` | `#DCE4FF` | avatars, comment badges, assignees |
| `pastel-purple` | `#EDE0FF` | manager icon bg, stat card |

---

## Typography

### Fonts
- **Primary:** DM Sans (Google Fonts) — geometric sans-serif, closest free alternative to Roobert PRO
- **Hebrew fallback:** Heebo
- **Stack:** `"DM Sans", "Heebo", ui-sans-serif, system-ui, sans-serif`

### Scale (defined in Tailwind)
| Token | Size | Weight | Use |
|---|---|---|---|
| `text-2xl` | 24px | 700 | Page titles |
| `text-lg` | 18px | 700 | Section headers |
| `text-base` | 16px | 700 | Card headers |
| `text-body-md` | 15px | 400 | Body text large |
| `text-body-sm` | 14px | 400 | Body text default |
| `text-button` | 14px | 600 | Button labels |
| `text-caption` | 13px | 400 | Captions, secondary text |
| `text-sm` | 13px | 500 | Table cells |

---

## Buttons

All primary CTAs are pill-shaped (canary yellow). Defined in `components/ui/button.tsx`.

| Variant | Classes | Use |
|---|---|---|
| `primary` | `rounded-full bg-accent text-ink` | Main CTA (yellow pill) |
| `secondary` | `rounded-full border-2 border-border bg-white text-ink` | Secondary actions |
| `ghost` | `rounded-xl text-ink hover:bg-surface` | Toolbar/inline actions |
| `danger` | `rounded-full bg-overdue text-white` | Delete/destructive |
| `link` | `text-primary hover:underline` | Inline links |

### Sizes
| Size | Height | Padding |
|---|---|---|
| `sm` | 32px | `px-4 text-[13px]` |
| `md` | 40px | `px-5` |
| `lg` | 48px | `px-7` |
| `icon` | 36px | `w-9 rounded-xl` |

---

## Border Radius

| Token | Value | Use |
|---|---|---|
| `rounded-full` | 9999px | Primary buttons, badges, pills, FAB |
| `rounded-2xl` | 16px | Cards, sections, modals |
| `rounded-xl` | 12px | Inputs, small cards, ghost buttons, dropdowns |
| `rounded-lg` | 8px | Small interactive elements (mention items, calendar tasks) |

---

## Elevation (Shadows)

| Token | Value | Use |
|---|---|---|
| `shadow-elevation-1` | `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` | Cards, stat blocks |
| `shadow-elevation-2` | `0 4px 12px rgba(0,0,0,0.08)` | FAB, hover cards |
| `shadow-elevation-3` | `0 8px 24px rgba(0,0,0,0.12)` | Dropdowns, popovers |
| `shadow-elevation-4` | `0 12px 36px rgba(0,0,0,0.16)` | Sheet panels |
| `shadow-elevation-5` | `0 20px 48px rgba(0,0,0,0.20)` | Modals, lightbox |

---

## Components

### Cards
- `rounded-2xl border border-border bg-white shadow-elevation-1`
- Section headers inside cards: `bg-sidebar` (dark) with white text
- Contact info section: `bg-surface` header bar

### Sidebar
- Background: `bg-sidebar` (`#1B1B3A`)
- Logo: `bg-accent text-ink` (yellow B on dark)
- Active nav item: `bg-accent/15` with yellow left indicator
- User area: initials in `bg-accent/20 text-accent`

### Header
- `bg-white/80 backdrop-blur-md` (glass effect)
- Sticky top

### Stat Cards (Dashboard)
- Full pastel backgrounds (not white with colored bar)
- `bg-pastel-coral`, `bg-pastel-purple`, `bg-pastel-yellow`, `bg-pastel-rose`
- Icon containers: `bg-white/60 rounded-xl`

### Status Badges
- All `rounded-full` (pill-shaped)
- Colors match status: orange (waiting), blue (incoming), yellow (in-progress), green (done), red (overdue)

### Dialogs & Sheets
- Dialog overlay: `bg-ink/30 backdrop-blur-[2px]`
- Dialog content: `rounded-2xl shadow-elevation-5`
- Sheet: `shadow-elevation-4`, edge radius on open side

### Forms
- Inputs: `rounded-xl`, `focus:ring-2 focus:ring-primary/20`
- Selects: same treatment as inputs
- Textarea: `rounded-xl`

### Quick-Add FAB
- `rounded-full bg-accent text-ink shadow-elevation-2`
- Fixed bottom-right position

---

## Patterns

### Section Layout
```
<div class="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
  <div class="bg-sidebar px-4 py-3">
    <h2 class="text-base font-bold text-white">Title</h2>
  </div>
  <div class="p-4">
    Content
  </div>
</div>
```

### Hover States
- Table rows: `hover:bg-surface`
- Cards: `hover:shadow-elevation-2`
- Links: `hover:text-primary` or `hover:underline`

### Avatars
- Background: `bg-pastel-blue`
- Text: `text-primary`
- Initials: first letter of each word, uppercase, max 2 chars

---

## Do's and Don'ts

### Do
- Use `bg-accent` (canary yellow) for all primary CTAs
- Use `bg-sidebar` (dark navy) for section headers, not `bg-primary`
- Use pastel backgrounds for feature/stat cards
- Use `rounded-2xl` for major cards, `rounded-xl` for inputs/small elements
- Use `shadow-elevation-N` instead of Tailwind's built-in shadows
- Keep all text in Hebrew, RTL

### Don't
- Don't use `bg-primary` (blue) for buttons — blue is for links and focus only
- Don't use `rounded-md` or `rounded-lg` for cards — use `rounded-2xl`
- Don't use `shadow-sm` or `shadow-lg` — use elevation tokens
- Don't use Tailwind gray utilities (`bg-gray-50`, `bg-gray-100`) — use `bg-surface`
- Don't use hardcoded hex colors (`#F5F6F8`, `#0073EA`, `#323338`) — use tokens
- Don't use `hover:bg-[#F5F6F8]` — use `hover:bg-surface`
