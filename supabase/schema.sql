-- ============================================================
-- Nexus PM Tool — Supabase Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. VERTICALS (must exist before profiles references it)
create table if not exists public.verticals (
  id       uuid primary key default gen_random_uuid(),
  name     text unique not null,
  color    text not null default '#6366f1',
  lead_id  uuid unique,  -- set after profiles created
  created_at timestamptz default now()
);

-- 2. PROFILES (extends auth.users 1:1)
create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  name          text not null,
  profile_image text,                   -- Supabase Storage public URL
  dob           date,
  role          text not null default 'MEMBER',  -- ADMIN | VERTICAL_LEAD | MEMBER
  vertical_id   uuid references public.verticals(id) on delete set null,
  created_at    timestamptz default now()
);

-- 3. Add FK from verticals.lead_id → profiles (deferred so both tables exist)
alter table public.verticals
  add constraint fk_vertical_lead
  foreign key (lead_id) references public.profiles(id) on delete set null;

-- 4. PROJECTS
create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  icon_type  text not null default 'layers',
  created_at timestamptz default now()
);

-- 5. PROJECT MEMBERS
create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  primary key (project_id, user_id)
);

-- 6. TASKS
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  status      text not null default 'TODO',  -- TODO | IN_PROGRESS | DONE
  due_date    date,
  project_id  uuid not null references public.projects(id) on delete cascade,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger tasks_updated_at before update on public.tasks
  for each row execute procedure public.set_updated_at();

-- 7. TASK ASSIGNEES
create table if not exists public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (task_id, user_id)
);

-- 8. TASK VERTICALS
create table if not exists public.task_verticals (
  task_id     uuid not null references public.tasks(id) on delete cascade,
  vertical_id uuid not null references public.verticals(id) on delete cascade,
  primary key (task_id, vertical_id)
);

-- 9. TAGS
create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  color      text not null,
  text_color text not null,
  task_id    uuid not null references public.tasks(id) on delete cascade
);

-- 10. CONTEXT BLOCKS
create table if not exists public.context_blocks (
  id      uuid primary key default gen_random_uuid(),
  title   text not null,
  content text not null default '',
  task_id uuid not null references public.tasks(id) on delete cascade
);

-- 11. SUB TASKS
create table if not exists public.sub_tasks (
  id        uuid primary key default gen_random_uuid(),
  title     text not null,
  completed boolean not null default false,
  task_id   uuid not null references public.tasks(id) on delete cascade
);

-- 12. COMMENTS
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  content    text not null,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  task_id    uuid not null references public.tasks(id) on delete cascade,
  created_at timestamptz default now()
);

-- 13. GANTT TASKS
create table if not exists public.gantt_tasks (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  scheduled_days   int not null,
  start_day_offset int not null,
  color            text not null,
  bg_color         text not null,
  project_id       uuid not null references public.projects(id) on delete cascade
);

-- ============================================================
-- TRIGGER: auto-create profile when user registers
-- First user to register gets ADMIN role automatically
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, profile_image, dob, role, vertical_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'New User'),
    new.raw_user_meta_data->>'profile_image',
    case
      when new.raw_user_meta_data->>'dob' is not null
      then (new.raw_user_meta_data->>'dob')::date
      else null
    end,
    case
      when (select count(*) from public.profiles) = 0 then 'ADMIN'
      else 'MEMBER'
    end,
    case
      when new.raw_user_meta_data->>'vertical_id' is not null
        and new.raw_user_meta_data->>'vertical_id' != ''
      then (new.raw_user_meta_data->>'vertical_id')::uuid
      else null
    end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles       enable row level security;
alter table public.verticals      enable row level security;
alter table public.projects       enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks          enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_verticals enable row level security;
alter table public.tags           enable row level security;
alter table public.context_blocks enable row level security;
alter table public.sub_tasks      enable row level security;
alter table public.comments       enable row level security;
alter table public.gantt_tasks    enable row level security;

-- Helper: get current user role
create or replace function public.current_user_role()
returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid();
$$;

-- PROFILES
create policy "profiles_select" on public.profiles for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid() or public.current_user_role() = 'ADMIN');
create policy "profiles_insert_trigger" on public.profiles for insert with check (true);

-- VERTICALS (all read; admin write)
create policy "verticals_select" on public.verticals for select to authenticated using (true);
create policy "verticals_write"  on public.verticals for all to authenticated
  using (public.current_user_role() = 'ADMIN')
  with check (public.current_user_role() = 'ADMIN');

