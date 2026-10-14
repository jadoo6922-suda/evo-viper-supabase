-- Revoke direct browser-role writes across the application schema.
-- All mutations run through authenticated Node server routes using the server-only service role.
revoke all privileges on all tables in schema public from anon, authenticated;

-- Public catalog access is filtered by store_products_select_published RLS.
grant select on table public.store_products to anon, authenticated;

-- Authenticated browser reads are restricted by the existing per-user RLS policies.
grant select on table public.store_profiles, public.store_wallets, public.store_ledger_entries, public.store_transactions, public.store_orders to authenticated;
