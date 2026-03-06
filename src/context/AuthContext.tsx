import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile, WorkspaceMembership } from '../types'
import { login as svcLogin, logout as svcLogout, loginWithGoogle as svcLoginWithGoogle, OAUTH_INVITE_KEY } from '../services/auth'
import { acceptInvite } from '../services/invites'

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  memberships: WorkspaceMembership[]
  loading: boolean
  // isAdmin here means "admin in ANY workspace" — used only for route gating in App.tsx
  // For workspace-specific role checks use isAdmin/isViewer/canWrite from AppContext
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  // Initiates Google OAuth. Pass inviteToken if the user came from an invite link —
  // it will be preserved across the OAuth redirect and auto-accepted on return.
  loginWithGoogle: (inviteToken?: string) => Promise<void>
  logout: () => Promise<void>
  refreshMemberships: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [memberships, setMemberships] = useState<WorkspaceMembership[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchProfileAndMemberships(userId: string) {
    const [profileRes, membershipsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('workspace_members').select('*, workspace:workspaces(*)').eq('user_id', userId),
    ])
    setProfile(profileRes.data as Profile | null)
    setMemberships((membershipsRes.data ?? []) as WorkspaceMembership[])
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (s?.user) fetchProfileAndMemberships(s.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s)
      if (s?.user) {
        // For Google OAuth sign-ins, check localStorage for a pending invite token.
        // The token is written by loginWithGoogle() before the OAuth redirect so it
        // survives the round-trip. We accept it here before fetching memberships so
        // the user's workspace is visible immediately after sign-in.
        if (event === 'SIGNED_IN' && s.user.app_metadata?.provider === 'google') {
          const pendingToken = localStorage.getItem(OAUTH_INVITE_KEY)
          if (pendingToken) {
            localStorage.removeItem(OAUTH_INVITE_KEY) // clear first — prevents double-accept on re-render
            try {
              await acceptInvite(pendingToken)
            } catch (err) {
              // Non-fatal: user may already be a member, or token expired.
              // They can still create/join a workspace manually.
              console.error('[AuthContext] acceptInvite (OAuth):', err)
            }
          }
        }
        await fetchProfileAndMemberships(s.user.id)
      } else {
        setProfile(null)
        setMemberships([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    await svcLogin(email, password)
  }

  const loginWithGoogle = async (inviteToken?: string) => {
    await svcLoginWithGoogle(inviteToken)
  }

  const logout = async () => {
    await svcLogout()
    setSession(null)
    setProfile(null)
    setMemberships([])
  }

  const refreshMemberships = async () => {
    if (session?.user) await fetchProfileAndMemberships(session.user.id)
  }

  return (
    <AuthContext.Provider value={{
      session,
      profile,
      memberships,
      loading,
      isAdmin: memberships.some(m => m.role === 'ADMIN'),
      login,
      loginWithGoogle,
      logout,
      refreshMemberships,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
