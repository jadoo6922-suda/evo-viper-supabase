-- Security hardening follow-ups (safe re-run where possible)

alter table public.store_profiles drop constraint if exists store_profiles_role_check;
alter table public.store_profiles
  add constraint store_profiles_role_check
  check (role in (
    'user', 'customer', 'merchant', 'admin', 'super_admin',
    'support', 'moderator', 'finance', 'product_manager'
  ));

-- Non-negative wallet balances when column exists
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='store_wallets' and column_name='balance'
  ) then
    begin
      alter table public.store_wallets drop constraint if exists store_wallets_balance_nonneg;
      alter table public.store_wallets add constraint store_wallets_balance_nonneg check (balance >= 0);
    exception when others then
      raise notice 'balance check skipped: %', SQLERRM;
    end;
  end if;
end $$;
