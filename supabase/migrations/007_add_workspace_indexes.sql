-- ============================================================
-- Migration 007: Add missing workspace-scoped indexes
-- Run in: Supabase Dashboard → SQL Editor
--
-- WHY: All workspace-scoped queries (tasks, projects, meetings)
-- filter by workspace_id but no index exists on that column —
-- every query does a full table scan. At scale (500+ rows) this
-- degrades performance noticeably. Safe to run on live DB.
-- ============================================================

-- UP ─────────────────────────────────────────────────────────

-- tasks: most-queried table — every kanban, allTasks, myTasks
-- load filters by workspace_id
CREATE INDEX IF NOT EXISTS tasks_workspace_id_idx
  ON public.tasks(workspace_id);

-- projects: fetched on every workspace switch in AppContext
CREATE INDEX IF NOT EXISTS projects_workspace_id_idx
  ON public.projects(workspace_id);

-- meetings: calendar view + meetings page filter by workspace_id
CREATE INDEX IF NOT EXISTS meetings_workspace_id_idx
  ON public.meetings(workspace_id);

-- task_assignees: listTasks with assigneeId filter does a
-- SELECT task_id FROM task_assignees WHERE user_id = ? before
-- the main tasks query — this index covers that lookup
CREATE INDEX IF NOT EXISTS task_assignees_user_id_idx
  ON public.task_assignees(user_id);

-- ─────────────────────────────────────────────────────────────
-- DOWN (rollback)
-- DROP INDEX IF EXISTS tasks_workspace_id_idx;
-- DROP INDEX IF EXISTS projects_workspace_id_idx;
-- DROP INDEX IF EXISTS meetings_workspace_id_idx;
-- DROP INDEX IF EXISTS task_assignees_user_id_idx;
-- ─────────────────────────────────────────────────────────────
