-- ============================================================
-- Migration 003: Fix unique constraints for multi-workspace
-- Run AFTER 002_add_workspace_id.sql
-- ============================================================

-- UP

-- verticals.name was globally unique — two orgs cannot both have "Design".
-- Replace with per-workspace unique constraint.
alter table public.verticals drop constraint if exists verticals_name_key;
alter table public.verticals add constraint verticals_name_workspace_unique unique (workspace_id, name);

-- DOWN
-- alter table public.verticals drop constraint if exists verticals_name_workspace_unique;
-- alter table public.verticals add constraint verticals_name_key unique (name);
