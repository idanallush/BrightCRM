-- Junction table for multiple account managers per client
CREATE TABLE client_account_managers (
  client_id  uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  member_id  uuid NOT NULL REFERENCES team_members(id) ON DELETE RESTRICT,
  PRIMARY KEY (client_id, member_id)
);

-- Enable RLS with same policy as other tables
ALTER TABLE client_account_managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY bright_full_access ON client_account_managers
  FOR ALL TO authenticated
  USING (is_bright_member())
  WITH CHECK (is_bright_member());

-- Migrate existing data: copy current account_manager_id into new junction table
INSERT INTO client_account_managers (client_id, member_id)
SELECT id, account_manager_id
FROM clients
WHERE account_manager_id IS NOT NULL;

-- Drop the old single-FK column
ALTER TABLE clients DROP COLUMN account_manager_id;
