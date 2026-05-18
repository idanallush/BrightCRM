-- RLS — team of 4. Anyone authenticated with a @b-bright.co.il email
-- gets full read/write on every table. No row-level segmentation.
-- Domain restriction at the IdP level (Google `hd`) is the first gate;
-- this is the belt-and-suspenders second gate inside Postgres.

alter table team_members      enable row level security;
alter table clients           enable row level security;
alter table tasks             enable row level security;
alter table task_assignees    enable row level security;
alter table campaigns         enable row level security;
alter table meetings          enable row level security;
alter table client_strategies enable row level security;
alter table content_resources enable row level security;
alter table suggestions       enable row level security;

create or replace function is_bright_member()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() ->> 'email') ilike '%@b-bright.co.il',
    false
  );
$$;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'team_members','clients','tasks','task_assignees',
      'campaigns','meetings','client_strategies',
      'content_resources','suggestions'
    ])
  loop
    execute format($q$
      create policy bright_full_access on %I
        for all to authenticated
        using (is_bright_member())
        with check (is_bright_member());
    $q$, t);
  end loop;
end$$;
