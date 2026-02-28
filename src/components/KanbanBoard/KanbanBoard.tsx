import { useState } from 'react'
import type { TaskStatus } from '../../types'
import { useApp } from '../../context/AppContext'
import KanbanColumn from './KanbanColumn'

const COLUMNS: { title: string; status: TaskStatus }[] = [
  { title: 'To Do',       status: 'TODO' },
  { title: 'In Progress', status: 'IN_PROGRESS' },
  { title: 'Done',        status: 'DONE' },
]

export default function KanbanBoard() {
  const { tasks, moveTask } = useApp()
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedId(taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault()
    if (draggedId) {
      moveTask(draggedId, status)
      setDraggedId(null)
    }
  }

  return (
    <div className="flex gap-5 h-full overflow-x-auto px-6 py-5 items-start">
      {COLUMNS.map(col => (
        <KanbanColumn
          key={col.status}
          title={col.title}
          status={col.status}
          tasks={tasks.filter(t => t.status === col.status)}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
        />
      ))}
    </div>
  )
}
