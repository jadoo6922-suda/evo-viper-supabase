-- Supporting indexes for the server-mediated support and review flows.
create index if not exists store_support_tickets_owner_updated_idx
  on public.store_support_tickets (user_id, updated_at desc);

create index if not exists store_support_messages_ticket_created_idx
  on public.store_support_messages (ticket_id, created_at asc);
