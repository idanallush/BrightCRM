-- Add comment_id to notifications for deep linking to specific comments
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS comment_id uuid REFERENCES task_comments(id) ON DELETE SET NULL;
