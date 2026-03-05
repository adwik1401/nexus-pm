# Nexus PM Tool — Project Context

Quick-reference for any agent or developer joining this project. Read this before touching code.

---

## What This Is

An **internal project management tool** for QCIN (a single organisation). Think Jira + Notion lite:
- Tasks organised in Kanban boards per Program (internally called "Projects" in the DB)
- Meetings, stakeholders, calendar, notifications, KRAs/KPIs per user
- Three roles: ADMIN, VERTICAL_LEAD, MEMBER
- Restricted to `@qcin.org` email addresses

**Current version:** v1.1 (security-audited, deployed to Netlify)

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Vite + React 19 + TypeScript |
| Styling | Tailwind CSS 3 (no component library) |
| Icons | Lucide React |
| Routing | React Router v6 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password + JWT) |
| Storage | Supabase Storage (`avatars` bucket) |
| Realtime | Supabase Realtime (notifications channel) |
| Hosting | Netlify (SPA, `_redirects` for routing) |
| Backend | **None** — Supabase JS client called directly from React |

---

## Key File Paths

```
src/
  main.tsx                        # Entry point
  App.tsx                         # Router + auth guards (ProtectedRoute, AdminRoute)
  types/index.ts                  # ALL TypeScript interfaces (snake_case to match DB)
  lib/supabase.ts                 # Singleton Supabase client
  context/
    AuthContext.tsx               # login/logout/register, current user profile
    AppContext.tsx                 # Global state: programs, tasks, users, meetings,
                                  # notifications, search, filter. THE central hub.
  services/
    auth.ts                       # register, login, logout, uploadAvatar
    users.ts                      # listUsers, updateUserRole, updateUserVertical
    verticals.ts                  # CRUD for verticals, setVerticalLead
    projects.ts                   # listPrograms, createProgram, updateProgram
    tasks.ts                      # listTasks, createTask, updateTask, deleteTask,
                                  # setTaskAssignees, setTaskVerticals, addComment,
                                  # listComments, deleteComment, addSubTask, etc.
    meetings.ts                   # listMeetings, createMeeting, updateMeeting,
                                  # setMeetingMemberAttendees, setMeetingStakeholderAttendees
    stakeholders.ts               # listStakeholders, createStakeholder, updateStakeholder
    notifications.ts              # listNotifications, markRead, markAllRead, createNotification
    kras.ts                       # listKRAs/KPIs, createKRA/KPI, updateKRA/KPI, deleteKRA/KPI
  pages/
    LoginPage.tsx / RegisterPage.tsx / ForgotPasswordPage.tsx / ResetPasswordPage.tsx
    KanbanPage.tsx                # Main board (active program, drag-and-drop tasks)
    MyTasksPage.tsx               # Tasks assigned to current user
    AllTasksPage.tsx              # All tasks across all programs
    CalendarPage.tsx              # Monthly calendar: tasks, program deadlines, meetings
    AdminPage.tsx                 # 4 tabs: Verticals / Users / Programs / Stakeholders
    ProfilePage.tsx               # Own profile (/profile) + read-only view (/profile/:id)
  components/
    Sidebar/Sidebar.tsx           # Nav, program list, member filter, role-aware
    Header/Header.tsx             # Search (Ctrl+K), notifications bell, user avatar
    TaskModal/TaskModal.tsx       # Full task detail: inline edit, assignees, subtasks,
                                  # comments, activity feed, context blocks
    MeetingModal/MeetingModal.tsx # Create/edit meetings
    SearchModal/SearchModal.tsx   # Global search across tasks, programs, users, meetings
    NotificationPanel/            # Bell dropdown: list, mark read, navigate to entity
    GanttChart/GanttChart.tsx     # Calendar view (named misleadingly; it's a monthly grid)
    KanbanBoard/KanbanBoard.tsx   # Kanban columns (TODO / IN_PROGRESS / DONE)
supabase/
  schema.sql                      # Full DB schema — run in Supabase SQL Editor for fresh install
ISSUES.md                         # Security audit log: all findings, fixes, dismissals
```

---

## Data Model (DB Tables)

