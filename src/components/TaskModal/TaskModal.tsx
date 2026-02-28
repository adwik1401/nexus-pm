import { useEffect, useState } from 'react'
import { X, Plus, FileText, CalendarDays } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import type { ActivityLog, Comment, ContextBlock as CBType, Profile, SubTask, Vertical } from '../../types'
import ContextBlock from './ContextBlock'
import SubTaskItem from './SubTaskItem'
import MemberPicker from './MemberPicker'
import VerticalPicker from './VerticalPicker'
import CommentSection from './CommentSection'
import ActivityFeed from './ActivityFeed'
import {
  updateTask, setTaskAssignees, setTaskVerticals,
  createContextBlock, updateContextBlock, deleteContextBlock,
  addSubTask, toggleSubTask, listComments,
  logActivity, getActivityLogs,
} from '../../services/tasks'

export default function TaskModal() {
  const { selectedTask, selectTask, refreshTasks, users, verticals, activeProgramId } = useApp()
  const { profile } = useAuth()

  const [task, setTask] = useState(selectedTask)
  const [comments, setComments] = useState<Comment[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [newSubTask, setNewSubTask] = useState('')
  const [saving, setSaving] = useState(false)

  // Sync local copy when selected task changes
  useEffect(() => {
    setTask(selectedTask)
    setActivityLogs([])
    if (selectedTask) {
      listComments(selectedTask.id).then(setComments).catch(() => {})
      getActivityLogs(selectedTask.id).then(setActivityLogs).catch(() => {})
    }
  }, [selectedTask])

  if (!task) return null

  // Helper: optimistically push a new log entry and persist to DB
  const pushLog = (action: ActivityLog['action'], meta: Record<string, unknown> = {}) => {
    if (!profile) return
    const optimistic: ActivityLog = {
      id: crypto.randomUUID(),
      task_id: task.id,
      user_id: profile.id,
      action,
      meta,
      created_at: new Date().toISOString(),
      user: profile,
    }
    setActivityLogs(prev => [optimistic, ...prev])
    logActivity(task.id, action, meta)
  }

  // Program members for the member picker
  const projectMembers = activeProgramId
    ? users.filter(u => u.id !== undefined)
    : users

  // ── Field savers ───────────────────────────────────────────────────────────
  const save = async (updates: Parameters<typeof updateTask>[1]) => {
    setSaving(true)
    try {
      await updateTask(task.id, updates)
      setTask(t => t ? { ...t, ...updates } : t)
      refreshTasks()
    } finally { setSaving(false) }
  }

  const handleAssigneesChange = async (selected: Profile[]) => {
    await setTaskAssignees(task.id, selected.map(u => u.id))
    setTask(t => t ? { ...t, assignees: selected } : t)
    refreshTasks()
  }

  const handleVerticalsChange = async (selected: Vertical[]) => {
    await setTaskVerticals(task.id, selected.map(v => v.id))
    setTask(t => t ? { ...t, verticals: selected } : t)
    refreshTasks()
  }

  // ── Context blocks ─────────────────────────────────────────────────────────
  const handleAddBlock = async () => {
    const block = await createContextBlock({ title: 'NEW SECTION', content: '', task_id: task.id })
    setTask(t => t ? { ...t, context_blocks: [...(t.context_blocks ?? []), block] } : t)
    pushLog('context_block_added', { title: 'NEW SECTION' })
  }

  const handleDeleteBlock = async (id: string) => {
    await deleteContextBlock(id)
    setTask(t => t ? { ...t, context_blocks: (t.context_blocks ?? []).filter(b => b.id !== id) } : t)
  }

  const handleBlockChange = async (id: string, field: 'title' | 'content', value: string) => {
    setTask(t => t ? {
      ...t,
      context_blocks: (t.context_blocks ?? []).map(b => b.id === id ? { ...b, [field]: value } : b),
    } : t)
    await updateContextBlock(id, { [field]: value })
  }

  // ── Subtasks ───────────────────────────────────────────────────────────────
  const handleAddSubTask = async () => {
    if (!newSubTask.trim()) return
    const title = newSubTask.trim()
    const st = await addSubTask(task.id, title)
    setTask(t => t ? { ...t, sub_tasks: [...(t.sub_tasks ?? []), st] } : t)
    setNewSubTask('')
    pushLog('subtask_added', { title })
  }

  const handleToggleSubTask = async (id: string, completed: boolean) => {
    const subTask = task.sub_tasks?.find(s => s.id === id)
    await toggleSubTask(id, completed)
    setTask(t => t ? {
      ...t,
      sub_tasks: (t.sub_tasks ?? []).map(s => s.id === id ? { ...s, completed } : s),
    } : t)
    if (subTask) pushLog('subtask_updated', { title: subTask.title, completed })
  }

  const program = useApp().programs.find(m => m.id === task.project_id)

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm" onClick={() => selectTask(null)} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 shadow-2xl" style={{ width: '740px' }}>
        <div className="flex w-full h-full bg-white rounded-l-2xl overflow-hidden">

          {/* ── Main content ── */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* Header */}
            <div className="flex items-start gap-3 px-7 pt-7 pb-5 border-b border-gray-100">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FileText size={17} className="text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <input
                  className="text-xl font-bold text-gray-900 leading-tight w-full outline-none bg-transparent hover:bg-gray-50 rounded px-1 -ml-1 focus:bg-gray-50 transition-colors"
                  value={task.title}
                  onChange={e => setTask(t => t ? { ...t, title: e.target.value } : t)}
                  onBlur={e => save({ title: e.target.value })}
                />
                <div className="flex items-center gap-1.5 mt-1 ml-1">
                  <span className="text-xs text-gray-400">In program</span>
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {program?.name ?? '—'}
                  </span>
                  {saving && <span className="text-[10px] text-gray-400 ml-1">Saving…</span>}
                </div>
              </div>
              <button
                onClick={() => selectTask(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 px-7 py-5 space-y-7">
              {/* Description */}
              <section>
                <h3 className="label-title">Description</h3>
                <textarea
                  className="w-full text-sm text-gray-700 bg-gray-50 rounded-xl p-4 border border-gray-100 outline-none resize-none leading-relaxed focus:border-indigo-200 focus:bg-white transition-all"
                  rows={4}
                  value={task.description ?? ''}
                  onChange={e => setTask(t => t ? { ...t, description: e.target.value } : t)}
                  onBlur={e => save({ description: e.target.value })}
                  placeholder="Add a description…"
                />
              </section>

              {/* Context Blocks */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="label-title">Context Blocks</h3>
                  <button onClick={handleAddBlock}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors">
                    <Plus size={13} /> Add Block
                  </button>
                </div>
                <div className="space-y-3">
                  {(task.context_blocks ?? []).map((block: CBType) => (
                    <ContextBlock
                      key={block.id}
                      block={block}
                      onDelete={handleDeleteBlock}
                      onChange={handleBlockChange}
                    />
                  ))}
                </div>
              </section>

              {/* Sub-tasks */}
              <section>
                <h3 className="label-title mb-3">Sub-Tasks</h3>
                <div className="divide-y divide-gray-50 mb-3">
                  {(task.sub_tasks ?? []).map((st: SubTask) => (
                    <SubTaskItem key={st.id} subTask={st} onChange={handleToggleSubTask} />
                  ))}
                </div>
                {/* Add sub-task input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubTask}
                    onChange={e => setNewSubTask(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddSubTask()}
                    placeholder="Add a subtask…"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-indigo-300 transition-colors"
                  />
                  <button
                    onClick={handleAddSubTask}
                    disabled={!newSubTask.trim()}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </div>
              </section>

              {/* Comments */}
              <section>
                <CommentSection
                  taskId={task.id}
                  comments={comments}
                  onCommentAdded={c => setComments(prev => [...prev, c])}
                  onLogged={log => setActivityLogs(prev => [log, ...prev])}
                />
              </section>

              {/* Activity Feed */}
              <section>
                <ActivityFeed logs={activityLogs} />
              </section>
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div className="w-56 flex-shrink-0 border-l border-gray-100 px-5 py-7 flex flex-col gap-6 bg-gray-50/50 overflow-y-auto">
            {/* Assignees */}
            <MemberPicker
              label="Assignees"
              options={projectMembers}
              selected={task.assignees ?? []}
              onChange={handleAssigneesChange}
            />

            {/* Verticals */}
            <VerticalPicker
              verticals={verticals}
              selected={task.verticals ?? []}
              onChange={handleVerticalsChange}
            />

            {/* Due Date */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                <CalendarDays size={11} className="inline mr-1 -mt-0.5" />
                Due Date
              </p>
              <input
                type="date"
                value={task.due_date ?? ''}
                onChange={e => {
                  const v = e.target.value || null
                  setTask(t => t ? { ...t, due_date: v } : t)
                  save({ due_date: v })
                }}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 outline-none focus:border-indigo-300 transition-colors bg-white"
              />
            </div>

            {/* Status */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Status</p>
              <select
                value={task.status}
                onChange={e => {
                  const fromStatus = task.status
                  const v = e.target.value as typeof task.status
                  setTask(t => t ? { ...t, status: v } : t)
                  save({ status: v })
                  pushLog('status_changed', { from: fromStatus, to: v })
                }}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 outline-none focus:border-indigo-300 bg-white transition-colors"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
