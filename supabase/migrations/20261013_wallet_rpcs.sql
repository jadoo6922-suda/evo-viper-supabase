-- Atomic wallet, purchase, download, and escrow routines.
-- Service-role wrappers are the only entry points exposed to the Node server.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create or replace function private.store_send_transfer(
  p_sender_id uuid, p_recipient_id uuid, p_amount numeric, p_description text,
  p_request_id text, p_tx_id uuid, p_debit_id uuid, p_credit_id uuid,
  p_reference text, p_security_hash text
) returns jsonb
language plpgsql security definer
set search_path to 'public','private','pg_temp'
as $function$
declare v_result jsonb; v_sender_status text; v_recipient_status text; v_sender_balance numeric(14,2); v_recipient_balance numeric(14,2);
begin
  if p_sender_id is null or p_recipient_id is null or p_sender_id=p_recipient_id then raise exception 'invalid recipient'; end if;
  if p_amount is null or p_amount<=0 or p_amount>50000 or p_amount<>round(p_amount,2) then raise exception 'invalid amount'; end if;
  if p_request_id is null or length(trim(p_request_id))<8 or length(p_request_id)>160 then raise exception 'invalid idempotency key'; end if;
  if length(coalesce(p_description,''))>200 then raise exception 'description too long'; end if;
  insert into public.store_idempotency_keys(key,user_id,operation,status) values(p_request_id,p_sender_id,'sendTransfer','processing') on conflict(key) do nothing;
  select response into v_result from public.store_idempotency_keys where key=p_request_id and user_id=p_sender_id for update;
  if v_result is not null then return v_result; end if;
  if not exists(select 1 from public.store_idempotency_keys where key=p_request_id and user_id=p_sender_id and operation='sendTransfer') then raise exception 'idempotency key conflict'; end if;
  select account_status into v_sender_status from public.store_profiles where id=p_sender_id;
  select account_status into v_recipient_status from public.store_profiles where id=p_recipient_id;
  if v_sender_status is distinct from 'active' then raise exception 'sender account is not active'; end if;
  if v_recipient_status is distinct from 'active' then raise exception 'recipient account is not active'; end if;
  insert into public.store_wallets(user_id,balance) values(p_sender_id,0) on conflict(user_id) do nothing;
  insert into public.store_wallets(user_id,balance) values(p_recipient_id,0) on conflict(user_id) do nothing;
  select balance into v_sender_balance from public.store_wallets where user_id=p_sender_id for update;
  select balance into v_recipient_balance from public.store_wallets where user_id=p_recipient_id for update;
  if exists(select 1 from public.store_wallets where user_id in (p_sender_id,p_recipient_id) and frozen) then raise exception 'wallet frozen'; end if;
  if v_sender_balance<p_amount then raise exception 'insufficient balance'; end if;
  update public.store_wallets set balance=balance-p_amount,updated_at=now() where user_id=p_sender_id;
  update public.store_wallets set balance=balance+p_amount,updated_at=now() where user_id=p_recipient_id;
  insert into public.store_transactions(id,user_id,counterparty_user_id,transaction_type,amount,currency,status,reference,idempotency_key,description,security_verification_hash)
  values(p_tx_id,p_sender_id,p_recipient_id,'transfer_out',p_amount,'COIN','completed',p_reference,p_request_id,coalesce(p_description,'Secure wallet transfer'),p_security_hash);
  insert into public.store_ledger_entries(id,transaction_id,user_id,entry_type,amount,balance_after,currency,description)
  values(p_debit_id,p_tx_id,p_sender_id,'debit',p_amount,v_sender_balance-p_amount,'COIN',coalesce(p_description,'Transfer sent')),
        (p_credit_id,p_tx_id,p_recipient_id,'credit',p_amount,v_recipient_balance+p_amount,'COIN',coalesce(p_description,'Transfer received'));
  v_result:=jsonb_build_object('success',true,'txId',p_tx_id,'reference',p_reference);
  update public.store_idempotency_keys set status='completed',response=v_result where key=p_request_id and user_id=p_sender_id;
  return v_result;
end; $function$;

