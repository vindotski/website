-- From 2026-10-30 hosted projects no longer grant new public tables to any
-- API role by default, service_role included. Grant the sync script and the
-- search route what they need, explicitly. anon and authenticated stay revoked
grant select, insert, update, delete on table documents to service_role;
