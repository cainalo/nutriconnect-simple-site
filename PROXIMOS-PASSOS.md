# Próximos passos (para a próxima sessão do Claude Code)

> Atualizado em 2026-10-12. O usuário (Cainã, cainalopes1@gmail.com) pediu para não ser consultado
> sem necessidade: faça tudo o que der sozinho e junte os pedidos a ele numa única mensagem no fim.
> Quando os itens abaixo estiverem resolvidos, apague este arquivo num commit próprio.

## Estado atual (tudo feito, exceto o que está em "Falta")

- Código idêntico ao de `alicejardimj2006-max/nutri-connect` (commit `1333739`), com o Supabase do
  usuário (`mtwtlbbgkzexyaavcboe`) no `.env` e no `supabase/config.toml`.
- **Branches**: `main` = trabalho (sincroniza com o Lovable); `prod` = o que o Netlify publica em
  https://nutri-connect.netlify.app. Para publicar: `git push origin main:prod` (sem force push).
- **Banco**: todas as migrations aplicadas; `node supabase/tests/run.cjs` 323/323. Seed **não**
  aplicado (só se o usuário pedir as contas demo).
- **Edge Functions**: as 14 publicadas; segredos VAPID, `CRON_SECRET` e `LOVABLE_API_KEY` presentes;
  Vault (`nutriconnect_functions_url`, `nutriconnect_cron_secret`) gravado; jobs pg_cron rodando.
- **Auth**: `site_url` = https://nutri-connect.netlify.app; lista de redirecionamentos com o site,
  previews do Netlify (`*--nutri-connect`), previews do Lovable e localhost. O template de
  recuperação **não pode** ser trocado no plano gratuito sem SMTP próprio; o link do e-mail padrão
  funciona com `/recuperar-senha`. `config.toml` não tem `[auth]`: **não** use `supabase config push`.
- **App Android**: links apontam para o site e para as releases de `cainalo/nutriconnect-simple-site`.

## Limitações do ambiente

- `npx supabase` está logado e linkado nesta máquina. Configurações de auth usam a Management API
  (precisa de token pessoal do usuário; peça se necessário).
- O modo automático do Claude Code bloqueia `supabase secrets set` e escritas no Vault, mesmo com
  autorização: prepare um script e peça ao usuário para rodá-lo com `!`.

## Falta

1. **Tornar o usuário admin**, depois que ele se cadastrar no site:
   ```sql
   insert into public.platform_admins (user_id)
   select id from auth.users where email = 'cainalopes1@gmail.com'
   on conflict do nothing;
   ```
2. **Stripe (opcional)**, se o usuário mandar `sk_test_...` e `pk_test_...`: grave
   `STRIPE_SECRET_KEY` e `STRIPE_PUBLISHABLE_KEY` (via script do usuário, ver acima) e crie o webhook
   (destination charges na conta da plataforma, então **não** precisa de `connect=true`):
   ```bash
   curl https://api.stripe.com/v1/webhook_endpoints -u "$STRIPE_SECRET_KEY:" \
     -d url=https://mtwtlbbgkzexyaavcboe.supabase.co/functions/v1/stripe-webhook \
     -d "enabled_events[]=checkout.session.completed" -d "enabled_events[]=charge.refunded" \
     -d "enabled_events[]=customer.subscription.updated" -d "enabled_events[]=customer.subscription.deleted" \
     -d "enabled_events[]=invoice.created" -d "enabled_events[]=invoice.paid" \
     -d "enabled_events[]=invoice.payment_failed"
   ```
   Salve o `secret` (`whsec_...`) como `STRIPE_WEBHOOK_SECRET` (Supabase e `supabase/secrets.env.local`).
3. **Opcionais**: `APP_URL` = https://nutri-connect.netlify.app nos segredos; TURN para videoconsulta;
   SMTP próprio (o padrão do Supabase envia só 2 e-mails/hora).
