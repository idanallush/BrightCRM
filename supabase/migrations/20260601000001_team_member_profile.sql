-- Profile additions for team members: avatar photo + notification channel prefs.

-- Avatar photo (stored in the public "avatars" bucket; null = fall back to initials)
alter table team_members
  add column if not exists avatar_url text;

-- Notification channel preferences (default: receive on both channels)
alter table team_members
  add column if not exists notify_email boolean not null default true;

alter table team_members
  add column if not exists notify_whatsapp boolean not null default true;
