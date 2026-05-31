-- Tags system: tags table + task_tags junction table

create table tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text, -- hex color e.g. '#FFE4E8'
  created_at timestamptz default now()
);

create table task_tags (
  task_id uuid not null references tasks(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (task_id, tag_id)
);

-- RLS
alter table tags enable row level security;
alter table task_tags enable row level security;

create policy bright_full_access on tags
  for all to authenticated
  using (is_bright_member())
  with check (is_bright_member());

create policy bright_full_access on task_tags
  for all to authenticated
  using (is_bright_member())
  with check (is_bright_member());

-- Seed default tags with pastel colors
insert into tags (name, color) values
  ('קמפיין', '#DCE4FF'),
  ('תוכן', '#D0F0E8'),
  ('דיזיין', '#EDE0FF'),
  ('אסטרטגיה', '#FFF4CC'),
  ('דיווח', '#FFE0D0');
