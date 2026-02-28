import { supabase } from '../lib/supabase'

export async function register(opts: {
  email: string
  password: string
  name: string
  dob: string
  verticalId: string | null
  profileImageUrl: string | null
}) {
  if (!opts.email.toLowerCase().endsWith('@qcin.org')) {
    throw new Error('Only @qcin.org email addresses are allowed to register.')
  }

  const { data, error } = await supabase.auth.signUp({
    email: opts.email,
    password: opts.password,
    options: {
      data: {
        name: opts.name,
        dob: opts.dob,
        vertical_id: opts.verticalId ?? '',
        profile_image: opts.profileImageUrl ?? '',
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
  const path = `${userId}/avatar.${ext}`

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true })

  if (error) throw error

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}
