-- Add threaded replies and media attachments to task comments.

-- A) Add parent_id for threading (null = top-level comment)
ALTER TABLE task_comments
  ADD COLUMN parent_id uuid REFERENCES task_comments(id) ON DELETE CASCADE;

CREATE INDEX task_comments_parent_idx ON task_comments(parent_id) WHERE parent_id IS NOT NULL;

-- B) Comment attachments (separate from the general attachments table)
CREATE TABLE comment_attachments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id   uuid NOT NULL REFERENCES task_comments(id) ON DELETE CASCADE,
  file_name    text NOT NULL,
  file_size    bigint,
  content_type text,
  storage_path text NOT NULL,
  uploaded_by  uuid REFERENCES team_members(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX comment_attachments_comment_idx ON comment_attachments(comment_id);

-- C) RLS
ALTER TABLE comment_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY bright_full_access ON comment_attachments
  FOR ALL TO authenticated
  USING (is_bright_member()) WITH CHECK (is_bright_member());
