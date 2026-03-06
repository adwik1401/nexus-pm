import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Upload, User, Briefcase, Target } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { uploadAvatar } from '../services/auth'
import { listKRAs, listKPIs } from '../services/kras'
import type { KPI, KRA, Profile } from '../types'

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-indigo-500">{icon}</span>
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function ObjectiveCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="border border-gray-100 rounded-xl px-4 py-3">
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </div>
  )
}

export default function ProfilePage() {
  const { id: routeId } = useParams<{ id?: string }>()
  const { profile: authProfile, isAdmin } = useAuth()
  const { users, verticals, refreshUsers } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)

  const [subject, setSubject] = useState<Profile | null>(null)
  const [kras, setKras] = useState<KRA[]>([])
  const [kpis, setKpis] = useState<KPI[]>([])
  const [uploading, setUploading] = useState(false)

  // Editable own profile fields
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [savingDob, setSavingDob] = useState(false)

  const isOwnProfile = !routeId || routeId === authProfile?.id

  useEffect(() => {
    const target = routeId
      ? users.find(u => u.id === routeId) ?? null
      : authProfile ?? null
    setSubject(target)
    if (target) {
      setName(target.name)
      setDob(target.dob ?? '')
      listKRAs(target.id).then(setKras).catch(() => {})
      listKPIs(target.id).then(setKpis).catch(() => {})
    }
  }, [routeId, authProfile, users])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !subject || !isOwnProfile) return
    setUploading(true)
    try {
      const url = await uploadAvatar(file, subject.id)
      await supabase.from('profiles').update({ profile_image: url }).eq('id', subject.id)
      setSubject(prev => prev ? { ...prev, profile_image: url } : prev)
      refreshUsers()
    } finally {
      setUploading(false)
    }
  }

  const handleSaveName = async () => {
    if (!subject || !name.trim()) return
    setSavingName(true)
    try {
      await supabase.from('profiles').update({ name: name.trim() }).eq('id', subject.id)
      setSubject(prev => prev ? { ...prev, name: name.trim() } : prev)
      setEditingName(false)
      refreshUsers()
    } finally {
      setSavingName(false)
    }
  }

  const handleSaveDob = async (val: string) => {
    if (!subject) return
    setDob(val)
    setSavingDob(true)
    try {
      await supabase.from('profiles').update({ dob: val || null }).eq('id', subject.id)
      setSubject(prev => prev ? { ...prev, dob: val || null } : prev)
    } finally {
      setSavingDob(false)
    }
  }

  if (!subject) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <User size={32} className="mb-2" />
      </div>
    )
  }

  const vertical = verticals.find(v => v.id === subject.vertical_id)
  const initials = subject.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const colors = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899']
  const avatarColor = colors[subject.name.charCodeAt(0) % colors.length]

  return (
    <div className="flex-1 overflow-auto bg-gray-50 px-8 py-7">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Avatar + basic info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-start gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div
              className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center text-white text-xl font-bold"
              style={{ backgroundColor: avatarColor }}
            >
              {subject.profile_image
                ? <img src={subject.profile_image} alt={subject.name} className="w-full h-full object-cover" />
                : initials
              }
            </div>
            {isOwnProfile && (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full flex items-center justify-center shadow transition-colors"
              >
                <Upload size={12} />
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            {isOwnProfile && editingName ? (
              <div className="flex items-center gap-2 mb-1">
                <input
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                  className="text-xl font-bold text-gray-900 border-b border-indigo-400 outline-none bg-transparent flex-1"
                />
                <button onClick={handleSaveName} disabled={savingName} className="text-xs text-indigo-600 font-semibold">
                  {savingName ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setEditingName(false)} className="text-xs text-gray-400">Cancel</button>
              </div>
            ) : (
              <h1
                className={`text-xl font-bold text-gray-900 mb-1 ${isOwnProfile ? 'cursor-pointer hover:text-indigo-600' : ''}`}
                onClick={() => isOwnProfile && setEditingName(true)}
                title={isOwnProfile ? 'Click to edit name' : undefined}
              >
                {subject.name}
              </h1>
            )}

            <p className="text-sm text-gray-400 capitalize">{subject.role?.toLowerCase().replace('_', ' ')}</p>
            {vertical && (
              <span
                className="inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-md"
                style={{ backgroundColor: vertical.color + '20', color: vertical.color }}
              >
                {vertical.name}
              </span>
            )}

            {/* DOB */}
            {isOwnProfile && (
              <div className="mt-3 flex items-center gap-2">
                <label className="text-xs text-gray-400 font-medium">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={e => handleSaveDob(e.target.value)}
                  className="text-xs text-gray-600 border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
                {savingDob && <span className="text-xs text-gray-400">Saving…</span>}
              </div>
            )}
            {!isOwnProfile && subject.dob && (
              <p className="text-xs text-gray-400 mt-2">
                DOB: {new Date(subject.dob + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {/* KRAs */}
        <Section icon={<Briefcase size={16} />} title="Key Responsibility Areas">
          {kras.length === 0 ? (
            <p className="text-sm text-gray-400">{isAdmin ? 'No KRAs assigned yet. Add them from the Admin panel.' : 'No KRAs assigned yet.'}</p>
          ) : (
            <div className="space-y-2">
              {kras.map(k => <ObjectiveCard key={k.id} title={k.title} description={k.description} />)}
            </div>
          )}
        </Section>

        {/* KPIs */}
        <Section icon={<Target size={16} />} title="Key Performance Indicators">
          {kpis.length === 0 ? (
            <p className="text-sm text-gray-400">{isAdmin ? 'No KPIs assigned yet. Add them from the Admin panel.' : 'No KPIs assigned yet.'}</p>
          ) : (
            <div className="space-y-2">
              {kpis.map(k => <ObjectiveCard key={k.id} title={k.title} description={k.description} />)}
            </div>
          )}
        </Section>

      </div>
    </div>
  )
}
