# BrightCRM Architecture Audit

**Date:** 2026-06-04
**Scope:** Full codebase — every `.ts`, `.tsx`, `.sql` file outside `node_modules` and `.next`
**Method:** 4 parallel audit agents covering all 10 areas, read every source file

---

## Scorecard

| # | Area | Score | Verdict |
|---|------|-------|---------|
| 1 | Error Handling | **5/10** | Inconsistent — server actions are solid, data layer silently swallows ~15 query errors |
| 2 | Data Fetching Patterns | **7/10** | Clean server/client split, but no Suspense boundaries and comments bypass the pattern |
| 3 | Type Safety | **3/10** | 40+ `as any` casts, no generated Supabase types, types scattered across files |
| 4 | Component Structure | **4/10** | 4 files over 400 lines, 3 utilities duplicated 3-4x each, 2 UI components duplicated |
| 5 | Database Queries | **5/10** | Client-side counting anti-pattern x4, N+1 in attachments, fetch-all-then-filter, missing indexes |
| 6 | State Management | **6/10** | Generally solid, one component with 13+ useState, 2 components break server-first pattern |
| 7 | API / Server Actions | **6/10** | Chat API has no auth, WhatsApp signature bypass, no ownership checks on comments |
| 8 | Middleware & Auth | **7/10** | Solid architecture, triple `getUser()` per request is wasteful, cron secret fails open |
| 9 | File Structure | **8/10** | Clean App Router layout, good separation of concerns, some dead code to clean up |
| 10 | Performance | **6/10** | No pagination, dashboard fires 20+ queries, no Suspense, `getCommentCountsByTask` fetches all rows |

**Overall: 5.7/10** — Solid architecture with correct patterns, but significant gaps in type safety, error handling, and query optimization that will compound as data grows.

---

## 1. Error Handling (5/10)

### CRITICAL

| Issue | File | Line(s) | Fix |
|-------|------|---------|-----|
| No `error.tsx` error boundaries anywhere. A single Supabase failure crashes the entire page (dashboard, tasks, clients). | All `page.tsx` files | — | Add `error.tsx` in `app/(app)/`, `app/(app)/tasks/`, `app/(app)/clients/`, `app/(app)/dashboard/` with fallback UI |
| Server component `Promise.all` calls have no fallback. Dashboard does 7 parallel fetches — one failure kills the page. | `app/(app)/dashboard/page.tsx` | 89-97 | Wrap in try/catch or use `Promise.allSettled`, degrade gracefully |
| Same `Promise.all` crash risk on tasks page (5 fetches) | `app/(app)/tasks/page.tsx` | 39-45 | Same fix |
| Same `Promise.all` crash risk on clients page (3 fetches) | `app/(app)/clients/page.tsx` | 22-27 | Same fix |
| Same on client detail page (4 fetches) | `app/(app)/clients/[id]/page.tsx` | 27-29 | Same fix |

### HIGH

| Issue | File | Line(s) | Fix |
|-------|------|---------|-----|
| ~15 functions in `lib/data.ts` silently swallow DB errors by returning `data ?? []` without checking `error` | `lib/data.ts` | 172, 189, 215, 239, 275, 309, 356, 372, 400, 435, 452, 513, 560, 594, 613, 625, 661 | Add `if (error) throw error` to match pattern used by `getTasks`, `getClients`, etc. |

### MEDIUM

| Issue | File | Line(s) | Fix |
|-------|------|---------|-----|
| Cron endpoints accept unauthenticated requests if `CRON_SECRET` env var is not set. Pattern: `if (cronSecret) { check }` fails open. | `app/api/cron/overdue/route.ts`, `morning-digest/route.ts`, `overdue-email/route.ts` | 9-13 | Change to `if (!cronSecret \|\| req.headers.get('authorization') !== ...)` — fail closed |
| Email notification errors silently swallowed with `.catch(() => {})` | `app/(app)/tasks/actions.ts` | 277-279 | At minimum log the error: `.catch(console.error)` |

### LOW

| Issue | File | Line(s) | Fix |
|-------|------|---------|-----|
| `recordTaskView` entire upsert has no error handling | `app/(app)/tasks/actions.ts` | 440-446 | Add basic error logging |
| `deleteComment` doesn't check errors on child reply/attachment deletion | `app/(app)/tasks/actions.ts` | 398-416 | Check intermediate errors |
| Client-side `fetchComments` in task-comments.tsx has no error handling | `app/(app)/tasks/task-comments.tsx` | 570-598 | Add try/catch with user notification |

---

## 2. Data Fetching Patterns (7/10)

### MEDIUM

