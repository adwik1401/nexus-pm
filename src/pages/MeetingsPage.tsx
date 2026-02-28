import { Plus, Clock, MapPin, Link2, Users, CheckCircle2, CalendarClock } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { Meeting } from '../types'
import { Avatar } from '../components/Sidebar/Sidebar'

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatTime(t: string) {
  return t.slice(0, 5)
}

function MeetingCard({ meeting, past }: { meeting: Meeting; past?: boolean }) {
  const { selectMeeting } = useApp()

  const members = meeting.member_attendees ?? []
  const stakeholders = meeting.stakeholder_attendees ?? []
  const totalAttendees = members.length + stakeholders.length

  return (
    <div
      onClick={() => selectMeeting(meeting)}
      className={`bg-white rounded-xl border cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
        past ? 'border-gray-100 opacity-70 hover:opacity-100' : 'border-gray-100 hover:border-teal-200'
      }`}
    >
      {/* Top color accent */}
      <div className={`h-1 rounded-t-xl ${past ? 'bg-gray-200' : 'bg-teal-400'}`} />

      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {past
                ? <CheckCircle2 size={14} className="text-gray-400 flex-shrink-0" />
                : <CalendarClock size={14} className="text-teal-500 flex-shrink-0" />
              }
              <h3 className="font-semibold text-gray-800 truncate">{meeting.title}</h3>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-1.5">
              {/* Date */}
              <span className="font-medium text-gray-600">{formatDate(meeting.date)}</span>

              {/* Time */}
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {formatTime(meeting.time_from)} – {formatTime(meeting.time_to)}
              </span>

              {/* Mode */}
              {meeting.mode === 'ONLINE' ? (
                <span className="flex items-center gap-1 text-teal-600">
                  <Link2 size={11} /> Online
                  {meeting.link && (
                    <a
                      href={meeting.link}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="underline hover:text-teal-700 ml-1"
                    >
                      Join
                    </a>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-orange-500">
                  <MapPin size={11} /> {meeting.location ?? 'In-person'}
                </span>
              )}

              {/* Vertical */}
              {meeting.vertical && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: meeting.vertical.color }} />
                  {meeting.vertical.name}
                </span>
              )}
            </div>
          </div>

          {/* Attendees */}
          {totalAttendees > 0 && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="flex -space-x-1.5">
                {members.slice(0, 4).map(u => (
                  <Avatar key={u.id} user={u} size="sm" />
                ))}
              </div>
              {stakeholders.length > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                  <Users size={10} /> {stakeholders.length}
                </span>
              )}
              {members.length > 4 && (
                <span className="text-xs text-gray-400">+{members.length - 4}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MeetingsPage() {
  const { meetings, openNewMeeting } = useApp()

  const todayStr = (() => {
    const t = new Date()
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  })()

  const upcoming = meetings
    .filter(m => m.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time_from.localeCompare(b.time_from))

  const past = meetings
    .filter(m => m.date < todayStr)
    .sort((a, b) => b.date.localeCompare(a.date) || b.time_from.localeCompare(a.time_from))

  return (
    <div className="flex-1 overflow-auto px-8 py-7 bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {upcoming.length} upcoming · {past.length} past
          </p>
        </div>
        <button
          onClick={() => openNewMeeting()}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <Plus size={15} /> New Meeting
        </button>
      </div>

      {/* Upcoming */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock size={15} className="text-teal-500" />
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Upcoming</h2>
          <span className="text-xs bg-teal-100 text-teal-700 font-semibold rounded-full px-2 py-0.5">{upcoming.length}</span>
        </div>
        {upcoming.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 px-6 py-10 text-center">
            <CalendarClock size={28} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No upcoming meetings scheduled</p>
            <button
              onClick={() => openNewMeeting()}
              className="mt-3 text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              Schedule one now
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(m => <MeetingCard key={m.id} meeting={m} />)}
          </div>
        )}
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={15} className="text-gray-400" />
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Past</h2>
            <span className="text-xs bg-gray-100 text-gray-500 font-semibold rounded-full px-2 py-0.5">{past.length}</span>
          </div>
          <div className="space-y-3">
            {past.map(m => <MeetingCard key={m.id} meeting={m} past />)}
          </div>
        </section>
      )}
    </div>
  )
}
