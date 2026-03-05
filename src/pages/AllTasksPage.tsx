import { useEffect, useState } from 'react'
import { LayoutList, MessageSquare, Paperclip, CalendarDays } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { listTasks } from '../services/tasks'
import { Avatar } from '../components/Sidebar/Sidebar'
import type { Task, TaskStatus } from '../types'

const COLUMNS: { title: string; status: TaskStatus; color: string }[] = [
  { title: 'To Do',       status: 'TODO',        color: 'bg-gray-400' },
  { title: 'In Progress', status: 'IN_PROGRESS',  color: 'bg-blue-400' },
  { title: 'Done',        status: 'DONE',         color: 'bg-green-400' },
]

function ProgramChip({ task }: { task: Task }) {
  const prog = task.program
  if (!prog) return null
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
      style={{ backgroundColor: prog.color + '20', color: prog.color }}
    >
      {prog.name}
    </span>
  )
}

function TaskCard({ task, onDragStart }: { task: Task; onDragStart: (e: React.DragEvent, id: string) => void }) {
  const { selectTask } = useApp()
  const assignees = task.assignees ?? []
  const tags = task.tags ?? []
  const subTasks = task.sub_tasks ?? []
  const comments = task.comments ?? []

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, task.id)}
      onClick={() => selectTask(task)}
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <div className="mb-2">
        <ProgramChip task={task} />
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map(tag => (
            <span
              key={tag.id}
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ backgroundColor: tag.color, color: tag.text_color }}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}

      <h3 className="text-sm font-semibold text-gray-900 mb-1 leading-snug">{task.title}</h3>

      {task.description && (
        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mb-1">{task.description}</p>
      )}

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {comments.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <MessageSquare size={11} />{comments.length}
          </span>
        )}
        {subTasks.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Paperclip size={11} />{subTasks.filter(s => s.completed).length}/{subTasks.length}
          </span>
        )}
        {task.due_date && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <CalendarDays size={11} />
            {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        {assignees.length > 0 && (
          <div className="ml-auto flex -space-x-1.5">
            {assignees.slice(0, 3).map(a => <Avatar key={a.id} user={a} size="sm" />)}
          </div>
        )}
      </div>
    </div>
  )
}

function Column({ title, color, status, tasks, onDragStart, onDrop }: {
  title: string; color: string; status: TaskStatus; tasks: Task[]
  onDragStart: (e: React.DragEvent, id: string) => void
  onDrop: (e: React.DragEvent, status: TaskStatus) => void
}) {
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.currentTarget.classList.add('bg-indigo-50/50') }
  const handleDragLeave = (e: React.DragEvent) => { e.currentTarget.classList.remove('bg-indigo-50/50') }
  const handleDrop = (e: React.DragEvent) => { e.currentTarget.classList.remove('bg-indigo-50/50'); onDrop(e, status) }

  return (
    <div
      className="flex flex-col w-80 flex-shrink-0 rounded-xl transition-colors"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-2 px-1 pb-3">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto pb-2 min-h-[80px]">
        {tasks.map(task => <TaskCard key={task.id} task={task} onDragStart={onDragStart} />)}
      </div>
    </div>
  )
}

export default function AllTasksPage() {
  const { moveTask } = useApp()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedId, setDraggedId] = useState<string | null>(null)

  useEffect(() => {
    listTasks()
      .then(setTasks)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedId(taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault()
    if (!draggedId) return
    moveTask(draggedId, status)
    setTasks(prev => prev.map(t => t.id === draggedId ? { ...t, status } : t))
    setDraggedId(null)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <div className="px-6 py-5 border-b border-gray-100 bg-white flex items-center gap-3">
        <LayoutList size={18} className="text-indigo-500" />
        <div>
          <h1 className="text-lg font-bold text-gray-900">All Tasks</h1>
          <p className="text-xs text-gray-400">{tasks.length} task{tasks.length !== 1 ? 's' : ''} across all projects</p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
          <LayoutList size={36} className="mb-3 text-gray-300" />
          <p className="text-base font-medium">No tasks found</p>
        </div>
      ) : (
        <div className="flex gap-5 flex-1 overflow-x-auto px-6 py-5 items-start">
          {COLUMNS.map(col => (
            <Column
              key={col.status}
              title={col.title}
              status={col.status}
              color={col.color}
              tasks={tasks.filter(t => t.status === col.status)}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
            />
          ))}
        </div>
      )}
    </div>
  )
}
