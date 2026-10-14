-- Supabase auth/profile bootstrap and client privilege hardening.
-- This migration assumes the existing store_* base schema is already present.

-- Application fields added while replacing Firebase documents with relational rows.
alter table public.store_profiles add column if not exists display_name text;
alter table public.store_profiles add column if not exists email text;
alter table public.store_profiles add column if not exists account_status text not null default 'active';
alter table public.store_profiles add column if not exists avatar_url text;
alter table public.store_profiles add column if not exists username text;
alter table public.store_profiles add column if not exists transfer_code text;
alter table public.store_profiles add column if not exists transfer_code_expires_at bigint;
alter table public.store_profiles add column if not exists security_status text not null default 'secure';
alter table public.store_profiles add column if not exists mfa_enabled boolean not null default false;
alter table public.store_profiles add column if not exists has_pin_set boolean not null default false;
alter table public.store_profiles add column if not exists merchant_activated_at timestamptz;
alter table public.store_profiles add column if not exists merchant_license_id text;
alter table public.store_profiles add column if not exists merchant_license_revoked_at timestamptz;
alter table public.store_profiles add column if not exists merchant_license_revoke_reason text;
alter table public.store_profiles add column if not exists verified_seller boolean not null default false;
alter table public.store_profiles add column if not exists referral_code text;
alter table public.store_profiles add column if not exists referred_by uuid;
alter table public.store_profiles add column if not exists referral_pending boolean not null default false;
alter table public.store_profiles add column if not exists telegram_chat_id text;
alter table public.store_profiles add column if not exists telegram_username text;
alter table public.store_profiles add column if not exists telegram_linked_at timestamptz;
alter table public.store_profiles add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.store_products add column if not exists title_en text;
alter table public.store_products add column if not exists image_urls jsonb not null default '[]'::jsonb;
alter table public.store_products add column if not exists demo_video_url text;
alter table public.store_products add column if not exists demo_url text;
alter table public.store_products add column if not exists file_format text;
alter table public.store_products add column if not exists download_url text;
alter table public.store_products add column if not exists file_name text;
alter table public.store_products add column if not exists file_data text;
alter table public.store_products add column if not exists file_type text;
alter table public.store_products add column if not exists file_size text;
alter table public.store_products add column if not exists downloads_count bigint not null default 0;
alter table public.store_products add column if not exists rating numeric not null default 0;
alter table public.store_products add column if not exists rating_count bigint not null default 0;
alter table public.store_products add column if not exists features jsonb not null default '[]'::jsonb;
alter table public.store_products add column if not exists features_en jsonb not null default '[]'::jsonb;
alter table public.store_products add column if not exists seller_name text;
alter table public.store_products add column if not exists rejection_reason text;
alter table public.store_products add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.store_products add column if not exists file_storage_path text;

alter table public.store_orders add column if not exists product_name text;
alter table public.store_orders add column if not exists product_thumbnail text;
alter table public.store_orders add column if not exists use_escrow boolean not null default false;
alter table public.store_orders add column if not exists dispute_id uuid;
alter table public.store_orders add column if not exists disputed_at timestamptz;
alter table public.store_orders add column if not exists dispute_resolved_at timestamptz;
alter table public.store_orders add column if not exists dispute_decision text;
alter table public.store_orders add column if not exists license_key text;
alter table public.store_orders add column if not exists escrow_released_at timestamptz;
alter table public.store_orders add column if not exists auto_released boolean not null default false;
alter table public.store_orders add column if not exists transaction_id uuid;
alter table public.store_orders add column if not exists download_url text;
alter table public.store_orders add column if not exists download_url_expires_at bigint;
alter table public.store_orders add column if not exists downloads_count bigint not null default 0;
alter table public.store_orders add column if not exists max_downloads bigint not null default 10;
alter table public.store_orders add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.store_orders add column if not exists escrow_status text;

