import { useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { Avatar } from '../Sidebar/Sidebar'
import type { Profile } from '../../types'

interface MemberPickerProps {
  label: string
  options: Profile[]
  selected: Profile[]
  onChange: (selected: Profile[]) => void
}

export default function MemberPicker({ label, options, selected, onChange }: MemberPickerProps) {
  const [open, setOpen] = useState(false)

  const toggle = (user: Profile) => {
    const exists = selected.some(s => s.id === user.id)
    onChange(exists ? selected.filter(s => s.id !== user.id) : [...selected, user])
  }

  return (
    <div className="relative">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</p>

      {/* Selected avatars */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 flex-wrap group"
      >
        {selected.length > 0
          ? (
            <div className="flex -space-x-1.5 flex-wrap gap-y-1">
              {selected.map(u => <Avatar key={u.id} user={u} size="sm" />)}
            </div>
          )
          : <span className="text-sm text-gray-400 italic">Unassigned</span>
        }
        <ChevronDown size={13} className="text-gray-400 ml-1 group-hover:text-gray-600 transition-colors" />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-100 rounded-xl shadow-lg min-w-[180px] py-1 max-h-48 overflow-y-auto">
            {options.map(user => {
              const isSelected = selected.some(s => s.id === user.id)
              return (
                <button
                  key={user.id}
                  onClick={() => toggle(user)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                >
                  <Avatar user={user} size="sm" />
                  <span className="flex-1 text-sm text-gray-700 truncate">{user.name}</span>
                  {isSelected && <Check size={13} className="text-indigo-500 flex-shrink-0" />}
                </button>
              )
            })}
            {options.length === 0 && (
              <p className="px-3 py-2 text-sm text-gray-400">No members available</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
