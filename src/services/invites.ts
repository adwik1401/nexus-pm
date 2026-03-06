import { supabase } from '../lib/supabase'
import type { InviteValidation, Role, WorkspaceInvite } from '../types'

export async function listInvites(workspaceId: string): Promise<WorkspaceInvite[]> {
  const { data, error } = await supabase
    .from('workspace_invites')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as WorkspaceInvite[]
}

export async function createInvite(opts: {
  workspaceId: string
  email: string
  role: Role
}): Promise<WorkspaceInvite> {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('workspace_invites')
    .insert({
      workspace_id: opts.workspaceId,
      email: opts.email.toLowerCase().trim(),
      role: opts.role,
      invited_by: user?.id ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data as WorkspaceInvite
}

export async function revokeInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from('workspace_invites')
    .delete()
    .eq('id', inviteId)
  if (error) throw error
}

// Public call — no auth required.
// Returns invite details if token is valid (unused, not expired), null otherwise.
export async function validateInviteToken(token: string): Promise<InviteValidation | null> {
  const { data, error } = await supabase
    .rpc('validate_invite_token', { p_token: token })
  if (error || !data || data.length === 0) return null
  return data[0] as InviteValidation
}