alter table public.store_transactions add column if not exists sender_name text;
alter table public.store_transactions add column if not exists receiver_name text;
alter table public.store_transactions add column if not exists sender_id uuid;
alter table public.store_transactions add column if not exists product_id uuid;
alter table public.store_transactions add column if not exists security_verification_hash text;
alter table public.store_transactions add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.store_ledger_entries add column if not exists description text;
alter table public.store_ledger_entries add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.store_disputes add column if not exists transaction_id uuid;
alter table public.store_disputes add column if not exists reporter_name text;
alter table public.store_disputes add column if not exists respondent_name text;
alter table public.store_disputes add column if not exists reason_label text;
alter table public.store_disputes add column if not exists evidence_files jsonb not null default '[]'::jsonb;
alter table public.store_disputes add column if not exists ocr_verification jsonb;
alter table public.store_disputes add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.store_disputes add column if not exists amount numeric(14,2);
alter table public.store_disputes add column if not exists opened_by uuid;
alter table public.store_disputes add column if not exists buyer_id uuid;
alter table public.store_disputes add column if not exists seller_id uuid;
alter table public.store_disputes add column if not exists description text;
alter table public.store_disputes add column if not exists resolution text;
alter table public.store_disputes add column if not exists resolved_by uuid;
alter table public.store_disputes add column if not exists resolved_at timestamptz;
alter table public.store_disputes add column if not exists updated_at timestamptz;

alter table public.store_merchant_applications add column if not exists full_name text;
alter table public.store_merchant_applications add column if not exists phone text;
alter table public.store_merchant_applications add column if not exists business_description text;
alter table public.store_merchant_applications add column if not exists portfolio_urls jsonb not null default '[]'::jsonb;
alter table public.store_merchant_applications add column if not exists reviewed_at timestamptz;
alter table public.store_merchant_applications add column if not exists review_note text;
alter table public.store_merchant_applications add column if not exists license_paid boolean not null default false;
alter table public.store_merchant_applications add column if not exists license_paid_at timestamptz;
alter table public.store_merchant_applications add column if not exists application_data jsonb not null default '{}'::jsonb;
alter table public.store_merchant_applications add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.store_merchant_deposits add column if not exists refundable_at timestamptz;
alter table public.store_merchant_deposits add column if not exists refunded_at timestamptz;
alter table public.store_merchant_deposits add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.store_merchant_reports add column if not exists merchant_name text;
alter table public.store_merchant_reports add column if not exists reporter_name text;
alter table public.store_merchant_reports add column if not exists evidence text;
alter table public.store_merchant_reports add column if not exists resolved_at timestamptz;
alter table public.store_merchant_reports add column if not exists resolved_by uuid;
alter table public.store_merchant_reports add column if not exists resolution_note text;
alter table public.store_merchant_reports add column if not exists updated_at timestamptz;
alter table public.store_merchant_reports add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.store_notifications add column if not exists title_en text;
alter table public.store_notifications add column if not exists body_en text;
alter table public.store_notifications add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.store_audit_logs add column if not exists actor_email text;
alter table public.store_audit_logs add column if not exists actor_role text;
alter table public.store_audit_logs add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.store_audit_logs add column if not exists user_agent text;
alter table public.store_platform_settings add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.store_reviews add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.store_support_tickets add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.store_support_messages add column if not exists metadata jsonb not null default '{}'::jsonb;


alter table public.store_profiles drop constraint if exists store_profiles_role_check;
alter table public.store_profiles add constraint store_profiles_role_check
  check (role in ('user','merchant','support','admin','super_admin','moderator','finance','product_manager'));

create unique index if not exists store_profiles_username_lower_unique
  on public.store_profiles (lower(username)) where username is not null;

create unique index if not exists store_profiles_transfer_code_unique
  on public.store_profiles (transfer_code) where transfer_code is not null;

alter table public.store_security_profiles add column if not exists transfer_pin_salt text;
alter table public.store_security_profiles add column if not exists pin_enabled boolean not null default false;

