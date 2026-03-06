import { useEffect, useState } from 'react'
import { LayoutGrid, CalendarDays, Search, Bell } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { ViewMode } from '../../types'
import SearchModal from '../SearchModal/SearchModal'
import NotificationPanel from '../NotificationPanel/NotificationPanel'

export default function Header() {
  const { activeProgram, viewMode, setViewMode, unreadCount, showNotifications, setShowNotifications } = useApp()
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <header className="flex items-center px-6 py-0 bg-white border-b border-gray-100 flex-shrink-0 h-14 relative">
        <h1 className="text-lg font-bold text-gray-900 mr-6">{activeProgram?.name ?? 'Planzo'}</h1>

        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 border border-gray-100">
          <ViewToggleBtn mode="kanban" current={viewMode} icon={<LayoutGrid size={14} />}
            label="Kanban Board" onClick={() => setViewMode('kanban')} />
          <ViewToggleBtn mode="gantt" current={viewMode} icon={<CalendarDays size={14} />}
            label="Calendar" onClick={() => setViewMode('gantt')} />
        </div>

        <div className="flex-1" />

        {/* Search trigger */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 mr-3 w-52 text-left hover:border-indigo-300 transition-colors"
        >
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-400 flex-1">Search…</span>
          <kbd className="text-[10px] text-gray-300 border border-gray-200 rounded px-1 py-0.5 font-mono">⌘K</kbd>
        </button>

        {/* Bell + notification dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Bell size={18} className="text-gray-500" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotifications && <NotificationPanel />}
        </div>
      </header>

      {isSearchOpen && <SearchModal onClose={() => setIsSearchOpen(false)} />}
    </>
  )
}

function ViewToggleBtn({ mode, current, icon, label, onClick }: {
  mode: ViewMode; current: ViewMode; icon: React.ReactNode; label: string; onClick: () => void
}) {
  const isActive = mode === current
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
        isActive ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      <span className={isActive ? 'text-indigo-500' : 'text-gray-400'}>{icon}</span>
      {label}
    </button>
  )
}
