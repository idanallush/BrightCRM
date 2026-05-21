-- Layer 1: Telegram bot support.
-- Adds telegram_user_id to team_members for bot ↔ user mapping.
-- Creates pending registrations table for the email verification flow.
-- Creates pending tasks table for the confirm/edit flow.

alter table team_members
  add column telegram_user_id bigint unique;

create index team_members_telegram_idx on team_members(telegram_user_id);

-- Unrecognized Telegram users land here until they provide a matching email.
create table telegram_pending_registrations (
  id                uuid primary key default gen_random_uuid(),
  telegram_user_id  bigint not null unique,
  chat_id           bigint not null,
  created_at        timestamptz not null default now()
);

-- Parsed tasks waiting for user confirmation before being written to tasks table.
create table telegram_pending_tasks (
  id                uuid primary key default gen_random_uuid(),
  chat_id           bigint not null,
  telegram_user_id  bigint not null,
  parsed_data       jsonb not null,
  created_at        timestamptz not null default now()
);
