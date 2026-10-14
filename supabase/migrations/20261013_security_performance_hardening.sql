-- Remove redundant participant policies (the base schema already has equivalent policies).
-- Keep the base policies which wrap auth.uid() in a scalar SELECT for better RLS plans.
drop policy if exists store_transactions_select_participant on public.store_transactions;
drop policy if exists store_ledger_entries_select_own on public.store_ledger_entries;

-- Trigger functions do not need direct RPC execution grants from API roles.
do $$
begin
  if to_regprocedure('public.protect_store_profile_columns()') is not null then
    execute 'revoke all on function public.protect_store_profile_columns() from public, anon, authenticated';
  end if;
end $$;

-- Cover foreign-key lookups and deletes/updates with indexes identified by Supabase's advisor.
create index if not exists idx_store_audit_logs_actor_id on public.store_audit_logs(actor_id);
create index if not exists idx_store_disputes_buyer_id on public.store_disputes(buyer_id);
create index if not exists idx_store_disputes_opened_by on public.store_disputes(opened_by);
create index if not exists idx_store_disputes_resolved_by on public.store_disputes(resolved_by);
create index if not exists idx_store_disputes_seller_id on public.store_disputes(seller_id);
create index if not exists idx_store_escrow_holds_buyer_id on public.store_escrow_holds(buyer_id);
create index if not exists idx_store_escrow_holds_seller_id on public.store_escrow_holds(seller_id);
create index if not exists idx_store_idempotency_keys_user_id on public.store_idempotency_keys(user_id);
create index if not exists idx_store_ledger_entries_transaction_id on public.store_ledger_entries(transaction_id);
create index if not exists idx_store_merchant_activation_tokens_user_id on public.store_merchant_activation_tokens(user_id);
create index if not exists idx_store_merchant_applications_reviewed_by on public.store_merchant_applications(reviewed_by);
create index if not exists idx_store_merchant_applications_user_id on public.store_merchant_applications(user_id);
create index if not exists idx_store_merchant_deposits_reviewed_by on public.store_merchant_deposits(reviewed_by);
create index if not exists idx_store_merchant_deposits_user_id on public.store_merchant_deposits(user_id);
create index if not exists idx_store_merchant_reports_merchant_id on public.store_merchant_reports(merchant_id);
create index if not exists idx_store_merchant_reports_reporter_id on public.store_merchant_reports(reporter_id);
create index if not exists idx_store_merchant_reports_resolved_by on public.store_merchant_reports(resolved_by);
create index if not exists idx_store_orders_product_id on public.store_orders(product_id);
create index if not exists idx_store_platform_settings_updated_by on public.store_platform_settings(updated_by);
create index if not exists idx_store_reviews_reviewer_id on public.store_reviews(reviewer_id);
create index if not exists idx_store_reviews_seller_id on public.store_reviews(seller_id);
create index if not exists idx_store_support_messages_sender_id on public.store_support_messages(sender_id);
create index if not exists idx_store_support_tickets_assigned_to on public.store_support_tickets(assigned_to);
create index if not exists idx_store_support_tickets_user_id on public.store_support_tickets(user_id);
create index if not exists idx_store_transactions_counterparty_user_id on public.store_transactions(counterparty_user_id);
create index if not exists idx_store_transactions_order_id on public.store_transactions(order_id);
