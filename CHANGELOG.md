# Changelog

All notable changes to Nexus PM are documented here.

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
- Deployed to Netlify (`nexus-pm-tool.netlify.app`)
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
