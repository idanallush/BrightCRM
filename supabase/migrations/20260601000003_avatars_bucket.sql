-- Public storage bucket for user avatar photos.
-- Public read (so <img src> works without signing); writes restricted to Bright members.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select to public
  using (bucket_id = 'avatars');

drop policy if exists "avatars_bright_write" on storage.objects;
create policy "avatars_bright_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars' and is_bright_member())
  with check (bucket_id = 'avatars' and is_bright_member());
