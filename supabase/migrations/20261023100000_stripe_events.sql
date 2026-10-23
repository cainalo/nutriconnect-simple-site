-- Registro dos eventos do Stripe já processados pelo webhook (NC-PAY-005).
-- Um reenvio do mesmo evento (mesmo id) é ignorado, e um estorno que chega antes da confirmação
-- do pagamento fica guardado aqui pelo payment_intent, para a confirmação já nascer estornada.
-- Só o webhook (service role) usa a tabela: sem políticas para usuários.
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  payment_intent text,
  processed_at timestamptz not null default now()
);

create index if not exists stripe_events_refund_idx
  on public.stripe_events (payment_intent)
  where type = 'charge.refunded' and payment_intent is not null;

alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from public, anon, authenticated;
