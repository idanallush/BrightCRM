-- Allow deleting a client by cascading to all related records.
-- Affected FKs: tasks.client_id, campaigns.client_id, meetings.client_id, client_strategies.client_id

-- tasks: drop NOT NULL + old FK, re-add with CASCADE
alter table tasks drop constraint tasks_client_id_fkey;
alter table tasks add constraint tasks_client_id_fkey
  foreign key (client_id) references clients(id) on delete cascade;

-- campaigns
alter table campaigns drop constraint campaigns_client_id_fkey;
alter table campaigns add constraint campaigns_client_id_fkey
  foreign key (client_id) references clients(id) on delete cascade;

-- meetings
alter table meetings drop constraint meetings_client_id_fkey;
alter table meetings add constraint meetings_client_id_fkey
  foreign key (client_id) references clients(id) on delete cascade;

-- client_strategies
alter table client_strategies drop constraint client_strategies_client_id_fkey;
alter table client_strategies add constraint client_strategies_client_id_fkey
  foreign key (client_id) references clients(id) on delete cascade;
