import { useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import type { Vertical } from '../../types'

interface VerticalPickerProps {
  verticals: Vertical[]
  selected: Vertical[]
  onChange: (selected: Vertical[]) => void
}

export default function VerticalPicker({ verticals, selected, onChange }: VerticalPickerProps) {
  const [open, setOpen] = useState(false)

  const toggle = (v: Vertical) => {
    const exists = selected.some(s => s.id === v.id)
    onChange(exists ? selected.filter(s => s.id !== v.id) : [...selected, v])
  }

  return (
    <div className="relative">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Verticals</p>

      <button onClick={() => setOpen(!open)} className="flex flex-wrap items-center gap-1.5 group">
        {selected.length > 0
          ? selected.map(v => (
            <span key={v.id} className="text-xs font-medium px-2 py-0.5 rounded-md border"
              style={{ color: v.color, borderColor: v.color + '55', backgroundColor: v.color + '18' }}>
              {v.name}
            </span>
          ))
          : <span className="text-sm text-gray-400 italic">None</span>
        }
        <ChevronDown size={13} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-100 rounded-xl shadow-lg min-w-[160px] py-1 max-h-48 overflow-y-auto">
            {verticals.map(v => {
              const isSel = selected.some(s => s.id === v.id)
              return (
                <button
                  key={v.id}
                  onClick={() => toggle(v)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: v.color }} />
                  <span className="flex-1 text-sm text-gray-700">{v.name}</span>
                  {isSel && <Check size={13} className="text-indigo-500 flex-shrink-0" />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
