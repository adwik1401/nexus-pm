-- ============================================================
-- Migration 005: Rewrite all RLS policies for multi-workspace
-- Run AFTER 004_rewrite_trigger.sql
-- IMPORTANT: Drops current_user_role() — code must be updated first
-- ============================================================

-- UP: Drop all existing policies
drop policy if exists "profiles_select"           on public.profiles;
drop policy if exists "profiles_update_own"       on public.profiles;
drop policy if exists "profiles_insert_trigger"   on public.profiles;
drop policy if exists "verticals_select"          on public.verticals;
drop policy if exists "verticals_write"           on public.verticals;
drop policy if exists "projects_select"           on public.projects;
drop policy if exists "projects_write"            on public.projects;
drop policy if exists "pm_select"                 on public.project_members;
drop policy if exists "pm_write"                  on public.project_members;
drop policy if exists "tasks_select"              on public.tasks;
drop policy if exists "tasks_insert_update"       on public.tasks;
drop policy if exists "tasks_update"              on public.tasks;
drop policy if exists "tasks_delete"              on public.tasks;
drop policy if exists "tags_all"                  on public.tags;
drop policy if exists "tags_select"               on public.tags;
drop policy if exists "tags_write"                on public.tags;
drop policy if exists "context_blocks_all"        on public.context_blocks;
drop policy if exists "context_blocks_select"     on public.context_blocks;
drop policy if exists "context_blocks_write"      on public.context_blocks;
drop policy if exists "sub_tasks_all"             on public.sub_tasks;
drop policy if exists "sub_tasks_select"          on public.sub_tasks;
drop policy if exists "sub_tasks_write"           on public.sub_tasks;
drop policy if exists "task_assignees_all"        on public.task_assignees;
drop policy if exists "task_assignees_select"     on public.task_assignees;
drop policy if exists "task_assignees_write"      on public.task_assignees;
drop policy if exists "task_verticals_all"        on public.task_verticals;
drop policy if exists "task_verticals_select"     on public.task_verticals;
drop policy if exists "task_verticals_write"      on public.task_verticals;
drop policy if exists "gantt_tasks_all"           on public.gantt_tasks;
drop policy if exists "gantt_tasks_select"        on public.gantt_tasks;
drop policy if exists "gantt_tasks_write"         on public.gantt_tasks;
drop policy if exists "comments_select"           on public.comments;
drop policy if exists "comments_insert"           on public.comments;
drop policy if exists "comments_update"           on public.comments;
drop policy if exists "comments_delete"           on public.comments;
drop policy if exists "stakeholders_select"       on public.external_stakeholders;
drop policy if exists "stakeholders_write"        on public.external_stakeholders;
drop policy if exists "meetings_select"           on public.meetings;
drop policy if exists "meetings_write"            on public.meetings;
drop policy if exists "meeting_members_all"       on public.meeting_member_attendees;
drop policy if exists "meeting_stk_all"           on public.meeting_stakeholder_attendees;
drop policy if exists "activity_logs_all"         on public.activity_logs;
drop policy if exists "notifs_own"                on public.notifications;
drop policy if exists "kras_select"               on public.kras;
drop policy if exists "kras_write"                on public.kras;
drop policy if exists "kpis_select"               on public.kpis;
drop policy if exists "kpis_write"                on public.kpis;

-- Drop old single-org helper (replaced by workspace-aware helpers)
drop function if exists public.current_user_role();

-- ── workspaces ───────────────────────────────────────────────────────────────
create policy "workspaces_select" on public.workspaces for select to authenticated
  using (id in (select get_my_workspace_ids()));
-- Any authenticated user can create a new workspace (they become its admin via workspace_members insert)
create policy "workspaces_insert" on public.workspaces for insert to authenticated
  with check (true);
create policy "workspaces_update" on public.workspaces for update to authenticated
  using  (id in (select get_my_workspace_ids()) and get_my_role_in_workspace(id) = 'ADMIN')
  with check (id in (select get_my_workspace_ids()) and get_my_role_in_workspace(id) = 'ADMIN');

-- ── workspace_members ─────────────────────────────────────────────────────────
create policy "wm_select" on public.workspace_members for select to authenticated
  using (workspace_id in (select get_my_workspace_ids()));
