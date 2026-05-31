-- Watchers: members who follow a task and receive its notifications,
-- separate from assignees (who are responsible for doing the work).

create table task_watchers (
  task_id    uuid not null references tasks(id) on delete cascade,
  member_id  uuid not null references team_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, member_id)
);

create index task_watchers_member_idx on task_watchers(member_id);

alter table task_watchers enable row level security;

create policy bright_full_access on task_watchers
  for all to authenticated
  using (is_bright_member()) with check (is_bright_member());
