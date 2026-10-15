-- Allow roles used by the app. Safe re-run.
alter table public.store_profiles drop constraint if exists store_profiles_role_check;
alter table public.store_profiles
  add constraint store_profiles_role_check
  check (role in (
    'user', 'customer', 'merchant', 'admin', 'super_admin',
    'support', 'moderator', 'finance', 'product_manager'
  ));
