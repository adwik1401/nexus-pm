import { supabase } from '../lib/supabase'
import type { Workspace, WorkspaceMembership } from '../types'

export async function listMyWorkspaces(): Promise<WorkspaceMembership[]> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('*, workspace:workspaces(*)')
    .order('joined_at')
  if (error) throw error
  return (data ?? []) as WorkspaceMembership[]
}

export async function getWorkspace(id: string): Promise<Workspace> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Workspace
}

export async function updateWorkspace(id: string, updates: Partial<Pick<Workspace, 'name'>>): Promise<void> {
  const { error } = await supabase.from('workspaces').update(updates).eq('id', id)
  if (error) throw error
}

// Creates a new workspace and adds the current user as ADMIN.
// Uses a SECURITY DEFINER RPC to bypass RLS on the insert.
export async function createWorkspace(name: string): Promise<{ workspace: Workspace; membership: WorkspaceMembership }> {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const slug = `${base}-${Math.random().toString(36).slice(2, 7)}`

  const { data: wsId, error: rpcErr } = await supabase
    .rpc('create_workspace_for_user', { p_name: name, p_slug: slug })
  if (rpcErr) throw rpcErr

  const { data: ws, error: wsErr } = await supabase
    .from('workspaces').select('*').eq('id', wsId).single()
  if (wsErr) throw wsErr

  const { data: { user } } = await supabase.auth.getUser()
  const membership: WorkspaceMembership = {
    workspace_id: wsId as string,
    user_id: user!.id,
    role: 'ADMIN',
    joined_at: new Date().toISOString(),
    workspace: ws as Workspace,
  }

  return { workspace: ws as Workspace, membership }
}
