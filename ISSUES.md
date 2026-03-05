# Nexus PM — Code Review Issues

Generated from code review of v1.1. All issues have been fixed in this batch.

## False Positives (Dismissed)
| Finding | Reason dismissed |
|---|---|
| `.env.local` credentials in git | File is in `.gitignore`; git status clean — never committed |
| `AdminPage` missing auth guard | `App.tsx` wraps route in `AdminRoute`; route-level guard is sufficient |

---

## Issues Fixed

| # | Severity | File | Line | Issue | Fix |
|---|---|---|---|---|---|
| 1 | CRITICAL | `src/pages/ForgotPasswordPage.tsx` | 18 | Production URL hardcoded — breaks local/staging password reset | Replaced with `import.meta.env.VITE_APP_URL` fallback |
| 2 | CRITICAL | `supabase/schema.sql` | 211 | tasks write: `using(true)` — any user can delete any task | DELETE restricted to ADMIN/VERTICAL_LEAD |
| 3 | CRITICAL | `supabase/schema.sql` | 219 | comments write: `using(true)` — any user can delete any comment | DELETE/UPDATE restricted to own comment or ADMIN |
| 4 | CRITICAL | `supabase/schema.sql` | 263 | external_stakeholders write: `using(true)` — any member can modify stakeholders | Write restricted to ADMIN only |
| 5 | CRITICAL | `supabase/schema.sql` | 280 | meetings write: `using(true)` — any member can modify/delete meetings | Write restricted to ADMIN/VERTICAL_LEAD |
| 6 | HIGH | `src/services/auth.ts` | 44 | Avatar upload accepts any file extension | Whitelist: jpg, jpeg, png, gif, webp |
| 7 | HIGH | `src/context/AppContext.tsx` | 73–104 | 6 empty `catch {}` blocks swallow errors silently | Added `console.error` with context label |
| 8 | HIGH | `src/services/notifications.ts` | 18, 24 | `markRead`/`markAllRead` ignore Supabase errors | Destructure `error`, log if present |
| 9 | HIGH | `src/components/TaskModal/TaskModal.tsx` | 34–37 | useEffect: no cleanup for in-flight listComments/getActivityLogs | Added `cancelled` flag + cleanup return |
| 10 | HIGH | `src/components/SearchModal/SearchModal.tsx` | 49–67 | Debounce `setTimeout` has no effect cleanup — can fire after unmount | Added `return () => clearTimeout(...)` |
| 11 | HIGH | `src/pages/AdminPage.tsx` | 180 | `load()` called directly in render body (anti-pattern, repeated calls) | Moved to `useEffect` |
| 12 | MEDIUM | `src/components/GanttChart/GanttChart.tsx` | 34–66 | 4 `.reduce()` calls re-run on every render | Wrapped in `useMemo` |
| 13 | MEDIUM | `src/components/Sidebar/Sidebar.tsx` | 60–64 | `visibleUsers`/`displayedUsers` re-computed every render | Wrapped in `useMemo` |
| 14 | MEDIUM | `src/components/TaskModal/ActivityFeed.tsx` | 15 | `m.from as string` / `m.to as string` unsafe cast | Added `typeof` type guards |
| 15 | MEDIUM | `package.json` | 6–9 | Missing `typecheck` script | Added `"typecheck": "tsc --noEmit"` |
| 16 | LOW | `src/services/projects.ts` | 33 | Magic string `'#6366f1'` default color | Extracted `DEFAULT_PROGRAM_COLOR` constant |
| 17 | LOW | `src/services/tasks.ts` | 94, 105 | Delete errors unchecked in `setTaskAssignees`/`setTaskVerticals` | Added error check and throw |
| 18 | LOW | `src/context/AppContext.tsx` | 120 | Magic string `'notifications'` Realtime channel name | Extracted `NOTIFICATIONS_CHANNEL` constant |
| 19 | LOW | *(new file)* | — | No security headers on Netlify deployment | Created `netlify.toml` with CSP-adjacent headers |

---

