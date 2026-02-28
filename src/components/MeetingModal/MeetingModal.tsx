import { useEffect, useState } from 'react'
import { X, Clock, MapPin, Link2, Users, Trash2, Check } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { MeetingMode } from '../../types'
import {
  createMeeting, updateMeeting, deleteMeeting,
  setMeetingMemberAttendees, setMeetingStakeholderAttendees,
} from '../../services/meetings'
import { Avatar } from '../Sidebar/Sidebar'

export default function MeetingModal() {
  const {
    selectedMeeting, selectMeeting,
    newMeetingDate,
    users, verticals, stakeholders,
    refreshMeetings,
  } = useApp()

  const isOpen = selectedMeeting !== null || newMeetingDate !== null
  const isEditing = selectedMeeting !== null

  // Form state
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [timeFrom, setTimeFrom] = useState('09:00')
  const [timeTo, setTimeTo] = useState('10:00')
  const [mode, setMode] = useState<MeetingMode>('ONLINE')
  const [link, setLink] = useState('')
  const [location, setLocation] = useState('')
  const [verticalId, setVerticalId] = useState('')
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set())
  const [stakeholderIds, setStakeholderIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  // Populate form when modal opens
  useEffect(() => {
    if (selectedMeeting) {
      setTitle(selectedMeeting.title)
      setDate(selectedMeeting.date)
      setTimeFrom(selectedMeeting.time_from.slice(0, 5))
      setTimeTo(selectedMeeting.time_to.slice(0, 5))
      setMode(selectedMeeting.mode)
      setLink(selectedMeeting.link ?? '')
      setLocation(selectedMeeting.location ?? '')
      setVerticalId(selectedMeeting.vertical_id ?? '')
      setMemberIds(new Set((selectedMeeting.member_attendees ?? []).map(u => u.id)))
      setStakeholderIds(new Set((selectedMeeting.stakeholder_attendees ?? []).map(s => s.id)))
    } else if (newMeetingDate !== null) {
      setTitle('')
      setDate(newMeetingDate)
      setTimeFrom('09:00')
      setTimeTo('10:00')
      setMode('ONLINE')
      setLink('')
      setLocation('')
      setVerticalId('')
      setMemberIds(new Set())
      setStakeholderIds(new Set())
    }
    setError('')
  }, [selectedMeeting, newMeetingDate])

  if (!isOpen) return null

  const handleClose = () => {
    // selectMeeting(null) clears both selectedMeeting and newMeetingDate in AppContext
    selectMeeting(null)
  }

  const toggleMember = (id: string) => {
    setMemberIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleStakeholder = (id: string) => {
    setStakeholderIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSave = async () => {
    if (!title.trim() || !date || !timeFrom || !timeTo) {
      setError('Title, date, and time are required.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        date,
        time_from: timeFrom,
        time_to: timeTo,
        mode,
        link: mode === 'ONLINE' ? (link.trim() || null) : null,
        location: mode === 'OFFLINE' ? (location.trim() || null) : null,
        vertical_id: verticalId || null,
      }

      let meetingId: string
      if (isEditing) {
        await updateMeeting(selectedMeeting!.id, payload)
        meetingId = selectedMeeting!.id
      } else {
        const created = await createMeeting(payload)
        meetingId = created.id
      }

      await Promise.all([
        setMeetingMemberAttendees(meetingId, [...memberIds]),
        setMeetingStakeholderAttendees(meetingId, [...stakeholderIds]),
      ])

      await refreshMeetings()
      selectMeeting(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save meeting')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedMeeting) return
    if (!confirm(`Delete meeting "${selectedMeeting.title}"?`)) return
    setDeleting(true)
    try {
      await deleteMeeting(selectedMeeting.id)
      await refreshMeetings()
      selectMeeting(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-teal-500" />
            <h2 className="text-base font-bold text-gray-900">
              {isEditing ? 'Edit Meeting' : 'New Meeting'}
            </h2>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="modal-label">Title *</label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Sprint planning"
              className={inputCls}
            />
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="modal-label">Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="modal-label">From *</label>
              <input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="modal-label">To *</label>
              <input type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Mode toggle */}
          <div>
            <label className="modal-label">Mode</label>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setMode('ONLINE')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  mode === 'ONLINE'
                    ? 'bg-teal-50 border-teal-300 text-teal-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <Link2 size={14} /> Online
              </button>
              <button
                type="button"
                onClick={() => setMode('OFFLINE')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  mode === 'OFFLINE'
                    ? 'bg-orange-50 border-orange-300 text-orange-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <MapPin size={14} /> In-person
              </button>
            </div>
          </div>

          {/* Link or Location */}
          {mode === 'ONLINE' ? (
            <div>
              <label className="modal-label">Meeting Link</label>
              <input
                type="url"
                value={link}
                onChange={e => setLink(e.target.value)}
                placeholder="https://meet.google.com/..."
                className={inputCls}
              />
            </div>
          ) : (
            <div>
              <label className="modal-label">Location</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Conference Room A"
                className={inputCls}
              />
            </div>
          )}

          {/* Vertical */}
          <div>
            <label className="modal-label">Vertical</label>
            <select value={verticalId} onChange={e => setVerticalId(e.target.value)} className={inputCls}>
              <option value="">— None —</option>
              {verticals.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* Team member attendees */}
          <div>
            <label className="modal-label flex items-center gap-1.5 mb-2">
              <Users size={13} className="text-gray-400" /> Team Members
            </label>
            <div className="border border-gray-100 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-50">
              {users.map(u => (
                <label key={u.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={memberIds.has(u.id)}
                    onChange={() => toggleMember(u.id)}
                    className="rounded accent-indigo-600"
                  />
                  <Avatar user={u} size="sm" />
                  <span className="text-sm text-gray-700 flex-1">{u.name}</span>
                  <span className="text-xs text-gray-400 capitalize">{u.role.toLowerCase().replace('_', ' ')}</span>
                </label>
              ))}
              {users.length === 0 && (
                <p className="px-3 py-4 text-sm text-gray-400 text-center">No team members</p>
              )}
            </div>
            {memberIds.size > 0 && (
              <p className="text-xs text-indigo-600 mt-1">{memberIds.size} member{memberIds.size > 1 ? 's' : ''} selected</p>
            )}
          </div>

          {/* External stakeholder attendees */}
          <div>
            <label className="modal-label flex items-center gap-1.5 mb-2">
              <Users size={13} className="text-gray-400" /> External Stakeholders
            </label>
            {stakeholders.length === 0 ? (
              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-3">
                No stakeholders yet — add them in the Admin panel.
              </p>
            ) : (
              <div className="border border-gray-100 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-50">
                {stakeholders.map(s => (
                  <label key={s.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stakeholderIds.has(s.id)}
                      onChange={() => toggleStakeholder(s.id)}
                      className="rounded accent-indigo-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{s.name}</p>
                      <p className="text-xs text-gray-400 truncate">{s.organization}</p>
                    </div>
                    {s.email && <span className="text-xs text-gray-400 truncate max-w-[120px]">{s.email}</span>}
                  </label>
                ))}
              </div>
            )}
            {stakeholderIds.size > 0 && (
              <p className="text-xs text-teal-600 mt-1">{stakeholderIds.size} stakeholder{stakeholderIds.size > 1 ? 's' : ''} selected</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div>
            {isEditing && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleClose}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Check size={14} /> {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Meeting'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-indigo-300 bg-white transition-colors'