create or replace function private.store_purchase_product(
  p_user_id uuid, p_product_id uuid, p_request_id text, p_order_id uuid, p_tx_id uuid,
  p_debit_id uuid, p_seller_credit_id uuid, p_reference text, p_security_hash text
) returns jsonb
language plpgsql security definer
set search_path to 'public','private','pg_temp'
as $function$
declare v_result jsonb; v_status text; v_price numeric(14,2); v_seller_id uuid; v_title text; v_image text; v_balance numeric(14,2); v_seller_balance numeric(14,2); v_threshold numeric(14,2); v_escrow boolean; v_seller_status text;
begin
  if p_user_id is null or p_product_id is null then raise exception 'missing user or product'; end if;
  if p_request_id is null or length(trim(p_request_id))<8 or length(p_request_id)>160 then raise exception 'invalid idempotency key'; end if;
  insert into public.store_idempotency_keys(key,user_id,operation,status) values(p_request_id,p_user_id,'purchaseProduct','processing') on conflict(key) do nothing;
  select response into v_result from public.store_idempotency_keys where key=p_request_id and user_id=p_user_id for update;
  if v_result is not null then return v_result; end if;
  if not exists(select 1 from public.store_idempotency_keys where key=p_request_id and user_id=p_user_id and operation='purchaseProduct') then raise exception 'idempotency key conflict'; end if;
  select account_status into v_status from public.store_profiles where id=p_user_id;
  if v_status is distinct from 'active' then raise exception 'account is not active'; end if;
  select status,price,seller_id,title,image_url into v_status,v_price,v_seller_id,v_title,v_image from public.store_products where id=p_product_id for update;
  if not found or v_status<>'published' then raise exception 'product not available'; end if;
  if v_seller_id is null then raise exception 'product seller is required'; end if;
  if v_seller_id=p_user_id then raise exception 'cannot purchase own product'; end if;
  select account_status into v_seller_status from public.store_profiles where id=v_seller_id;
  if v_seller_status is distinct from 'active' then raise exception 'seller account is not active'; end if;
  if v_price is null or v_price<=0 or v_price>50000 or v_price<>round(v_price,2) then raise exception 'invalid product price'; end if;
  if exists(select 1 from public.store_orders where user_id=p_user_id and product_id=p_product_id and status in ('paid','processing','completed')) then raise exception 'product already purchased'; end if;
  select coalesce((value->>'threshold')::numeric,500) into v_threshold from public.store_platform_settings where key='escrow';
  v_threshold:=coalesce(v_threshold,500); v_escrow:=v_price>=v_threshold;
  insert into public.store_wallets(user_id,balance) values(p_user_id,0) on conflict(user_id) do nothing;
  select balance into v_balance from public.store_wallets where user_id=p_user_id for update;
  if exists(select 1 from public.store_wallets where user_id=p_user_id and frozen) then raise exception 'wallet frozen'; end if;
  if v_balance<v_price then raise exception 'insufficient balance'; end if;
  update public.store_wallets set balance=balance-v_price,updated_at=now() where user_id=p_user_id;
  if not v_escrow and v_seller_id<>p_user_id then
    insert into public.store_wallets(user_id,balance) values(v_seller_id,0) on conflict(user_id) do nothing;
    select balance into v_seller_balance from public.store_wallets where user_id=v_seller_id for update;
    if exists(select 1 from public.store_wallets where user_id=v_seller_id and frozen) then raise exception 'seller wallet frozen'; end if;
    update public.store_wallets set balance=balance+v_price,updated_at=now() where user_id=v_seller_id;
  end if;
  insert into public.store_orders(id,user_id,seller_id,product_id,quantity,amount,currency,status,escrow_status,idempotency_key,product_name,product_thumbnail,use_escrow,transaction_id)
  values(p_order_id,p_user_id,v_seller_id,p_product_id,1,v_price,'COIN',case when v_escrow then 'paid' else 'completed' end,case when v_escrow then 'held' else 'none' end,p_request_id,v_title,v_image,v_escrow,p_tx_id);
  insert into public.store_transactions(id,user_id,counterparty_user_id,order_id,transaction_type,amount,currency,status,reference,idempotency_key,security_verification_hash,description)
  values(p_tx_id,p_user_id,v_seller_id,p_order_id,'purchase',v_price,'COIN','completed',p_reference,p_request_id,p_security_hash,'Digital product purchase');
  insert into public.store_ledger_entries(id,transaction_id,user_id,entry_type,amount,balance_after,currency,description)
  values(p_debit_id,p_tx_id,p_user_id,'debit',v_price,v_balance-v_price,'COIN','Digital product purchase');
  if not v_escrow and v_seller_id<>p_user_id then
    insert into public.store_ledger_entries(id,transaction_id,user_id,entry_type,amount,balance_after,currency,description)
    values(p_seller_credit_id,p_tx_id,v_seller_id,'credit',v_price,v_seller_balance+v_price,'COIN','Digital product sale');
  end if;
  if v_escrow then insert into public.store_escrow_holds(order_id,buyer_id,seller_id,amount) values(p_order_id,p_user_id,v_seller_id,v_price); end if;
  v_result:=jsonb_build_object('success',true,'orderId',p_order_id,'txId',p_tx_id,'reference',p_reference,'escrow',v_escrow);
  update public.store_idempotency_keys set status='completed',response=v_result where key=p_request_id and user_id=p_user_id;
  return v_result;