| Issue | File | Line(s) | Fix |
|-------|------|---------|-----|
| `task-comments.tsx` bypasses the data layer — fetches directly from browser Supabase client instead of server actions | `app/(app)/tasks/task-comments.tsx` | 13, 559-598 | Move to server action or fetch comments in the parent server component |
| No Suspense boundaries — pages are all-or-nothing renders. Dashboard loads 7 data sources before showing anything. | All `page.tsx` files | — | Wrap independent sections in `<Suspense>` with skeleton fallbacks |
| Settings page fetches data sequentially instead of `Promise.all` | `app/(app)/settings/page.tsx` | 17-38 | Parallelize with `Promise.all` |

### Positive findings
- All `"use client"` directives are justified — no unnecessary client components
- Clean server-fetches → client-renders pattern followed consistently (except comments)
- Server actions handle mutations, data.ts handles reads — good separation

---

## 3. Type Safety (3/10)

### CRITICAL

| Issue | File | Line(s) | Fix |
|-------|------|---------|-----|
| No generated Supabase types. Every `.select()` result is cast through `as any`. ~25 instances in data.ts alone. | `lib/data.ts` | 115, 118, 119, 140, 151, 165, 201, 222, 258, 263, 268, 389, 443, 459, 477, 533, 544, 581-585, 601, 639, 668 | Run `supabase gen types typescript --project-id <id> > lib/database.types.ts`, type the Supabase client, remove all `as any` |

### HIGH

| Issue | File | Line(s) | Fix |
|-------|------|---------|-----|
| Double casts: `as unknown as Client[]` — red flag that types don't match schema | `lib/data.ts` | 140, 151 | Generated types would eliminate these |
| `setCollapsed: setCollapsed as any` in shared context | `app/(app)/shell-context.tsx` | 20 | Type properly as `React.Dispatch<React.SetStateAction<boolean>>` |
| `member={creator as any}` prop bypass | `app/(app)/tasks/tasks-client.tsx` | 138, 191 | Define proper `UserChip` prop type |
| `as any[]` casts in server actions | `app/(app)/tasks/actions.ts` | 364, 454, 472 | Use generated types |
| `as any` casts at server/client boundary | `app/(app)/settings/page.tsx` | 131, 145 | Pass properly typed data |
| `as any[]` in email notify functions | `lib/email/notify.ts` | 57, 65, 146, 153 | Use generated types |

### MEDIUM

| Issue | File | Line(s) | Fix |
|-------|------|---------|-----|
| Types defined inline in `lib/data.ts` rather than a central `types.ts` | `lib/data.ts` | 1-50 | Extract to `lib/types.ts` or better: use generated types |
| Duplicate type definitions in actions.ts, settings-client.tsx, profile-client.tsx | Multiple files | — | Import from shared location |
| `updateTaskStatus` accepts any string for status with no validation against the allowed enum | `app/(app)/tasks/actions.ts` | 145 | Validate against `TaskStatus` type |

---

## 4. Component Structure (4/10)

### CRITICAL

| Issue | File | Lines | Fix |
|-------|------|-------|-----|
| `task-comments.tsx` is 803 lines with 4 components + utility function | `app/(app)/tasks/task-comments.tsx` | 803 | Split into `comment-input.tsx`, `single-comment.tsx`, `task-comments.tsx` |

### HIGH

| Issue | File | Lines | Fix |
|-------|------|-------|-----|
| `tasks-client.tsx` is 680 lines with `TaskDetailPanel` (224 lines) embedded | `app/(app)/tasks/tasks-client.tsx` | 680 | Extract `TaskDetailPanel` to its own file |
| `task-form.tsx` is 598 lines with 4 sub-components + dual-mode rendering | `app/(app)/tasks/task-form.tsx` | 598 | Extract `AssigneeDropdown`, `TagSelector`, `CollapsibleTextarea` |
| `task-table.tsx` is 469 lines with `StatusDropdown` embedded | `app/(app)/tasks/task-table.tsx` | 469 | Extract `StatusDropdown` to shared component |

### MEDIUM — Duplicated utilities

| Function | Duplicated in | Fix |
|----------|---------------|-----|
| `getInitials()` | `lib/utils.ts`, `task-form.tsx:30`, `dashboard/page.tsx:59`, `settings/settings-client.tsx:25` | Import from `lib/utils.ts` everywhere |
| `relativeDate()` | `task-table.tsx`, `task-kanban.tsx:15`, `dashboard/page.tsx:37` | Move to `lib/utils.ts`, import |
| `timeAgo()` | `task-comments.tsx:27`, `dashboard/page.tsx:46`, `activity/page.tsx:8`, `notification-bell.tsx` | Move to `lib/utils.ts`, import |

