import { supabase } from '../lib/supabase'
import type { ExternalStakeholder } from '../types'

export async function listStakeholders(): Promise<ExternalStakeholder[]> {
  const { data, error } = await supabase
    .from('external_stakeholders')
    .select('*')
    .order('created_at')
  if (error) throw error
  return (data ?? []) as ExternalStakeholder[]
}

export async function createStakeholder(opts: {
  organization: string
  name: string
  email: string | null
  contact_no: string | null
}): Promise<ExternalStakeholder> {
  const { data, error } = await supabase
    .from('external_stakeholders')
    .insert(opts)
    .select()
    .single()
  if (error) throw error
  return data as ExternalStakeholder
}

export async function updateStakeholder(
  id: string,
  updates: Partial<Pick<ExternalStakeholder, 'organization' | 'name' | 'email' | 'contact_no'>>
): Promise<void> {
  const { error } = await supabase.from('external_stakeholders').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteStakeholder(id: string): Promise<void> {
  const { error } = await supabase.from('external_stakeholders').delete().eq('id', id)
  if (error) throw error
}
