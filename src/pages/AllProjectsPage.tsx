import { useNavigate } from 'react-router-dom'
import { Layers, Server, DollarSign, Code2, ArrowRight, CheckCircle2, Clock, Circle, CalendarDays } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Avatar } from '../components/Sidebar/Sidebar'
import type { Program } from '../types'

const ICONS = {
  layers: Layers, server: Server, dollar: DollarSign, code: Code2,
}

function ProgramCard({ program }: { program: Program }) {
  const navigate = useNavigate()
  const { setActiveProgramId } = useApp()
  const Icon = ICONS[program.icon_type] ?? Layers
  const color = program.color ?? '#6366f1'

  const todo = program.todo_count ?? 0
  const inProgress = program.in_progress_count ?? 0
  const done = program.done_count ?? 0
  const total = todo + inProgress + done
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  const members = (program.members ?? []).slice(0, 5)
  const extraMembers = (program.members?.length ?? 0) - 5

  const openBoard = () => {
    setActiveProgramId(program.id)
    navigate('/')
  }

  // Deadline display
  const deadlineStr = program.deadline
    ? new Date(program.deadline + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null
  const isOverdue = program.deadline
    ? new Date(program.deadline + 'T00:00:00') < new Date(new Date().toDateString())
    : false

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden">
      {/* Color bar */}
      <div className="h-1.5 flex-shrink-0" style={{ backgroundColor: color }} />

      <div className="p-6 flex flex-col gap-4 flex-1">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: color + '20' }}
        >
          <Icon size={20} style={{ color }} />
        </div>
        <button
          onClick={openBoard}
          className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          Open <ArrowRight size={12} />
        </button>
      </div>

      <div>
        <h3 className="text-base font-bold text-gray-900">{program.name}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{total} tasks</p>
      </div>

      {/* Deadline */}
      {deadlineStr && (
        <div className={`flex items-center gap-1.5 text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
          <CalendarDays size={12} />
          <span>{isOverdue ? 'Overdue · ' : 'Due '}{deadlineStr}</span>
        </div>
      )}

      {/* Progress bar */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[11px] text-gray-400 font-medium">Progress</span>
          <span className="text-[11px] font-bold text-gray-600">{progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, backgroundColor: color }}
          />
        </div>
      </div>

      {/* Task counts */}
      <div className="flex gap-3 text-xs">
        <span className="flex items-center gap-1 text-gray-500">
          <Circle size={11} className="text-gray-400" /> {todo} to do
        </span>
        <span className="flex items-center gap-1 text-blue-600">
          <Clock size={11} /> {inProgress} active
        </span>
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircle2 size={11} /> {done} done
        </span>
      </div>

      {/* Members */}
      {members.length > 0 && (
        <div className="flex items-center gap-1 pt-1 border-t border-gray-50">
          <div className="flex -space-x-1.5">
            {members.map(m => <Avatar key={m.id} user={m} size="sm" />)}
          </div>
          {extraMembers > 0 && (
            <span className="text-xs text-gray-400 ml-1">+{extraMembers}</span>
          )}
        </div>
      )}
      </div>
    </div>
  )
}

export default function AllProgramsPage() {
  const { programs, loading } = useApp()

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto px-8 py-7 bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">All Programs</h1>
        <p className="text-sm text-gray-500 mt-0.5">{programs.length} program{programs.length !== 1 ? 's' : ''} in your workspace</p>
      </div>

      {programs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <p className="text-lg font-medium">No programs yet</p>
          <p className="text-sm mt-1">Ask an admin to create one</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {programs.map(p => <ProgramCard key={p.id} program={p} />)}
        </div>
      )}
    </div>
  )
}