end; $function$;

create or replace function private.store_consume_download(p_user_id uuid, p_order_id uuid)
returns uuid language plpgsql security definer
set search_path to 'public','private','pg_temp'
as $function$
declare v_order public.store_orders%rowtype; v_account_status text;
begin
  select account_status into v_account_status from public.store_profiles where id=p_user_id;
  if v_account_status is distinct from 'active' then raise exception 'account is not active'; end if;
  select * into v_order from public.store_orders where id=p_order_id and user_id=p_user_id for update;
  if not found then raise exception 'order not found or access denied'; end if;
  if v_order.status not in ('paid','processing','completed') or v_order.escrow_status='disputed' then raise exception 'order is not eligible for download'; end if;
  if v_order.max_downloads is not null and coalesce(v_order.downloads_count,0)>=v_order.max_downloads then raise exception 'download limit reached'; end if;
  update public.store_orders set downloads_count=coalesce(downloads_count,0)+1,updated_at=now() where id=p_order_id;
  return v_order.product_id;
end; $function$;

create or replace function private.store_admin_adjust_wallet(
  p_actor_id uuid, p_target_id uuid, p_amount numeric, p_entry_type text, p_reason text,
  p_request_id text, p_tx_id uuid, p_ledger_id uuid, p_reference text, p_security_hash text
) returns jsonb
language plpgsql security definer
set search_path to 'public','private','pg_temp'
as $function$
declare v_role text; v_actor_status text; v_balance numeric(14,2); v_result jsonb;
begin
  if p_amount is null or p_amount<=0 or p_amount>50000 or p_amount<>round(p_amount,2) then raise exception 'invalid amount'; end if;
  if p_entry_type not in ('credit','debit') then raise exception 'invalid adjustment type'; end if;
  if length(coalesce(p_reason,''))<3 or length(p_reason)>300 then raise exception 'reason is required'; end if;
  insert into public.store_idempotency_keys(key,user_id,operation,status) values(p_request_id,p_actor_id,'adjustUserBalance','processing') on conflict(key) do nothing;
  select response into v_result from public.store_idempotency_keys where key=p_request_id and user_id=p_actor_id for update;
  if v_result is not null then return v_result; end if;
  if not exists(select 1 from public.store_idempotency_keys where key=p_request_id and user_id=p_actor_id and operation='adjustUserBalance') then raise exception 'idempotency key conflict'; end if;
  select role,account_status into v_role,v_actor_status from public.store_profiles where id=p_actor_id;
  if v_actor_status is distinct from 'active' or v_role not in ('admin','super_admin','finance') then raise exception 'administrator permission required'; end if;
  if not exists(select 1 from public.store_profiles where id=p_target_id) then raise exception 'target user not found'; end if;
  insert into public.store_wallets(user_id,balance) values(p_target_id,0) on conflict(user_id) do nothing;
  select balance into v_balance from public.store_wallets where user_id=p_target_id for update;
  if exists(select 1 from public.store_wallets where user_id=p_target_id and frozen) then raise exception 'target wallet frozen'; end if;
  if p_entry_type='debit' and v_balance<p_amount then raise exception 'insufficient balance'; end if;
  update public.store_wallets set balance=case when p_entry_type='credit' then balance+p_amount else balance-p_amount end,updated_at=now() where user_id=p_target_id;
  insert into public.store_transactions(id,user_id,counterparty_user_id,transaction_type,amount,currency,status,reference,idempotency_key,description,security_verification_hash) values(p_tx_id,p_target_id,p_actor_id,'adjustment',p_amount,'COIN','completed',p_reference,p_request_id,p_reason,p_security_hash);
  insert into public.store_ledger_entries(id,transaction_id,user_id,entry_type,amount,balance_after,currency,description) values(p_ledger_id,p_tx_id,p_target_id,p_entry_type,p_amount,case when p_entry_type='credit' then v_balance+p_amount else v_balance-p_amount end,'COIN',p_reason);
  insert into public.store_audit_logs(actor_id,actor_role,action,entity_type,entity_id,details,result,created_at) values(p_actor_id,v_role,case when p_entry_type='credit' then 'WALLET_ADJUST_CREDIT' else 'WALLET_ADJUST_DEBIT' end,'wallet',p_target_id::text,jsonb_build_object('amount',p_amount,'reason',p_reason,'requestId',p_request_id),'success',now());
  v_result:=jsonb_build_object('success',true,'txId',p_tx_id,'ledgerId',p_ledger_id,'reference',p_reference,'balanceAfter',case when p_entry_type='credit' then v_balance+p_amount else v_balance-p_amount end);
  update public.store_idempotency_keys set status='completed',response=v_result where key=p_request_id and user_id=p_actor_id;
  return v_result;
