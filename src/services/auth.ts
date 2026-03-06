import { supabase } from '../lib/supabase'

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
