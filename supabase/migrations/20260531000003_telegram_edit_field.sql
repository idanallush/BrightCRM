-- Adds edit_field column to telegram_pending_tasks.
-- When set (e.g. 'title', 'due_date'), the next text message from the user
-- updates that field in parsed_data instead of creating a new task.

alter table telegram_pending_tasks
  add column edit_field text;
