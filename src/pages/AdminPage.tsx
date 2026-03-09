import { useEffect, useState } from 'react'
import { Plus, Trash2, Check, X, Pencil, ChevronDown, ChevronRight, Copy, Clock, Mail } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { ExternalStakeholder, IconType, KPI, KRA, Profile, Role, WorkspaceInvite } from '../types'
import {
  createVertical, updateVertical, deleteVertical, setVerticalLead,
} from '../services/verticals'
import { updateUserRole, updateUserVertical } from '../services/users'
import {
  createProgram, updateProgram,
  addMemberToProgram, removeMemberFromProgram, deleteProgram,
} from '../services/projects'
import {
  createStakeholder, updateStakeholder, deleteStakeholder,
} from '../services/stakeholders'
import {
  listKRAs, createKRA, updateKRA, deleteKRA,
  listKPIs, createKPI, updateKPI, deleteKPI,
} from '../services/kras'
import { listInvites, createInvite, revokeInvite } from '../services/invites'
import { Avatar } from '../components/Sidebar/Sidebar'
import { Layers, Server, DollarSign, Code2 } from 'lucide-react'

type Tab = 'verticals' | 'users' | 'programs' | 'stakeholders' | 'invites'

const ICON_OPTIONS: { value: IconType; label: string; Icon: React.ElementType }[] = [
  { value: 'layers', label: 'Layers',  Icon: Layers },
  { value: 'server', label: 'Server',  Icon: Server },
  { value: 'dollar', label: 'Dollar',  Icon: DollarSign },
  { value: 'code',   label: 'Code',    Icon: Code2 },
]