All tables are in the `public` schema. All have RLS enabled.

| Table | Purpose |
|---|---|
| `profiles` | One row per user. Joined from `auth.users` via trigger. Fields: `id`, `name`, `email`, `role`, `vertical_id`, `profile_image`, `date_of_birth` |
| `verticals` | Departments/teams. Fields: `id`, `name`, `color`, `lead_id` |
| `projects` | Programs (renamed in UI only — DB still says `projects`). Fields: `id`, `name`, `icon_type`, `deadline`, `color` |
| `project_members` | Junction: which profiles belong to which program |
| `tasks` | Core entity. Fields: `id`, `project_id`, `title`, `description`, `status` (TODO/IN_PROGRESS/DONE), `due_date`, `created_by` |
| `task_assignees` | Junction: `(task_id, user_id)` |
| `task_verticals` | Junction: `(task_id, vertical_id)` |
| `comments` | `(id, task_id, user_id, content, created_at)` |
| `sub_tasks` | `(id, task_id, title, completed)` |
| `context_blocks` | `(id, task_id, title, content)` — rich text blocks inside a task |
| `tags` | `(id, task_id, label, color)` |
| `gantt_tasks` | Extra metadata for Gantt display — linked to `tasks` |
| `external_stakeholders` | Non-user contacts: `(id, organization, name, email, contact_no)` |
| `meetings` | `(id, title, date, time_from, time_to, mode, link, location, vertical_id)` |
| `meeting_member_attendees` | Junction: `(meeting_id, user_id)` |
| `meeting_stakeholder_attendees` | Junction: `(meeting_id, stakeholder_id)` |
| `activity_logs` | `(id, task_id, user_id, action, meta jsonb, created_at)` — actions: status_changed, comment_added, context_block_added, subtask_added, subtask_updated |
| `notifications` | `(id, user_id, type, title, body, entity_id, entity_type, read, created_at)` — types: task_assigned, task_moved, meeting_added, meeting_reminder |
| `kras` | Key Responsibility Areas per user — admin-write only |
| `kpis` | Key Performance Indicators per user — admin-write only |

---

## Auth & Roles

- **Supabase Auth** (email/password). JWT tokens, auto-refreshed.
- Email verification required before login.
- Domain check (`@qcin.org`) is **client-side only** — not enforced at DB level. Intentional for this internal tool.
- First registered user becomes ADMIN via DB trigger `handle_new_user`.
- Role is stored in `profiles.role` and read via `public.current_user_role()` DB function used in all RLS policies.

| Role | Can do |
|---|---|
| `ADMIN` | Everything including delete tasks, manage users, manage stakeholders, manage programs |
| `VERTICAL_LEAD` | Create/edit meetings, see their vertical's members, move/update tasks |
| `MEMBER` | Create tasks, comment, move tasks on the board |

---

## RLS Policy Decisions (Security Audit)

These decisions were made deliberately — do not change without understanding the reasoning:

| Table | Policy |
|---|---|
| `tasks` | SELECT/INSERT/UPDATE: all authenticated. DELETE: ADMIN/VERTICAL_LEAD only |
| `comments` | SELECT/INSERT: all authenticated. INSERT enforces `user_id = auth.uid()`. UPDATE/DELETE: own comment or ADMIN |
| `external_stakeholders` | Write: ADMIN only |
| `meetings` / attendee junctions | Write: ADMIN/VERTICAL_LEAD only |
| `projects` | Write: ADMIN only |
| `kras`, `kpis` | Write: ADMIN only |
| `notifications` | Own rows only (`user_id = auth.uid()`) |
| Cascade tables (tags, sub_tasks, context_blocks, task_assignees, task_verticals, gantt_tasks) | Open read/write for all authenticated — intentional collaborative design |

---

## Architecture Patterns

