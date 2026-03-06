import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  AppNotification, Program, Profile, Role, Task, TaskStatus,
  Vertical, ViewMode, ExternalStakeholder, Meeting, Workspace,
} from '../types'
import { listPrograms } from '../services/projects'
import { listUsers } from '../services/users'
import { listVerticals } from '../services/verticals'
import { listTasks, updateTask as svcUpdateTask, createTask as svcCreateTask, logActivity } from '../services/tasks'
import { listStakeholders } from '../services/stakeholders'
import { listMeetings } from '../services/meetings'
import { listNotifications, createNotification } from '../services/notifications'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

interface AppContextValue {
  // Workspace
  activeWorkspaceId: string | null
  activeWorkspace: Workspace | null
  switchWorkspace: (workspaceId: string) => void
  // Role flags (per active workspace)
  isAdmin: boolean
  isVerticalLead: boolean
  isViewer: boolean
  canWrite: boolean
  myRole: Role | null
  // Data
  programs: Program[]
  users: Profile[]
  verticals: Vertical[]
  stakeholders: ExternalStakeholder[]
  meetings: Meeting[]
  notifications: AppNotification[]
  unreadCount: number
  showNotifications: boolean
  setShowNotifications: (v: boolean) => void
  refreshNotifications: () => Promise<void>
  activeProgramId: string | null
  setActiveProgramId: (id: string) => void
  activeProgram: Program | null
  tasks: Task[]
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  selectedTask: Task | null
  selectTask: (task: Task | null) => void
  selectedMeeting: Meeting | null
  selectMeeting: (meeting: Meeting | null) => void
  newMeetingDate: string | null
  openNewMeeting: (date?: string) => void
  filterMemberId: string | null
  setFilterMemberId: (id: string | null) => void
  moveTask: (taskId: string, newStatus: TaskStatus) => Promise<void>
  addTask: (programId: string, status: TaskStatus) => Promise<Task>
  refreshPrograms: () => Promise<void>
  refreshTasks: () => Promise<void>
  refreshVerticals: () => Promise<void>
  refreshUsers: () => Promise<void>
  refreshStakeholders: () => Promise<void>
  refreshMeetings: () => Promise<void>
  loading: boolean
}

const AppContext = createContext<AppContextValue | null>(null)

const NOTIFICATIONS_CHANNEL = 'app-notifications'

