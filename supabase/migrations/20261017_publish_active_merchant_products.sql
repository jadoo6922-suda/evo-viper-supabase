-- Make shared catalog consistent: active merchants' pending products become published.
-- Private data (wallets, orders, PINs) remain owner-scoped; only public catalog rows are affected.
update public.store_products p
set status = 'published',
    updated_at = now()
where p.status = 'pending'
  and p.seller_id is not null
  and exists (
    select 1
    from public.store_profiles pr
    where pr.id = p.seller_id
      and pr.role = 'merchant'
      and pr.account_status = 'active'
      and pr.merchant_activated_at is not null
      and pr.merchant_license_revoked_at is null
  );
