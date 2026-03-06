import { supabase } from '../lib/supabase'
import type { Profile, Role } from '../types'

export async function listUsers(workspaceId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('role, user:profiles(id, name, profile_image, dob, vertical_id, created_at)')
    .eq('workspace_id', workspaceId)
    .order('role')

  if (error) throw error
  return (data ?? []).map(r => ({
    ...(r.user as unknown as Record<string, unknown>),
    role: r.role as Role,
  })) as Profile[]
}

export async function updateUserRole(userId: string, role: Role, workspaceId: string): Promise<void> {
  const { error } = await supabase
    .from('workspace_members')
    .update({ role })
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
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
