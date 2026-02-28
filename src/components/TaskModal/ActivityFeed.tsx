import { ArrowRight, MessageCircle, FileText, Plus, CheckSquare, Clock } from 'lucide-react'
import { Avatar } from '../Sidebar/Sidebar'
import type { ActivityLog } from '../../types'

const STATUS_LABEL: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
}

function actionText(log: ActivityLog): string {
  const m = log.meta
  switch (log.action) {
    case 'status_changed':
      return `changed status from "${STATUS_LABEL[m.from as string] ?? m.from}" to "${STATUS_LABEL[m.to as string] ?? m.to}"`
    case 'comment_added':
      return 'added a comment'
    case 'context_block_added':
      return `added context block "${m.title}"`
    case 'subtask_added':
      return `added subtask "${m.title}"`
    case 'subtask_updated':
      return `marked "${m.title}" as ${m.completed ? 'complete' : 'incomplete'}`
    default:
      return log.action
  }
}

const ACTION_ICON: Record<string, React.ElementType> = {
  status_changed:      ArrowRight,
  comment_added:       MessageCircle,
  context_block_added: FileText,
  subtask_added:       Plus,
  subtask_updated:     CheckSquare,
}

const ACTION_COLOR: Record<string, string> = {
  status_changed:      'bg-indigo-50 text-indigo-500',
  comment_added:       'bg-blue-50 text-blue-500',
  context_block_added: 'bg-purple-50 text-purple-500',
  subtask_added:       'bg-green-50 text-green-500',
  subtask_updated:     'bg-emerald-50 text-emerald-500',
}

interface ActivityFeedProps {
  logs: ActivityLog[]
}

export default function ActivityFeed({ logs }: ActivityFeedProps) {
  return (
    <div>
      <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
        <Clock size={11} /> Activity {logs.length > 0 && `(${logs.length})`}
      </h3>

      {logs.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No activity yet.</p>
      ) : (
        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
          {logs.map(log => {
            const Icon = ACTION_ICON[log.action] ?? Clock
            const color = ACTION_COLOR[log.action] ?? 'bg-gray-50 text-gray-500'
            return (
              <div key={log.id} className="flex items-start gap-2.5">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${color}`}>
                  <Icon size={11} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    <span className="font-semibold text-gray-800">{log.user?.name ?? 'Someone'}</span>
                    {' '}{actionText(log)}
                  </p>
                  <span className="text-[10px] text-gray-400">
                    {new Date(log.created_at).toLocaleString('en-US', {
                      month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
                {log.user && <Avatar user={log.user} size="sm" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
