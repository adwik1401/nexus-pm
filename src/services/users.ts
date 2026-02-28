import { supabase } from '../lib/supabase'
import type { Profile, Role } from '../types'

export async function listUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name')

  if (error) throw error
  return data as Profile[]
}

export async function updateUserRole(userId: string, role: Role): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (error) throw error
}

export async function updateUserVertical(userId: string, verticalId: string | null): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ vertical_id: verticalId })
    .eq('id', userId)

  if (error) throw error
}

export async function updateOwnProfile(userId: string, updates: Partial<Pick<Profile, 'name' | 'profile_image'>>): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  if (error) throw error
}
