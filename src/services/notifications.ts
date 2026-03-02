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
  await supabase.from('notifications').update({ read: true }).eq('id', id)
}

export async function markAllRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
}

export async function createNotification(n: Omit<AppNotification, 'id' | 'read' | 'created_at'>): Promise<void> {
  // For meeting_reminder: upsert to avoid duplicates (DB unique index handles it)
  if (n.type === 'meeting_reminder') {
    await supabase
      .from('notifications')
      .upsert(
        { ...n, read: false },
        { onConflict: 'user_id,entity_id,type', ignoreDuplicates: true }
      )
  } else {
    await supabase.from('notifications').insert({ ...n, read: false })
  }
}
