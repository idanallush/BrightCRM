-- Performance RPCs: move counting logic from JS to PostgreSQL

-- 1. Comment counts grouped by task
CREATE OR REPLACE FUNCTION get_comment_counts_by_tasks(task_ids uuid[])
RETURNS TABLE(task_id uuid, count bigint) AS $$
  SELECT task_id, COUNT(*)::bigint as count
  FROM task_comments
  WHERE task_id = ANY(task_ids)
  GROUP BY task_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Open task counts grouped by client
CREATE OR REPLACE FUNCTION get_open_task_counts_by_client()
RETURNS TABLE(client_id uuid, count bigint) AS $$
  SELECT client_id, COUNT(*)::bigint as count
  FROM tasks
  WHERE client_id IS NOT NULL
  AND status IN ('מחכה לטיפול', 'נכנס לעבודה', 'בעבודה', 'אישור לקוח')
  GROUP BY client_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Weekly source counts
CREATE OR REPLACE FUNCTION get_weekly_source_counts()
RETURNS TABLE(source text, count bigint) AS $$
  SELECT COALESCE(source, 'ידני') as source, COUNT(*)::bigint as count
  FROM tasks
  WHERE created_at >= NOW() - INTERVAL '7 days'
  GROUP BY source;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. Missing indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_member_id ON task_assignees(member_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_lookup ON notification_log(type, recipient_email, reference_id);