-- Admin-managed writes
create policy "wm_update" on public.workspace_members for update to authenticated
  using  (workspace_id in (select get_my_workspace_ids()) and get_my_role_in_workspace(workspace_id) = 'ADMIN')
  with check (workspace_id in (select get_my_workspace_ids()) and get_my_role_in_workspace(workspace_id) = 'ADMIN');
create policy "wm_delete" on public.workspace_members for delete to authenticated
  using (workspace_id in (select get_my_workspace_ids()) and get_my_role_in_workspace(workspace_id) = 'ADMIN');
-- INSERT is via SECURITY DEFINER trigger + admin invite acceptance — allow both
create policy "wm_insert" on public.workspace_members for insert with check (true);

-- ── workspace_invites ─────────────────────────────────────────────────────────
create policy "wi_select" on public.workspace_invites for select to authenticated
  using (workspace_id in (select get_my_workspace_ids()) and get_my_role_in_workspace(workspace_id) = 'ADMIN');
create policy "wi_insert" on public.workspace_invites for insert to authenticated
  with check (workspace_id in (select get_my_workspace_ids()) and get_my_role_in_workspace(workspace_id) = 'ADMIN');
create policy "wi_delete" on public.workspace_invites for delete to authenticated
  using (workspace_id in (select get_my_workspace_ids()) and get_my_role_in_workspace(workspace_id) = 'ADMIN');

-- ── profiles ─────────────────────────────────────────────────────────────────
-- Visible to anyone who shares at least one workspace
create policy "profiles_select" on public.profiles for select to authenticated
  using (id in (
    select wm.user_id from public.workspace_members wm
    where wm.workspace_id in (select get_my_workspace_ids())
  ));
-- Users can only update their own profile
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- Trigger inserts profiles on registration
create policy "profiles_insert_trigger" on public.profiles for insert with check (true);

-- ── verticals (ADMIN write) ───────────────────────────────────────────────────
create policy "verticals_select" on public.verticals for select to authenticated
  using (workspace_id in (select get_my_workspace_ids()));
create policy "verticals_write" on public.verticals for all to authenticated
  using  (workspace_id in (select get_my_workspace_ids()) and get_my_role_in_workspace(workspace_id) = 'ADMIN')
  with check (workspace_id in (select get_my_workspace_ids()) and get_my_role_in_workspace(workspace_id) = 'ADMIN');

-- ── projects (ADMIN write) ────────────────────────────────────────────────────
create policy "projects_select" on public.projects for select to authenticated
  using (workspace_id in (select get_my_workspace_ids()));
create policy "projects_write" on public.projects for all to authenticated
  using  (workspace_id in (select get_my_workspace_ids()) and get_my_role_in_workspace(workspace_id) = 'ADMIN')
  with check (workspace_id in (select get_my_workspace_ids()) and get_my_role_in_workspace(workspace_id) = 'ADMIN');

-- ── project_members ───────────────────────────────────────────────────────────
create policy "pm_select" on public.project_members for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.workspace_id in (select get_my_workspace_ids())));
create policy "pm_write" on public.project_members for all to authenticated
  using (
    exists (select 1 from public.projects p where p.id = project_id and p.workspace_id in (select get_my_workspace_ids()))
    and exists (select 1 from public.projects p where p.id = project_id and get_my_role_in_workspace(p.workspace_id) = 'ADMIN')
  )
  with check (
    exists (select 1 from public.projects p where p.id = project_id and p.workspace_id in (select get_my_workspace_ids()))
    and exists (select 1 from public.projects p where p.id = project_id and get_my_role_in_workspace(p.workspace_id) = 'ADMIN')
  );

-- ── tasks (VIEWER read-only; ADMIN/VL delete) ─────────────────────────────────
create policy "tasks_select" on public.tasks for select to authenticated
  using (workspace_id in (select get_my_workspace_ids()));
create policy "tasks_insert" on public.tasks for insert to authenticated
  with check (workspace_id in (select get_my_workspace_ids()) and can_write_in_workspace(workspace_id));
create policy "tasks_update" on public.tasks for update to authenticated
  using  (workspace_id in (select get_my_workspace_ids()) and can_write_in_workspace(workspace_id))
  with check (workspace_id in (select get_my_workspace_ids()) and can_write_in_workspace(workspace_id));
create policy "tasks_delete" on public.tasks for delete to authenticated
  using (workspace_id in (select get_my_workspace_ids())
    and get_my_role_in_workspace(workspace_id) in ('ADMIN', 'VERTICAL_LEAD'));

