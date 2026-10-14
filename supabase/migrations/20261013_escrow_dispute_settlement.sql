-- Atomic, idempotent escrow dispute settlement. Only the trusted server service role can call the wrapper.
create or replace function private.store_resolve_escrow_dispute(
  p_actor_id uuid, p_dispute_id uuid, p_decision text, p_tx_id uuid, p_ledger_id uuid,
  p_reference text, p_security_hash text
) returns jsonb
language plpgsql security definer
set search_path to 'public','private','pg_temp'
as $function$
declare
  v_result jsonb; v_role text; v_actor_status text; v_dispute public.store_disputes%rowtype;
  v_order public.store_orders%rowtype; v_hold public.store_escrow_holds%rowtype;
  v_target_id uuid; v_counterparty_id uuid; v_balance numeric(14,2); v_request text;
  v_tx_type text; v_ledger_type text; v_order_status text; v_hold_status text; v_dispute_status text;
begin
  if p_actor_id is null or p_dispute_id is null or p_decision is null or p_decision not in ('refund_buyer','release_seller') then raise exception 'invalid settlement request'; end if;
  select role, account_status into v_role, v_actor_status from public.store_profiles where id=p_actor_id;
  if v_actor_status is distinct from 'active' or v_role not in ('admin','super_admin') then raise exception 'administrator permission required'; end if;
  v_request := 'escrow-settle:' || p_dispute_id::text || ':' || p_decision;
  insert into public.store_idempotency_keys(key,user_id,operation,status)
  values(v_request,p_actor_id,'settleEscrowDispute','processing') on conflict(key) do nothing;
  select response into v_result from public.store_idempotency_keys where key=v_request and user_id=p_actor_id for update;
  if v_result is not null then return v_result; end if;
  if not exists(select 1 from public.store_idempotency_keys where key=v_request and user_id=p_actor_id and operation='settleEscrowDispute') then raise exception 'idempotency key conflict'; end if;
  select * into v_dispute from public.store_disputes where id=p_dispute_id for update;
  if not found or v_dispute.order_id is null then raise exception 'escrow dispute not found'; end if;
  if v_dispute.status not in ('open','under_review') then raise exception 'dispute already resolved'; end if;
  select * into v_order from public.store_orders where id=v_dispute.order_id for update;
  if not found then raise exception 'order not found'; end if;
  select * into v_hold from public.store_escrow_holds where order_id=v_order.id for update;
  if not found or v_hold.status not in ('held','disputed') or v_order.escrow_status not in ('held','disputed') then raise exception 'escrow funds are not held'; end if;
  if v_hold.amount <= 0 or v_hold.amount <> v_order.amount then raise exception 'escrow amount mismatch'; end if;
  if p_decision='refund_buyer' then
    v_target_id := v_hold.buyer_id; v_counterparty_id := v_hold.seller_id;
    v_tx_type := 'refund'; v_ledger_type := 'credit'; v_order_status := 'refunded'; v_hold_status := 'refunded'; v_dispute_status := 'resolved_buyer';
  else
    if v_hold.seller_id is null then raise exception 'seller missing'; end if;
    if not exists(select 1 from public.store_profiles where id=v_hold.seller_id and account_status='active') then raise exception 'seller account is not active'; end if;
    v_target_id := v_hold.seller_id; v_counterparty_id := v_hold.buyer_id;
    v_tx_type := 'sale'; v_ledger_type := 'credit'; v_order_status := 'completed'; v_hold_status := 'released'; v_dispute_status := 'resolved_seller';
  end if;
  insert into public.store_wallets(user_id,balance) values(v_target_id,0) on conflict(user_id) do nothing;
  select balance into v_balance from public.store_wallets where user_id=v_target_id for update;
  if p_decision='release_seller' and exists(select 1 from public.store_wallets where user_id=v_target_id and frozen) then raise exception 'seller wallet frozen'; end if;
  update public.store_wallets set balance=balance+v_hold.amount,updated_at=now() where user_id=v_target_id;
  insert into public.store_transactions(id,user_id,counterparty_user_id,order_id,transaction_type,amount,currency,status,reference,idempotency_key,description,security_verification_hash)
  values(p_tx_id,v_target_id,v_counterparty_id,v_order.id,v_tx_type,v_hold.amount,'COIN','completed',p_reference,v_request,
    case when p_decision='refund_buyer' then 'Escrow dispute refund to buyer' else 'Escrow dispute release to seller' end,p_security_hash);
  insert into public.store_ledger_entries(id,transaction_id,user_id,entry_type,amount,balance_after,currency,description)
  values(p_ledger_id,p_tx_id,v_target_id,v_ledger_type,v_hold.amount,v_balance+v_hold.amount,'COIN',
    case when p_decision='refund_buyer' then 'Escrow dispute refund' else 'Escrow dispute release' end);
  update public.store_orders set status=v_order_status,escrow_status=v_hold_status,escrow_released_at=case when p_decision='release_seller' then now() else escrow_released_at end,
    dispute_resolved_at=now(),dispute_decision=p_decision,updated_at=now() where id=v_order.id;
  update public.store_escrow_holds set status=v_hold_status,resolved_at=now() where order_id=v_order.id;
  update public.store_disputes set status=v_dispute_status,resolution=p_decision,resolved_by=p_actor_id,resolved_at=now(),updated_at=now() where id=v_dispute.id;
  v_result:=jsonb_build_object('success',true,'disputeId',v_dispute.id,'orderId',v_order.id,'decision',p_decision,'txId',p_tx_id,'reference',p_reference,'amount',v_hold.amount,'creditedUserId',v_target_id);
  update public.store_idempotency_keys set status='completed',response=v_result where key=v_request and user_id=p_actor_id;
  return v_result;
end; $function$;

create or replace function public.store_resolve_escrow_dispute_service(p_actor_id uuid,p_dispute_id uuid,p_decision text,p_tx_id uuid,p_ledger_id uuid,p_reference text,p_security_hash text)
returns jsonb language sql set search_path to 'public','private','pg_temp'
as $function$ select private.store_resolve_escrow_dispute(p_actor_id,p_dispute_id,p_decision,p_tx_id,p_ledger_id,p_reference,p_security_hash); $function$;
revoke all on function private.store_resolve_escrow_dispute(uuid,uuid,text,uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function private.store_resolve_escrow_dispute(uuid,uuid,text,uuid,uuid,text,text) to service_role;
revoke all on function public.store_resolve_escrow_dispute_service(uuid,uuid,text,uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.store_resolve_escrow_dispute_service(uuid,uuid,text,uuid,uuid,text,text) to service_role;
