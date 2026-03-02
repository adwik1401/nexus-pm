import { supabase } from '../lib/supabase'
import type { KPI, KRA } from '../types'

// ── KRAs ────────────────────────────────────────────────────────────────────

export async function listKRAs(userId: string): Promise<KRA[]> {
  const { data, error } = await supabase
    .from('kras')
    .select('*')
    .eq('user_id', userId)
    .order('created_at')
  if (error) throw error
  return (data ?? []) as KRA[]
}

export async function createKRA(userId: string, title: string, description: string): Promise<KRA> {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('kras')
    .insert({ user_id: userId, title, description, created_by: user?.id ?? null })
    .select()
    .single()
  if (error) throw error
  return data as KRA
}

export async function updateKRA(id: string, updates: { title?: string; description?: string }): Promise<void> {
  const { error } = await supabase.from('kras').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteKRA(id: string): Promise<void> {
  const { error } = await supabase.from('kras').delete().eq('id', id)
  if (error) throw error
}

// ── KPIs ────────────────────────────────────────────────────────────────────

export async function listKPIs(userId: string): Promise<KPI[]> {
  const { data, error } = await supabase
    .from('kpis')
    .select('*')
    .eq('user_id', userId)
    .order('created_at')
  if (error) throw error
  return (data ?? []) as KPI[]
}

export async function createKPI(userId: string, title: string, description: string): Promise<KPI> {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('kpis')
    .insert({ user_id: userId, title, description, created_by: user?.id ?? null })
    .select()
    .single()
  if (error) throw error
  return data as KPI
}

export async function updateKPI(id: string, updates: { title?: string; description?: string }): Promise<void> {
  const { error } = await supabase.from('kpis').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteKPI(id: string): Promise<void> {
  const { error } = await supabase.from('kpis').delete().eq('id', id)
  if (error) throw error
}
