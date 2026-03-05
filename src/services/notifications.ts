import { supabase } from '../lib/supabase'
import type { AppNotification } from '../types'

export async function listNotifications(): Promise<AppNotification[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []) as AppNotification[]
}

export async function markRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
  if (error) console.error('[notifications] markRead:', error)
}

export async function markAllRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
  if (error) console.error('[notifications] markAllRead:', error)
}

export async function createNotification(n: Omit<AppNotification, 'id' | 'read' | 'created_at'>): Promise<void> {
  // For meeting_reminder: upsert to avoid duplicates (DB unique index handles it)
  if (n.type === 'meeting_reminder') {
    const { error: upsertErr } = await supabase
      .from('notifications')
      .upsert(
        { ...n, read: false },
        { onConflict: 'user_id,entity_id,type', ignoreDuplicates: true }
      )
    if (upsertErr) console.error('[notifications] createNotification upsert:', upsertErr)
  } else {
    const { error: insertErr } = await supabase.from('notifications').insert({ ...n, read: false })
    if (insertErr) console.error('[notifications] createNotification insert:', insertErr)
  }
}
