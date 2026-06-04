-- Add completed_at timestamp to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Backfill: set completed_at for existing completed tasks using updated_at
UPDATE tasks SET completed_at = updated_at WHERE status = 'בוצע' AND completed_at IS NULL;
