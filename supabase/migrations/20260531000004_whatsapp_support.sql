-- Replace Telegram bot with WhatsApp Cloud API.
-- Adds whatsapp_phone to team_members, creates pending tables,
-- updates tasks.source constraint, and drops Telegram tables/columns.

-- 1. Add whatsapp_phone to team_members
alter table team_members
  add column if not exists whatsapp_phone text unique;

create index if not exists team_members_whatsapp_idx
  on team_members(whatsapp_phone);

-- 2. Create WhatsApp pending registrations table
create table whatsapp_pending_registrations (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null unique,
  created_at  timestamptz not null default now()
);

-- 3. Create WhatsApp pending tasks table
create table whatsapp_pending_tasks (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null,
  parsed_data jsonb not null,
  edit_field   text,
  created_at  timestamptz not null default now()
);

-- 4. Update tasks.source check constraint to include 'whatsapp'
alter table tasks drop constraint if exists tasks_source_check;
alter table tasks add constraint tasks_source_check
  check (source in ('web', 'telegram', 'whatsapp', 'import'));

-- 5. Drop Telegram tables
drop table if exists telegram_pending_tasks;
drop table if exists telegram_pending_registrations;

-- 6. Drop Telegram column from team_members
drop index if exists team_members_telegram_idx;
alter table team_members drop column if exists telegram_user_id;
