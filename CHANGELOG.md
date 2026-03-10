# Changelog

All notable changes to Planzo are documented here.

---

## [1.6.0] — 2026-03-10

### Security

**HTTP Security Headers** (`netlify.toml`)
- Added `Content-Security-Policy` — restricts script/style/connect/img sources to `self` and `*.supabase.co`; blocks XSS and data exfiltration
- Added `Strict-Transport-Security` (`max-age=31536000; includeSubDomains`) — enforces HTTPS for 1 year, prevents downgrade attacks
- No CSP violations — app fully functional after deployment verified

**Task RLS audit** (`supabase/migrations/005_rewrite_rls.sql`)
- Confirmed tasks INSERT/UPDATE already enforce workspace boundary via `with check (workspace_id in (get_my_workspace_ids()) and can_write_in_workspace(workspace_id))` — no additional migration needed

### Performance

**Database indexes** (`supabase/migrations/007_add_workspace_indexes.sql`)
- Added `tasks_workspace_id_idx` — eliminates full table scan on every kanban/all-tasks load
- Added `projects_workspace_id_idx` — speeds up workspace switch data fetch
- Added `meetings_workspace_id_idx` — speeds up calendar and meetings page queries
- Added `task_assignees_user_id_idx` — covers N+1 lookup in `listTasks` assigneeId filter

---

## [1.5.2] — 2026-03-09

### Added

**Email-based invite flow** (`supabase/functions/send-invite/`, `src/services/invites.ts`)
- Invites now send a branded HTML email via Resend instead of copying a link to the clipboard
- New Supabase Edge Function (`send-invite`) verifies the caller is ADMIN, creates the `workspace_invites` record, and sends the email with an **Accept Invitation** button linking to `/invite/:token`
- Edge Function deployed with `verify_jwt: false` (auth handled internally) and an 8s timeout on the Resend API call to prevent hangs
- Client updated to call the function via `supabase.functions.invoke` with a 20s `Promise.race` timeout
- Admin → Invites tab and Sidebar quick invite now show "Invite sent!" on success instead of copying a link

### Fixed

**Invite token lost when switching login → register** (`src/pages/LoginPage.tsx`)
- "Register" link on the login page now carries the invite token when arriving from `/login?redirect=/invite/:token`, so new users who accidentally click "Sign in" can still reach `/register?token=xxx` and join the correct workspace

**Invite CTA ambiguity** (`src/pages/AcceptInvitePage.tsx`)
- Added hint text and renamed buttons to "Create account — I'm new" / "Sign in — I already have an account" to eliminate confusion for first-time users

**Invited users auto-accepted after login** (`src/pages/AcceptInvitePage.tsx`)
- When a logged-in user visits `/invite/:token`, the invite is now accepted automatically via `acceptInvite()` RPC and they are redirected to the app — no dead end

---

## [1.5.1] — 2026-03-09

### Fixed

**Invite button stuck on "Sending…"** (`src/components/Sidebar/Sidebar.tsx`, `src/pages/AdminPage.tsx`)
- `navigator.clipboard.writeText()` returns a Promise that can hang indefinitely when the browser blocks clipboard permission (document not focused, permission denied without rejection)
- Because the call was `await`ed, the `finally` block never ran, leaving `inviting = true` permanently
- Changed all three call sites (sidebar quick invite, Admin → Invites tab send, copy-link button) to fire-and-forget with `.catch(() => {})` — invite is created in the DB regardless of clipboard availability

**All Tasks and My Tasks showing tasks from other workspaces** (`src/pages/AllTasksPage.tsx`, `src/pages/MyTasksPage.tsx`)
- Both pages called `listTasks()` with no `workspaceId` filter; Supabase RLS returned tasks from every workspace the user belongs to
- Now passes `activeWorkspaceId` to scope the query to the current workspace
- Added `activeWorkspaceId` to `useEffect` dependency arrays so both pages re-fetch automatically on workspace switch

---

## [1.5.0] — 2026-03-08

### Performance

**Route-level code splitting**
- All page components converted to `React.lazy()` + `Suspense` in `App.tsx`
- Initial JS bundle reduced from **583 KB → 264 KB** (gzipped: 158 KB → 78 KB) — a 51% reduction
- Each page now loads as a separate chunk on first visit; `AdminPage` (31 KB) no longer bundled for all users

