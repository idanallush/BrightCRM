# BrightCRM Design System — Studio Light

מעודכן: 2026-06-01

**כיוון:** Studio Light. שטחים לבנים נקיים, sidebar כהה, צהוב רק על CTAs.
הדגשה דרך משקל טקסט. צבע נדיר ומדויק. שקט ואסתטי עם נקודות חדות במקומות הנכונים.

**השראה:** Linear (light), Craft, Notion — כלים שמרגישים חכמים בלי להיות רועשים.

טוקנים מוגדרים ב-`tailwind.config.ts`. רכיבי UI מבוססים על shadcn/ui עם overrides ב-`components/ui/`.

---

## Aesthetic Direction

- **Direction:** Brutally Minimal (light variant) — typography does all the work
- **Decoration:** Minimal — no gradients, no pastel cards, no colored headers
- **Mood:** Simple, smart, quiet. Like a tool built by someone who actually uses it
- **Color approach:** Restrained — yellow is the only accent, everything else is ink/gray/white

---

## Colors

### Brand & Accent
| Token | Hex | Use |
|---|---|---|
| `accent` | `#FFD02F` | Primary CTA buttons only. The ONE color users remember. |
| `ink` | `#050038` | Primary text. Deep navy, never pure black. |
| `ink-hover` | `#1A1A4E` | Hover state for ink elements |
| `ink-muted` | `#6B7280` | Secondary text, placeholders |
| `ink-secondary` | `#9CA3AF` | Tertiary text, timestamps, metadata |

### Surfaces
| Token | Hex | Use |
|---|---|---|
| `white` | `#FFFFFF` | Card backgrounds, main content |
| `surface` | `#F7F7F8` | Page background |
| `sidebar` | `#1B1B3A` | Sidebar background only (nowhere else) |

### Borders
| Token | Hex | Use |
|---|---|---|
| `border` | `#E0E0E6` | Default card/section borders |
| `hairline` | `#E8E8F0` | Subtle inner dividers |
| `hairline-soft` | `#F0F0F5` | Table row separators |
| `hairline-strong` | `#C0C0D0` | Emphasized dividers |

### Status (functional — used ONLY on status indicators, not decoration)
| Status | Saturated hex | Light bg | Dark text |
|---|---|---|---|
| Waiting | `#FDAB3D` | `#FFF3E0` | `#92400E` |
| Incoming | `#4262FF` | `#EEF2FF` | `#2B42B0` |
| Working | `#A25DDC` | `#F5F3FF` | `#5B21B6` |
| Approval | `#FFCB00` | `#FFFBEB` | `#78350F` |
| Done | `#00C875` | `#ECFDF5` | `#065F46` |
| Overdue | `#E2445C` | `#FEF2F2` | `#991B1B` |

**Status badge treatment:** Light bg + matched dark text (soft pills).
Saturated hex used ONLY for kanban column headers and table group rows (functional, not decorative).