-- PROJECTS (all read; admin write)
create policy "projects_select" on public.projects for select to authenticated using (true);
create policy "projects_write"  on public.projects for all to authenticated
  using (public.current_user_role() = 'ADMIN')
  with check (public.current_user_role() = 'ADMIN');

-- PROJECT MEMBERS (all read; admin write)
create policy "pm_select" on public.project_members for select to authenticated using (true);
create policy "pm_write"  on public.project_members for all to authenticated
  using (public.current_user_role() = 'ADMIN')
  with check (public.current_user_role() = 'ADMIN');

-- TASKS (project members read/write)
create policy "tasks_select" on public.tasks for select to authenticated using (true);
create policy "tasks_write"  on public.tasks for all to authenticated using (true) with check (true);

-- CASCADE tables (tags, context_blocks, sub_tasks, task_assignees, task_verticals, comments, gantt_tasks)
create policy "tags_all"           on public.tags           for all to authenticated using (true) with check (true);
create policy "context_blocks_all" on public.context_blocks for all to authenticated using (true) with check (true);
create policy "sub_tasks_all"      on public.sub_tasks      for all to authenticated using (true) with check (true);
create policy "task_assignees_all" on public.task_assignees for all to authenticated using (true) with check (true);
create policy "task_verticals_all" on public.task_verticals for all to authenticated using (true) with check (true);
create policy "comments_all"       on public.comments       for all to authenticated using (true) with check (true);
create policy "gantt_tasks_all"    on public.gantt_tasks    for all to authenticated using (true) with check (true);

-- ============================================================
-- SEED DATA (initial verticals + projects + tasks)
-- Comment out if you want a clean slate
-- ============================================================

insert into public.verticals (name, color) values
  ('Design',    '#6366f1'),
  ('Backend',   '#f59e0b'),
  ('Frontend',  '#10b981'),
  ('Marketing', '#ec4899'),
  ('QA',        '#06b6d4'),
  ('DevOps',    '#8b5cf6')
on conflict (name) do nothing;

insert into public.projects (name, icon_type) values
  ('Design System', 'layers'),
  ('Backend Core',  'server'),
  ('Finance App',   'dollar'),
  ('Mobile App',    'code')
on conflict do nothing;

-- ============================================================
-- ADDITIONS: External Stakeholders, Meetings, Program Color
-- Run this section in Supabase SQL Editor if upgrading an
-- existing database (already included in fresh installs above)
-- ============================================================

-- 14. Add deadline + color columns to programs/projects
alter table public.projects add column if not exists deadline date;
alter table public.projects add column if not exists color text not null default '#6366f1';

-- 15. EXTERNAL STAKEHOLDERS (no auth account)
create table if not exists public.external_stakeholders (
  id           uuid primary key default gen_random_uuid(),
  organization text not null,
  name         text not null,
  email        text,
  contact_no   text,
  created_at   timestamptz default now()
);
alter table public.external_stakeholders enable row level security;
create policy "stakeholders_select" on public.external_stakeholders for select to authenticated using (true);
create policy "stakeholders_write"  on public.external_stakeholders for all    to authenticated using (true) with check (true);

-- 16. MEETINGS
create table if not exists public.meetings (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  date        date not null,
  time_from   time not null,
  time_to     time not null,
  mode        text not null default 'ONLINE',  -- 'ONLINE' | 'OFFLINE'
  link        text,
  location    text,
  vertical_id uuid references public.verticals(id) on delete set null,
  created_at  timestamptz default now()
);
alter table public.meetings enable row level security;
create policy "meetings_select" on public.meetings for select to authenticated using (true);
create policy "meetings_write"  on public.meetings for all    to authenticated using (true) with check (true);

-- 17. MEETING MEMBER ATTENDEES (team members)
create table if not exists public.meeting_member_attendees (
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  primary key (meeting_id, user_id)
);
alter table public.meeting_member_attendees enable row level security;
create policy "meeting_members_all" on public.meeting_member_attendees for all to authenticated using (true) with check (true);

-- 18. MEETING STAKEHOLDER ATTENDEES
create table if not exists public.meeting_stakeholder_attendees (
  meeting_id     uuid not null references public.meetings(id) on delete cascade,
  stakeholder_id uuid not null references public.external_stakeholders(id) on delete cascade,
  primary key (meeting_id, stakeholder_id)
);
alter table public.meeting_stakeholder_attendees enable row level security;
create policy "meeting_stk_all" on public.meeting_stakeholder_attendees for all to authenticated using (true) with check (true);