**Vendor chunk splitting** (`vite.config.ts`)
- React + React Router, Supabase JS, and Lucide React split into dedicated vendor chunks
- Vendor files cached independently by the browser — app code updates no longer bust the React/Supabase cache

### Fixed

**Auth loading spinner after login**
- Removed erroneous `setLoading(true)` call from `onAuthStateChange` in `AuthContext.tsx`
- `onAuthStateChange` fires for every Supabase auth event (`INITIAL_SESSION`, `SIGNED_IN`, `TOKEN_REFRESHED`, etc.) — setting `loading = true` there caused a full-page spinner after every login and a flash on every background token refresh
- `loading` state is now controlled solely by the initial `getSession()` IIFE

**Admin page redirect race condition** (`App.tsx`)
- `AdminRoute` was using `useApp().isAdmin` which depends on `activeWorkspaceId` being validated — on first render this could be `null`, causing admins to be redirected to `/`
- Fixed by switching to `useAuth().isAdmin` (checks any-workspace admin) which is available immediately after auth resolves

**Supabase Web Lock 5-second timeout warning** (`src/lib/supabase.ts`)
- Replaced `lock: undefined` (which keeps the default Web Lock) with a no-op lock function
- Eliminates the `Lock was not released within 5000ms` console warning on every app load

### Changed
- Removed unused `StrictMode` import from `src/main.tsx`

---

## [1.4.1] — 2026-03-06