alter table public.store_wallets alter column balance type numeric(14,2) using balance::numeric(14,2);
-- Seller-less legacy/system orders are allowed by schema; the purchase RPC still requires a valid seller for marketplace purchases.
alter table public.store_orders drop constraint if exists store_orders_seller_required;
alter table public.store_security_profiles add column if not exists transfer_pin_hash text;
alter table public.store_security_profiles add column if not exists transfer_pin_salt text;
alter table public.store_security_profiles add column if not exists pin_enabled boolean not null default false;
alter table public.store_security_profiles add column if not exists failed_attempts integer not null default 0;
alter table public.store_security_profiles add column if not exists locked_until timestamptz;
alter table public.store_security_profiles add column if not exists updated_at timestamptz;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists public.store_escrow_holds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.store_orders(id) on delete restrict,
  buyer_id uuid not null references public.store_profiles(id) on delete restrict,
  seller_id uuid references public.store_profiles(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  status text not null default 'held' check (status in ('held','released','refunded','disputed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table public.store_escrow_holds add column if not exists resolved_at timestamptz;
alter table public.store_escrow_holds enable row level security;
revoke all on public.store_escrow_holds from anon, authenticated;
alter table public.store_transactions enable row level security;
alter table public.store_orders enable row level security;
alter table public.store_wallets enable row level security;
alter table public.store_ledger_entries enable row level security;
grant select on table public.store_wallets, public.store_ledger_entries, public.store_transactions, public.store_orders to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='store_transactions' and policyname='store_transactions_select_participant') then
    create policy store_transactions_select_participant on public.store_transactions for select to authenticated
      using (auth.uid() = user_id or auth.uid() = counterparty_user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='store_orders' and policyname='store_orders_select_participant') then
    create policy store_orders_select_participant on public.store_orders for select to authenticated
      using (auth.uid() = user_id or auth.uid() = seller_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='store_wallets' and policyname='store_wallets_select_own') then
    create policy store_wallets_select_own on public.store_wallets for select to authenticated
      using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='store_ledger_entries' and policyname='store_ledger_entries_select_own') then
    create policy store_ledger_entries_select_own on public.store_ledger_entries for select to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

insert into storage.buckets(id, name, public, file_size_limit)
values ('store-product-files', 'store-product-files', false, 104857600)
on conflict (id) do update set public = false, file_size_limit = 104857600;

drop policy if exists store_product_files_insert_owner on storage.objects;
drop policy if exists store_product_files_update_owner on storage.objects;
drop policy if exists store_product_files_delete_owner on storage.objects;
create policy store_product_files_insert_owner on storage.objects for insert to authenticated
with check (bucket_id = 'store-product-files' and (storage.foldername(name))[1] = auth.uid()::text and exists (select 1 from public.store_profiles p where p.id = auth.uid() and p.role in ('merchant','admin','super_admin','product_manager') and p.account_status = 'active'));
create policy store_product_files_update_owner on storage.objects for update to authenticated
using (bucket_id = 'store-product-files' and (storage.foldername(name))[1] = auth.uid()::text and exists (select 1 from public.store_profiles p where p.id = auth.uid() and p.role in ('merchant','admin','super_admin','product_manager') and p.account_status = 'active'))
with check (bucket_id = 'store-product-files' and (storage.foldername(name))[1] = auth.uid()::text and exists (select 1 from public.store_profiles p where p.id = auth.uid() and p.role in ('merchant','admin','super_admin','product_manager') and p.account_status = 'active'));
create policy store_product_files_delete_owner on storage.objects for delete to authenticated
using (bucket_id = 'store-product-files' and (storage.foldername(name))[1] = auth.uid()::text and exists (select 1 from public.store_profiles p where p.id = auth.uid() and p.role in ('merchant','admin','super_admin','product_manager') and p.account_status = 'active'));

-- Deny direct table writes from browser roles. Application writes go through authenticated server routes.
revoke all privileges on all tables in schema public from anon, authenticated;
grant select on table public.store_products to anon, authenticated;
grant select on table public.store_profiles, public.store_wallets, public.store_ledger_entries, public.store_transactions, public.store_orders to authenticated;
-- Profile changes (including Telegram linking) are routed through the server; no direct profile UPDATE is granted.

create or replace function public.store_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  wanted_username text;
  chosen_username text;
  base_name text;
begin
  wanted_username := lower(coalesce(new.raw_user_meta_data->>'username', ''));
  if wanted_username !~ '^[a-z0-9_]{3,24}$' then
    wanted_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);
  end if;
  chosen_username := wanted_username;
  if exists (select 1 from public.store_profiles p where lower(p.username) = lower(chosen_username)) then
    chosen_username := left(wanted_username, 15) || '_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  base_name := coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), chosen_username);
  insert into public.store_profiles(id, email, username, display_name, role, account_status)
  values (new.id, new.email, chosen_username, base_name, 'user', 'active')
  on conflict (id) do nothing;
  insert into public.store_wallets(user_id, balance)
  values (new.id, 0)
  on conflict (user_id) do nothing;
  insert into public.store_security_profiles(user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.store_handle_new_auth_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_store_profile on auth.users;
create trigger on_auth_user_created_store_profile
after insert on auth.users
for each row execute function public.store_handle_new_auth_user();
