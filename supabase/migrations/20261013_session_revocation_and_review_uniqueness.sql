-- Server-enforced remote session revocation cutoff. Browser clients must not be able to change it.
alter table public.store_security_profiles
  add column if not exists session_revoked_at timestamptz;

-- One review per buyer per product. Existing duplicate rows must be resolved before this migration.
create unique index if not exists store_reviews_unique_product_reviewer
  on public.store_reviews (product_id, reviewer_id)
  where product_id is not null;

-- Keep the session revocation timestamp server-only.
revoke update (session_revoked_at) on public.store_security_profiles from anon, authenticated;
