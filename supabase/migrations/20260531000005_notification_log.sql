-- Email notification log to prevent duplicate emails.
CREATE TABLE notification_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type            text NOT NULL,
  recipient_email text NOT NULL,
  reference_id    uuid,
  sent_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notification_log_ref_idx ON notification_log(reference_id, type);
CREATE INDEX notification_log_sent_idx ON notification_log(sent_at);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY bright_full_access ON notification_log
  FOR ALL TO authenticated
  USING (is_bright_member()) WITH CHECK (is_bright_member());
