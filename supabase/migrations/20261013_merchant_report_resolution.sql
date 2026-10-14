-- Atomically resolve a merchant report and, when an admin upholds it, apply the merchant sanction.
create or replace function private.store_resolve_merchant_report(
  p_actor_id uuid, p_report_id uuid, p_decision text, p_note text
) returns jsonb
language plpgsql security definer
set search_path to 'public','private','pg_temp'
as $function$
declare
  v_role text; v_actor_status text; v_report public.store_merchant_reports%rowtype; v_sanction boolean := false; v_final_status text;
begin
  if p_actor_id is null or p_report_id is null or p_decision is null or p_decision not in ('upheld','dismissed') then raise exception 'invalid report decision'; end if;
  select role,account_status into v_role,v_actor_status from public.store_profiles where id=p_actor_id;
  if v_actor_status is distinct from 'active' or v_role not in ('admin','super_admin','moderator') then raise exception 'report permission required'; end if;
  select * into v_report from public.store_merchant_reports where id=p_report_id for update;
  if not found then raise exception 'report not found'; end if;
  if v_report.status not in ('open','reviewing') then raise exception 'report already resolved'; end if;
  if v_role='moderator' and v_report.status='reviewing' then raise exception 'report awaiting admin review'; end if;
  if p_decision='upheld' and v_role='moderator' then
    -- Escalate to an admin instead of applying a merchant sanction.
    v_final_status := 'reviewing';
    update public.store_merchant_reports set status=v_final_status,
      resolution_note=coalesce(nullif(left(trim(coalesce(p_note,'')),2000),''),'Moderator recommends admin review'),
      resolved_by=p_actor_id,resolved_at=null,updated_at=now() where id=p_report_id;
  else
    v_final_status := case when p_decision='upheld' then 'resolved' else 'dismissed' end;
    if p_decision='upheld' and v_role in ('admin','super_admin') then
      update public.store_profiles set account_status='suspended',merchant_license_revoked_at=now(),merchant_license_revoke_reason=coalesce(nullif(trim(p_note),''),'Merchant report upheld') where id=v_report.merchant_id and role='merchant';
      if not found then raise exception 'merchant profile not found'; end if;
      v_sanction := true;
    end if;
    update public.store_merchant_reports set status=v_final_status,
      resolution_note=nullif(left(trim(coalesce(p_note,'')),2000),''),resolved_by=p_actor_id,resolved_at=now(),updated_at=now() where id=p_report_id;
  end if;
  insert into public.store_audit_logs(actor_id,actor_role,action,entity_type,entity_id,details,result,created_at)
  values(p_actor_id,v_role,case when p_decision='dismissed' then 'MERCHANT_REPORT_DISMISSED' when v_role='moderator' then 'MERCHANT_REPORT_ESCALATED' else 'MERCHANT_REPORT_UPHELD' end,
    'merchant_report',p_report_id::text,jsonb_build_object('decision',p_decision,'note',left(coalesce(p_note,''),2000),'sanctionApplied',v_sanction,'status',v_final_status),'success',now());
  return jsonb_build_object('success',true,'reportId',p_report_id,'decision',p_decision,'status',v_final_status,'sanctionApplied',v_sanction);
end; $function$;

create or replace function public.store_resolve_merchant_report_service(p_actor_id uuid,p_report_id uuid,p_decision text,p_note text)
returns jsonb language sql set search_path to 'public','private','pg_temp'
as $function$ select private.store_resolve_merchant_report(p_actor_id,p_report_id,p_decision,p_note); $function$;
revoke all on function private.store_resolve_merchant_report(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function private.store_resolve_merchant_report(uuid,uuid,text,text) to service_role;
revoke all on function public.store_resolve_merchant_report_service(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.store_resolve_merchant_report_service(uuid,uuid,text,text) to service_role;
