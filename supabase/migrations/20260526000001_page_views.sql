create table page_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  page text not null,
  viewed_at timestamptz default now()
);

alter table page_views enable row level security;

create policy "Authenticated users can insert page views"
  on page_views for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Authenticated users can read page views"
  on page_views for select to authenticated
  using (true);
