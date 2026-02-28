import { useNavigate, useLocation } from 'react-router-dom'
import {
  Grid3X3, Layers, Server, DollarSign, Code2,
  CheckSquare, LayoutGrid, ShieldCheck, LogOut, Settings, CalendarDays, Video,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import type { Profile } from '../../types'

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
  const { programs, users, activeProgramId, setActiveProgramId, filterMemberId, setFilterMemberId, viewMode, setViewMode } = useApp()
  const { profile, isAdmin, isVerticalLead, logout } = useAuth()

  const isOnPrograms = location.pathname === '/projects'
  const isOnAdmin    = location.pathname === '/admin'
  const isOnBoard    = location.pathname === '/'
  const isOnMeetings = location.pathname === '/meetings'

  const visibleUsers = (isVerticalLead && !isAdmin && profile?.vertical_id)
    ? users.filter(u => u.vertical_id === profile.vertical_id)
    : users
  const displayedUsers = visibleUsers.slice(0, 25)
  const extraCount = visibleUsers.length - 25

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
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-sm">
          <Grid3X3 size={16} className="text-white" />
        </div>
        <span className="text-white font-bold text-xl tracking-tight">Nexus</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-6 pb-4">
        {/* GENERAL */}
        <section>
          <p className="px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">General</p>
          <NavItem icon={<CheckSquare size={15} />} label="My Tasks" />
          <NavItem
            icon={<LayoutGrid size={15} />}
            label="All Programs"
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
          <p className="px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">Programs</p>
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
            {filterMemberId && (
              <button onClick={() => setFilterMemberId(null)} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold">
                Clear
              </button>
            )}
          </div>
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
            <p className="text-[10px] text-gray-500 truncate capitalize">{profile.role.toLowerCase().replace('_', ' ')}</p>
          </div>
          <button className="text-gray-500 hover:text-gray-300 transition-colors" title="Settings">
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
