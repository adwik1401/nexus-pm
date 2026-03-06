import { useEffect, useRef, useState } from 'react'
import { Search, User, Layers, CheckSquare, Video, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useApp } from '../../context/AppContext'
import type { Meeting, Profile, Program, Task } from '../../types'

interface SearchModalProps {
  onClose: () => void
}

type ResultSection =
  | { type: 'program'; items: Program[] }
  | { type: 'task'; items: Task[] }
  | { type: 'meeting'; items: Meeting[] }
  | { type: 'user'; items: Profile[] }

const TYPE_STYLES = {
  program: { color: 'bg-indigo-100 text-indigo-700', label: 'Project' },
  task:    { color: 'bg-blue-100 text-blue-700',    label: 'Task' },
  meeting: { color: 'bg-teal-100 text-teal-700',   label: 'Meeting' },
  user:    { color: 'bg-purple-100 text-purple-700', label: 'User' },
}

function Tag({ type }: { type: keyof typeof TYPE_STYLES }) {
  const s = TYPE_STYLES[type]
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${s.color}`}>
      {s.label}
    </span>
  )
}

export default function SearchModal({ onClose }: SearchModalProps) {
  const navigate = useNavigate()
  const { programs, meetings, users, setActiveProgramId, selectTask, selectMeeting } = useApp()
  const [query, setQuery] = useState('')
  const [taskResults, setTaskResults] = useState<Task[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setTaskResults([]); return }

    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*, program:projects(id, name, color, icon_type), assignees:task_assignees(user:profiles(id, name, profile_image, role, vertical_id))')
        .ilike('title', `%${query}%`)
        .limit(8)
      if (data) {
        const normalised = data.map((raw: Record<string, unknown>) => {
          const assignees = ((raw.assignees as { user: unknown }[]) ?? []).map(a => a.user)
          return { ...raw, assignees } as unknown as Task
        })
        setTaskResults(normalised)
      }
    }, 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const q = query.toLowerCase().trim()

  const filteredPrograms = q ? programs.filter(p => p.name.toLowerCase().includes(q)) : []
  const filteredMeetings = q ? meetings.filter(m => m.title.toLowerCase().includes(q)) : []
  const filteredUsers = q ? users.filter(u => u.name.toLowerCase().includes(q)) : []

  const sections: ResultSection[] = [
    { type: 'program', items: filteredPrograms },
    { type: 'task',    items: taskResults },
    { type: 'meeting', items: filteredMeetings },
    { type: 'user',    items: filteredUsers },
  ].filter(s => s.items.length > 0) as ResultSection[]

  const totalResults = filteredPrograms.length + taskResults.length + filteredMeetings.length + filteredUsers.length

  const handleProgramClick = (p: Program) => {
    setActiveProgramId(p.id)
    navigate('/')
    onClose()
  }

  const handleTaskClick = (t: Task) => {
    selectTask(t)
    onClose()
  }

  const handleMeetingClick = (m: Meeting) => {
    selectMeeting(m)
    onClose()
  }

  const handleUserClick = (u: Profile) => {
    navigate(`/profile/${u.id}`)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-24 px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <Search size={16} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tasks, projects, meetings, users…"
            className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500">
              <X size={14} />
            </button>
          )}
          <kbd className="text-[10px] text-gray-300 border border-gray-200 rounded px-1.5 py-0.5 font-mono">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto">
          {!q && (
            <div className="px-4 py-10 text-center text-sm text-gray-400">
              Start typing to search…
            </div>
          )}

          {q && totalResults === 0 && (
            <div className="px-4 py-10 text-center text-sm text-gray-400">
              No results for "<span className="font-medium text-gray-600">{query}</span>"
            </div>
          )}

          {sections.map(section => (
            <div key={section.type}>
              <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 border-b border-gray-100">
                {TYPE_STYLES[section.type].label}s
              </div>

              {section.type === 'program' && (section.items as Program[]).map(p => (
                <button
                  key={p.id}
                  onClick={() => handleProgramClick(p)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: p.color + '20' }}>
                    <Layers size={13} style={{ color: p.color }} />
                  </div>
                  <span className="flex-1 text-sm font-medium text-gray-800 truncate">{p.name}</span>
                  <Tag type="program" />
                </button>
              ))}

              {section.type === 'task' && (section.items as Task[]).map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTaskClick(t)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50">
                    <CheckSquare size={13} className="text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                    {t.program && (
                      <p className="text-[11px] text-gray-400 truncate">{t.program.name}</p>
                    )}
                  </div>
                  <Tag type="task" />
                </button>
              ))}

              {section.type === 'meeting' && (section.items as Meeting[]).map(m => (
                <button
                  key={m.id}
                  onClick={() => handleMeetingClick(m)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-teal-50">
                    <Video size={13} className="text-teal-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{m.title}</p>
                    <p className="text-[11px] text-gray-400">{m.date}</p>
                  </div>
                  <Tag type="meeting" />
                </button>
              ))}

              {section.type === 'user' && (section.items as Profile[]).map(u => (
                <button
                  key={u.id}
                  onClick={() => handleUserClick(u)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-purple-50">
                    <User size={13} className="text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                    <p className="text-[11px] text-gray-400 capitalize">{u.role?.toLowerCase().replace('_', ' ')}</p>
                  </div>
                  <Tag type="user" />
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
