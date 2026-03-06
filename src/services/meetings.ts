import { supabase } from '../lib/supabase'
import type { Meeting, MeetingMode } from '../types'
import { createNotification } from './notifications'

function normalizeMeeting(m: Record<string, unknown>): Meeting {
  return {
    ...m,
    vertical: (m.vertical as Record<string, unknown> | null) ?? undefined,
    member_attendees: ((m.member_attendees as { user: unknown }[]) ?? []).map(a => a.user),
    stakeholder_attendees: ((m.stakeholder_attendees as { stakeholder: unknown }[]) ?? []).map(a => a.stakeholder),
  } as Meeting
}

export async function listMeetings(workspaceId: string): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from('meetings')
    .select(`
      *,
      vertical:verticals(id, name, color),
      member_attendees:meeting_member_attendees(user:profiles(id, name, profile_image, vertical_id)),
      stakeholder_attendees:meeting_stakeholder_attendees(stakeholder:external_stakeholders(*))
    `)
    .eq('workspace_id', workspaceId)
    .order('date')
    .order('time_from')
  if (error) throw error
  return (data ?? []).map(m => normalizeMeeting(m as Record<string, unknown>))
}

export async function createMeeting(opts: {
  title: string
  date: string
  time_from: string
  time_to: string
  mode: MeetingMode
  link: string | null
  location: string | null
  vertical_id: string | null
  workspaceId: string
}): Promise<Meeting> {
  const { workspaceId, ...rest } = opts
  const { data, error } = await supabase
    .from('meetings')
    .insert({ ...rest, workspace_id: workspaceId })
    .select()
    .single()
  if (error) throw error
  return data as Meeting
}

export async function updateMeeting(
  id: string,
  updates: {
    title?: string
    date?: string
    time_from?: string
    time_to?: string
    mode?: MeetingMode
    link?: string | null
    location?: string | null
    vertical_id?: string | null
  }
): Promise<void> {
  const { error } = await supabase.from('meetings').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteMeeting(id: string): Promise<void> {
  const { error } = await supabase.from('meetings').delete().eq('id', id)
  if (error) throw error
}

export async function setMeetingMemberAttendees(
  meetingId: string,
  userIds: string[],
  meetingTitle?: string,
): Promise<void> {
  // Get previous attendees to find newly added ones
  const { data: prevRows } = await supabase
    .from('meeting_member_attendees')
    .select('user_id')
    .eq('meeting_id', meetingId)
  const prevIds = new Set((prevRows ?? []).map((r: { user_id: string }) => r.user_id))

  await supabase.from('meeting_member_attendees').delete().eq('meeting_id', meetingId)
  if (userIds.length === 0) return
  const { error } = await supabase
    .from('meeting_member_attendees')
    .insert(userIds.map(user_id => ({ meeting_id: meetingId, user_id })))
  if (error) throw error

  // Notify newly added attendees
  const { data: { user } } = await supabase.auth.getUser()
  for (const uid of userIds) {
    if (prevIds.has(uid) || uid === user?.id) continue
    createNotification({
      user_id: uid,
      type: 'meeting_added',
      title: 'You were added to a meeting',
      body: meetingTitle ?? 'New meeting',
      entity_id: meetingId,
      entity_type: 'meeting',
    })
  }
}

export async function setMeetingStakeholderAttendees(meetingId: string, stakeholderIds: string[]): Promise<void> {
  await supabase.from('meeting_stakeholder_attendees').delete().eq('meeting_id', meetingId)
  if (stakeholderIds.length === 0) return
  const { error } = await supabase
    .from('meeting_stakeholder_attendees')
    .insert(stakeholderIds.map(stakeholder_id => ({ meeting_id: meetingId, stakeholder_id })))
  if (error) throw error
}
