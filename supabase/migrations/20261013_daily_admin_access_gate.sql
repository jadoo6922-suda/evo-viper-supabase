-- Daily, single-use administrative gate tokens. Raw tokens are never stored.
create table if not exists public.store_admin_daily_access (
  id uuid primary key default gen_random_uuid(),
  access_date date not null unique,
  path_token_hash text not null unique,
  key_hash text not null,
  qr_token_hash text not null,
  expires_at timestamptz not null,
  sent_at timestamptz,
  key_verified_at timestamptz,
  qr_verified_at timestamptz,
  user_id uuid references auth.users(id) on delete cascade,
  attempts integer not null default 0 check (attempts >= 0 and attempts <= 100),
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.store_admin_daily_access add column if not exists qr_verified_at timestamptz;
create index if not exists store_admin_daily_access_expiry_idx on public.store_admin_daily_access (expires_at);
alter table public.store_admin_daily_access enable row level security;
revoke all privileges on table public.store_admin_daily_access from anon, authenticated;
grant all privileges on table public.store_admin_daily_access to service_role;
comment on table public.store_admin_daily_access is 'Server-only daily admin gate. Stores hashes of daily path/key/QR tokens, never raw secrets.';
