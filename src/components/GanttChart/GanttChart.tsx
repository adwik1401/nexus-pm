import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Flag, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import type { Meeting, Program, Task } from '../../types'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']


function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

// Returns Mon-based offset for the first day of the month (0=Mon … 6=Sun)
function getStartOffset(year: number, month: number) {
  const dow = new Date(year, month, 1).getDay() // 0=Sun
  return dow === 0 ? 6 : dow - 1
}

// ── Calendar event types ─────────────────────────────────────────────────────
type CalEvent =
  | { kind: 'meeting'; data: Meeting }
  | { kind: 'program'; data: Program }
  | { kind: 'task';    data: Task }

export default function CalendarView() {
  const navigate = useNavigate()
  const {
    tasks, selectTask,
    programs, setActiveProgramId,
    meetings, selectMeeting, openNewMeeting,
  } = useApp()

  const programColorById = programs.reduce<Record<string, string>>((acc, p) => {
    acc[p.id] = p.color
    return acc
  }, {})

  const today = new Date()

  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const daysInMonth  = getDaysInMonth(viewYear, viewMonth)
  const startOffset  = getStartOffset(viewYear, viewMonth)
  const totalCells   = Math.ceil((startOffset + daysInMonth) / 7) * 7

  // Group tasks by due_date "YYYY-MM-DD"
  const tasksByDate = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    if (!t.due_date) return acc
    acc[t.due_date] = acc[t.due_date] ? [...acc[t.due_date], t] : [t]
    return acc
  }, {})

  // Group program deadlines by date
  const programsByDate = programs.reduce<Record<string, Program[]>>((acc, p) => {
    if (!p.deadline) return acc
    acc[p.deadline] = acc[p.deadline] ? [...acc[p.deadline], p] : [p]
    return acc
  }, {})

  // Group meetings by date
  const meetingsByDate = meetings.reduce<Record<string, Meeting[]>>((acc, m) => {
    acc[m.date] = acc[m.date] ? [...acc[m.date], m] : [m]
    return acc
  }, {})

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const goToday = () => {
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
  }

  const monthLabel = new Date(viewYear, viewMonth, 1)
    .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div className="flex flex-col h-full overflow-hidden px-6 py-5">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col flex-1 overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronLeft size={16} className="text-gray-500" />
            </button>
            <h2 className="text-base font-bold text-gray-900 w-44 text-center">{monthLabel}</h2>
            <button onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronRight size={16} className="text-gray-500" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            {/* Legend */}
            <div className="hidden sm:flex items-center gap-3 mr-1 text-[11px] text-gray-400">
              <span className="flex items-center gap-1"><Clock size={10} className="text-teal-500" />Meeting</span>
              <span className="flex items-center gap-1"><Flag size={10} className="text-indigo-400" />Deadline</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />Task</span>
            </div>
            <button
              onClick={() => openNewMeeting()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-600 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors"
            >
              <Plus size={14} /> New Meeting
            </button>
            <button onClick={goToday}
              className="px-3 py-1.5 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
              Today
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-100 flex-shrink-0">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-2.5 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 flex-1 overflow-y-auto" style={{ gridAutoRows: 'minmax(100px, 1fr)' }}>
          {Array.from({ length: totalCells }).map((_, idx) => {
            const dayNum = idx - startOffset + 1
            const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth

            const dateStr = isCurrentMonth
              ? `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
              : ''

            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
            const isToday = dateStr === todayStr

            if (!isCurrentMonth) {
              return (
                <div key={idx} className="border-r border-b border-gray-100 last:border-r-0 p-1.5 bg-gray-50/40" />
              )
            }

            // Build events: meetings first, then program deadlines, then tasks
            const dayEvents: CalEvent[] = [
              ...(meetingsByDate[dateStr] ?? []).map(m => ({ kind: 'meeting' as const, data: m })),
              ...(programsByDate[dateStr] ?? []).map(p => ({ kind: 'program' as const, data: p })),
              ...(tasksByDate[dateStr] ?? []).map(t => ({ kind: 'task' as const, data: t })),
            ]

            const visibleEvents = dayEvents.slice(0, 3)
            const overflowCount = dayEvents.length - 3

            return (
              <div
                key={idx}
                onClick={() => openNewMeeting(dateStr)}
                className={`border-r border-b border-gray-100 last:border-r-0 p-1.5 overflow-hidden cursor-pointer transition-colors
                  ${idx % 7 >= 5 ? 'bg-gray-50/30 hover:bg-gray-50/60' : 'hover:bg-blue-50/20'}
                `}
              >
                {/* Day number */}
                <div className="mb-1 flex justify-end">
                  <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}>
                    {dayNum}
                  </span>
                </div>

                {/* Events */}
                <div className="space-y-0.5">
                  {visibleEvents.map((evt, i) => {
                    if (evt.kind === 'meeting') {
                      const m = evt.data
                      return (
                        <button
                          key={`m-${m.id}`}
                          onClick={e => { e.stopPropagation(); selectMeeting(m) }}
                          title={`${m.time_from.slice(0,5)}–${m.time_to.slice(0,5)} · ${m.mode === 'ONLINE' ? 'Online' : 'In-person'}`}
                          className="w-full text-left text-[11px] font-medium px-1.5 py-0.5 rounded truncate flex items-center gap-1 bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors"
                        >
                          <Clock size={9} className="flex-shrink-0" />
                          <span className="truncate">{m.time_from.slice(0, 5)} {m.title}</span>
                        </button>
                      )
                    }

                    if (evt.kind === 'program') {
                      const p = evt.data
                      return (
                        <button
                          key={`p-${p.id}`}
                          onClick={e => {
                            e.stopPropagation()
                            setActiveProgramId(p.id)
                            navigate('/')
                          }}
                          title={`Program deadline: ${p.name}`}
                          className="w-full text-left text-[11px] font-medium px-1.5 py-0.5 rounded truncate flex items-center gap-1 transition-opacity hover:opacity-75"
                          style={{ backgroundColor: p.color + '28', color: p.color }}
                        >
                          <Flag size={9} className="flex-shrink-0" style={{ color: p.color }} />
                          <span className="truncate">{p.name}</span>
                        </button>
                      )
                    }

                    // task
                    const t = evt.data as Task
                    const tc = programColorById[t.project_id] ?? '#6366f1'
                    return (
                      <button
                        key={`t-${t.id}-${i}`}
                        onClick={e => { e.stopPropagation(); selectTask(t) }}
                        className="w-full text-left text-[11px] font-medium px-1.5 py-0.5 rounded truncate block"
                        style={{ backgroundColor: tc + '20', color: tc }}
                      >
                        {t.title}
                      </button>
                    )
                  })}
                  {overflowCount > 0 && (
                    <p className="text-[10px] text-gray-400 px-1">+{overflowCount} more</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
