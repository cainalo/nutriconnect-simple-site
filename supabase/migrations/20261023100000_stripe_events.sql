-- Registro dos eventos do Stripe processados pelo webhook (NC-PAY-005, NCV7-004/005/017).
-- Cada evento é RESERVADO antes de processar (claim_stripe_event, atômico): duas entregas
-- simultâneas do mesmo evento não processam juntas; um evento concluído não roda de novo; uma
-- reserva largada (o processo caiu) pode ser retomada depois de 5 minutos. Se o processamento
-- falhar, release_stripe_event apaga a reserva para o reenvio do Stripe tentar de novo.
-- Um estorno que chega antes da confirmação fica aqui pelo payment_intent.
-- Só o webhook (service role) usa a tabela e as funções.
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  payment_intent text,
  status text not null default 'processando' check (status in ('processando', 'concluido')),
  claimed_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists stripe_events_refund_idx
  on public.stripe_events (payment_intent)
  where type = 'charge.refunded' and payment_intent is not null;

alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from public, anon, authenticated;

/** 'claimed' = pode processar; 'done' = já concluído; 'busy' = outra entrega está processando. */
create or replace function public.claim_stripe_event(p_id text, p_type text, p_payment_intent text)
returns text language plpgsql security definer set search_path = public as $$
declare
  st text;
begin
  insert into public.stripe_events (id, type, payment_intent)
  values (p_id, p_type, p_payment_intent)
  on conflict (id) do nothing;
  if found then
    return 'claimed';
  end if;
  -- Já existia: retoma só uma reserva largada há mais de 5 minutos.
  update public.stripe_events
     set claimed_at = now()
   where id = p_id and status = 'processando' and claimed_at < now() - interval '5 minutes'
  returning status into st;
  if found then
    return 'claimed';
  end if;
  select status into st from public.stripe_events where id = p_id;
  return case when st = 'concluido' then 'done' else 'busy' end;
end;
$$;

create or replace function public.finish_stripe_event(p_id text)
returns void language sql security definer set search_path = public as $$
  update public.stripe_events set status = 'concluido', processed_at = now() where id = p_id;
$$;

create or replace function public.release_stripe_event(p_id text)
returns void language sql security definer set search_path = public as $$
  delete from public.stripe_events where id = p_id and status = 'processando';
$$;

revoke execute on function public.claim_stripe_event(text, text, text) from public, anon, authenticated;
revoke execute on function public.finish_stripe_event(text) from public, anon, authenticated;
revoke execute on function public.release_stripe_event(text) from public, anon, authenticated;
grant execute on function public.claim_stripe_event(text, text, text) to service_role;
grant execute on function public.finish_stripe_event(text) to service_role;
grant execute on function public.release_stripe_event(text) to service_role;
