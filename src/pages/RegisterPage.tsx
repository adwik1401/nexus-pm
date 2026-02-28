import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Grid3X3, Upload, Eye, EyeOff } from 'lucide-react'
import { register, uploadAvatar } from '../services/auth'
import { listVerticals } from '../services/verticals'
import type { Vertical } from '../types'
import { supabase } from '../lib/supabase'

export default function RegisterPage() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [verticals, setVerticals] = useState<Vertical[]>([])
  const [form, setForm] = useState({
    name: '', email: '', password: '', dob: '', verticalId: '',
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    listVerticals().then(setVerticals).catch(() => {})
  }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.email.toLowerCase().endsWith('@qcin.org')) {
      setError('Only @qcin.org email addresses are allowed.')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      // 1. Register (creates auth.users + triggers profile creation)
      const { user } = await register({
        email: form.email,
        password: form.password,
        name: form.name,
        dob: form.dob,
        verticalId: form.verticalId || null,
        profileImageUrl: null,
      })

      // 2. Upload avatar if provided (requires session)
      let imageUrl: string | null = null
      if (avatarFile && user) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          imageUrl = await uploadAvatar(avatarFile, user.id)
          // Update profile with image
          await supabase.from('profiles').update({ profile_image: imageUrl }).eq('id', user.id)
        }
      }

      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Grid3X3 size={20} className="text-white" />
          </div>
          <span className="text-white font-bold text-2xl tracking-tight">Nexus</span>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Create your account</h1>
          <p className="text-sm text-gray-500 mb-6">Only <span className="font-semibold">@qcin.org</span> email addresses are accepted.</p>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Avatar upload */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-16 h-16 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50 transition-colors overflow-hidden flex-shrink-0"
              >
                {avatarPreview
                  ? <img src={avatarPreview} className="w-full h-full object-cover" alt="preview" />
                  : <Upload size={20} className="text-gray-400" />
                }
              </button>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Profile Photo</p>
                <p className="text-xs text-gray-400">Click to upload (optional)</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>

            <Field label="Full Name">
              <input type="text" required value={form.name} onChange={set('name')}
                placeholder="Jane Doe" className={inputCls} />
            </Field>

            <Field label="Email">
              <input type="email" required value={form.email} onChange={set('email')}
                placeholder="you@qcin.org" className={inputCls} />
            </Field>

            <Field label="Password">
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} required value={form.password}
                  onChange={set('password')} placeholder="Min 6 characters" className={`${inputCls} pr-10`} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </Field>

            <Field label="Date of Birth">
              <input type="date" required value={form.dob} onChange={set('dob')} className={inputCls} />
            </Field>

            <Field label="Vertical (Team)">
              <select value={form.verticalId} onChange={set('verticalId')} className={inputCls}>
                <option value="">Select a vertical…</option>
                {verticals.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors shadow-sm shadow-indigo-300 mt-2"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-semibold hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  )
}
