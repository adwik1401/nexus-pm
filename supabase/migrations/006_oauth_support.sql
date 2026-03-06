-- ============================================================
-- Migration 006: Google OAuth support
-- Run AFTER 005_rewrite_rls.sql in Supabase SQL Editor
-- ============================================================

-- UP

-- ── 1. Update handle_new_user() trigger ─────────────────────────────────────
-- Adds Flow C: OAuth / social sign-in.
-- When raw_user_meta_data has no workspace_name and no workspace_id
-- (e.g. Google OAuth first sign-in), we create the profile only.
-- The user must create or join a workspace via the app UI.
-- Google populates: name/full_name, avatar_url, email, email_verified, etc.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_ws_id   uuid;
  v_role    text;
  v_ws_name text;
  v_slug    text;
  v_token   text;
begin
  v_ws_name := new.raw_user_meta_data->>'workspace_name';
  v_ws_id   := nullif(new.raw_user_meta_data->>'workspace_id', '')::uuid;
  v_role    := coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'MEMBER');
  v_token   := nullif(new.raw_user_meta_data->>'invite_token', '');

  if v_ws_name is not null and v_ws_id is null then
    -- Flow A: create new workspace, this user is ADMIN
    v_slug := lower(regexp_replace(v_ws_name, '[^a-zA-Z0-9]+', '-', 'g'));
    if exists (select 1 from public.workspaces where slug = v_slug) then
      v_slug := v_slug || '-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 6);
    end if;
    insert into public.workspaces (name, slug, plan)
    values (v_ws_name, v_slug, 'free')
    returning id into v_ws_id;
    v_role := 'ADMIN';

  elsif v_ws_id is not null then
    -- Flow B: join existing workspace via invite
    if not exists (select 1 from public.workspaces where id = v_ws_id) then
      raise exception 'Workspace not found: %', v_ws_id;
    end if;
    if v_token is not null then
      if not exists (
        select 1 from public.workspace_invites
        where token = v_token
          and workspace_id = v_ws_id
          and used_at is null
          and expires_at > now()
      ) then
        raise exception 'Invalid or expired invite token';
      end if;
    end if;

  else
    -- Flow C: OAuth / social sign-in (no workspace metadata).
    -- Create profile using Google's fields; workspace join handled client-side.
    insert into public.profiles (id, name, profile_image, dob)
    values (
      new.id,
      coalesce(
        nullif(new.raw_user_meta_data->>'name', ''),
        nullif(new.raw_user_meta_data->>'full_name', ''),
        split_part(new.email, '@', 1)
      ),
      nullif(coalesce(
        new.raw_user_meta_data->>'profile_image',
        new.raw_user_meta_data->>'avatar_url'
      ), ''),
      null
    );
    return new;
  end if;

  -- Create profile (Flows A and B)
  insert into public.profiles (id, name, profile_image, dob)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), 'New User'),
    nullif(new.raw_user_meta_data->>'profile_image', ''),
    nullif(new.raw_user_meta_data->>'dob', '')::date
  );

  -- Create workspace membership
  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_ws_id, new.id, v_role);

  -- Mark invite used (Flow B only)
  if v_token is not null then
    update public.workspace_invites set used_at = now() where token = v_token;
  end if;

  return new;
end;
$$;


-- ── 2. Add accept_invite() RPC ───────────────────────────────────────────────
-- Called client-side when an OAuth user arrives with a pending invite token
-- stored in localStorage. SECURITY DEFINER bypasses RLS so it can:
--   • insert into workspace_members for the caller
--   • mark the invite as used
-- Returns: { workspace_id, role } on success, or { error } if invalid.

create or replace function public.accept_invite(p_token text)
returns jsonb language plpgsql security definer as $$
declare
  v_invite record;
begin
  -- Find a valid, unused, unexpired invite
  select * into v_invite
  from public.workspace_invites
  where token = p_token
    and used_at is null
    and expires_at > now();

  if not found then
    return jsonb_build_object('error', 'Invalid or expired invite');
  end if;

  -- Insert membership; skip silently if the user is already a member
  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_invite.workspace_id, auth.uid(), v_invite.role)
  on conflict (workspace_id, user_id) do nothing;

  -- Mark the invite as used
  update public.workspace_invites
  set used_at = now()
  where id = v_invite.id;

  return jsonb_build_object(
    'workspace_id', v_invite.workspace_id::text,
    'role',         v_invite.role
  );
end;
$$;

-- Grant execute to authenticated users (RLS still enforced via auth.uid() inside)
grant execute on function public.accept_invite(text) to authenticated;


-- DOWN (development only — restores original trigger that rejects OAuth users)
-- create or replace function public.handle_new_user() ...
--   (copy from 004_rewrite_trigger.sql — the version with `else raise exception`)
-- drop function if exists public.accept_invite(text);
