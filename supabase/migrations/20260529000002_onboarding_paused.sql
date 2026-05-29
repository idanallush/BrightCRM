-- Add "בהשהייה" to onboarding_status allowed values.
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_onboarding_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_onboarding_status_check
  CHECK (onboarding_status IN ('בתהליך קליטה', 'באוויר', 'בהשהייה'));
