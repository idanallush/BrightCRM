-- Attachments: files attached to either a client or a task (one of them required).
-- Storage layer: bucket "attachments" (must be created manually in dashboard —
-- see README). storage_path is the object key inside that bucket.

create table attachments (
  id            uuid primary key default gen_random_uuid(),
  file_name     text not null,
  file_size     integer,
  content_type  text,
  storage_path  text not null,
  client_id     uuid references clients(id) on delete cascade,
  task_id       uuid references tasks(id) on delete cascade,
  uploaded_by   uuid references team_members(id),
  created_at    timestamptz not null default now(),
  check (client_id is not null or task_id is not null)
);

create index attachments_client_idx on attachments(client_id) where client_id is not null;
create index attachments_task_idx   on attachments(task_id)   where task_id   is not null;

alter table attachments enable row level security;

create policy bright_full_access on attachments
  for all to authenticated
  using (is_bright_member())
  with check (is_bright_member());

-- Storage policy for the "attachments" bucket — same gate (Bright domain).
-- One policy covering all operations, scoped to this bucket only.
create policy bright_attachments_storage on storage.objects
  for all to authenticated
  using (bucket_id = 'attachments' and is_bright_member())
  with check (bucket_id = 'attachments' and is_bright_member());
