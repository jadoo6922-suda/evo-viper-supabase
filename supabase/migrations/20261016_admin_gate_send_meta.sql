-- Metadata for daily admin gate email attempts (no raw tokens stored).
alter table public.store_admin_daily_access
  add column if not exists send_attempts integer not null default 0;
alter table public.store_admin_daily_access
  add column if not exists last_error text;

comment on column public.store_admin_daily_access.send_attempts is 'Number of Supabase Auth email queue attempts for this daily gate.';
comment on column public.store_admin_daily_access.last_error is 'Last sanitized send error (never includes path tokens).';
