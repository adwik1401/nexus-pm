import { supabase } from '../lib/supabase'
import type { ActivityLog, Comment, ContextBlock, SubTask, Tag, Task, TaskStatus } from '../types'

// ── List tasks (with filters) ───────────────────────────────────────────────
export async function listTasks(filters: {
  projectId?: string
  assigneeId?: string
  verticalId?: string
}): Promise<Task[]> {
  let query = supabase
    .from('tasks')
    .select(`
      *,
      assignees:task_assignees(user:profiles(id, name, profile_image, role, vertical_id)),
      verticals:task_verticals(vertical:verticals(id, name, color)),
      tags(*),
      context_blocks(*),
      sub_tasks(*)
    `)
    .order('created_at')

  if (filters.projectId) query = query.eq('project_id', filters.projectId)
  if (filters.assigneeId) {
    // tasks where this user is an assignee
    const { data: ids } = await supabase
      .from('task_assignees')
      .select('task_id')
      .eq('user_id', filters.assigneeId)
    const taskIds = (ids ?? []).map((r: { task_id: string }) => r.task_id)
    if (taskIds.length === 0) return []
    query = query.in('id', taskIds)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).map(normaliseTask) as Task[]
}

// ── Get single task (full) ──────────────────────────────────────────────────
export async function getTask(id: string): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assignees:task_assignees(user:profiles(id, name, profile_image, role, vertical_id)),
      verticals:task_verticals(vertical:verticals(id, name, color)),
      tags(*),
      context_blocks(*),
      sub_tasks(*),
      comments(*, user:profiles(id, name, profile_image))
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return normaliseTask(data) as Task
}

// ── Create task ─────────────────────────────────────────────────────────────
export async function createTask(opts: {
  title: string
  projectId: string
  status?: TaskStatus
}): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: opts.title,
      project_id: opts.projectId,
      status: opts.status ?? 'TODO',
    })
    .select()
    .single()

  if (error) throw error
  return { ...data, assignees: [], verticals: [], tags: [], context_blocks: [], sub_tasks: [] } as Task
}

// ── Update task ─────────────────────────────────────────────────────────────
export async function updateTask(id: string, updates: {
  title?: string
  description?: string
  status?: TaskStatus
  due_date?: string | null
}): Promise<void> {
  const { error } = await supabase.from('tasks').update(updates).eq('id', id)
  if (error) throw error
}

// ── Assignees ───────────────────────────────────────────────────────────────
export async function setTaskAssignees(taskId: string, userIds: string[]): Promise<void> {
  await supabase.from('task_assignees').delete().eq('task_id', taskId)
  if (userIds.length > 0) {
    const { error } = await supabase
      .from('task_assignees')
      .insert(userIds.map(uid => ({ task_id: taskId, user_id: uid })))
    if (error) throw error
  }
}

// ── Task Verticals ──────────────────────────────────────────────────────────
export async function setTaskVerticals(taskId: string, verticalIds: string[]): Promise<void> {
  await supabase.from('task_verticals').delete().eq('task_id', taskId)
  if (verticalIds.length > 0) {
    const { error } = await supabase
      .from('task_verticals')
      .insert(verticalIds.map(vid => ({ task_id: taskId, vertical_id: vid })))
    if (error) throw error
  }
}

// ── Tags ────────────────────────────────────────────────────────────────────
export async function upsertTag(tag: Omit<Tag, 'id'>): Promise<Tag> {
  const { data, error } = await supabase.from('tags').insert(tag).select().single()
  if (error) throw error
  return data as Tag
}

export async function deleteTag(tagId: string): Promise<void> {
  const { error } = await supabase.from('tags').delete().eq('id', tagId)
  if (error) throw error
}

// ── Context blocks ──────────────────────────────────────────────────────────
export async function createContextBlock(block: Omit<ContextBlock, 'id'>): Promise<ContextBlock> {
  const { data, error } = await supabase.from('context_blocks').insert(block).select().single()
  if (error) throw error
  return data as ContextBlock
}

export async function updateContextBlock(id: string, updates: Partial<Pick<ContextBlock, 'title' | 'content'>>): Promise<void> {
  const { error } = await supabase.from('context_blocks').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteContextBlock(id: string): Promise<void> {
  const { error } = await supabase.from('context_blocks').delete().eq('id', id)
  if (error) throw error
}

// ── Subtasks ────────────────────────────────────────────────────────────────
export async function addSubTask(taskId: string, title: string): Promise<SubTask> {
  const { data, error } = await supabase
    .from('sub_tasks')
    .insert({ task_id: taskId, title })
    .select()
    .single()

  if (error) throw error
  return data as SubTask
}

export async function toggleSubTask(id: string, completed: boolean): Promise<void> {
  const { error } = await supabase.from('sub_tasks').update({ completed }).eq('id', id)
  if (error) throw error
}

export async function deleteSubTask(id: string): Promise<void> {
  const { error } = await supabase.from('sub_tasks').delete().eq('id', id)
  if (error) throw error
}

// ── Comments ─────────────────────────────────────────────────────────────────
export async function listComments(taskId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*, user:profiles(id, name, profile_image)')
    .eq('task_id', taskId)
    .order('created_at')

  if (error) throw error
  return data as Comment[]
}

export async function addComment(taskId: string, userId: string, content: string): Promise<Comment> {
  const { data, error } = await supabase
    .from('comments')
    .insert({ task_id: taskId, user_id: userId, content })
    .select('*, user:profiles(id, name, profile_image)')
    .single()

  if (error) throw error
  return data as Comment
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', id)
  if (error) throw error
}

// ── Activity Logs ────────────────────────────────────────────────────────────
export async function logActivity(
  taskId: string,
  action: string,
  meta: Record<string, unknown> = {}
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('activity_logs').insert({ task_id: taskId, user_id: user.id, action, meta })
  // fire & forget — intentionally no error throw
}

export async function getActivityLogs(taskId: string): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*, user:profiles(id, name, profile_image)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ActivityLog[]
}

// ── Internal helper ─────────────────────────────────────────────────────────
function normaliseTask(raw: Record<string, unknown>): Task {
  const assignees = ((raw.assignees as { user: unknown }[]) ?? []).map(a => a.user)
  const verticals = ((raw.verticals as { vertical: unknown }[]) ?? []).map(v => v.vertical)
  return { ...raw, assignees, verticals } as unknown as Task
}