### MEDIUM — Duplicated components

| Component | Duplicated in | Fix |
|-----------|---------------|-----|
| `Toggle` switch | `settings/settings-client.tsx`, `profile/profile-client.tsx` | Extract to `components/ui/toggle.tsx` |
| `Section` + `Field` form helpers | `clients/client-form.tsx`, `profile/profile-client.tsx` | Extract to shared form components |
| `STATUS_LABELS` / `STATUS_BG` / `STATUS_TEXT` | `task-table.tsx`, `components/ui/badge.tsx` | Use canonical `STATUS_LIGHT` from badge.tsx |
| `AnimatedNumber` | `components/motion.tsx:121`, `components/dashboard/animated-layout.tsx:49` | Keep one, remove the other |

---

## 5. Database Queries (5/10)

### CRITICAL

| Issue | File | Line(s) | Fix |
|-------|------|---------|-----|
| N+1: `getCommentAttachments` generates a signed URL per attachment in a loop | `app/(app)/tasks/actions.ts` | 376-381 | Use `createSignedUrls` (batch) instead of `createSignedUrl` per item |
| N+1: `notifyOverdueByEmail` checks `notification_log` per assignee per task | `lib/email/notify.ts` | 228-235 | Batch-check all pairs in one query |

### HIGH

| Issue | File | Line(s) | Fix |
|-------|------|---------|-----|
| `getCommentCountsByTask` fetches ALL comment rows into memory to count them in JS | `lib/data.ts` | 613-623 | Replace with RPC using `GROUP BY task_id` |
| `getOpenTaskCountsByClient` / `getClientsWithOpenTaskCounts` fetch all open tasks to count client-side | `lib/data.ts` | 215-226, 625-649 | Same — `GROUP BY client_id` RPC |
| `getMyTasks` fetches ALL open tasks then filters by member in JS | `lib/data.ts` | 560-592 | Filter via join through `task_assignees` in the query |
| `getWeeklySourceCounts` fetches all recent tasks to count sources in JS | `lib/data.ts` | 435-450 | Three `count` queries or one RPC |
| `getDashboardCounts` when member-scoped: 2 queries + large IN list instead of joined query | `lib/data.ts` | 317-324 | Use inner join through `task_assignees` |
| Missing indexes: no index on `task_comments(task_id)`, `task_assignees(member_id)`, `notification_log(type, recipient_email, reference_id)` | `supabase/migrations/` | — | Create migration with these indexes |
| `tasks_status_open_idx` partial index only covers `status = 'בעבודה'` but queries now filter `IN('מחכה לטיפול', 'נכנס לעבודה', 'בעבודה')` | `supabase/migrations/20260518000001_init_schema.sql` | — | Drop and recreate with updated partial index or full index on status |

### MEDIUM

| Issue | File | Line(s) | Fix |
|-------|------|---------|-----|
| `getDashboardTrends` issues 8 parallel HEAD count queries | `lib/data.ts` | 413-422 | Collapse to single RPC |
| `getMyActiveTasks` in chat API same fetch-all-then-filter pattern | `app/api/chat/route.ts` | 44-57 | Filter at query level |
| N+1: `notifyNewComment` sends emails sequentially per member | `lib/email/notify.ts` | 176-194 | Use `Promise.allSettled` |

---

## 6. State Management (6/10)

### HIGH

| Issue | File | Line(s) | Fix |
|-------|------|---------|-----|
| `TasksClient` has 13+ `useState` hooks — tasks, filteredTasks, groupedTasks, viewMode, sortField, sortDirection, selectedTaskIds, bulkMode, openTaskId, isCreating, editingTask, detailTask, sidebarTask | `app/(app)/tasks/tasks-client.tsx` | 270-310 | Extract filter/sort/selection into custom hooks or use `useReducer` |
| `filteredTasks` and `groupedTasks` stored as separate `useState` instead of derived via `useMemo` — risk of stale UI | `app/(app)/tasks/tasks-client.tsx` | — | Replace with `useMemo` derived from `tasks` + filter state |
| `TaskComments` fetches data client-side via browser Supabase client, creating a waterfall | `app/(app)/tasks/task-comments.tsx` | 570-577 | Fetch in server component, pass as props |

### MEDIUM

| Issue | File | Line(s) | Fix |
|-------|------|---------|-----|
| `notification-bell.tsx` same client-side fetch pattern | `components/notification-bell.tsx` | — | Use server component or server action |
| Multiple `useState` for each form field in `task-form.tsx` instead of form state object | `app/(app)/tasks/task-form.tsx` | — | Consider `useReducer` or a form library |

