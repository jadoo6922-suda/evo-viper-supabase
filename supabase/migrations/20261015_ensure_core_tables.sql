-- Minimal core tables so /api/me/profile can work on a fresh Supabase project.
-- Safe to re-run (IF NOT EXISTS).

create table if not exists public.store_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  username text,
  display_name text,
  role text not null default 'customer',
  account_status text not null default 'active',
  security_status text not null default 'secure',
  has_pin_set boolean not null default false,
  avatar_url text,
  mfa_enabled boolean not null default false,
  merchant_activated_at timestamptz,
  merchant_license_id text,
  merchant_license_revoked_at timestamptz,
  merchant_license_revoke_reason text,
  verified_seller boolean not null default false,
  referral_code text,
  referred_by uuid,
  referral_pending boolean not null default false,
  telegram_chat_id text,
  telegram_username text,
  telegram_linked_at timestamptz,
  transfer_code text,
  transfer_code_expires_at bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists store_profiles_username_uidx on public.store_profiles (username) where username is not null;
create unique index if not exists store_profiles_email_uidx on public.store_profiles (email) where email is not null;

create table if not exists public.store_wallets (
  user_id uuid primary key references public.store_profiles (id) on delete cascade,
  balance numeric not null default 0,
  frozen boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.store_security_profiles (
  user_id uuid primary key references public.store_profiles (id) on delete cascade,
  pin_enabled boolean not null default false,
  transfer_pin_hash text,
  transfer_pin_salt text,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  session_revoked_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Service role used by Express bypasses RLS; still enable RLS for safety.
alter table public.store_profiles enable row level security;
alter table public.store_wallets enable row level security;
alter table public.store_security_profiles enable row level security;
