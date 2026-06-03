-- Allow tasks without a client (general tasks assigned to everyone)
alter table tasks alter column client_id drop not null;
