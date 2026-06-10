-- Add "בעבודה סטודיו" and "בעבודה ספק חיצוני" statuses, remove old "בעבודה"

-- Migrate existing tasks with old "בעבודה" status to "בעבודה סטודיו"
UPDATE tasks SET status = 'בעבודה סטודיו' WHERE status = 'בעבודה';

-- Drop old CHECK constraint and add new one with updated statuses
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('מחכה לטיפול', 'נכנס לעבודה', 'בעבודה סטודיו', 'בעבודה ספק חיצוני', 'אישור לקוח', 'אישור מנהל', 'בוצע', 'בוטל'));
