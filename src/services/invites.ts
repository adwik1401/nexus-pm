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
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out — please try again')), 20000)
  )
  const invoke = supabase.functions.invoke('send-invite', {
    body: {
      workspaceId: opts.workspaceId,
      email: opts.email.toLowerCase().trim(),
      role: opts.role,
    },
  })
  const { data, error } = await Promise.race([invoke, timeout])
  if (error) throw error
  if (data?.error) throw new Error(data.error as string)
  return data as WorkspaceInvite
}

export async function revokeInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from('workspace_invites')
    .delete()
    .eq('id', inviteId)
  if (error) throw error
}

// Accept a workspace invite for the currently signed-in user.
// Used by OAuth users who bypass the DB trigger (no metadata to carry invite info).
// Returns { workspace_id, role } on success, or null if the token is invalid/expired.
export async function acceptInvite(token: string): Promise<{ workspace_id: string; role: string } | null> {
  const { data, error } = await supabase.rpc('accept_invite', { p_token: token })
  if (error) throw error
  // The RPC returns { error } if the invite is invalid
  if (data && (data as { error?: string }).error) return null
  return data as { workspace_id: string; role: string }
}

// Public call — no auth required.
// Returns invite details if token is valid (unused, not expired), null otherwise.
export async function validateInviteToken(token: string): Promise<InviteValidation | null> {
  const { data, error } = await supabase
    .rpc('validate_invite_token', { p_token: token })
  if (error || !data || data.length === 0) return null
  return data[0] as InviteValidation
}