export function AppProvider({ children }: { children: ReactNode }) {
  const { memberships } = useAuth()

  // ── Workspace state ─────────────────────────────────────────────────────────
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(
    () => localStorage.getItem('activeWorkspaceId')
  )

  // Validate stored workspace ID against memberships; auto-select first if needed
  useEffect(() => {
    if (memberships.length === 0) return
    const valid = memberships.find(m => m.workspace_id === activeWorkspaceId)
    if (!valid) {
      const firstId = memberships[0]?.workspace_id ?? null
      setActiveWorkspaceIdState(firstId)
      if (firstId) localStorage.setItem('activeWorkspaceId', firstId)
    }
  }, [memberships]) // eslint-disable-line react-hooks/exhaustive-deps

  const switchWorkspace = useCallback((workspaceId: string) => {
    localStorage.setItem('activeWorkspaceId', workspaceId)
    setActiveWorkspaceIdState(workspaceId)
    // Reset active program when switching workspaces
    setActiveProgramIdState(null)
    setTasks([])
    setFilterMemberId(null)
    setSelectedTask(null)
  }, [])

  const activeWorkspace = (memberships.find(m => m.workspace_id === activeWorkspaceId)?.workspace ?? null) as Workspace | null
  const myRole = (memberships.find(m => m.workspace_id === activeWorkspaceId)?.role ?? null) as Role | null
  const isAdmin        = myRole === 'ADMIN'
  const isVerticalLead = myRole === 'VERTICAL_LEAD' || myRole === 'ADMIN'
  const isViewer       = myRole === 'VIEWER'
  const canWrite       = myRole !== null && myRole !== 'VIEWER'

  // ── App state ───────────────────────────────────────────────────────────────
  const [programs, setPrograms] = useState<Program[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [verticals, setVerticals] = useState<Vertical[]>([])
  const [stakeholders, setStakeholders] = useState<ExternalStakeholder[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [activeProgramId, setActiveProgramIdState] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [newMeetingDate, setNewMeetingDate] = useState<string | null>(null)
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [loading, setLoading] = useState(true)

  // ── Refresh functions — all scoped to activeWorkspaceId ─────────────────────
  const refreshPrograms = useCallback(async () => {
    if (!activeWorkspaceId) return
    try {
      const data = await listPrograms(activeWorkspaceId)
      setPrograms(data)
      setActiveProgramIdState(prev => data.find(m => m.id === prev) ? prev : (data[0]?.id ?? null))
    } catch (err) { console.error('[AppContext] refreshPrograms:', err) }
  }, [activeWorkspaceId])

  const refreshUsers = useCallback(async () => {
    if (!activeWorkspaceId) return
    try { setUsers(await listUsers(activeWorkspaceId)) } catch (err) { console.error('[AppContext] refreshUsers:', err) }
  }, [activeWorkspaceId])

  const refreshVerticals = useCallback(async () => {
    if (!activeWorkspaceId) return
    try { setVerticals(await listVerticals(activeWorkspaceId)) } catch (err) { console.error('[AppContext] refreshVerticals:', err) }
  }, [activeWorkspaceId])

  const refreshStakeholders = useCallback(async () => {
    if (!activeWorkspaceId) return
    try { setStakeholders(await listStakeholders(activeWorkspaceId)) } catch (err) { console.error('[AppContext] refreshStakeholders:', err) }
  }, [activeWorkspaceId])

  const refreshMeetings = useCallback(async () => {
    if (!activeWorkspaceId) return
    try { setMeetings(await listMeetings(activeWorkspaceId)) } catch (err) { console.error('[AppContext] refreshMeetings:', err) }
  }, [activeWorkspaceId])

  const refreshNotifications = useCallback(async () => {
    try { setNotifications(await listNotifications()) } catch (err) { console.error('[AppContext] refreshNotifications:', err) }
  }, [])

  const refreshTasks = useCallback(async () => {
    if (!activeProgramId || !activeWorkspaceId) return
    try {
      const data = await listTasks({
        workspaceId: activeWorkspaceId,
        projectId: activeProgramId,
        assigneeId: filterMemberId ?? undefined,
      })
      setTasks(data)
    } catch (err) { console.error('[AppContext] refreshTasks:', err) }
  }, [activeProgramId, filterMemberId, activeWorkspaceId])

  // Re-fetch all workspace-scoped data when active workspace changes
  useEffect(() => {
    if (!activeWorkspaceId) return
    setLoading(true)
    Promise.all([
      refreshPrograms(),
      refreshUsers(),
      refreshVerticals(),
      refreshStakeholders(),
      refreshMeetings(),
    ]).finally(() => setLoading(false))
  }, [activeWorkspaceId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Notifications + realtime (workspace-independent)
  useEffect(() => {
    refreshNotifications()

    const sub = supabase
      .channel(NOTIFICATIONS_CHANNEL)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        refreshNotifications()
      })
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Meeting reminders: on mount, after meetings load, create reminder notifs for today/tomorrow
  useEffect(() => {
    if (meetings.length === 0) return
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]

      for (const m of meetings) {
        if (m.date !== todayStr && m.date !== tomorrowStr) continue
        const isAttendee = (m.member_attendees ?? []).some(a => a.id === user.id)
        if (!isAttendee) continue
        const label = m.date === todayStr ? 'Today' : 'Tomorrow'
        await createNotification({
          user_id: user.id,
          type: 'meeting_reminder',
          title: `${label}: ${m.title}`,
          body: `${m.time_from.slice(0, 5)} – ${m.time_to.slice(0, 5)}`,
          entity_id: m.id,
          entity_type: 'meeting',
        })
      }
      refreshNotifications()
    })()
  }, [meetings]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { refreshTasks() }, [refreshTasks])

  const activeProgram = programs.find(m => m.id === activeProgramId) ?? null

  const setActiveProgramId = useCallback((id: string) => {
    setActiveProgramIdState(id)
    setFilterMemberId(null)
    setSelectedTask(null)
  }, [])

  const selectTask = useCallback((task: Task | null) => setSelectedTask(task), [])

  const selectMeeting = useCallback((meeting: Meeting | null) => {
    setSelectedMeeting(meeting)
    setNewMeetingDate(null)
  }, [])

  const openNewMeeting = useCallback((date?: string) => {
    setSelectedMeeting(null)
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    setNewMeetingDate(date ?? todayStr)
  }, [])

  const moveTask = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    let oldStatus: TaskStatus | undefined
    let taskAssignees: Profile[] = []
    setTasks(prev => {
      const t = prev.find(t => t.id === taskId)
      oldStatus = t?.status
      taskAssignees = t?.assignees ?? []
      return prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
    })
    await svcUpdateTask(taskId, { status: newStatus })
    if (oldStatus && oldStatus !== newStatus) {
      logActivity(taskId, 'status_changed', { from: oldStatus, to: newStatus })
      const { data: { user } } = await supabase.auth.getUser()
      const statusLabel: Record<TaskStatus, string> = { TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' }
      for (const assignee of taskAssignees) {
        if (user && assignee.id === user.id) continue
        createNotification({
          user_id: assignee.id,
          type: 'task_moved',
          title: 'Task status updated',
          body: `Moved to ${statusLabel[newStatus]}`,
          entity_id: taskId,
          entity_type: 'task',
        })
      }
    }
  }, [])

  const addTask = useCallback(async (programId: string, status: TaskStatus): Promise<Task> => {
    if (!activeWorkspaceId) throw new Error('No active workspace')
    const newTask = await svcCreateTask({ title: 'New Task', projectId: programId, workspaceId: activeWorkspaceId, status })
    setTasks(prev => [...prev, newTask])
    return newTask
  }, [activeWorkspaceId])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <AppContext.Provider value={{
      activeWorkspaceId, activeWorkspace, switchWorkspace,
      isAdmin, isVerticalLead, isViewer, canWrite, myRole,
      programs, users, verticals, stakeholders, meetings,
      notifications, unreadCount, showNotifications, setShowNotifications, refreshNotifications,
      activeProgramId, setActiveProgramId, activeProgram,
      tasks, viewMode, setViewMode,
      selectedTask, selectTask,
      selectedMeeting, selectMeeting,
      newMeetingDate, openNewMeeting,
      filterMemberId, setFilterMemberId,
      moveTask, addTask,
      refreshTasks, refreshPrograms, refreshVerticals, refreshUsers,
      refreshStakeholders, refreshMeetings,
      loading,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
