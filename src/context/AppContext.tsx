import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Program, Profile, Task, TaskStatus, Vertical, ViewMode, ExternalStakeholder, Meeting } from '../types'
import { listPrograms } from '../services/projects'
import { listUsers } from '../services/users'
import { listVerticals } from '../services/verticals'
import { listTasks, updateTask as svcUpdateTask, createTask as svcCreateTask, logActivity } from '../services/tasks'
import { listStakeholders } from '../services/stakeholders'
import { listMeetings } from '../services/meetings'

interface AppContextValue {
  programs: Program[]
  users: Profile[]
  verticals: Vertical[]
  stakeholders: ExternalStakeholder[]
  meetings: Meeting[]
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

export function AppProvider({ children }: { children: ReactNode }) {
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
  const [loading, setLoading] = useState(true)

  const refreshPrograms = useCallback(async () => {
    try {
      const data = await listPrograms()
      setPrograms(data)
      setActiveProgramIdState(prev => data.find(m => m.id === prev) ? prev : (data[0]?.id ?? null))
    } catch { /* not logged in yet */ }
  }, [])

  const refreshUsers = useCallback(async () => {
    try { setUsers(await listUsers()) } catch { /* ignore */ }
  }, [])

  const refreshVerticals = useCallback(async () => {
    try { setVerticals(await listVerticals()) } catch { /* ignore */ }
  }, [])

  const refreshStakeholders = useCallback(async () => {
    try { setStakeholders(await listStakeholders()) } catch { /* ignore */ }
  }, [])

  const refreshMeetings = useCallback(async () => {
    try { setMeetings(await listMeetings()) } catch { /* ignore */ }
  }, [])

  const refreshTasks = useCallback(async () => {
    if (!activeProgramId) return
    try {
      const data = await listTasks({
        projectId: activeProgramId,
        assigneeId: filterMemberId ?? undefined,
      })
      setTasks(data)
    } catch { /* ignore */ }
  }, [activeProgramId, filterMemberId])

  useEffect(() => {
    Promise.all([
      refreshPrograms(),
      refreshUsers(),
      refreshVerticals(),
      refreshStakeholders(),
      refreshMeetings(),
    ]).finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    setTasks(prev => {
      oldStatus = prev.find(t => t.id === taskId)?.status
      return prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
    })
    await svcUpdateTask(taskId, { status: newStatus })
    if (oldStatus && oldStatus !== newStatus) {
      logActivity(taskId, 'status_changed', { from: oldStatus, to: newStatus })
    }
  }, [])

  const addTask = useCallback(async (programId: string, status: TaskStatus): Promise<Task> => {
    const newTask = await svcCreateTask({ title: 'New Task', projectId: programId, status })
    setTasks(prev => [...prev, newTask])
    return newTask
  }, [])

  return (
    <AppContext.Provider value={{
      programs, users, verticals, stakeholders, meetings,
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
