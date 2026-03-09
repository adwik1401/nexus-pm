import { useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Grid3X3, Layers, Server, DollarSign, Code2,
  CheckSquare, LayoutGrid, ClipboardList, ShieldCheck, LogOut, Settings, CalendarDays, Video,
  Plus, X, ChevronDown, Building2, Check,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { createProgram } from '../../services/projects'
import { createWorkspace } from '../../services/workspaces'
import { createInvite } from '../../services/invites'
import type { Profile, Role } from '../../types'

const PROGRAM_ICONS = {
  layers: Layers,
  server: Server,
  dollar: DollarSign,
  code: Code2,
}

export function Avatar({ user, size = 'sm', onClick, highlighted }: {
  user: Pick<Profile, 'name' | 'profile_image'>
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  highlighted?: boolean
}) {
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-xs'
    : size === 'md' ? 'w-8 h-8 text-sm'
    : 'w-10 h-10 text-sm'

  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const colors = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#14b8a6','#a855f7']
  const color = colors[user.name.charCodeAt(0) % colors.length]

  return (
    <div
      onClick={onClick}
      title={user.name}
      className={`${sizeClass} rounded-full flex-shrink-0 overflow-hidden ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-indigo-400 ring-offset-1 ring-offset-[#0F1117] transition-all' : ''} ${highlighted ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-[#0F1117]' : ''}`}
    >
      {user.profile_image
        ? <img src={user.profile_image} alt={user.name} className="w-full h-full object-cover" />
        : (
          <div className="w-full h-full flex items-center justify-center text-white font-semibold" style={{ backgroundColor: color }}>
            {initials}
          </div>
        )
      }
    </div>
  )
}

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    programs, users, activeProgramId, setActiveProgramId,
    filterMemberId, setFilterMemberId, viewMode, setViewMode, refreshPrograms,
    isAdmin, isVerticalLead, activeWorkspace, activeWorkspaceId, switchWorkspace,
    myRole,
  } = useApp()
  const { profile, memberships, logout, refreshMemberships } = useAuth()

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6366f1')
  const [newDeadline, setNewDeadline] = useState('')
  const [creating, setCreating] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Workspace switcher
  const [showWsSwitcher, setShowWsSwitcher] = useState(false)
  const [showNewWsForm, setShowNewWsForm] = useState(false)
  const [newWsName, setNewWsName] = useState('')
  const [creatingWs, setCreatingWs] = useState(false)
  const [wsError, setWsError] = useState('')

  // Quick-invite from Members section (ADMIN only)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('MEMBER')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSent, setInviteSent] = useState(false)

  const handleCreateProject = async () => {
    if (!newName.trim() || creating || !activeWorkspaceId) return
    setCreating(true)
    try {
      const p = await createProgram(newName.trim(), 'layers', newDeadline || null, activeWorkspaceId, newColor)
      await refreshPrograms()
      setActiveProgramId(p.id)
      navigate('/')
      setNewName('')
      setNewColor('#6366f1')
      setNewDeadline('')
      setShowCreate(false)
    } catch (err) {
      console.error('[Sidebar] createProject:', err)
    } finally {
      setCreating(false)
    }
  }

  const handleCreateWorkspace = async () => {
    if (!newWsName.trim() || creatingWs) return
    setCreatingWs(true)
    setWsError('')
    try {
      const { workspace } = await createWorkspace(newWsName.trim())
      await refreshMemberships()
      switchWorkspace(workspace.id)
      setNewWsName('')
      setShowNewWsForm(false)
      setShowWsSwitcher(false)
    } catch (err) {
      console.error('[Sidebar] createWorkspace:', err)
      setWsError((err as { message?: string })?.message || 'Failed to create workspace')
    } finally {
      setCreatingWs(false)
    }
  }

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || inviting || !activeWorkspaceId) return
    setInviting(true)
    setInviteError('')
    setInviteSent(false)
    try {
      await createInvite({ workspaceId: activeWorkspaceId, email: inviteEmail.trim(), role: inviteRole })
      setInviteSent(true)
      setInviteEmail('')
      // Auto-dismiss success message after 3 s
      setTimeout(() => setInviteSent(false), 3000)
    } catch (err) {
      console.error('[Sidebar] sendInvite:', err)
      setInviteError((err as { message?: string })?.message || 'Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  const isOnPrograms = location.pathname === '/projects'
  const isOnAdmin    = location.pathname === '/admin'
  const isOnBoard    = location.pathname === '/'
  const isOnMeetings = location.pathname === '/meetings'

  const { displayedUsers, extraCount } = useMemo(() => {
    const visible = (isVerticalLead && !isAdmin && profile?.vertical_id)
      ? users.filter(u => u.vertical_id === profile.vertical_id)
      : users
    return { displayedUsers: visible.slice(0, 25), extraCount: visible.length - 25 }
  }, [users, isVerticalLead, isAdmin, profile?.vertical_id])

  const handleMemberClick = (userId: string) => {
    if (!isVerticalLead) return
    if (!isOnBoard) navigate('/')
    setFilterMemberId(filterMemberId === userId ? null : userId)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside className="w-[270px] flex-shrink-0 flex flex-col h-full" style={{ backgroundColor: '#0F1117' }}>
      {/* Workspace Switcher */}
      <div className="px-3 pt-4 pb-2 relative">
        <button
          onClick={() => { setShowWsSwitcher(v => !v); setShowNewWsForm(false) }}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group"
        >
          <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Grid3X3 size={14} className="text-white" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold text-gray-200 truncate leading-tight">
              {activeWorkspace?.name ?? 'Select Workspace'}
            </p>
            <p className="text-[10px] text-gray-500 leading-tight">Workspace</p>
          </div>
          <ChevronDown size={13} className={`text-gray-500 transition-transform flex-shrink-0 ${showWsSwitcher ? 'rotate-180' : ''}`} />
        </button>

        {/* Switcher dropdown */}
        {showWsSwitcher && (
          <div className="absolute left-3 right-3 top-full mt-1 bg-[#1a1f2e] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="max-h-56 overflow-y-auto py-1">
              {memberships.map(m => {
                const ws = m.workspace
                if (!ws) return null
                return (
                  <button
                    key={m.workspace_id}
                    onClick={() => { switchWorkspace(m.workspace_id); setShowWsSwitcher(false) }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/5 transition-colors ${m.workspace_id === activeWorkspaceId ? 'text-indigo-300' : 'text-gray-300'}`}
                  >
                    <div className="w-6 h-6 rounded-md bg-indigo-600/30 flex items-center justify-center flex-shrink-0">
                      <Building2 size={12} className="text-indigo-400" />
                    </div>
                    <span className="text-sm font-medium truncate flex-1">{ws.name}</span>
                    {m.workspace_id === activeWorkspaceId && (
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
            <div className="border-t border-white/10 p-2">
              {showNewWsForm ? (
                <div className="space-y-1.5">
                  <input
                    autoFocus
                    type="text"
                    value={newWsName}
                    onChange={e => { setNewWsName(e.target.value); setWsError('') }}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreateWorkspace(); if (e.key === 'Escape') { setShowNewWsForm(false); setWsError('') } }}
                    placeholder="Workspace name…"
                    className="w-full bg-white/5 text-gray-200 text-xs rounded-md px-2 py-1.5 outline-none border border-white/10 focus:border-indigo-500 placeholder-gray-600"
                  />
                  {wsError && <p className="text-[10px] text-red-400 px-0.5">{wsError}</p>}
                  <button
                    onClick={handleCreateWorkspace}
                    disabled={creatingWs || !newWsName.trim()}
                    className="w-full text-xs py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium transition-colors"
                  >
                    {creatingWs ? 'Creating…' : 'Create'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewWsForm(true)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors rounded-md hover:bg-white/5"
                >
                  <Plus size={12} />
                  Create new workspace
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-6 pb-4">
        {/* GENERAL */}
        <section>
          <p className="px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">General</p>
          <NavItem
            icon={<CheckSquare size={15} />}
            label="My Tasks"
            active={location.pathname === '/my-tasks'}
            onClick={() => navigate('/my-tasks')}
          />
          <NavItem
            icon={<ClipboardList size={15} />}
            label="All Tasks"
            active={location.pathname === '/all-tasks'}
            onClick={() => navigate('/all-tasks')}
          />
          <NavItem
            icon={<LayoutGrid size={15} />}
            label="All Projects"
            active={isOnPrograms}
            onClick={() => navigate('/projects')}
          />
          <NavItem
            icon={<CalendarDays size={15} />}
            label="Calendar"
            active={isOnBoard && viewMode === 'gantt'}
            onClick={() => { setViewMode('gantt'); navigate('/') }}
          />
          <NavItem
            icon={<Video size={15} />}
            label="Meetings"
            active={isOnMeetings}
            onClick={() => navigate('/meetings')}
          />
          {isAdmin && (
            <NavItem
              icon={<ShieldCheck size={15} />}
              label="Admin"
              active={isOnAdmin}
              onClick={() => navigate('/admin')}
            />
          )}
        </section>

        {/* PROGRAMS */}
        <section>
          <div className="px-2 flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Projects</p>
            {isAdmin && (
              <button
                onClick={() => { setShowCreate(v => !v); setTimeout(() => nameInputRef.current?.focus(), 50) }}
                className="text-gray-500 hover:text-gray-300 transition-colors"
                title="New project"
              >
                {showCreate ? <X size={13} /> : <Plus size={13} />}
              </button>
            )}
          </div>

          {showCreate && (
            <div className="mb-2 px-1">
              <div className="flex items-center gap-1.5 mb-1.5">
                <input
                  type="color"
                  value={newColor}
                  onChange={e => setNewColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent flex-shrink-0"
                  title="Pick color"
                />
                <input
                  ref={nameInputRef}
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateProject(); if (e.key === 'Escape') setShowCreate(false) }}
                  placeholder="Project name…"
                  className="flex-1 bg-white/5 text-gray-200 text-xs rounded-md px-2 py-1.5 outline-none border border-white/10 focus:border-indigo-500 placeholder-gray-600"
                />
              </div>
              <input
                type="date"
                value={newDeadline}
                onChange={e => setNewDeadline(e.target.value)}
                className="w-full mb-1.5 bg-white/5 text-gray-400 text-xs rounded-md px-2 py-1.5 outline-none border border-white/10 focus:border-indigo-500"
                title="Deadline (optional)"
              />
              <button
                onClick={handleCreateProject}
                disabled={creating || !newName.trim()}
                className="w-full text-xs py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium transition-colors"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          )}

          {programs.map(program => {
            const Icon = PROGRAM_ICONS[program.icon_type] ?? Layers
            const isActive = program.id === activeProgramId && isOnBoard
            return (
              <button
                key={program.id}
                onClick={() => { setActiveProgramId(program.id); navigate('/') }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left overflow-hidden ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                {/* Program color bar */}
                <div
                  className="w-[3px] h-[14px] rounded-full flex-shrink-0"
                  style={{ backgroundColor: program.color ?? '#6366f1' }}
                />
                <Icon size={15} className={isActive ? 'text-indigo-400' : 'text-gray-500'} />
                <span className="font-medium truncate flex-1">{program.name}</span>
                {program.deadline && (
                  <span className="text-[10px] text-gray-500 flex-shrink-0">
                    {new Date(program.deadline + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </button>
            )
          })}
        </section>

        {/* MEMBERS */}
        <section>
          <div className="px-2 flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Members</p>
            <div className="flex items-center gap-2">
              {filterMemberId && (
                <button onClick={() => setFilterMemberId(null)} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold">
                  Clear
                </button>
              )}
              {/* Invite button — ADMIN only */}
              {isAdmin && (
                <button
                  onClick={() => { setShowInvite(v => !v); setInviteError(''); setInviteSent(false) }}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                  title="Invite member"
                >
                  {showInvite ? <X size={13} /> : <Plus size={13} />}
                </button>
              )}
            </div>
          </div>

          {/* Inline invite form — shown when showInvite is true */}
          {showInvite && isAdmin && (
            <div className="mb-3 px-1">
              <input
                autoFocus
                type="email"
                value={inviteEmail}
                onChange={e => { setInviteEmail(e.target.value); setInviteError('') }}
                onKeyDown={e => { if (e.key === 'Enter') handleSendInvite(); if (e.key === 'Escape') setShowInvite(false) }}
                placeholder="Email address…"
                className="w-full bg-white/5 text-gray-200 text-xs rounded-md px-2 py-1.5 outline-none border border-white/10 focus:border-indigo-500 placeholder-gray-600 mb-1.5"
              />
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as Role)}
                className="w-full bg-[#1a1f2e] text-gray-300 text-xs rounded-md px-2 py-1.5 outline-none border border-white/10 focus:border-indigo-500 mb-1.5"
              >
                <option value="VERTICAL_LEAD">Vertical Lead</option>
                <option value="MEMBER">Member</option>
                <option value="VIEWER">Viewer</option>
              </select>
              {inviteError && <p className="text-[10px] text-red-400 px-0.5 mb-1">{inviteError}</p>}
              {inviteSent && (
                <p className="text-[10px] text-green-400 px-0.5 mb-1 flex items-center gap-1">
                  <Check size={10} /> Invite sent!
                </p>
              )}
              <button
                onClick={handleSendInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="w-full text-xs py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium transition-colors"
              >
                {inviting ? 'Sending…' : 'Send Invite'}
              </button>
            </div>
          )}

          <div className="px-2 flex flex-wrap gap-1.5">
            {displayedUsers.map(user => (
              <Avatar
                key={user.id}
                user={user}
                size="sm"
                highlighted={filterMemberId === user.id}
                onClick={isVerticalLead ? () => handleMemberClick(user.id) : undefined}
              />
            ))}
            {extraCount > 0 && (
              <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-gray-300 font-semibold">
                +{extraCount}
              </div>
            )}
          </div>
          {filterMemberId && (
            <p className="px-2 mt-1.5 text-[11px] text-indigo-400">
              Showing: {users.find(u => u.id === filterMemberId)?.name}
            </p>
          )}
        </section>
      </nav>

      {/* Current User */}
      {profile && (
        <div className="px-4 py-4 border-t border-white/5 flex items-center gap-2.5">
          <Avatar user={profile} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">{profile.name}</p>
            <p className="text-[10px] text-gray-500 truncate capitalize">{myRole?.toLowerCase().replace('_', ' ') ?? 'member'}</p>
          </div>
          <button onClick={() => navigate('/profile')} className="text-gray-500 hover:text-gray-300 transition-colors" title="Profile & Settings">
            <Settings size={14} />
          </button>
          <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 transition-colors" title="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      )}
    </aside>
  )
}

function NavItem({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
        active ? 'bg-indigo-600/20 text-indigo-300' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
      }`}
    >
      <span className={active ? 'text-indigo-400' : 'text-gray-500'}>{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  )
}