### Positive findings
- `ShellContext` is well-scoped — only manages mobile menu + sidebar collapse
- No prop drilling issues found — data flows cleanly from server pages to client components
- Context usage is minimal and appropriate

---

## 7. API / Server Actions (6/10)

### CRITICAL

| Issue | File | Line(s) | Fix |
|-------|------|---------|-----|
| `/api/chat` POST has no auth check — trusts `userEmail` from request body. Anyone can POST with any email. | `app/api/chat/route.ts` | 120 | Call `getUser()` from Supabase cookies to verify session, ignore body email |
| WhatsApp webhook signature verification skippable — `if (signature && !verifySignature(...))` allows unsigned requests | `app/api/whatsapp/route.ts` | 45-48 | Change to `if (!signature \|\| !verifySignature(...))` — reject missing signatures |

### HIGH

| Issue | File | Line(s) | Fix |
|-------|------|---------|-----|
| Server actions don't verify auth — rely entirely on RLS. `createTask`, `updateTask`, `deleteTask`, `bulkUpdateStatus`, `bulkDeleteTasks` have no `getUser()` check. | `app/(app)/tasks/actions.ts` | Throughout | Add `getUser()` + domain check at top of each action |
| `addComment` accepts `authorId` from caller — client can impersonate another user | `app/(app)/tasks/actions.ts` | 240 | Derive `authorId` from `getUser()` session |
| `deleteComment` / `updateComment` have no ownership check — any user can edit/delete any comment | `app/(app)/tasks/actions.ts` | 387-416 | Verify caller is comment author |
| `updateTaskStatus` / `bulkUpdateStatus` accept any string for status, no validation against allowed enum | `app/(app)/tasks/actions.ts` | 145, 154 | Validate against `TaskStatus` values |

### MEDIUM

| Issue | File | Line(s) | Fix |
|-------|------|---------|-----|
| In-memory rate limiter in chat API won't survive serverless cold starts | `app/api/chat/route.ts` | 8-19 | Use Upstash Redis or Vercel KV for rate limiting |
| `/api/tasks/[taskId]/comments` GET has no explicit auth check (relies on RLS) | `app/api/tasks/[taskId]/comments/route.ts` | 5-33 | Add auth check for consistency |
| No input validation on task title length or content in `createTask`/`updateTask` | `app/(app)/tasks/actions.ts` | — | Validate title non-empty, reasonable length |
| Inconsistent error response format across API routes | Multiple | — | Standardize on `{ error: string, status: number }` |

---

## 8. Middleware & Auth (7/10)

### MEDIUM

| Issue | File | Line(s) | Fix |
|-------|------|---------|-----|
| Triple `getUser()` per page load — middleware, layout, and individual page each call it | `middleware.ts`, `app/(app)/layout.tsx`, page files | — | Pass user data through layout props or React cache |
| Auth callback doesn't validate `code` parameter format | `app/auth/callback/route.ts` | — | Minor, Supabase handles validation |

### Positive findings
- RLS correctly applied to all tables
- `is_bright_member()` function is sound
- Domain restriction enforced at middleware, callback, and layout (belt-and-suspenders)
- Middleware correctly skips auth for `/api/whatsapp` and `/api/cron/`
- CSRF protection via server actions is built-in with Next.js

---

## 9. File Structure (8/10)

### MEDIUM — Dead code

| Issue | File | Fix |
|-------|------|-----|
| `PageViewTracker` component never imported anywhere | `components/page-view-tracker.tsx` | Remove |
| `FadeIn`, `SlideIn`, `ScalePop` from motion.tsx never imported | `components/motion.tsx:7,76,97` | Remove unused exports |
| `notifyMentions` is a no-op but still called | `lib/email/notify.ts:198`, called from `app/api/tasks/[taskId]/comments/route.ts:106` | Remove function and call site |
| `DashboardSearch` duplicates `GlobalSearch` functionality | `components/dashboard/dashboard-search.tsx` | Remove, use GlobalSearch |
| Duplicate `AnimatedNumber` in two files | `components/motion.tsx:121` vs `components/dashboard/animated-layout.tsx:49` | Keep one |
| Unused `Clipboard` icon import | `components/file-upload.tsx:5` | Remove import |

### LOW

| Issue | File | Fix |
|-------|------|-----|
| Duplicate migration file with space in name | `supabase/migrations/20260601000002_task_watchers 2.sql` | Delete duplicate |
| CLAUDE.md says model is `claude-opus-4-7` but code uses `claude-sonnet-4-6` | CLAUDE.md vs `lib/whatsapp/parse-task.ts:97`, `app/api/chat/route.ts:192` | Update docs or code |

