import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Grid3X3, Upload, Eye, EyeOff, Building2 } from 'lucide-react'
import { register, uploadAvatar, loginWithGoogle } from '../services/auth'
import { validateInviteToken } from '../services/invites'
import type { InviteValidation } from '../types'
import { supabase } from '../lib/supabase'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fileRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<'new-workspace' | 'invite'>('new-workspace')
  const [inviteData, setInviteData] = useState<InviteValidation | null>(null)
  const [inviteError, setInviteError] = useState('')

  const [form, setForm] = useState({
    name: '', email: '', password: '', dob: '', workspaceName: '',
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentEmail, setSentEmail] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)

  // Check for invite token in URL
  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) return
    setLoading(true)
    validateInviteToken(token)
      .then(data => {
        if (data) {
          setInviteData(data)
          setMode('invite')
          setForm(prev => ({ ...prev, email: data.email }))
        } else {
          setInviteError('This invite link is invalid or has expired.')
        }
      })
      .catch(() => setInviteError('Failed to validate invite link.'))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (mode === 'new-workspace' && !form.workspaceName.trim()) {
      setError('Please enter a workspace name.')
      return
    }

    setLoading(true)
    try {
      const token = searchParams.get('token') ?? undefined
      const { user, session } = await register({
        email: form.email,
        password: form.password,
        name: form.name,
        dob: form.dob,
        profileImageUrl: null,
        ...(mode === 'new-workspace'
          ? { workspaceName: form.workspaceName.trim() }
          : { workspaceId: inviteData!.workspace_id, inviteToken: token, role: inviteData!.role }
        ),
      })

      if (avatarFile && user && session) {
        const imageUrl = await uploadAvatar(avatarFile, user.id)
        await supabase.from('profiles').update({ profile_image: imageUrl }).eq('id', user.id)
      }

      setSentEmail(form.email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleRegister = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      // In invite mode, pass the token so it's accepted automatically after OAuth.
      const token = searchParams.get('token') ?? undefined
      await loginWithGoogle(token)
      // Browser will redirect to Google; no navigate() call needed
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
      setGoogleLoading(false)
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
          <span className="text-white font-bold text-2xl tracking-tight">Planzo</span>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">✉️</div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Check your inbox</h1>
              <p className="text-sm text-gray-500 mb-1">A verification link has been sent to</p>
              <p className="text-sm font-semibold text-indigo-600 mb-6">{sentEmail}</p>
              <p className="text-sm text-gray-400 mb-8">
                Click the link in your email to activate your account, then sign in.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="text-sm text-indigo-600 font-semibold hover:underline"
              >
                ← Back to login
              </button>
            </div>
          ) : inviteError ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">⚠️</div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid invite</h1>
              <p className="text-sm text-gray-500 mb-6">{inviteError}</p>
              <Link to="/register" className="text-sm text-indigo-600 font-semibold hover:underline">
                Create a new workspace instead →
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1">
                {mode === 'invite' ? `Join ${inviteData?.workspace_name}` : 'Create your account'}
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                {mode === 'invite'
                  ? <span>You've been invited as <span className="font-semibold text-indigo-600">{inviteData?.role}</span></span>
                  : 'Start with a new workspace — invite your team later'}
              </p>

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
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={set('email')}
                    placeholder="you@example.com"
                    className={inputCls}
                    readOnly={mode === 'invite'}
                  />
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

                {mode === 'new-workspace' && (
                  <Field label="Workspace Name">
                    <div className="relative">
                      <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={form.workspaceName}
                        onChange={set('workspaceName')}
                        placeholder="e.g. Acme Corp, My Team…"
                        className={`${inputCls} pl-9`}
                      />
                    </div>
                  </Field>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors shadow-sm shadow-indigo-300 mt-2"
                >
                  {loading ? 'Creating account…' : 'Create Account'}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Google OAuth */}
              <button
                type="button"
                onClick={handleGoogleRegister}
                disabled={googleLoading || loading}
                className="w-full flex items-center justify-center gap-3 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 font-semibold py-2.5 rounded-lg text-sm transition-colors"
              >
                <GoogleIcon />
                {googleLoading ? 'Redirecting…' : 'Continue with Google'}
              </button>

              <p className="text-center text-sm text-gray-500 mt-5">
                Already have an account?{' '}
                <Link to="/login" className="text-indigo-600 font-semibold hover:underline">Sign In</Link>
              </p>
            </>
          )}
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

// Inline Google "G" logo — avoids any external asset dependency
function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}
