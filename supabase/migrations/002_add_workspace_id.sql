-- ============================================================
-- Migration 002: Add workspace_id to all tenant tables
-- Run AFTER 001_multitenancy_foundation.sql
-- ============================================================

-- UP

-- Add workspace_id FK to all tenant-scoped tables
alter table public.verticals             add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.projects              add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.tasks                 add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.external_stakeholders add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.meetings              add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.kras                  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.kpis                  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

-- Junction tables (task_assignees, task_verticals, project_members, tags,
-- context_blocks, sub_tasks, comments, activity_logs, gantt_tasks,
-- meeting_member_attendees, meeting_stakeholder_attendees, notifications)
-- do NOT get workspace_id — RLS inherits from parent via EXISTS subqueries.

-- ── Seed: create default workspace and migrate all existing data ──────────────
-- IMPORTANT: Adjust org name/slug to match your actual organization.
do $$
declare v_ws_id uuid;
begin
  insert into public.workspaces (name, slug, plan)
  values ('QCIN', 'qcin', 'pro')
  returning id into v_ws_id;

  update public.verticals             set workspace_id = v_ws_id where workspace_id is null;
  update public.projects              set workspace_id = v_ws_id where workspace_id is null;
  update public.tasks                 set workspace_id = v_ws_id where workspace_id is null;
  update public.external_stakeholders set workspace_id = v_ws_id where workspace_id is null;
  update public.meetings              set workspace_id = v_ws_id where workspace_id is null;
  update public.kras                  set workspace_id = v_ws_id where workspace_id is null;
  update public.kpis                  set workspace_id = v_ws_id where workspace_id is null;

  -- Migrate all existing profiles into workspace_members using their current role
  insert into public.workspace_members (workspace_id, user_id, role)
  select v_ws_id, id, coalesce(role, 'MEMBER')
  from public.profiles
  on conflict (workspace_id, user_id) do nothing;
end;
$$;

-- Enforce NOT NULL after seeding
alter table public.verticals             alter column workspace_id set not null;
alter table public.projects              alter column workspace_id set not null;
alter table public.tasks                 alter column workspace_id set not null;
alter table public.external_stakeholders alter column workspace_id set not null;
alter table public.meetings              alter column workspace_id set not null;
alter table public.kras                  alter column workspace_id set not null;
alter table public.kpis                  alter column workspace_id set not null;

-- Drop role from profiles — role is now per-workspace in workspace_members.
-- Run ONLY after the workspace_members migration above has completed.
alter table public.profiles drop column if exists role;

-- Performance indexes
create index if not exists verticals_ws_idx             on public.verticals(workspace_id);
create index if not exists projects_ws_idx              on public.projects(workspace_id);
create index if not exists tasks_ws_idx                 on public.tasks(workspace_id);
create index if not exists external_stakeholders_ws_idx on public.external_stakeholders(workspace_id);
create index if not exists meetings_ws_idx              on public.meetings(workspace_id);
create index if not exists kras_ws_idx                  on public.kras(workspace_id);
create index if not exists kpis_ws_idx                  on public.kpis(workspace_id);

-- DOWN
-- alter table public.profiles add column if not exists role text not null default 'MEMBER';
-- alter table public.verticals             drop column if exists workspace_id;
-- alter table public.projects              drop column if exists workspace_id;
-- alter table public.tasks                 drop column if exists workspace_id;
-- alter table public.external_stakeholders drop column if exists workspace_id;
-- alter table public.meetings              drop column if exists workspace_id;
-- alter table public.kras                  drop column if exists workspace_id;
-- alter table public.kpis                  drop column if exists workspace_id;
