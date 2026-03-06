-- ============================================================
-- Migration 004: Rewrite handle_new_user trigger
-- Run AFTER 003_fix_constraints.sql
-- ============================================================

-- UP

-- Supports two registration flows:
--
-- Flow A — New workspace:
--   raw_user_meta_data: { name, dob, workspace_name, profile_image? }
--   → Creates new workspace, inserts profile, inserts workspace_members as ADMIN
--
-- Flow B — Joining via invite:
--   raw_user_meta_data: { name, dob, workspace_id, role, invite_token, profile_image? }
--   → Validates token, inserts profile, inserts workspace_members with given role,
--     marks invite as used

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
    -- Ensure slug uniqueness
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
    raise exception 'Registration requires workspace_name (new workspace) or workspace_id (join existing)';
  end if;

  -- Create profile (no role column — lives in workspace_members)
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

-- Trigger binding already exists; no need to recreate.
-- If it doesn't exist, run:
-- drop trigger if exists on_auth_user_created on auth.users;
-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row execute procedure public.handle_new_user();
