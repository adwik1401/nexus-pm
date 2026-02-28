import { MessageSquare, Paperclip, CalendarDays } from 'lucide-react'
import type { Task } from '../../types'
import { useApp } from '../../context/AppContext'
import { Avatar } from '../Sidebar/Sidebar'

interface TaskCardProps {
  task: Task
  onDragStart: (e: React.DragEvent, taskId: string) => void
}

export default function TaskCard({ task, onDragStart }: TaskCardProps) {
  const { selectTask } = useApp()
  const assignees = task.assignees ?? []
  const tags = task.tags ?? []
  const verticals = task.verticals ?? []
  const subTasks = task.sub_tasks ?? []
  const comments = task.comments ?? []

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, task.id)}
      onClick={() => selectTask(task)}
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group"
    >
      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tags.map(tag => (
            <span
              key={tag.id}
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide"
              style={{ backgroundColor: tag.color, color: tag.text_color }}
            >
              {tag.label}
            </span>
          ))}
          <button
            onClick={e => e.stopPropagation()}
            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 px-1 text-base leading-none"
          >
            ···
          </button>
        </div>
      )}

      {/* Vertical labels */}
      {verticals.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {verticals.map(v => (
            <span key={v.id} className="text-[10px] font-medium px-1.5 py-0.5 rounded-md border"
              style={{ color: v.color, borderColor: v.color + '55', backgroundColor: v.color + '18' }}>
              {v.name}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <h3 className="text-sm font-semibold text-gray-900 mb-1 leading-snug">{task.title}</h3>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mb-1">{task.description}</p>
      )}

      {/* Footer */}
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
            {assignees.slice(0, 3).map(a => (
              <Avatar key={a.id} user={a} size="sm" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
