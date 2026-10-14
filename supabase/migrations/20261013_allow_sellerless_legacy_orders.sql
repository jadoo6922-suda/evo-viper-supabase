-- Some legacy/system order rows may not have a seller. The marketplace purchase RPC still rejects seller-less products until a platform-revenue model exists.
alter table public.store_orders drop constraint if exists store_orders_seller_required;
