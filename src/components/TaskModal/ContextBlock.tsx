import { Trash2 } from 'lucide-react'
import type { ContextBlock as ContextBlockType } from '../../types'

interface ContextBlockProps {
  block: ContextBlockType
  onDelete: (id: string) => void
  onChange: (id: string, field: 'title' | 'content', value: string) => void
}

export default function ContextBlock({ block, onDelete, onChange }: ContextBlockProps) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 group">
      <div className="flex items-center justify-between mb-2">
        <input
          className="text-[11px] font-bold tracking-widest text-gray-400 uppercase bg-transparent outline-none hover:text-gray-600 transition-colors w-full"
          value={block.title}
          onChange={e => onChange(block.id, 'title', e.target.value)}
        />
        <button
          onClick={() => onDelete(block.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 flex-shrink-0 ml-2"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <textarea
        className="w-full text-sm text-gray-700 bg-transparent outline-none resize-none leading-relaxed"
        rows={3}
        value={block.content}
        onChange={e => onChange(block.id, 'content', e.target.value)}
        placeholder="Add content..."
      />
    </div>
  )
}
