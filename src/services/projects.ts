import { supabase } from '../lib/supabase'
import type { GanttTask, IconType, Program } from '../types'

export async function listPrograms(): Promise<Program[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      members:project_members(user:profiles(id, name, profile_image, role, vertical_id)),
      tasks(id, status),
      gantt_tasks(*)
    `)
    .order('created_at')

  if (error) throw error

  return (data ?? []).map((p: Record<string, unknown>) => {
    const tasks = (p.tasks as { status: string }[]) ?? []
    const members = ((p.members as { user: unknown }[]) ?? []).map((m) => m.user)
    return {
      ...p,
      members,
      todo_count: tasks.filter(t => t.status === 'TODO').length,
      in_progress_count: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      done_count: tasks.filter(t => t.status === 'DONE').length,
    }
  }) as Program[]
}

export async function createProgram(name: string, iconType: IconType, deadline: string | null, color?: string): Promise<Program> {
  const { data, error } = await supabase
    .from('projects')
    .insert({ name, icon_type: iconType, deadline: deadline || null, color: color ?? '#6366f1' })
    .select()
    .single()

  if (error) throw error
  return data as Program
}

export async function updateProgram(id: string, updates: Partial<Pick<Program, 'name' | 'deadline' | 'color'>>): Promise<void> {
  const { error } = await supabase.from('projects').update(updates).eq('id', id)
  if (error) throw error
}

export async function addMemberToProgram(programId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .insert({ project_id: programId, user_id: userId })

  if (error && error.code !== '23505') throw error // ignore duplicate
}

export async function removeMemberFromProgram(programId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', programId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function deleteProgram(programId: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', programId)

  if (error) throw error
}

export async function createGanttTask(ganttTask: Omit<GanttTask, 'id'>): Promise<GanttTask> {
  const { data, error } = await supabase
    .from('gantt_tasks')
    .insert(ganttTask)
    .select()
    .single()

  if (error) throw error
  return data as GanttTask
}
