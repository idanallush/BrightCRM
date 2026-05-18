-- BrightCRM initial schema.
-- Mirrors ANALYSIS.md §3 and the approved decisions in CLAUDE.md.
-- 9 tables only. No projects / weekly_reports / campaign_log / vendors / credentials.

create extension if not exists "pgcrypto";

-- team_members must exist before clients (FK target).
create table team_members (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  role          text,
  email         text not null unique,
  auth_user_id  uuid unique,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table clients (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null unique,
  contact_name        text,
  account_manager_id  uuid references team_members(id),
  phone               text,
  email               text,
  website_url         text,
  budget_note         text,
  drive_url           text,
  facebook_ads_url    text,
  google_ads_url      text,
  cms_url             text,
  analytics_url       text,
  health              text check (health in ('בריא','אסטרטגיה צריכה','קריטי')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table tasks (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  client_id      uuid not null references clients(id),
  description    text,
  status         text not null default 'בעבודה'
                 check (status in ('בעבודה','בוצע','סגור')),
  start_date     date not null default current_date,
  due_date       date,
  created_by_id  uuid references team_members(id),
  source         text not null default 'web'
                 check (source in ('web','telegram','import')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index tasks_client_idx          on tasks(client_id);
create index tasks_status_open_idx     on tasks(status) where status = 'בעבודה';
create index tasks_due_idx             on tasks(due_date) where due_date is not null;

create table task_assignees (
  task_id    uuid not null references tasks(id) on delete cascade,
  member_id  uuid not null references team_members(id) on delete restrict,
  primary key (task_id, member_id)
);

create table campaigns (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  client_id             uuid references clients(id),
  platform              text not null
                        check (platform in ('google','facebook','tiktok')),
  status                text check (status in ('פעיל','הסתיים','בעבודה','מושהה')),
  start_date            date,
  spent                 numeric(12,2),
  external_campaign_id  text,
  created_at            timestamptz not null default now()
);

create index campaigns_client_idx on campaigns(client_id);

create table meetings (
  id          uuid primary key default gen_random_uuid(),
  title       text,
  meeting_at  timestamptz,
  client_id   uuid references clients(id),
  attendees   text,
  summary     text not null,
  created_at  timestamptz not null default now()
);

create index meetings_client_idx on meetings(client_id);

create table client_strategies (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null unique references clients(id),
  strategy       text,
  kpis           text,
  audiences      text,
  messages_copy  text,
  testing        text,
  funnel_stages  text,
  timeline       text,
  updated_at     timestamptz not null default now()
);

create table content_resources (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null,
  topic       text,
  source_url  text not null,
  notes       text,
  created_at  timestamptz not null default now()
);

create table suggestions (
  id          uuid primary key default gen_random_uuid(),
  suggestion  text not null,
  notes       text,
  suggester   text,
  created_at  timestamptz not null default now()
);

-- Keep updated_at fresh on the tables that have it.
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clients_set_updated_at  before update on clients
  for each row execute function set_updated_at();
create trigger tasks_set_updated_at    before update on tasks
  for each row execute function set_updated_at();
create trigger strategies_set_updated_at before update on client_strategies
  for each row execute function set_updated_at();
