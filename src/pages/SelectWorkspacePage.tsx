import { useNavigate } from 'react-router-dom'
import { Grid3X3, Check, ShieldCheck, Users, Eye } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import type { Role } from '../types'

const ROLE_INFO: Record<Role, { label: string; color: string; Icon: React.ElementType }> = {
  ADMIN:         { label: 'Admin',         color: 'bg-red-100 text-red-700',      Icon: ShieldCheck },
  VERTICAL_LEAD: { label: 'Vertical Lead', color: 'bg-amber-100 text-amber-700',  Icon: ShieldCheck },
  MEMBER:        { label: 'Member',        color: 'bg-indigo-100 text-indigo-700', Icon: Users },
  VIEWER:        { label: 'Viewer',        color: 'bg-gray-100 text-gray-600',     Icon: Eye },
}

export default function SelectWorkspacePage() {
  const navigate = useNavigate()
  const { memberships } = useAuth()
  const { activeWorkspaceId, switchWorkspace } = useApp()

  const handleSelect = (workspaceId: string) => {
    switchWorkspace(workspaceId)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Grid3X3 size={20} className="text-white" />
          </div>
          <span className="text-white font-bold text-2xl tracking-tight">Planzo</span>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Select a workspace</h1>
          <p className="text-sm text-gray-500 mb-6">Choose which workspace to open</p>

          <div className="space-y-2">
            {memberships.map(m => {
              const ws = m.workspace
              if (!ws) return null
              const roleInfo = ROLE_INFO[m.role as Role] ?? ROLE_INFO.MEMBER
              const RoleIcon = roleInfo.Icon
              const isActive = m.workspace_id === activeWorkspaceId
              return (
                <button
                  key={m.workspace_id}
                  onClick={() => handleSelect(m.workspace_id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                    isActive
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-600 font-bold text-sm">
                      {ws.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{ws.name}</p>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${roleInfo.color}`}>
                      <RoleIcon size={10} />
                      {roleInfo.label}
                    </span>
                  </div>
                  {isActive && <Check size={16} className="text-indigo-500 flex-shrink-0" />}
                </button>
              )
            })}
          </div>

          {memberships.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No workspaces found.</p>
          )}
        </div>
      </div>
    </div>
  )
}