### Positive findings
- Clean App Router folder structure
- Good `lib/` layer separation (supabase clients, email, whatsapp, data)
- Consistent naming conventions
- Proper RTL handling throughout
- Design system well-documented in `tailwind.config.ts`

---

## 10. Performance (6/10)

### HIGH

| Issue | File | Line(s) | Fix |
|-------|------|---------|-----|
| Dashboard fires 20+ DB queries per load (7 parallel data fetches, several issue sub-queries) | `app/(app)/dashboard/page.tsx` | 89-97 | Consolidate queries into RPCs, add Suspense boundaries |
| `getCommentCountsByTask()` fetches ALL comment rows to count in JS — called on both dashboard and tasks page | `lib/data.ts` | 613-623 | Replace with `GROUP BY` RPC |
| No pagination anywhere — `getTasks()`, `getClients()` return all matching rows | `lib/data.ts` | — | Add `.range()` pagination for lists |

### MEDIUM

| Issue | File | Line(s) | Fix |
|-------|------|---------|-----|
| `force-dynamic` on all pages prevents any caching | Dashboard, tasks, clients pages | — | Acceptable for real-time internal tool, but consider `revalidate` for dashboard |
| No `<Suspense>` boundaries — pages are all-or-nothing | All `page.tsx` files | — | Wrap independent sections with skeleton fallbacks |
| No `next/dynamic` for heavy client components | — | — | Low priority given small user base |
| No `images.remotePatterns` in next.config.js for Supabase storage URLs | `next.config.js` | — | Add pattern for `*.supabase.co` |

---

## Security Issues Summary

| Severity | Issue | File |
|----------|-------|------|
| **CRITICAL** | Chat API trusts `userEmail` from request body with no session verification | `app/api/chat/route.ts:120` |
| **CRITICAL** | WhatsApp webhook accepts unsigned requests (signature check skippable) | `app/api/whatsapp/route.ts:45-48` |
| **HIGH** | XSS in email templates — user content (`description`, `comment`, `title`) interpolated into HTML without escaping | `lib/email/templates.ts:75,98,122` |
| **HIGH** | `addComment` accepts `authorId` from caller — allows impersonation | `app/(app)/tasks/actions.ts:240` |
| **HIGH** | No ownership check on comment edit/delete | `app/(app)/tasks/actions.ts:387-416` |
| **MEDIUM** | Search query not escaped before Supabase `.or()` filter — could break PostgREST filter | `lib/data.ts:243` |
| **MEDIUM** | Cron endpoints fail open when `CRON_SECRET` not set | All cron routes |
| **MEDIUM** | Hardcoded production URL in email templates | `lib/email/templates.ts:1` |
| **MEDIUM** | Excessive logging of PII (phone numbers, emails) in production | `app/api/whatsapp/route.ts`, `lib/email/notify.ts`, `lib/email/resend.ts` |

---

## Priority Fix Roadmap

### P0 — Do this week (security)

1. **Fix chat API auth** — call `getUser()` from cookies instead of trusting body email
2. **Fix WhatsApp signature** — reject requests with missing signature header
3. **Escape HTML in email templates** — sanitize user content before interpolation
4. **Validate `authorId` in `addComment`** — derive from session, not caller
5. **Add ownership check on comment edit/delete**

### P1 — Do next sprint (stability + types)

6. **Add `error.tsx` error boundaries** — at minimum in `app/(app)/`
7. **Run `supabase gen types typescript`** — eliminate `as any` casts
8. **Fix 15 silent error swallows in `lib/data.ts`** — add `if (error) throw error`
9. **Fix cron secret to fail closed**
10. **Add missing DB indexes** — `task_comments(task_id)`, `task_assignees(member_id)`

### P2 — Do next month (performance + quality)

11. **Replace `getCommentCountsByTask` with GROUP BY RPC**
12. **Fix `getMyTasks` to filter at query level** instead of fetching all tasks
13. **Extract duplicated utilities** (`timeAgo`, `relativeDate`, `getInitials`) to `lib/utils.ts`
14. **Split large components** — `task-comments.tsx`, `tasks-client.tsx`, `task-form.tsx`
15. **Add Suspense boundaries** to dashboard and tasks pages

### P3 — Backlog (nice to have)

16. Remove dead code (PageViewTracker, unused motion exports, no-op notifyMentions)
17. Extract duplicated UI components (Toggle, Section/Field)
18. Add pagination to task/client lists
19. Consolidate dashboard queries into RPCs
20. Configure `images.remotePatterns` in next.config.js
