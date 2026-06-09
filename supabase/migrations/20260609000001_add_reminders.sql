create table reminders (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  reminder_date   date not null,
  reminder_time   time,
  scope           text not null default 'personal'
                  check (scope in ('personal', 'team')),
  created_by_id   uuid not null references team_members(id),
  is_completed    boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index reminders_date_idx on reminders(reminder_date);
create index reminders_created_by_idx on reminders(created_by_id);
create index reminders_active_idx on reminders(reminder_date, is_completed) where is_completed = false;

-- Use the existing set_updated_at() trigger function
create trigger reminders_set_updated_at before update on reminders
  for each row execute function set_updated_at();

-- RLS — same simple policy as other tables (small team, everyone sees everything)
alter table reminders enable row level security;
create policy "Authenticated users full access on reminders"
  on reminders for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
