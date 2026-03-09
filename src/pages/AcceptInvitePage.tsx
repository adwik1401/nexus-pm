import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Grid3X3, Building2, ShieldCheck, Users, Eye } from 'lucide-react'
import { validateInviteToken, acceptInvite } from '../services/invites'
import { useAuth } from '../context/AuthContext'
import type { InviteValidation } from '../types'

const ROLE_LABELS: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  ADMIN:         { label: 'Admin',         color: 'bg-red-100 text-red-700',    Icon: ShieldCheck },
  VERTICAL_LEAD: { label: 'Vertical Lead', color: 'bg-amber-100 text-amber-700', Icon: ShieldCheck },
  MEMBER:        { label: 'Member',        color: 'bg-indigo-100 text-indigo-700', Icon: Users },
  VIEWER:        { label: 'Viewer',        color: 'bg-gray-100 text-gray-600',   Icon: Eye },
}

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { session, refreshMemberships } = useAuth()

  const [invite, setInvite] = useState<InviteValidation | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) { setError('Missing invite token.'); setLoading(false); return }
    validateInviteToken(token)
      .then(async data => {
        if (!data) { setError('This invite link is invalid or has already been used.'); return }
        // If user is already logged in, auto-accept and redirect immediately
        if (session) {
          try {
            await acceptInvite(token)
            await refreshMemberships()
          } catch {
            // Non-fatal — may already be a member
          }
          navigate('/', { replace: true })
          return
        }
        setInvite(data)
      })
      .catch(() => setError('Failed to validate invite. Please try again.'))
      .finally(() => setLoading(false))
  }, [token, session]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
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
          {error ? (
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Invite not found</h1>
              <p className="text-sm text-gray-500 mb-6">{error}</p>
              <Link
                to="/register"
                className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
              >
                Create a new workspace
              </Link>
            </div>
          ) : invite ? (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Building2 size={28} className="text-indigo-500" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">You've been invited!</h1>
                <p className="text-sm text-gray-500 mt-1">to join</p>
                <p className="text-lg font-semibold text-gray-800 mt-0.5">{invite.workspace_name}</p>
              </div>

              {/* Role badge */}
              {(() => {
                const roleInfo = ROLE_LABELS[invite.role] ?? { label: invite.role, color: 'bg-gray-100 text-gray-600', Icon: Users }
                const RoleIcon = roleInfo.Icon
                return (
                  <div className="flex justify-center mb-6">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${roleInfo.color}`}>
                      <RoleIcon size={14} />
                      {roleInfo.label}
                    </span>
                  </div>
                )
              })()}

              <p className="text-xs text-center text-gray-400 mb-1">New to Planzo? Create an account. Already have one? Sign in.</p>
              <div className="space-y-3">
                <button
                  onClick={() => navigate(`/register?token=${token}`)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                  Create account — I'm new
                </button>
                <button
                  onClick={() => navigate(`/login?redirect=/invite/${token}`)}
                  className="w-full border border-gray-200 hover:border-indigo-300 text-gray-700 font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                  Sign in — I already have an account
                </button>
              </div>

              <p className="text-center text-xs text-gray-400 mt-4">
                Invite expires {new Date(invite.expires_at).toLocaleDateString()}
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
