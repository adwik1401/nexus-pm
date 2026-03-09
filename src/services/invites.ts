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
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 20000)

  try {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invite`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspaceId: opts.workspaceId,
          email: opts.email.toLowerCase().trim(),
          role: opts.role,
        }),
        signal: controller.signal,
      },
    )
    clearTimeout(timeoutId)
    const text = await res.text()
    let data: Record<string, unknown>
    try { data = JSON.parse(text) } catch { throw new Error(`Server error ${res.status}: ${text.slice(0, 300)}`) }
    if (!res.ok || data?.error) throw new Error((data?.error as string) ?? `HTTP ${res.status}: Failed to send invite`)
    return data as unknown as WorkspaceInvite
  } catch (err) {
    clearTimeout(timeoutId)
    if ((err as Error).name === 'AbortError') throw new Error('Request timed out — please try again')
    throw err
  }
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
