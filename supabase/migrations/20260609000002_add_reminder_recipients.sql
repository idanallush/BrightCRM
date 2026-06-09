create table reminder_recipients (
  reminder_id  uuid not null references reminders(id) on delete cascade,
  member_id    uuid not null references team_members(id) on delete restrict,
  primary key (reminder_id, member_id)
);

create index reminder_recipients_member_idx on reminder_recipients(member_id);

alter table reminder_recipients enable row level security;

create policy "Authenticated users full access on reminder_recipients"
  on reminder_recipients for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
