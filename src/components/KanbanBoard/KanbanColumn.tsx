import { Plus, MoreHorizontal } from 'lucide-react'
import type { Task, TaskStatus } from '../../types'
import { useApp } from '../../context/AppContext'
import TaskCard from './TaskCard'

interface KanbanColumnProps {
  title: string
  status: TaskStatus
  tasks: Task[]
  onDragStart: (e: React.DragEvent, taskId: string) => void
  onDrop: (e: React.DragEvent, status: TaskStatus) => void
}

export default function KanbanColumn({ title, status, tasks, onDragStart, onDrop }: KanbanColumnProps) {
  const { addTask, activeProgramId, selectTask } = useApp()

  const handleAddTask = async () => {
    if (!activeProgramId) return
    const newTask = await addTask(activeProgramId, status)
    selectTask(newTask)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add('bg-indigo-50/50')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-indigo-50/50')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-indigo-50/50')
    onDrop(e, status)
  }

  const statusColors: Record<TaskStatus, string> = {
    TODO: 'bg-gray-400',
    IN_PROGRESS: 'bg-blue-400',
    DONE: 'bg-green-400',
  }

  return (
    <div
      className="flex flex-col w-80 flex-shrink-0 min-h-0 rounded-xl transition-colors"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-1 pb-3">
        <span className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
          {tasks.length}
        </span>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={handleAddTask}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
          >
            <Plus size={14} />
          </button>
          <button className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3 flex-1 overflow-y-auto pb-2 min-h-[80px]">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} onDragStart={onDragStart} />
        ))}
      </div>

      {/* Add Task */}
      <button
        onClick={handleAddTask}
        className="mt-3 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-400 hover:bg-indigo-50/30 transition-all"
      >
        <Plus size={14} />
        Add Task
      </button>
    </div>
  )
}