-- ── tags (VIEWER read-only) ───────────────────────────────────────────────────
create policy "tags_select" on public.tags for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and t.workspace_id in (select get_my_workspace_ids())));
create policy "tags_write" on public.tags for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and t.workspace_id in (select get_my_workspace_ids()) and can_write_in_workspace(t.workspace_id)))
  with check (exists (select 1 from public.tasks t where t.id = task_id and t.workspace_id in (select get_my_workspace_ids()) and can_write_in_workspace(t.workspace_id)));

-- ── context_blocks (VIEWER read-only) ────────────────────────────────────────
create policy "context_blocks_select" on public.context_blocks for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and t.workspace_id in (select get_my_workspace_ids())));
create policy "context_blocks_write" on public.context_blocks for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and t.workspace_id in (select get_my_workspace_ids()) and can_write_in_workspace(t.workspace_id)))
  with check (exists (select 1 from public.tasks t where t.id = task_id and t.workspace_id in (select get_my_workspace_ids()) and can_write_in_workspace(t.workspace_id)));

-- ── sub_tasks (VIEWER read-only) ─────────────────────────────────────────────
create policy "sub_tasks_select" on public.sub_tasks for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and t.workspace_id in (select get_my_workspace_ids())));
create policy "sub_tasks_write" on public.sub_tasks for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and t.workspace_id in (select get_my_workspace_ids()) and can_write_in_workspace(t.workspace_id)))
  with check (exists (select 1 from public.tasks t where t.id = task_id and t.workspace_id in (select get_my_workspace_ids()) and can_write_in_workspace(t.workspace_id)));

-- ── task_assignees (VIEWER read-only) ────────────────────────────────────────
create policy "task_assignees_select" on public.task_assignees for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and t.workspace_id in (select get_my_workspace_ids())));
create policy "task_assignees_write" on public.task_assignees for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and t.workspace_id in (select get_my_workspace_ids()) and can_write_in_workspace(t.workspace_id)))
  with check (exists (select 1 from public.tasks t where t.id = task_id and t.workspace_id in (select get_my_workspace_ids()) and can_write_in_workspace(t.workspace_id)));

-- ── task_verticals (VIEWER read-only) ────────────────────────────────────────
create policy "task_verticals_select" on public.task_verticals for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and t.workspace_id in (select get_my_workspace_ids())));
create policy "task_verticals_write" on public.task_verticals for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and t.workspace_id in (select get_my_workspace_ids()) and can_write_in_workspace(t.workspace_id)))
  with check (exists (select 1 from public.tasks t where t.id = task_id and t.workspace_id in (select get_my_workspace_ids()) and can_write_in_workspace(t.workspace_id)));

-- ── gantt_tasks (VIEWER read-only) ───────────────────────────────────────────
create policy "gantt_tasks_select" on public.gantt_tasks for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.workspace_id in (select get_my_workspace_ids())));
create policy "gantt_tasks_write" on public.gantt_tasks for all to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.workspace_id in (select get_my_workspace_ids()) and can_write_in_workspace(p.workspace_id)))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.workspace_id in (select get_my_workspace_ids()) and can_write_in_workspace(p.workspace_id)));

-- ── comments (VIEWER can read; cannot post) ───────────────────────────────────
create policy "comments_select" on public.comments for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and t.workspace_id in (select get_my_workspace_ids())));
create policy "comments_insert" on public.comments for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.tasks t where t.id = task_id and t.workspace_id in (select get_my_workspace_ids()) and can_write_in_workspace(t.workspace_id))
  );
create policy "comments_update" on public.comments for update to authenticated
  using (user_id = auth.uid() and exists (select 1 from public.tasks t where t.id = task_id and t.workspace_id in (select get_my_workspace_ids())))
  with check (user_id = auth.uid() and exists (select 1 from public.tasks t where t.id = task_id and t.workspace_id in (select get_my_workspace_ids())));
create policy "comments_delete" on public.comments for delete to authenticated
  using (
    exists (select 1 from public.tasks t where t.id = task_id and t.workspace_id in (select get_my_workspace_ids()))
    and (
      user_id = auth.uid()
      or exists (
        select 1 from public.tasks t
        join public.workspace_members wm on wm.workspace_id = t.workspace_id and wm.user_id = auth.uid() and wm.role = 'ADMIN'
        where t.id = task_id
      )
    )
  );

