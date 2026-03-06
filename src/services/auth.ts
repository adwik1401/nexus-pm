import { supabase } from '../lib/supabase'

// localStorage key used to carry an invite token across the Google OAuth redirect.
// Written before the redirect; read + cleared in AuthContext after sign-in.
export const OAUTH_INVITE_KEY = 'nexus_oauth_invite_token'

export async function register(opts: {
  email: string
  password: string
  name: string
  dob: string
  profileImageUrl: string | null
  // Flow A — new workspace:
  workspaceName?: string
  // Flow B — joining via invite:
  workspaceId?: string
  inviteToken?: string
  role?: string
}) {
  const { data, error } = await supabase.auth.signUp({
    email: opts.email,
    password: opts.password,
    options: {
      data: {
        name: opts.name,
        dob: opts.dob,
        profile_image: opts.profileImageUrl ?? '',
        workspace_name: opts.workspaceName ?? '',
        workspace_id: opts.workspaceId ?? '',
        role: opts.role ?? '',
        invite_token: opts.inviteToken ?? '',
      },
    },
  })

  if (error) throw error
  return data
}

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

// Initiates Google OAuth sign-in via Supabase.
// If the user arrived from an invite link, pass the invite token so it
// survives the OAuth redirect (stored in localStorage, accepted in AuthContext).
export async function loginWithGoogle(inviteToken?: string): Promise<void> {
  if (inviteToken) {
    localStorage.setItem(OAUTH_INVITE_KEY, inviteToken)
  }
  const appUrl = import.meta.env.VITE_APP_URL ?? window.location.origin
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Supabase will append the session tokens and redirect here after auth
      redirectTo: `${appUrl}/`,
    },
  })
  if (error) throw error
}

export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function uploadAvatar(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop()
  const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext.toLowerCase())) {
    throw new Error('Only jpg, jpeg, png, gif, and webp files are allowed.')
  }
  const path = `${userId}/avatar.${ext}`

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true })

  if (error) throw error

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}
