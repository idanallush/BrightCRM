-- Persistent log of every email sent by the system.
CREATE TABLE email_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipients      text[] NOT NULL,
  subject         text NOT NULL,
  email_type      text,          -- 'new_task' | 'comment' | 'mention' | 'overdue' | 'digest'
  reference_id    uuid,          -- task_id or comment_id
  status          text NOT NULL DEFAULT 'sent',  -- 'sent' | 'failed'
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX email_log_created_idx ON email_log(created_at DESC);
CREATE INDEX email_log_type_idx ON email_log(email_type);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY bright_full_access ON email_log
  FOR ALL TO authenticated
  USING (is_bright_member()) WITH CHECK (is_bright_member());