-- ── activity_logs ─────────────────────────────────────────────────────────────
create policy "activity_logs_all" on public.activity_logs for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and t.workspace_id in (select get_my_workspace_ids())))
  with check (exists (select 1 from public.tasks t where t.id = task_id and t.workspace_id in (select get_my_workspace_ids())));

-- ── external_stakeholders (ADMIN write) ──────────────────────────────────────
create policy "stakeholders_select" on public.external_stakeholders for select to authenticated
  using (workspace_id in (select get_my_workspace_ids()));
create policy "stakeholders_write" on public.external_stakeholders for all to authenticated
  using  (workspace_id in (select get_my_workspace_ids()) and get_my_role_in_workspace(workspace_id) = 'ADMIN')
  with check (workspace_id in (select get_my_workspace_ids()) and get_my_role_in_workspace(workspace_id) = 'ADMIN');

-- ── meetings (VIEWER read-only; ADMIN/VL write) ───────────────────────────────
create policy "meetings_select" on public.meetings for select to authenticated
  using (workspace_id in (select get_my_workspace_ids()));
create policy "meetings_write" on public.meetings for all to authenticated
  using  (workspace_id in (select get_my_workspace_ids()) and get_my_role_in_workspace(workspace_id) in ('ADMIN', 'VERTICAL_LEAD'))
  with check (workspace_id in (select get_my_workspace_ids()) and get_my_role_in_workspace(workspace_id) in ('ADMIN', 'VERTICAL_LEAD'));

-- ── meeting junction tables ───────────────────────────────────────────────────
create policy "meeting_members_all" on public.meeting_member_attendees for all to authenticated
  using (
    exists (select 1 from public.meetings m where m.id = meeting_id and m.workspace_id in (select get_my_workspace_ids()))
    and exists (
      select 1 from public.meetings m
      join public.workspace_members wm on wm.workspace_id = m.workspace_id
      where m.id = meeting_id and wm.user_id = auth.uid() and wm.role in ('ADMIN', 'VERTICAL_LEAD')
    )
  )
  with check (
    exists (select 1 from public.meetings m where m.id = meeting_id and m.workspace_id in (select get_my_workspace_ids()))
    and exists (
      select 1 from public.meetings m
      join public.workspace_members wm on wm.workspace_id = m.workspace_id
      where m.id = meeting_id and wm.user_id = auth.uid() and wm.role in ('ADMIN', 'VERTICAL_LEAD')
    )
  );
create policy "meeting_stk_all" on public.meeting_stakeholder_attendees for all to authenticated
  using (
    exists (select 1 from public.meetings m where m.id = meeting_id and m.workspace_id in (select get_my_workspace_ids()))
    and exists (
      select 1 from public.meetings m
      join public.workspace_members wm on wm.workspace_id = m.workspace_id
      where m.id = meeting_id and wm.user_id = auth.uid() and wm.role in ('ADMIN', 'VERTICAL_LEAD')
    )
  )
  with check (
    exists (select 1 from public.meetings m where m.id = meeting_id and m.workspace_id in (select get_my_workspace_ids()))
    and exists (
      select 1 from public.meetings m
      join public.workspace_members wm on wm.workspace_id = m.workspace_id
      where m.id = meeting_id and wm.user_id = auth.uid() and wm.role in ('ADMIN', 'VERTICAL_LEAD')
    )
  );

-- ── notifications (user-scoped; no workspace needed) ─────────────────────────
create policy "notifs_own" on public.notifications for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── kras / kpis (ADMIN write) ─────────────────────────────────────────────────
create policy "kras_select" on public.kras for select to authenticated
  using (workspace_id in (select get_my_workspace_ids()));
create policy "kras_write" on public.kras for all to authenticated
  using  (workspace_id in (select get_my_workspace_ids()) and get_my_role_in_workspace(workspace_id) = 'ADMIN')
  with check (workspace_id in (select get_my_workspace_ids()) and get_my_role_in_workspace(workspace_id) = 'ADMIN');
create policy "kpis_select" on public.kpis for select to authenticated
  using (workspace_id in (select get_my_workspace_ids()));
create policy "kpis_write" on public.kpis for all to authenticated
  using  (workspace_id in (select get_my_workspace_ids()) and get_my_role_in_workspace(workspace_id) = 'ADMIN')
  with check (workspace_id in (select get_my_workspace_ids()) and get_my_role_in_workspace(workspace_id) = 'ADMIN');
