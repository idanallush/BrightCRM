-- Expand task statuses, add task_comments, add notifications.

-- A) Expand task statuses
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('מחכה לטיפול', 'נכנס לעבודה', 'בעבודה', 'אישור לקוח', 'אישור מנהל', 'בוצע', 'בוטל'));

UPDATE tasks SET status = 'בוטל' WHERE status = 'סגור';

-- Update the partial index to cover all active statuses
DROP INDEX IF EXISTS tasks_status_open_idx;
CREATE INDEX tasks_status_active_idx ON tasks(status)
  WHERE status IN ('מחכה לטיפול', 'נכנס לעבודה', 'בעבודה', 'אישור לקוח', 'אישור מנהל');

-- B) Task comments
CREATE TABLE task_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id  uuid NOT NULL REFERENCES team_members(id),
  content    text NOT NULL,
  mentions   uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX task_comments_task_idx   ON task_comments(task_id);
CREATE INDEX task_comments_author_idx ON task_comments(author_id);

CREATE TRIGGER task_comments_set_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- C) Notifications
CREATE TABLE notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES team_members(id),
  type         text NOT NULL CHECK (type IN ('mention', 'status_change', 'assignment', 'comment')),
  task_id      uuid REFERENCES tasks(id) ON DELETE CASCADE,
  from_user_id uuid REFERENCES team_members(id),
  content      text NOT NULL,
  read         boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_idx   ON notifications(user_id);
CREATE INDEX notifications_unread_idx ON notifications(user_id) WHERE read = false;

-- D) RLS on new tables
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY bright_full_access ON task_comments
  FOR ALL TO authenticated
  USING (is_bright_member()) WITH CHECK (is_bright_member());

CREATE POLICY bright_full_access ON notifications
  FOR ALL TO authenticated
  USING (is_bright_member()) WITH CHECK (is_bright_member());
