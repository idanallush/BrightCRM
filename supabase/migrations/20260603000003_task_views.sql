-- Track when each team member last viewed a task.
CREATE TABLE task_views (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, member_id)
);

CREATE INDEX task_views_task_idx ON task_views(task_id);
CREATE INDEX task_views_member_idx ON task_views(member_id);

ALTER TABLE task_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY bright_full_access ON task_views
  FOR ALL TO authenticated
  USING (is_bright_member()) WITH CHECK (is_bright_member());
