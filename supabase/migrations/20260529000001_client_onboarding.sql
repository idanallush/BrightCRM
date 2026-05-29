-- Add onboarding / intake fields to clients.
-- Mirrors the Airtable "קליטה ואפיון לקוח" form.

ALTER TABLE clients ADD COLUMN onboarding_status text
  CHECK (onboarding_status IN ('בתהליך קליטה', 'באוויר'));

ALTER TABLE clients ADD COLUMN onboarding_date date;

-- Characterization fields (אפיון)
ALTER TABLE clients ADD COLUMN competitors text;
ALTER TABLE clients ADD COLUMN target_audience text;
ALTER TABLE clients ADD COLUMN core_message text;
ALTER TABLE clients ADD COLUMN campaign_goal text;
ALTER TABLE clients ADD COLUMN differentiation text;

-- Multi-select arrays
ALTER TABLE clients ADD COLUMN digital_assets text[] NOT NULL DEFAULT '{}';
ALTER TABLE clients ADD COLUMN previous_campaigns text[] NOT NULL DEFAULT '{}';

-- Index for filtering onboarding clients
CREATE INDEX clients_onboarding_idx ON clients(onboarding_status)
  WHERE onboarding_status IS NOT NULL;