### Infrastructure
- Migrated production domain from `nexus-pm-tool.netlify.app` to `https://planzo.io`
- Custom domain configured via Hostinger DNS (A record → `75.2.60.5`, CNAME `www` → Netlify)
- SSL/TLS certificate provisioned by Netlify (Let's Encrypt); HTTPS enforced
- `VITE_APP_URL` updated to `https://planzo.io` in Netlify environment variables
- Supabase Auth URLs updated: Site URL and redirect allowlist now point to `https://planzo.io`

---

## [1.4.0] — 2026-03-06

### Added

**Google OAuth Login**
- "Continue with Google" button on both Login and Register pages
- New Google OAuth users get a profile created automatically (name + avatar pulled from Google account)
- Invite flow preserved across OAuth redirect: invite token stored in `localStorage` before redirect, auto-accepted in `AuthContext` after sign-in
- Existing email/password accounts are automatically linked if the Google email matches

**Sidebar Quick Invite**
- `+` button next to the MEMBERS heading in the sidebar (Admin only)
- Opens an inline form: email input + role dropdown (Vertical Lead / Member / Viewer) + Send Invite button
- On success, invite link is copied to clipboard with a green confirmation; form resets automatically
- `×` button closes the form; `Escape` key also dismisses it

### Database
New migration (`supabase/migrations/006_oauth_support.sql`):
- Updated `handle_new_user()` trigger — adds **Flow C** (OAuth / social sign-in): creates profile from Google metadata without requiring workspace metadata; no exception thrown
- New `accept_invite(p_token text)` SECURITY DEFINER RPC — called client-side for OAuth users to accept a workspace invite after sign-in

---

## [1.3.0] — 2026-03-06

### Added

**Multi-Workspace Architecture**
- Users can now belong to multiple workspaces (Slack/Notion model) — each workspace is a fully isolated data silo
- Workspace switcher in the sidebar header: lists all joined workspaces with a checkmark on the active one
- "Create new workspace" inline form in the switcher (email domain no longer restricted)
- Active workspace persisted to `localStorage` so switching survives page refresh
- Workspace selection page (`/select-workspace`): shown after login when a user belongs to more than one workspace

**Invite System**
- Admin can generate token-based invite links from Admin panel → Invites tab
- Invite form: email + role (Viewer / Member / Vertical Lead / Admin) → generates a link copied to clipboard
- Invites table: shows status (Pending / Used / Expired), expiry date, and a Revoke button
- Public invite landing page (`/invite/:token`): shows workspace name + assigned role with CTAs to create account or sign in
- Registration page now supports two flows:
  - **Flow A** — create a new workspace (workspace name field replaces the old org field)
  - **Flow B** — accept an invite (workspace name + role pre-filled and locked from the invite token)
- `@qcin.org` email restriction removed; any email address can register

**Viewer Role**
- New role: `VIEWER` — read-only access to the entire workspace
- Viewers can see all tasks, projects, meetings, members, and profiles, but cannot create, edit, comment, or delete anything
- UI gating: Add Task button hidden, drag-and-drop disabled, comment box hidden, inline editing locked, subtask checkboxes disabled

**Admin Panel — Invites Tab**
- 5th tab added to Admin panel: Invites
- Create and manage workspace invites from a central table

### Changed
- Role is now **per-workspace** (stored in `workspace_members`) — `profiles.role` column removed
- Registration no longer assigns a vertical; Admin assigns verticals post-join
- `isAdmin` / `isVerticalLead` / `canWrite` derived from the active workspace membership, not a global profile field

### Database
New tables (run `supabase/migrations/001–005` in Supabase SQL Editor):
- `workspaces` — workspace records with `name`, `slug`, `plan` (free / pro / enterprise)
- `workspace_members` — junction table: user ↔ workspace with per-workspace role
- `workspace_invites` — token-based invite records with expiry and used-at tracking

New DB functions:
- `get_my_workspace_ids()` — returns all workspace IDs for the current user (used in all RLS policies)
- `get_my_role_in_workspace(p_workspace_id)` — returns current user's role in a given workspace
- `can_write_in_workspace(p_workspace_id)` — returns false for VIEWER, true for all other roles
- `validate_invite_token(p_token)` — public SECURITY DEFINER RPC; validates invite token without requiring auth
- `create_workspace_for_user(p_name, p_slug)` — SECURITY DEFINER RPC used by the workspace creation form to bypass RLS on the `workspaces` table insert

All tenant-scoped tables gained a `workspace_id` FK column; all RLS policies rewritten to use the new workspace-scoped helper functions.

---

## [1.2.0] — 2026-03-05

### Changed
- UI label "Program" / "Programs" renamed to "Project" / "Projects" everywhere in the interface (TypeScript types, variables, and DB table names unchanged)

### Security
- RLS policy on `comments` INSERT now enforces `user_id = auth.uid()` in the `WITH CHECK` clause — prevents identity spoofing in comments
- Task DELETE restricted to `ADMIN` and `VERTICAL_LEAD` roles
- Comment UPDATE / DELETE restricted to own comment or ADMIN
- External stakeholder write access restricted to ADMIN only
- Avatar upload enforces an extension whitelist: `jpg`, `jpeg`, `png`, `gif`, `webp`
- Full security audit documented in `ISSUES.md`

### Fixed
- Sidebar project color bar was not rendering on first load in some browsers

---

## [1.1.0] — 2026-03-02

### Added

**My Tasks & All Tasks**
- "My Tasks" page (`/my-tasks`): kanban board scoped to tasks assigned to the current user, across all programs
- "All Tasks" page (`/all-tasks`): kanban board of every task across all programs
- Both pages show a program color chip on each task card so the originating program is always visible
- Sidebar navigation entries for both pages under General

**Search**
- Global search modal (`Ctrl+K` or click the search bar) overlays the current view
- Searches users, programs, tasks (live Supabase query), and meetings simultaneously
- Results grouped by type with color-coded pills: purple = User, indigo = Program, blue = Task, teal = Meeting
- Click a result to navigate directly: opens the task/meeting modal, switches active program, or visits a profile

**Notifications**
- Bell icon in the header with a red unread-count badge
- Dropdown panel lists notifications newest-first with relative timestamps and an unread blue dot
- "Mark all read" action in panel header
- Notification triggers:
  - Task assigned — notifies each newly added assignee
  - Task moved — notifies all assignees when a task status changes
  - Meeting added — notifies team member attendees when added to a meeting
  - Meeting reminder — fires once for meetings happening today or tomorrow (deduplicated via unique DB index)
- Live updates via Supabase Realtime subscription

**Profile Page**
- Settings icon (bottom-left of sidebar) navigates to `/profile`
- View any user's profile at `/profile/:id` (read-only for non-admins)
- Own profile: click name to edit inline, date-of-birth date picker, avatar upload
- Displays user's vertical badge and role
- KRAs and KPIs listed as cards below profile info

**KRAs & KPIs**
- Admin can assign Key Responsibility Areas and Key Performance Indicators to any user
- Managed in Admin panel → Users tab: expand a user card to reveal KRA and KPI sections with inline add / edit / delete
- Each entry has a title and optional description
- Visible on the user's profile page

**Auth improvements**
- Registration: after submitting the form, shows a "Check your inbox" confirmation panel instead of redirecting — prompts user to verify their email before signing in
- Forgot password: "Forgot password?" link on the login page → `/forgot-password` → sends Supabase reset email
- Password reset: Supabase redirects to `/reset-password` with a session token; user enters and confirms a new password then is redirected to login

### Fixed
- Activity log entries (status changes, comments, context blocks, subtasks) were silently failing because the `activity_logs` table did not exist in the database schema — table and RLS policy now created

### Database
New tables added (run additions SQL in Supabase SQL Editor for existing installs):
- `activity_logs` — task event history
- `notifications` — per-user notification inbox with unique index for meeting reminders
- `kras` — Key Responsibility Areas (admin-write, all-read RLS)
- `kpis` — Key Performance Indicators (admin-write, all-read RLS)

---

## [1.0.0] — 2026-03-01

### Added

**Auth**
- Email/password auth via Supabase; only `@qcin.org` addresses allowed
- Role system: `ADMIN` | `VERTICAL_LEAD` | `MEMBER`
- First registered user auto-promoted to ADMIN via DB trigger

**Programs**
- Create programs with name, icon (Layers / Server / Dollar / Code), deadline, and custom hex color
- Program cards on All Programs page: color bar, icon, progress bar, task counts (to do / active / done), member avatars, overdue deadline indicator
- Colored sidebar bar (3 px) next to each program name
- Admin can edit name, deadline, and color inline; delete programs

**Kanban Board**
- Three columns: To Do / In Progress / Done
- Drag-and-drop task reordering via HTML5 DnD
- Filter board by member (click member avatar in sidebar)
- Vertical Leads see only their vertical's tasks; Admins see all

**Task Modal**
- Inline title and description editing
- Status change, due date picker
- Assign members (MemberPicker) and verticals (VerticalPicker)
- Subtasks with completion toggle
- Context blocks (titled rich-text sections)
- Comments
- Activity feed: tracks status changes, comments, context blocks, subtask adds/updates

**Calendar View**
- Monthly grid, Mon-based week start
- Tasks shown by `due_date` — color-coded by their program's color
- Program deadlines shown as colored flag pills on the deadline date
- Meetings shown as teal Clock pills
- Up to 3 events per cell; overflow shows "+N more"
- Click empty cell → opens New Meeting modal with that date pre-filled
- "New Meeting" button in calendar header

**Meetings**
- Create / edit / delete meetings with title, date, time range, online/offline toggle
- Online: optional join link; Offline: optional location
- Assign vertical, team member attendees, external stakeholder attendees
- Meetings page: Upcoming (sorted ascending) and Past (sorted descending) sections

**External Stakeholders**
- Contact records (no auth): organization, name, email, phone
- Managed in Admin panel → Stakeholders tab
- Selectable as meeting attendees

**Admin Panel** (4 tabs)
- **Verticals**: create/edit/delete verticals with name, color, lead
- **Users**: view all users, assign roles and vertical membership
- **Programs**: create/manage programs, inline edit name + deadline + color
- **Stakeholders**: create/edit/delete external stakeholder records

**Verticals**
- Color-coded; each vertical can have a designated lead
- Vertical Leads have scoped visibility (own vertical only)

**Infra**
- Deployed to Netlify (`planzo.io`)
- `public/_redirects` for SPA client-side routing fallback
- Supabase PostgreSQL backend with RLS policies on all tables

---

## Stack

| Layer | Version |
|---|---|
| React | 19 |
| TypeScript | 5.8 |
| Vite | 6 |
| Tailwind CSS | 3.4 |
| Supabase JS | 2.98 |
| React Router | 7 |
| Lucide React | 0.469 |
