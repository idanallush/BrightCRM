-- Add logo URL and brief text to clients
alter table clients add column logo_url text;
alter table clients add column brief text;
