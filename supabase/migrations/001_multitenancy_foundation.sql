-- ============================================================
-- Migration 001: Multi-tenancy Foundation
-- Run in Supabase SQL Editor BEFORE any other migration
-- ============================================================

-- UP

-- ── workspaces ───────────────────────────────────────────────────────────────
create table if not exists public.workspaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  plan       text not null default 'free',  -- 'free' | 'pro' | 'enterprise'
  created_at timestamptz default now()
);
alter table public.workspaces enable row level security;

-- ── workspace_members ─────────────────────────────────────────────────────────
-- Many-to-many: a user can belong to multiple workspaces with different roles.
-- Replaces profiles.role and profiles.org_id.
create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  role         text not null default 'MEMBER',
  joined_at    timestamptz default now(),
  primary key (workspace_id, user_id),
  constraint wm_role_check check (role in ('ADMIN', 'VERTICAL_LEAD', 'MEMBER', 'VIEWER'))
);
alter table public.workspace_members enable row level security;
create index if not exists wm_user_id_idx      on public.workspace_members(user_id);
create index if not exists wm_workspace_id_idx on public.workspace_members(workspace_id);

-- ── workspace_invites ─────────────────────────────────────────────────────────
create table if not exists public.workspace_invites (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email        text not null,
  token        text not null unique default encode(gen_random_bytes(32), 'hex'),
  role         text not null default 'MEMBER',
  invited_by   uuid references public.profiles(id) on delete set null,
  used_at      timestamptz,
  expires_at   timestamptz not null default (now() + interval '7 days'),
  created_at   timestamptz default now(),
  constraint wi_role_check check (role in ('ADMIN', 'VERTICAL_LEAD', 'MEMBER', 'VIEWER'))
);
alter table public.workspace_invites enable row level security;
create index if not exists wi_email_idx on public.workspace_invites(email);
create index if not exists wi_token_idx on public.workspace_invites(token);

-- ── Helper: get all workspace_ids for current user ───────────────────────────
create or replace function public.get_my_workspace_ids()
returns setof uuid language sql stable security definer as $$
  select workspace_id from public.workspace_members where user_id = auth.uid();
$$;

-- ── Helper: get current user's role in a specific workspace ──────────────────
create or replace function public.get_my_role_in_workspace(p_workspace_id uuid)
returns text language sql stable security definer as $$
  select role from public.workspace_members
  where user_id = auth.uid() and workspace_id = p_workspace_id;
$$;

-- ── Helper: returns true if user can write in a workspace (not VIEWER) ───────
create or replace function public.can_write_in_workspace(p_workspace_id uuid)
returns boolean language sql stable security definer as $$
  select coalesce(
    (select role from public.workspace_members
     where user_id = auth.uid() and workspace_id = p_workspace_id)
    not in ('VIEWER'),
    false
  );
$$;

-- ── Public RPC: validate invite token (no auth required) ─────────────────────
create or replace function public.validate_invite_token(p_token text)
returns table (
  invite_id      uuid,
  workspace_id   uuid,
  workspace_name text,
  workspace_slug text,
  email          text,
  role           text,
  expires_at     timestamptz
)
language sql stable security definer as $$
  select
    i.id          as invite_id,
    i.workspace_id,
    w.name        as workspace_name,
    w.slug        as workspace_slug,
    i.email,
    i.role,
    i.expires_at
  from public.workspace_invites i
  join public.workspaces w on w.id = i.workspace_id
  where i.token = p_token
    and i.used_at is null
    and i.expires_at > now();
$$;

-- DOWN
-- drop function if exists public.validate_invite_token(text);
-- drop function if exists public.can_write_in_workspace(uuid);
-- drop function if exists public.get_my_role_in_workspace(uuid);
-- drop function if exists public.get_my_workspace_ids();
-- drop table if exists public.workspace_invites;
-- drop table if exists public.workspace_members;
-- drop table if exists public.workspaces;
