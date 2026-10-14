-- EVO VIPER: remove browser-role access to application tables in the exposed public schema.
-- IMPORTANT: apply ONLY after deploying the server API changes and passing scripts/test-api-access.mjs.
-- Supabase Auth and Storage are separate schemas; this migration intentionally does not alter them.
-- The backend uses SUPABASE_SERVICE_ROLE_KEY only on the server, so server-side operations continue.

begin;

-- Tables, views and materialized views exposed through the public Data API.
revoke all privileges on all tables in schema public from anon, authenticated;

-- Prevent table access via sequences as well (e.g. legacy serial-backed tables).
revoke all privileges on all sequences in schema public from anon, authenticated;

-- New public-schema tables/sequences created by postgres should not silently regain browser access.
alter default privileges for role postgres in schema public
  revoke all privileges on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all privileges on sequences from anon, authenticated;

commit;

-- Post-apply verification query (run separately):
-- select table_schema, table_name, grantee, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public' and grantee in ('anon', 'authenticated')
-- order by table_name, grantee, privilege_type;
-- Expected: no rows for application tables/views.