1. **Service Layer** — All DB calls in `src/services/`. Components never import `supabase` directly.
2. **AppContext + useApp()** — Single source of truth for all shared state. Fetches on mount; mutations are optimistic (update local state immediately, persist async).
3. **Singleton Supabase client** — `src/lib/supabase.ts`
4. **Compound components** — `TaskModal` composed of `CommentSection`, `ActivityFeed`, `AddSubTask`, etc.
5. **useMemo for expensive derivations** — Calendar reduces (tasksByDate, programsByDate, etc.) and sidebar user filtering are memoized.
6. **Cancelled-flag pattern** — useEffect data fetches check `if (!cancelled)` before setting state (prevents memory leaks on fast navigation).

---

## Type Conventions

- All DB column names are **snake_case** in TypeScript to match Supabase: `profile_image`, `task_id`, `due_date`
- `Task.assignees: Profile[]` — joined via PostgREST, not fetched separately
- `Task.verticals: Vertical[]` — same
- `Task.program?: Pick<Program, 'id'|'name'|'color'|'icon_type'>` — joined from `projects`
- `AppNotification` (not `Notification`) — avoids collision with browser's native Notification API
- `Program` = what the UI calls it; `projects` = what the DB table is called

---

## Environment Variables

```
VITE_SUPABASE_URL=           # Supabase project URL
VITE_SUPABASE_ANON_KEY=      # Supabase anon/public key
VITE_APP_URL=                # Full app URL (used in password reset emails)
                             # Local: http://localhost:5173
                             # Production: https://nexus-pm-tool.netlify.app
```

---

## Running Locally

```bash
export PATH="/c/Program Files/nodejs:$PATH" && npm run dev
```

Other scripts:
```bash
npm run build       # tsc -b && vite build (strict TypeScript)
npm run typecheck   # tsc --noEmit (faster type check without emitting)
npm run preview     # Preview production build locally
```

**Note:** `tsc -b` (used in build) is stricter than `tsc --noEmit` — it catches unused variables. Always run `npm run build` before marking work complete, not just typecheck.

---

## Known Gaps & Scale Considerations

| Gap | Impact | When to fix |
|---|---|---|
| No DB indexes on `tasks(project_id)`, `notifications(user_id)`, `activity_logs(task_id)` | Slow queries at scale | Before >500 tasks or >100 users |
| No pagination on `listTasks` | Full table scan per program | Before >500 tasks/program |
| `AppContext` owns all global state (God Object risk) | Hard to split later | When adding a major new domain (e.g., chat) |
| No automated tests (unit/E2E) | Manual UAT required before each deploy | Recommend Playwright before v2.0 |
| `notifications` table grows unboundedly | Storage cost, slow queries | Add a cleanup job after 6 months live |
| `@qcin.org` check is client-side only | Technical bypass possible via raw API | Acceptable for internal tool; note for future |

---

## Deferred Features (Planned, Not Built)

Both features have detailed implementation plans in `C:\Users\Adwik\.claude\plans\memoized-jingling-lobster.md`.

### Chat System (v1.2)
Slack-style messaging: DMs, Program channels (auto-created via DB trigger), Groups. 5 phases (A–E):
- **A**: DB tables (`conversations`, `conversation_members`, `messages`) + `src/services/chat.ts`
- **B**: `/chat` page, DM UI, sidebar nav entry
- **C**: Program channels + group creation
- **D**: Supabase Realtime messages, typing indicators, presence/online dots, unread badges
- **E**: Task unfurl (`#task`), @mentions with notifications, Chat-to-Task

### File Attachments
Attach files directly to tasks. 4 phases:
- **1**: Supabase Storage `attachments` bucket + `task_attachments` DB table
- **2**: `TaskAttachment` type + `src/services/attachments.ts`
- **3**: Attachments section in `TaskModal`
- **4**: Attachment count badge on Kanban cards

---

## What's Already Been Done

- Full security audit (2 rounds, 23 issues logged, all real ones fixed)
- RLS policies hardened for tasks, comments, meetings, stakeholders
- Netlify security headers (`netlify.toml`)
- Password reset flow with environment-aware redirect URL
- `useMemo` applied to all expensive re-computations
- `useEffect` cleanup (cancelled-flag pattern) in TaskModal and SearchModal
- Silent catch blocks replaced with `console.error` throughout
- `typecheck` script added to `package.json`
