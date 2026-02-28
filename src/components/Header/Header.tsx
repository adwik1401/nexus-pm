import { LayoutGrid, CalendarDays, Search, Bell } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { ViewMode } from '../../types'

export default function Header() {
  const { activeProgram, viewMode, setViewMode } = useApp()

  return (
    <header className="flex items-center px-6 py-0 bg-white border-b border-gray-100 flex-shrink-0 h-14">
      <h1 className="text-lg font-bold text-gray-900 mr-6">{activeProgram?.name ?? 'Nexus'}</h1>

      <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 border border-gray-100">
        <ViewToggleBtn mode="kanban" current={viewMode} icon={<LayoutGrid size={14} />}
          label="Kanban Board" onClick={() => setViewMode('kanban')} />
        <ViewToggleBtn mode="gantt" current={viewMode} icon={<CalendarDays size={14} />}
          label="Calendar" onClick={() => setViewMode('gantt')} />
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 mr-3 w-52">
        <Search size={14} className="text-gray-400 flex-shrink-0" />
        <input type="text" placeholder="Search tasks…"
          className="bg-transparent text-sm text-gray-600 placeholder-gray-400 outline-none w-full" />
      </div>

      <button className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-50 transition-colors">
        <Bell size={18} className="text-gray-500" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
      </button>
    </header>
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
