import { supabase } from '../lib/supabase'
import type { Vertical } from '../types'

export async function listVerticals(): Promise<Vertical[]> {
  const { data, error } = await supabase
    .from('verticals')
    .select('*')
    .order('name')

  if (error) throw error
  return data as Vertical[]
}

export async function createVertical(name: string, color: string): Promise<Vertical> {
  const { data, error } = await supabase
    .from('verticals')
    .insert({ name, color })
    .select()
    .single()

  if (error) throw error
  return data as Vertical
}

export async function updateVertical(id: string, updates: { name?: string; color?: string }): Promise<void> {
  const { error } = await supabase
    .from('verticals')
    .update(updates)
    .eq('id', id)

  if (error) throw error
}

export async function deleteVertical(id: string): Promise<void> {
  const { error } = await supabase
    .from('verticals')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function setVerticalLead(verticalId: string, userId: string | null): Promise<void> {
  const { error } = await supabase
    .from('verticals')
    .update({ lead_id: userId })
    .eq('id', verticalId)

  if (error) throw error
}
