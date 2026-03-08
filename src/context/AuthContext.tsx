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
  // isAdmin here means "admin in ANY workspace" and is used only for route gating in App.tsx.
  // For workspace-specific role checks use isAdmin/isViewer/canWrite from AppContext.
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  // Initiates Google OAuth. Pass inviteToken if the user came from an invite link.
  // It will be preserved across the OAuth redirect and auto-accepted on return.
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
    ;(async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession()
        setSession(s)
        if (s?.user) {
          await fetchProfileAndMemberships(s.user.id)
        } else {
          setProfile(null)
          setMemberships([])
        }
      } catch (err) {
        console.error('[AuthContext] getSession:', err)
        setSession(null)
        setProfile(null)
        setMemberships([])
      } finally {
        setLoading(false)
      }
    })()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      // NOTE: do NOT call setLoading(true) here — onAuthStateChange fires for every auth
      // event (INITIAL_SESSION, TOKEN_REFRESHED, etc.) and would cause a full-page spinner
      // on every token refresh. Loading state is managed solely by the getSession() IIFE above.
      try {
        setSession(s)
        if (s?.user) {
          if (event === 'SIGNED_IN' && s.user.app_metadata?.provider === 'google') {
            const pendingToken = localStorage.getItem(OAUTH_INVITE_KEY)
            if (pendingToken) {
              localStorage.removeItem(OAUTH_INVITE_KEY)
              try {
                await acceptInvite(pendingToken)
              } catch (err) {
                // Non-fatal: user may already be a member, or token expired.
                console.error('[AuthContext] acceptInvite (OAuth):', err)
              }
            }
          }
          await fetchProfileAndMemberships(s.user.id)
        } else {
          setProfile(null)
          setMemberships([])
        }
      } catch (err) {
        console.error('[AuthContext] onAuthStateChange:', err)
        setSession(null)
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