end; $function$;

create or replace function private.store_confirm_escrow_delivery(
  p_user_id uuid, p_order_id uuid, p_tx_id uuid, p_ledger_id uuid, p_reference text, p_security_hash text
) returns jsonb
language plpgsql security definer
set search_path to 'public','private','pg_temp'
as $function$
declare v_order public.store_orders%rowtype; v_hold public.store_escrow_holds%rowtype; v_seller_balance numeric(14,2); v_result jsonb; v_request text; v_account_status text; v_seller_status text;
begin
  if p_user_id is null or p_order_id is null then raise exception 'missing user or order'; end if;
  select account_status into v_account_status from public.store_profiles where id=p_user_id;
  if v_account_status is distinct from 'active' then raise exception 'account is not active'; end if;
  v_request:='escrow-release:'||p_order_id::text;
  insert into public.store_idempotency_keys(key,user_id,operation,status) values(v_request,p_user_id,'confirmEscrowDelivery','processing') on conflict(key) do nothing;
  select response into v_result from public.store_idempotency_keys where key=v_request and user_id=p_user_id for update;
  if v_result is not null then return v_result; end if;
  if not exists(select 1 from public.store_idempotency_keys where key=v_request and user_id=p_user_id and operation='confirmEscrowDelivery') then raise exception 'idempotency key conflict'; end if;
  select * into v_order from public.store_orders where id=p_order_id for update;
  if not found or v_order.user_id<>p_user_id then raise exception 'order not found or access denied'; end if;
  if v_order.escrow_status<>'held' or v_order.status not in ('paid','processing') then raise exception 'order is not awaiting escrow release'; end if;
  select * into v_hold from public.store_escrow_holds where order_id=p_order_id for update;
  if not found or v_hold.status<>'held' or v_hold.seller_id is null then raise exception 'escrow hold unavailable'; end if;
  select account_status into v_seller_status from public.store_profiles where id=v_hold.seller_id;
  if v_seller_status is distinct from 'active' then raise exception 'seller account is not active'; end if;
  insert into public.store_wallets(user_id,balance) values(v_hold.seller_id,0) on conflict(user_id) do nothing;
  select balance into v_seller_balance from public.store_wallets where user_id=v_hold.seller_id for update;
  if exists(select 1 from public.store_wallets where user_id=v_hold.seller_id and frozen) then raise exception 'seller wallet frozen'; end if;
  update public.store_wallets set balance=balance+v_hold.amount,updated_at=now() where user_id=v_hold.seller_id;
  insert into public.store_transactions(id,user_id,counterparty_user_id,order_id,transaction_type,amount,currency,status,reference,idempotency_key,description,security_verification_hash) values(p_tx_id,v_hold.seller_id,p_user_id,p_order_id,'sale',v_hold.amount,'COIN','completed',p_reference,v_request,'Escrow release after buyer confirmation',p_security_hash);
  insert into public.store_ledger_entries(id,transaction_id,user_id,entry_type,amount,balance_after,currency,description) values(p_ledger_id,p_tx_id,v_hold.seller_id,'credit',v_hold.amount,v_seller_balance+v_hold.amount,'COIN','Escrow sale released');
  update public.store_orders set status='completed',escrow_status='released',escrow_released_at=now(),updated_at=now() where id=p_order_id;
  update public.store_escrow_holds set status='released',resolved_at=now() where order_id=p_order_id;
  v_result:=jsonb_build_object('success',true,'orderId',p_order_id,'txId',p_tx_id,'reference',p_reference);
  update public.store_idempotency_keys set status='completed',response=v_result where key=v_request and user_id=p_user_id;
  return v_result;
end; $function$;

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

