import { useEffect, useRef } from 'react'
import { Bell, CheckSquare, Video, X, Check } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { markRead, markAllRead } from '../../services/notifications'
import type { AppNotification } from '../../types'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function NotifIcon({ type }: { type: AppNotification['type'] }) {
  if (type === 'task_assigned' || type === 'task_moved') {
    return <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0"><CheckSquare size={14} className="text-blue-500" /></div>
  }
  return <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0"><Video size={14} className="text-teal-500" /></div>
}

export default function NotificationPanel() {
  const { notifications, refreshNotifications, setShowNotifications, selectTask, selectMeeting, tasks, meetings } = useApp()
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [setShowNotifications])

  const handleClick = async (n: AppNotification) => {
    if (!n.read) {
      await markRead(n.id)
      await refreshNotifications()
    }
    if (n.entity_type === 'task' && n.entity_id) {
      const task = tasks.find(t => t.id === n.entity_id)
      if (task) selectTask(task)
    } else if (n.entity_type === 'meeting' && n.entity_id) {
      const meeting = meetings.find(m => m.id === n.entity_id)
      if (meeting) selectMeeting(meeting)
    }
    setShowNotifications(false)
  }

  const handleMarkAllRead = async () => {
    await markAllRead()
    await refreshNotifications()
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-11 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-gray-500" />
          <span className="text-sm font-semibold text-gray-800">Notifications</span>
        </div>
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.read) && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
            >
              <Check size={11} /> Mark all read
            </button>
          )}
          <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Bell size={24} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No notifications yet</p>
          </div>
        ) : (
          notifications.map(n => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${!n.read ? 'bg-blue-50/40' : ''}`}
            >
              <NotifIcon type={n.type} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{n.title}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{n.body}</p>
                <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
              </div>
              {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