## Supabase SQL Migration
The RLS policy changes above are reflected in `supabase/schema.sql` for fresh installs.
For the **live database**, run the following in Supabase Dashboard → SQL Editor:

```sql
-- Tasks: restrict DELETE to admin/lead
drop policy if exists "tasks_write" on public.tasks;
create policy "tasks_insert_update" on public.tasks for insert to authenticated with check (true);
create policy "tasks_update"        on public.tasks for update to authenticated using (true) with check (true);
create policy "tasks_delete"        on public.tasks for delete to authenticated
  using (public.current_user_role() in ('ADMIN','VERTICAL_LEAD'));

-- Comments: own-comment-or-admin for update/delete
drop policy if exists "comments_all" on public.comments;
create policy "comments_select" on public.comments for select to authenticated using (true);
create policy "comments_insert" on public.comments for insert to authenticated with check (true);
create policy "comments_update" on public.comments for update to authenticated
  using (user_id = auth.uid() or public.current_user_role() = 'ADMIN')
  with check (user_id = auth.uid() or public.current_user_role() = 'ADMIN');
create policy "comments_delete" on public.comments for delete to authenticated
  using (user_id = auth.uid() or public.current_user_role() = 'ADMIN');

-- External stakeholders: admin write only
drop policy if exists "stakeholders_write" on public.external_stakeholders;
create policy "stakeholders_write" on public.external_stakeholders for all to authenticated
  using (public.current_user_role() = 'ADMIN')
  with check (public.current_user_role() = 'ADMIN');

-- Meetings: admin + vertical_lead write
drop policy if exists "meetings_write" on public.meetings;
create policy "meetings_write" on public.meetings for all to authenticated
  using (public.current_user_role() in ('ADMIN','VERTICAL_LEAD'))
  with check (public.current_user_role() in ('ADMIN','VERTICAL_LEAD'));

drop policy if exists "meeting_members_all" on public.meeting_member_attendees;
create policy "meeting_members_all" on public.meeting_member_attendees for all to authenticated
  using (public.current_user_role() in ('ADMIN','VERTICAL_LEAD'))
  with check (public.current_user_role() in ('ADMIN','VERTICAL_LEAD'));

drop policy if exists "meeting_stk_all" on public.meeting_stakeholder_attendees;
create policy "meeting_stk_all" on public.meeting_stakeholder_attendees for all to authenticated
  using (public.current_user_role() in ('ADMIN','VERTICAL_LEAD'))
  with check (public.current_user_role() in ('ADMIN','VERTICAL_LEAD'));
```

---

## Post-Review Issues (v1.1 batch 2)

### Fixed

| # | Severity | File | Line | Issue | Fix |
|---|---|---|---|---|---|
| 20 | CRITICAL | `supabase/schema.sql` | 225 | `comments_insert` uses `with check (true)` — any user can insert a comment attributed to any `user_id` (identity spoofing) | Changed to `with check (user_id = auth.uid())` |
| 22 | MEDIUM | `src/services/notifications.ts` | 32 | `createNotification` silently swallows upsert/insert DB errors — notifications can be lost with no signal | Destructure `{ error: upsertErr/insertErr }` and `console.error` in both branches |

### Dismissed (false positives)

| # | Finding | Reason dismissed |
|---|---|---|
| 21 | `tasks_insert_update` / `tasks_update` open to all authenticated users | Intentional design — closed-org tool, all `@qcin.org` users are trusted collaborators; no project-membership access model in the UX |
| 23 | `console.error` not centralized | No telemetry service in stack; a wrapper would just re-wrap `console.error` — premature abstraction |

### Live DB Migration for #20

Run in Supabase Dashboard → SQL Editor:

```sql
drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments for insert to authenticated
  with check (user_id = auth.uid());
```

---

## Netlify Environment Variable
Add `VITE_APP_URL` to your Netlify site settings → Environment variables:
```
VITE_APP_URL=https://nexus-pm-tool.netlify.app
```
This ensures password reset emails redirect to the correct production URL.
