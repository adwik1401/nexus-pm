// ── Roles & enums ──────────────────────────────────────────────────────────
export type Role = 'ADMIN' | 'VERTICAL_LEAD' | 'MEMBER' | 'VIEWER'
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'
export type ViewMode = 'kanban' | 'gantt'
export type IconType = 'layers' | 'server' | 'dollar' | 'code'

// ── Workspace ─────────────────────────────────────────────────────────────────
export type OrgPlan = 'free' | 'pro' | 'enterprise'

export interface Workspace {
  id: string
  name: string
  slug: string
  plan: OrgPlan
  created_at: string
}

export interface WorkspaceMembership {
  workspace_id: string
  user_id: string
  role: Role
  joined_at: string
  workspace?: Workspace
}

export interface WorkspaceInvite {
  id: string
  workspace_id: string
  email: string
  token: string
  role: Role
  invited_by: string | null
  used_at: string | null
  expires_at: string
  created_at: string
}

export interface InviteValidation {
  invite_id: string
  workspace_id: string
  workspace_name: string
  workspace_slug: string
  email: string
  role: string
  expires_at: string
}

// ── Supabase-backed entities ────────────────────────────────────────────────
export interface Profile {
  id: string
  name: string
  email?: string        // from auth.users, joined in queries
  profile_image: string | null
  dob: string | null    // ISO date "YYYY-MM-DD"
  role?: Role           // populated from workspace_members when queried in workspace context
  vertical_id: string | null
  vertical?: Vertical   // joined
  created_at: string
}

export interface Vertical {
  id: string
  name: string
  color: string
  lead_id: string | null
  lead?: Profile
  members?: Profile[]
}

export interface Program {
  id: string
  name: string
  icon_type: IconType
  color: string             // hex color, e.g. '#6366f1'
  deadline: string | null   // "YYYY-MM-DD"
  created_at: string
  members?: Profile[]
  tasks?: Task[]
  gantt_tasks?: GanttTask[]
  // computed for AllProgramsPage
  todo_count?: number
  in_progress_count?: number
  done_count?: number
}

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  start_date: string | null  // "YYYY-MM-DD"
  due_date: string | null    // "YYYY-MM-DD"
  project_id: string
  workspace_id: string
  created_at: string
  updated_at: string
  // joined
  program?: Pick<Program, 'id' | 'name' | 'color' | 'icon_type'>
  assignees?: Profile[]
  verticals?: Vertical[]
  tags?: Tag[]
  context_blocks?: ContextBlock[]
  sub_tasks?: SubTask[]
  comments?: Comment[]
}

export interface Tag {
  id: string
  label: string
  color: string
  text_color: string
  task_id: string
}

export interface ContextBlock {
  id: string
  title: string
  content: string
  task_id: string
}

export interface SubTask {
  id: string
  title: string
  completed: boolean
  task_id: string
}

export interface Comment {
  id: string
  content: string
  user_id: string
  task_id: string
  created_at: string
  user?: Profile
}

export type ActivityAction =
  | 'status_changed'
  | 'comment_added'
  | 'context_block_added'
  | 'subtask_added'
  | 'subtask_updated'

export interface ActivityLog {
  id: string
  task_id: string
  user_id: string
  action: ActivityAction
  meta: Record<string, unknown>
  created_at: string
  user?: Profile
}

export interface GanttTask {
  id: string
  name: string
  scheduled_days: number
  start_day_offset: number
  color: string
  bg_color: string
  project_id: string
}

// ── External Stakeholders ───────────────────────────────────────────────────
export interface ExternalStakeholder {
  id: string
  organization: string
  name: string
  email: string | null
  contact_no: string | null
  created_at: string
}

// ── Notifications ────────────────────────────────────────────────────────────
export interface AppNotification {
  id: string
  user_id: string
  type: 'task_assigned' | 'task_moved' | 'meeting_added' | 'meeting_reminder'
  title: string
  body: string
  entity_id: string | null
  entity_type: 'task' | 'meeting' | null
  read: boolean
  created_at: string
}

// ── KRAs & KPIs ──────────────────────────────────────────────────────────────
export interface KRA {
  id: string
  user_id: string
  title: string
  description: string
  created_at: string
}

export interface KPI {
  id: string
  user_id: string
  title: string
  description: string
  created_at: string
}

// ── Meetings ────────────────────────────────────────────────────────────────
export type MeetingMode = 'ONLINE' | 'OFFLINE'

export interface Meeting {
  id: string
  title: string
  date: string        // "YYYY-MM-DD"
  time_from: string   // "HH:MM"
  time_to: string     // "HH:MM"
  mode: MeetingMode
  link: string | null
  location: string | null
  vertical_id: string | null
  vertical?: Vertical
  member_attendees?: Profile[]
  stakeholder_attendees?: ExternalStakeholder[]
  created_at: string
}
