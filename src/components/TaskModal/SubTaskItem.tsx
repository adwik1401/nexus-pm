import type { SubTask } from '../../types'

interface SubTaskItemProps {
  subTask: SubTask
  onChange: (id: string, completed: boolean) => void
}

export default function SubTaskItem({ subTask, onChange }: SubTaskItemProps) {
  return (
    <div className="flex items-center gap-3 py-2 group">
      <button
        onClick={() => onChange(subTask.id, !subTask.completed)}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          subTask.completed
            ? 'bg-indigo-500 border-indigo-500'
            : 'border-gray-300 hover:border-indigo-400'
        }`}
      >
        {subTask.completed && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <span className={`flex-1 text-sm ${subTask.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
        {subTask.title}
      </span>
    </div>
  )
}