### Removed from system
- ~~Pastel palette (pastel-rose, pastel-coral, etc.)~~ — replaced by white cards with subtle borders
- ~~bg-sidebar on card headers~~ — replaced by `border-b border-border`
- ~~Primary blue (#4262FF) as a UI color~~ — kept only for links and focus rings

---

## Typography

### Font
- **Primary:** Almoni (local OTF, weights 400/500/600/700)
- **Stack:** `var(--font-almoni), system-ui, -apple-system, Segoe UI, Arial, sans-serif`
- Almoni is a Hebrew geometric face with clean Latin characters. RTL-first.

### Scale
| Token | Size | Weight | Use |
|---|---|---|---|
| `text-2xl` | 24px | 800 | Page titles (שלום, Idan) |
| `text-lg` | 18px | 700 | Section headers |
| `text-base` | 16px | 700 | Card headers |
| `text-body-md` | 15px | 400 | Body text |
| `text-body-sm` | 14px | 400 | Default body |
| `text-button` | 14px | 600 | Button labels |
| `text-caption` | 13px | 400 | Timestamps, metadata |
| `text-sm` | 13px | 500 | Table cells |

### Hierarchy principle
Weight > size > color. Use font-weight to create hierarchy before reaching for larger sizes or different colors. A 14px/700 label reads as more important than a 16px/400 paragraph.

---

## Buttons

All defined in `components/ui/button.tsx`. Primary CTAs are yellow pills.

| Variant | Visual | Use |
|---|---|---|
| `primary` | Yellow pill, ink text, elevation-1 | Main CTA (one per section max) |
| `secondary` | White pill, 2px border, ink text | Secondary actions (filter, export) |
| `dark` | Ink pill, white text, elevation-1 | Strong secondary (cancel in modals) |
| `ghost` | No bg, ink text, hover:bg-surface | Toolbar/inline actions |
| `danger` | Red pill, white text | Delete/destructive |
| `link` | Blue text, no bg | Inline links |

### Sizes
| Size | Height | Use |
|---|---|---|
| `sm` | 32px | Compact UI, table actions |
| `md` | 40px | Default |
| `lg` | 48px | Hero CTA, form submit |
| `icon` | 36px | Icon-only buttons |

---

## Border Radius

| Token | Value | Use |
|---|---|---|
| `rounded-full` | 9999px | Buttons, badges, pills, FAB, avatars |
| `rounded-2xl` | 16px | Cards, modals |
| `rounded-xl` | 12px | Ghost buttons, dropdowns |
| `rounded-lg` | 8px | Inputs, selects, textareas |
| `rounded-xxxl` | 28px | Large feature cards (if ever needed) |

---

## Elevation

| Token | Use |
|---|---|
| `elevation-1` | Cards, stat blocks — barely visible lift |
| `elevation-2` | FAB, hover cards |
| `elevation-3` | Dropdowns, popovers |
| `elevation-4` | Sheet panels |
| `elevation-5` | Modals |

---

## Components

### Cards
```
rounded-2xl border border-border bg-white shadow-elevation-1
```
- **Card headers:** `border-b border-border` + `text-ink font-bold`. NEVER `bg-sidebar`.
- Card content: `p-4` or `p-5`

### Sidebar
- Background: `bg-sidebar` (`#1B1B3A`) — the ONLY place dark bg is used
- Logo: Bright TASKS PNG wordmark via `components/logo.tsx`
- Active nav item: `bg-white/10` with yellow right indicator bar (`bg-accent`)
- User area: avatar with initials

### Header / Topbar
- `bg-white/80 backdrop-blur-md border-b border-border`
- Sticky top. Glass effect on scroll.

### Stat Cards (Dashboard)
- **White background** with border and subtle elevation. NOT pastel backgrounds.
- Status indicator: small colored dot (6px) next to the number, not full-card color.
- Number: `text-2xl font-800 text-ink`. Label: `text-caption text-ink-secondary`.

### Status Badges
- Pill-shaped (`rounded-full`)
- Light bg + dark text treatment: `bg-st-waiting-bg text-st-waiting-text`
- Optional thin border for definition: `border border-[status-color]/30`
- Used in tables, kanban cards, task detail

### Inputs & Selects
- `h-11 rounded-lg border border-border bg-white`
- Focus: `focus:border-primary focus:ring-2 focus:ring-primary/20`
- All form elements same treatment for consistency

### Dialogs & Sheets
- Overlay: `bg-ink/30 backdrop-blur-[2px]`
- Content: `rounded-2xl shadow-elevation-5`
- Header: text only, no colored bar

### Quick-Add FAB
- `rounded-full bg-accent text-ink shadow-elevation-2`
- Fixed bottom-left

---

## Patterns

### Section Layout (NEW — white header)
```html
<div class="overflow-hidden rounded-2xl border border-border bg-white shadow-elevation-1">
  <div class="flex items-center justify-between border-b border-border px-5 py-3.5">
    <h2 class="text-base font-bold text-ink">Title</h2>
    <Link class="text-caption text-ink-secondary hover:text-ink">Link ←</Link>
  </div>
  <div class="p-4">
    Content
  </div>
</div>
```

### Hover States
- Table rows: `hover:bg-surface transition-colors`
- Cards: `hover:shadow-elevation-2`
- Links: `hover:text-primary`
- Buttons: `hover:-translate-y-px hover:shadow-elevation-2`

### Avatars
- Gradient background (unique per user)
- White initials, `rounded-full`
- Sizes: sm(24px) md(32px) lg(40px)

---

## Color Philosophy

1. **Yellow is sacred.** Only on primary CTA buttons and the sidebar active indicator. Never on backgrounds, cards, or decorative elements.
2. **Status colors are data.** They exist only on status badges, kanban columns, and progress indicators. Never used for decoration.
3. **Everything else is ink + white + gray.** Typography weight creates hierarchy. Color is reserved for meaning.
4. **When in doubt, remove the color.** If an element works without color, it shouldn't have color.

---

## Do's and Don'ts

### Do
- Use weight (600/700/800) to create hierarchy before reaching for color
- Use `border-b border-border` for section separation
- Use white cards with subtle elevation for content grouping
- Keep status colors ONLY on functional elements (badges, dots, progress)
- Use `text-ink-secondary` for all secondary/meta text
- Use `shadow-elevation-N` instead of Tailwind built-in shadows

### Don't
- Don't use `bg-sidebar` outside the actual sidebar
- Don't use pastel backgrounds on cards or stat blocks
- Don't use `bg-primary` blue for buttons — it's for links/focus only
- Don't apply color to more than 10% of any given surface
- Don't use Tailwind gray utilities (`bg-gray-*`) — use `bg-surface`, `text-ink-secondary`
- Don't use hardcoded hex colors — always use design tokens
- Don't add decoration (gradients, patterns, colored borders) without explicit approval
