-- Recurring tasks support
ALTER TABLE tasks
  ADD COLUMN recurrence_rule jsonb DEFAULT NULL,
  ADD COLUMN recurring_source_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  ADD COLUMN next_recurrence_date date;

-- Index for the cron job that creates recurring instances
CREATE INDEX idx_tasks_next_recurrence ON tasks(next_recurrence_date)
  WHERE recurrence_rule IS NOT NULL;

-- Update the source CHECK constraint to include 'recurring'
-- First drop the existing one, then recreate with the new value
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_source_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_source_check
  CHECK (source IN ('web', 'whatsapp', 'telegram', 'import', 'recurring'));