// ── Verticals tab ────────────────────────────────────────────────────────────
function VerticalsTab() {
  const { verticals, users, refreshVerticals, refreshUsers, activeWorkspaceId } = useApp()
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6366f1')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!newName.trim() || !activeWorkspaceId) return
    setLoading(true)
    try {
      await createVertical(newName.trim(), newColor, activeWorkspaceId)
      setNewName(''); setNewColor('#6366f1')
      await refreshVerticals()
    } finally { setLoading(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this vertical?')) return
    await deleteVertical(id)
    await refreshVerticals()
    await refreshUsers()
  }

  const handleSaveEdit = async (id: string) => {
    await updateVertical(id, { name: editName })
    setEditId(null)
    await refreshVerticals()
  }

  const handleSetLead = async (verticalId: string, userId: string) => {
    await setVerticalLead(verticalId, userId || null)
    await refreshVerticals()
    if (userId && activeWorkspaceId) await updateUserRole(userId, 'VERTICAL_LEAD', activeWorkspaceId)
    await refreshUsers()
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Create Vertical</h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="admin-label">Name</label>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Design" className={inputCls} onKeyDown={e => e.key === 'Enter' && handleCreate()} />
          </div>
          <div>
            <label className="admin-label">Color</label>
            <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
              className="h-9 w-14 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
          </div>
          <button onClick={handleCreate} disabled={loading || !newName.trim()} className={btnPrimary}>
            <Plus size={15} /> Add
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Vertical</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Lead</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Members</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {verticals.map(v => {
              const vertMembers = users.filter(u => u.vertical_id === v.id)
              return (
                <tr key={v.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: v.color }} />
                      {editId === v.id
                        ? (
                          <div className="flex gap-2 items-center">
                            <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                              className="border border-gray-200 rounded px-2 py-1 text-sm w-32" />
                            <button onClick={() => handleSaveEdit(v.id)} className="text-green-500"><Check size={14} /></button>
                            <button onClick={() => setEditId(null)} className="text-gray-400"><X size={14} /></button>
                          </div>
                        )
                        : (
                          <button onDoubleClick={() => { setEditId(v.id); setEditName(v.name) }}
                            className="font-medium text-gray-800 hover:text-indigo-600 transition-colors">
                            {v.name}
                          </button>
                        )
                      }
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={v.lead_id ?? ''}
                      onChange={e => handleSetLead(v.id, e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 outline-none focus:border-indigo-300 bg-white"
                    >
                      <option value="">— No lead —</option>
                      {vertMembers.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <div className="flex -space-x-1.5">
                        {vertMembers.slice(0, 4).map(u => <Avatar key={u.id} user={u} size="sm" />)}
                      </div>
                      <span className="text-xs text-gray-400 ml-1">{vertMembers.length}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => handleDelete(v.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Objective sub-list (KRAs or KPIs) ─────────────────────────────────────────
function ObjectiveList({ userId, type }: { userId: string; type: 'kra' | 'kpi' }) {
  const { activeWorkspaceId } = useApp()
  const [items, setItems] = useState<KRA[] | KPI[]>([])
  const [loaded, setLoaded] = useState(false)
  const [addTitle, setAddTitle] = useState('')
  const [addDesc, setAddDesc] = useState('')
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')

  const load = async () => {
    const data = type === 'kra' ? await listKRAs(userId) : await listKPIs(userId)
    setItems(data as KRA[] | KPI[])
    setLoaded(true)
  }

  useEffect(() => { load() }, [userId, type]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!loaded) return <p className="text-xs text-gray-400 py-1">Loading…</p>

  const handleAdd = async () => {
    if (!addTitle.trim() || !activeWorkspaceId) return
    const item = type === 'kra'
      ? await createKRA(userId, addTitle.trim(), addDesc.trim(), activeWorkspaceId)
      : await createKPI(userId, addTitle.trim(), addDesc.trim(), activeWorkspaceId)
    setItems(prev => [...prev, item] as KRA[] | KPI[])
    setAddTitle(''); setAddDesc(''); setAdding(false)
  }

  const handleUpdate = async (id: string) => {
    const fn = type === 'kra' ? updateKRA : updateKPI
    await fn(id, { title: editTitle.trim(), description: editDesc.trim() })
    setItems(prev => prev.map(i => i.id === id ? { ...i, title: editTitle.trim(), description: editDesc.trim() } : i) as KRA[] | KPI[])
    setEditId(null)
  }

  const handleDelete = async (id: string) => {
    const fn = type === 'kra' ? deleteKRA : deleteKPI
    await fn(id)
    setItems(prev => prev.filter(i => i.id !== id) as KRA[] | KPI[])
  }

  const label = type === 'kra' ? 'KRA' : 'KPI'

  return (
    <div>
      <div className="space-y-2 mb-2">
        {items.map(item => (
          editId === item.id ? (
            <div key={item.id} className="border border-indigo-200 rounded-lg p-2 space-y-1.5">
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="w-full border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-300"
                placeholder="Title"
              />
              <textarea
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                rows={2}
                className="w-full border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-300 resize-none"
                placeholder="Description"
              />
              <div className="flex gap-1.5">
                <button onClick={() => handleUpdate(item.id)} className="text-xs text-white bg-indigo-500 hover:bg-indigo-600 px-2 py-0.5 rounded flex items-center gap-1"><Check size={10} />Save</button>
                <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-0.5 rounded border border-gray-200">Cancel</button>
              </div>
            </div>
          ) : (
            <div key={item.id} className="flex items-start gap-2 border border-gray-100 rounded-lg px-3 py-2 group">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{item.title}</p>
                {item.description && <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button onClick={() => { setEditId(item.id); setEditTitle(item.title); setEditDesc(item.description) }}
                  className="text-gray-400 hover:text-indigo-500 transition-colors"><Pencil size={12} /></button>
                <button onClick={() => handleDelete(item.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
              </div>
            </div>
          )
        ))}
      </div>

      {adding ? (
        <div className="border border-indigo-200 rounded-lg p-2 space-y-1.5">
          <input
            autoFocus
            value={addTitle}
            onChange={e => setAddTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="w-full border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-300"
            placeholder={`${label} title`}
          />
          <textarea
            value={addDesc}
            onChange={e => setAddDesc(e.target.value)}
            rows={2}
            className="w-full border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-300 resize-none"
            placeholder="Description (optional)"
          />
          <div className="flex gap-1.5">
            <button onClick={handleAdd} className="text-xs text-white bg-indigo-500 hover:bg-indigo-600 px-2 py-0.5 rounded flex items-center gap-1"><Check size={10} />Add</button>
            <button onClick={() => { setAdding(false); setAddTitle(''); setAddDesc('') }} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-0.5 rounded border border-gray-200">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          <Plus size={11} /> Add {label}
        </button>
      )}
    </div>
  )
}

// ── Users tab ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const { users, verticals, refreshUsers, activeWorkspaceId } = useApp()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleRoleChange = async (userId: string, role: Role) => {
    if (!activeWorkspaceId) return
    await updateUserRole(userId, role, activeWorkspaceId)
    await refreshUsers()
  }

  const handleVerticalChange = async (userId: string, verticalId: string) => {
    await updateUserVertical(userId, verticalId || null)
    await refreshUsers()
  }

  return (
    <div className="space-y-3">
      {users.map(u => (
        <div key={u.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {/* User row */}
          <div className="flex items-center gap-3 px-5 py-3">
            <button
              onClick={() => setExpandedId(expandedId === u.id ? null : u.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              {expandedId === u.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <Avatar user={u} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 text-sm">{u.name}</p>
              <p className="text-xs text-gray-400 capitalize">{(u.role ?? 'member').toLowerCase().replace('_', ' ')}</p>
            </div>
            <select
              value={u.role ?? 'MEMBER'}
              onChange={e => handleRoleChange(u.id, e.target.value as Role)}
              className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 outline-none focus:border-indigo-300 bg-white"
            >
              <option value="VIEWER">Viewer</option>
              <option value="MEMBER">Member</option>
              <option value="VERTICAL_LEAD">Vertical Lead</option>
              <option value="ADMIN">Admin</option>
            </select>
            <select
              value={u.vertical_id ?? ''}
              onChange={e => handleVerticalChange(u.id, e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 outline-none focus:border-indigo-300 bg-white"
            >
              <option value="">— No Vertical —</option>
              {verticals.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* Expanded KRA/KPI panel */}
          {expandedId === u.id && (
            <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/60 grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Key Responsibility Areas</p>
                <ObjectiveList key={`kra-${u.id}`} userId={u.id} type="kra" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Key Performance Indicators</p>
                <ObjectiveList key={`kpi-${u.id}`} userId={u.id} type="kpi" />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Programs tab ──────────────────────────────────────────────────────────────
function ProgramsTab() {
  const { programs, users, verticals, refreshPrograms, activeWorkspaceId } = useApp()
  const [name, setName] = useState('')
  const [iconType, setIconType] = useState<IconType>('layers')
  const [deadline, setDeadline] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [creating, setCreating] = useState(false)

  const [addProgramId, setAddProgramId] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [selectedVerticalIds, setSelectedVerticalIds] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const [userSearch, setUserSearch] = useState('')

  // Inline edit state per-program
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDeadline, setEditDeadline] = useState('')
  const [editColor, setEditColor] = useState('#6366f1')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!name.trim() || !activeWorkspaceId) return
    setCreating(true)
    try {
      await createProgram(name.trim(), iconType, deadline || null, activeWorkspaceId, color)
      setName(''); setDeadline(''); setColor('#6366f1')
      await refreshPrograms()
    } finally { setCreating(false) }
  }

  const handleDelete = async (programId: string, programName: string) => {
    if (!confirm(`Delete project "${programName}"? This will also delete all its tasks.`)) return
    await deleteProgram(programId)
    await refreshPrograms()
  }

  const startEdit = (id: string, currentName: string, currentDeadline: string | null, currentColor: string) => {
    setEditId(id)
    setEditName(currentName)
    setEditDeadline(currentDeadline ?? '')
    setEditColor(currentColor)
  }

  const handleSaveEdit = async () => {
    if (!editId || !editName.trim()) return
    setSaving(true)
    try {
      await updateProgram(editId, { name: editName.trim(), deadline: editDeadline || null, color: editColor })
      setEditId(null)
      await refreshPrograms()
    } finally { setSaving(false) }
  }

  const handleCancelEdit = () => setEditId(null)

  const toggleUser = (id: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleVertical = (id: string) => {
    setSelectedVerticalIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const userIdsToAdd = new Set([
    ...selectedUserIds,
    ...users.filter(u => u.vertical_id && selectedVerticalIds.has(u.vertical_id)).map(u => u.id),
  ])

  const handleAddMembers = async () => {
    if (!addProgramId || userIdsToAdd.size === 0) return
    setAdding(true)
    try {
      await Promise.all([...userIdsToAdd].map(uid => addMemberToProgram(addProgramId, uid)))
      await refreshPrograms()
      setSelectedUserIds(new Set())
      setSelectedVerticalIds(new Set())
      setUserSearch('')
    } finally { setAdding(false) }
  }

  const handleRemoveMember = async (programId: string, userId: string) => {
    await removeMemberFromProgram(programId, userId)
    await refreshPrograms()
  }

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()))

  return (
    <div className="space-y-6">
      {/* Create program */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Create Project</h3>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-40">
            <label className="admin-label">Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Project name" className={inputCls} onKeyDown={e => e.key === 'Enter' && handleCreate()} />
          </div>
          <div>
            <label className="admin-label">Icon</label>
            <select value={iconType} onChange={e => setIconType(e.target.value as IconType)}
              className={`${inputCls} w-32`}>
              {ICON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="admin-label">Color</label>
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              className="h-9 w-14 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
          </div>
          <div>
            <label className="admin-label">Deadline</label>
            <input
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className={`${inputCls} w-40`}
            />
          </div>
          <button onClick={handleCreate} disabled={creating || !name.trim()} className={btnPrimary}>
            <Plus size={15} /> Create
          </button>
        </div>
      </div>

      {/* Add members panel */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Add Members to Project</h3>

        <div className="mb-4">
          <label className="admin-label">Project</label>
          <select value={addProgramId} onChange={e => setAddProgramId(e.target.value)} className={inputCls}>
            <option value="">Select project…</option>
            {programs.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="admin-label mb-1.5 block">Individual Members</label>
            <input
              type="text"
              placeholder="Search members…"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className={`${inputCls} mb-2`}
            />
            <div className="border border-gray-100 rounded-lg max-h-52 overflow-y-auto divide-y divide-gray-50">
              {filteredUsers.map(u => (
                <label key={u.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.has(u.id)}
                    onChange={() => toggleUser(u.id)}
                    className="rounded accent-indigo-600"
                  />
                  <Avatar user={u} size="sm" />
                  <span className="text-sm text-gray-700 truncate">{u.name}</span>
                </label>
              ))}
              {filteredUsers.length === 0 && (
                <p className="px-3 py-4 text-sm text-gray-400 text-center">No members found</p>
              )}
            </div>
          </div>

          <div>
            <label className="admin-label mb-1.5 block">By Vertical <span className="text-gray-400 font-normal normal-case">(adds all members)</span></label>
            <div className="border border-gray-100 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-50">
              {verticals.map(v => {
                const count = users.filter(u => u.vertical_id === v.id).length
                return (
                  <label key={v.id} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedVerticalIds.has(v.id)}
                      onChange={() => toggleVertical(v.id)}
                      className="rounded accent-indigo-600"
                    />
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: v.color }} />
                    <span className="text-sm text-gray-700 flex-1">{v.name}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{count}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
          <p className="text-sm text-gray-500">
            {userIdsToAdd.size > 0
              ? <><span className="font-semibold text-indigo-600">{userIdsToAdd.size}</span> member{userIdsToAdd.size > 1 ? 's' : ''} selected</>
              : 'Select members or verticals above'}
          </p>
          <button
            onClick={handleAddMembers}
            disabled={!addProgramId || userIdsToAdd.size === 0 || adding}
            className={btnPrimary}
          >
            {adding ? 'Adding…' : `Add ${userIdsToAdd.size > 0 ? userIdsToAdd.size : ''} Member${userIdsToAdd.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      {/* Programs list */}
      <div className="space-y-4">
        {programs.map(m => {
          const members = m.members ?? []
          const deadlineStr = m.deadline
            ? new Date(m.deadline + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : null
          const isEditing = editId === m.id

          return (
            <div key={m.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {/* Color bar at top */}
              <div className="h-1" style={{ backgroundColor: m.color }} />
              <div className="p-5">
                {isEditing ? (
                  /* Edit mode */
                  <div className="mb-4 space-y-3">
                    <div className="flex gap-3 items-end flex-wrap">
                      <div className="flex-1 min-w-32">
                        <label className="admin-label">Name</label>
                        <input
                          autoFocus
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="admin-label">Color</label>
                        <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)}
                          className="h-9 w-14 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                      </div>
                      <div>
                        <label className="admin-label">Deadline</label>
                        <input
                          type="date"
                          value={editDeadline}
                          onChange={e => setEditDeadline(e.target.value)}
                          className={`${inputCls} w-40`}
                        />
                      </div>
                      <button
                        onClick={handleSaveEdit}
                        disabled={saving || !editName.trim()}
                        className={btnPrimary}
                      >
                        <Check size={14} /> {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors h-9"
                      >
                        <X size={14} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                      <div>
                        <h4 className="font-semibold text-gray-800">{m.name}</h4>
                        {deadlineStr && (
                          <p className="text-xs text-gray-400 mt-0.5">Deadline: {deadlineStr}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(m.id, m.name, m.deadline, m.color)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-500 transition-colors"
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(m.id, m.name)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mt-3">
                  {members.map((mem: Profile) => (
                    <div key={mem.id} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5">
                      <Avatar user={mem} size="sm" />
                      <span className="text-xs text-gray-700">{mem.name}</span>
                      <button onClick={() => handleRemoveMember(m.id, mem.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors ml-0.5">
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                  {members.length === 0 && <p className="text-sm text-gray-400">No members yet</p>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Stakeholders tab ──────────────────────────────────────────────────────────
function StakeholdersTab() {
  const { stakeholders, refreshStakeholders, activeWorkspaceId } = useApp()

  // New form state
  const [newOrg, setNewOrg] = useState('')
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newContact, setNewContact] = useState('')
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Inline edit state
  const [editId, setEditId] = useState<string | null>(null)
  const [editOrg, setEditOrg] = useState('')
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editContact, setEditContact] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!newOrg.trim() || !newName.trim() || !activeWorkspaceId) return
    setCreating(true)
    try {
      await createStakeholder({
        organization: newOrg.trim(),
        name: newName.trim(),
        email: newEmail.trim() || null,
        contact_no: newContact.trim() || null,
        workspaceId: activeWorkspaceId,
      })
      setNewOrg(''); setNewName(''); setNewEmail(''); setNewContact('')
      setShowForm(false)
      await refreshStakeholders()
    } finally { setCreating(false) }
  }

  const startEdit = (s: ExternalStakeholder) => {
    setEditId(s.id)
    setEditOrg(s.organization)
    setEditName(s.name)
    setEditEmail(s.email ?? '')
    setEditContact(s.contact_no ?? '')
  }

  const handleSaveEdit = async () => {
    if (!editId || !editOrg.trim() || !editName.trim()) return
    setSaving(true)
    try {
      await updateStakeholder(editId, {
        organization: editOrg.trim(),
        name: editName.trim(),
        email: editEmail.trim() || null,
        contact_no: editContact.trim() || null,
      })
      setEditId(null)
      await refreshStakeholders()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete stakeholder "${name}"?`)) return
    await deleteStakeholder(id)
    await refreshStakeholders()
  }

  return (
    <div className="space-y-6">
      {/* Header + add button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-700">External Stakeholders</h3>
          <p className="text-xs text-gray-400 mt-0.5">Contacts outside your team — no account required</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className={btnPrimary}>
          <Plus size={15} /> Add Stakeholder
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-3">New Stakeholder</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Organization *</label>
              <input type="text" value={newOrg} onChange={e => setNewOrg(e.target.value)}
                placeholder="e.g. Acme Corp" className={inputCls} />
            </div>
            <div>
              <label className="admin-label">Person Name *</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Jane Smith" className={inputCls} />
            </div>
            <div>
              <label className="admin-label">Email</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                placeholder="jane@acme.com" className={inputCls} />
            </div>
            <div>
              <label className="admin-label">Contact No.</label>
              <input type="text" value={newContact} onChange={e => setNewContact(e.target.value)}
                placeholder="+1 555 000 0000" className={inputCls} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleCreate} disabled={creating || !newOrg.trim() || !newName.trim()} className={btnPrimary}>
              <Check size={14} /> {creating ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:text-gray-700 transition-colors h-9">
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {stakeholders.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">No stakeholders yet. Add one above.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Organization</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Person</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stakeholders.map(s => (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                  {editId === s.id ? (
                    <>
                      <td className="px-5 py-2">
                        <input autoFocus value={editOrg} onChange={e => setEditOrg(e.target.value)}
                          className="border border-gray-200 rounded px-2 py-1 text-sm w-full" />
                      </td>
                      <td className="px-5 py-2">
                        <input value={editName} onChange={e => setEditName(e.target.value)}
                          className="border border-gray-200 rounded px-2 py-1 text-sm w-full" />
                      </td>
                      <td className="px-5 py-2">
                        <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                          className="border border-gray-200 rounded px-2 py-1 text-sm w-full" />
                      </td>
                      <td className="px-5 py-2">
                        <input value={editContact} onChange={e => setEditContact(e.target.value)}
                          className="border border-gray-200 rounded px-2 py-1 text-sm w-full" />
                      </td>
                      <td className="px-5 py-2">
                        <div className="flex gap-2">
                          <button onClick={handleSaveEdit} disabled={saving} className="text-green-500 hover:text-green-600">
                            <Check size={14} />
                          </button>
                          <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600">
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-3 font-medium text-gray-800">{s.organization}</td>
                      <td className="px-5 py-3 text-gray-700">{s.name}</td>
                      <td className="px-5 py-3 text-gray-500">{s.email ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-500">{s.contact_no ?? '—'}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2.5">
                          <button onClick={() => startEdit(s)} className="text-gray-300 hover:text-indigo-500 transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(s.id, s.name)} className="text-gray-300 hover:text-red-400 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Invites tab ───────────────────────────────────────────────────────────────
function InvitesTab() {
  const { activeWorkspaceId } = useApp()
  const [invites, setInvites] = useState<WorkspaceInvite[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('MEMBER')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [sentEmail, setSentEmail] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const appUrl = import.meta.env.VITE_APP_URL ?? window.location.origin

  const load = async () => {
    if (!activeWorkspaceId) return
    setLoading(true)
    try { setInvites(await listInvites(activeWorkspaceId)) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [activeWorkspaceId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async () => {
    if (!email.trim() || !activeWorkspaceId || sending) return
    setSending(true)
    setSentEmail(null)
    try {
      await createInvite({ workspaceId: activeWorkspaceId, email: email.trim(), role })
      setSentEmail(email.trim())
      setEmail('')
      await load()
    } catch (err) {
      console.error('[InvitesTab] send:', err)
    } finally { setSending(false) }
  }

  const handleRevoke = async (inviteId: string) => {
    if (!confirm('Revoke this invite?')) return
    await revokeInvite(inviteId)
    await load()
  }

  const copyLink = async (token: string, inviteId: string) => {
    const link = `${appUrl}/invite/${token}`
    navigator.clipboard.writeText(link).catch(() => {})
    setCopiedId(inviteId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getStatus = (invite: WorkspaceInvite): { label: string; color: string } => {
    if (invite.used_at) return { label: 'Used', color: 'bg-gray-100 text-gray-500' }
    if (new Date(invite.expires_at) < new Date()) return { label: 'Expired', color: 'bg-red-100 text-red-600' }
    return { label: 'Pending', color: 'bg-green-100 text-green-700' }
  }

  return (
    <div className="space-y-6">
      {/* Send invite form */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Invite a Team Member</h3>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-52">
            <label className="admin-label">Email Address</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="colleague@example.com"
                className={`${inputCls} pl-9`}
              />
            </div>
          </div>
          <div className="w-40">
            <label className="admin-label">Role</label>
            <select value={role} onChange={e => setRole(e.target.value as Role)} className={inputCls}>
              <option value="VIEWER">Viewer</option>
              <option value="MEMBER">Member</option>
              <option value="VERTICAL_LEAD">Vertical Lead</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <button
            onClick={handleSend}
            disabled={sending || !email.trim()}
            className={btnPrimary}
          >
            <Plus size={15} /> {sending ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
        {sentEmail
          ? <p className="text-xs text-green-600 mt-2">Invite sent to {sentEmail}!</p>
          : <p className="text-xs text-gray-400 mt-2">An invite email will be sent directly to the recipient.</p>
        }
      </div>

      {/* Invites table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">Loading…</p>
        ) : invites.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">No invites sent yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Expires</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invites.map(inv => {
                const status = getStatus(inv)
                const isPending = !inv.used_at && new Date(inv.expires_at) >= new Date()
                return (
                  <tr key={inv.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-gray-800 font-medium">{inv.email}</td>
                    <td className="px-5 py-3 capitalize text-gray-600">{inv.role.toLowerCase().replace('_', ' ')}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        <Clock size={10} />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {new Date(inv.expires_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {isPending && (
                          <button
                            onClick={() => copyLink(inv.token, inv.id)}
                            className="text-gray-400 hover:text-indigo-500 transition-colors"
                            title="Copy invite link"
                          >
                            {copiedId === inv.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                          </button>
                        )}
                        {isPending && (
                          <button
                            onClick={() => handleRevoke(inv.id)}
                            className="text-gray-300 hover:text-red-400 transition-colors"
                            title="Revoke invite"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Admin Page ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('verticals')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'verticals',    label: 'Verticals' },
    { id: 'users',        label: 'Users' },
    { id: 'programs',     label: 'Projects' },
    { id: 'stakeholders', label: 'Stakeholders' },
    { id: 'invites',      label: 'Invites' },
  ]

  return (
    <div className="flex-1 overflow-auto px-8 py-7 bg-gray-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage verticals, team members, projects, stakeholders, and invites</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'verticals'    && <VerticalsTab />}
      {activeTab === 'users'        && <UsersTab />}
      {activeTab === 'programs'     && <ProgramsTab />}
      {activeTab === 'stakeholders' && <StakeholdersTab />}
      {activeTab === 'invites'      && <InvitesTab />}
    </div>
  )
}

// Shared styles
const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-indigo-300 bg-white transition-colors'
const btnPrimary = 'flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0 h-9'