-- Thin RPC wrappers. The browser's anon/authenticated roles cannot execute any wallet routine.
create or replace function public.store_send_transfer_service(p_sender_id uuid,p_recipient_id uuid,p_amount numeric,p_description text,p_request_id text,p_tx_id uuid,p_debit_id uuid,p_credit_id uuid,p_reference text,p_security_hash text) returns jsonb language sql set search_path to 'public','private','pg_temp' as $function$ select private.store_send_transfer(p_sender_id,p_recipient_id,p_amount,p_description,p_request_id,p_tx_id,p_debit_id,p_credit_id,p_reference,p_security_hash); $function$;
create or replace function public.store_purchase_product_service(p_user_id uuid,p_product_id uuid,p_request_id text,p_order_id uuid,p_tx_id uuid,p_debit_id uuid,p_seller_credit_id uuid,p_reference text,p_security_hash text) returns jsonb language sql set search_path to 'public','private','pg_temp' as $function$ select private.store_purchase_product(p_user_id,p_product_id,p_request_id,p_order_id,p_tx_id,p_debit_id,p_seller_credit_id,p_reference,p_security_hash); $function$;
create or replace function public.store_consume_download_service(p_user_id uuid,p_order_id uuid) returns uuid language sql set search_path to 'public','private','pg_temp' as $function$ select private.store_consume_download(p_user_id,p_order_id); $function$;
create or replace function public.store_admin_adjust_wallet_service(p_actor_id uuid,p_target_id uuid,p_amount numeric,p_entry_type text,p_reason text,p_request_id text,p_tx_id uuid,p_ledger_id uuid,p_reference text,p_security_hash text) returns jsonb language sql set search_path to 'public','private','pg_temp' as $function$ select private.store_admin_adjust_wallet(p_actor_id,p_target_id,p_amount,p_entry_type,p_reason,p_request_id,p_tx_id,p_ledger_id,p_reference,p_security_hash); $function$;
create or replace function public.store_confirm_escrow_delivery_service(p_user_id uuid,p_order_id uuid,p_tx_id uuid,p_ledger_id uuid,p_reference text,p_security_hash text) returns jsonb language sql set search_path to 'public','private','pg_temp' as $function$ select private.store_confirm_escrow_delivery(p_user_id,p_order_id,p_tx_id,p_ledger_id,p_reference,p_security_hash); $function$;
create or replace function public.store_resolve_escrow_dispute_service(p_actor_id uuid,p_dispute_id uuid,p_decision text,p_tx_id uuid,p_ledger_id uuid,p_reference text,p_security_hash text) returns jsonb language sql set search_path to 'public','private','pg_temp' as $function$ select private.store_resolve_escrow_dispute(p_actor_id,p_dispute_id,p_decision,p_tx_id,p_ledger_id,p_reference,p_security_hash); $function$;

revoke all on function private.store_send_transfer(uuid,uuid,numeric,text,text,uuid,uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function private.store_purchase_product(uuid,uuid,text,uuid,uuid,uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function private.store_consume_download(uuid,uuid) from public, anon, authenticated;
revoke all on function private.store_admin_adjust_wallet(uuid,uuid,numeric,text,text,text,uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function private.store_confirm_escrow_delivery(uuid,uuid,uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function private.store_resolve_escrow_dispute(uuid,uuid,text,uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function private.store_send_transfer(uuid,uuid,numeric,text,text,uuid,uuid,uuid,text,text) to service_role;
grant execute on function private.store_purchase_product(uuid,uuid,text,uuid,uuid,uuid,uuid,text,text) to service_role;
grant execute on function private.store_consume_download(uuid,uuid) to service_role;
grant execute on function private.store_admin_adjust_wallet(uuid,uuid,numeric,text,text,text,uuid,uuid,text,text) to service_role;
grant execute on function private.store_confirm_escrow_delivery(uuid,uuid,uuid,uuid,text,text) to service_role;
grant execute on function private.store_resolve_escrow_dispute(uuid,uuid,text,uuid,uuid,text,text) to service_role;
revoke all on function public.store_send_transfer_service(uuid,uuid,numeric,text,text,uuid,uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.store_purchase_product_service(uuid,uuid,text,uuid,uuid,uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.store_consume_download_service(uuid,uuid) from public, anon, authenticated;
revoke all on function public.store_admin_adjust_wallet_service(uuid,uuid,numeric,text,text,text,uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.store_confirm_escrow_delivery_service(uuid,uuid,uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.store_resolve_escrow_dispute_service(uuid,uuid,text,uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.store_send_transfer_service(uuid,uuid,numeric,text,text,uuid,uuid,uuid,text,text) to service_role;
grant execute on function public.store_purchase_product_service(uuid,uuid,text,uuid,uuid,uuid,uuid,text,text) to service_role;
grant execute on function public.store_consume_download_service(uuid,uuid) to service_role;
grant execute on function public.store_admin_adjust_wallet_service(uuid,uuid,numeric,text,text,text,uuid,uuid,text,text) to service_role;
grant execute on function public.store_confirm_escrow_delivery_service(uuid,uuid,uuid,uuid,text,text) to service_role;
grant execute on function public.store_resolve_escrow_dispute_service(uuid,uuid,text,uuid,uuid,text,text) to service_role;
