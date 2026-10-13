# Próximos passos (para a próxima sessão do Claude Code)

> Escrito em 2026-10-12. O usuário (Cainã, cainalopes1@gmail.com) pediu para não ser consultado
> sem necessidade: faça tudo o que der sozinho. Quando precisar de algo que só ele pode dar (login,
> chave de conta), junte **todos** os pedidos em **uma única** mensagem curta e objetiva.
> Ao terminar tudo, apague este arquivo num commit próprio.

## O que já foi feito

- O código do projeto ficou **idêntico** ao de https://github.com/alicejardimj2006-max/nutri-connect
  (commit `1333739`, "feed infinito com algoritmo no Espaço"). Tudo foi copiado: `src/`, `public/`,
  `mobile/`, `supabase/` (59 migrations, 14 Edge Functions, seed, testes), `docs/`, `package.json`,
  lockfiles, `.gitattributes`, `netlify.toml` etc. Os arquivos que só existiam aqui (template do
  Lovable: `drizzle/`, componentes `ui/` sem uso, `src/test/`, `vitest.config.ts`,
  `auth-attacher.ts`, `cron-auth.ts`, `robots.txt`) foram removidos.
- **Únicas diferenças em relação à origem** (contas do usuário, não as da Alice):
  - `.env`: Supabase do usuário (`mtwtlbbgkzexyaavcboe`) e uma chave VAPID pública **nova**.
  - `supabase/config.toml`: `project_id = "mtwtlbbgkzexyaavcboe"`.
  - `docs/banco-completo.md` e `docs/painel-clinico.md`: referências ao project ref trocadas.
- `npm install`, `npm run build` e `npx tsc --noEmit` passaram sem erros.
- Commit enviado para `main` (sincroniza com o Lovable). **Nada de force push / rebase / amend**
  (ver AGENTS.md).
- Segredos gerados localmente em `supabase/secrets.env.local` (**não versionado**, coberto por
  `*.local` no `.gitignore`): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`.
  A `VAPID_PUBLIC_KEY` desse arquivo é a mesma do `VITE_VAPID_PUBLIC_KEY` do `.env`.

## Estado do banco (importante)

O Supabase do usuário (`mtwtlbbgkzexyaavcboe`) **só tem as 2 primeiras migrations** aplicadas.
O Lovable as juntou numa migration única, `20261012195525_4bf58e29-...sql` (conteúdo idêntico a
`20260929115900_legacy_profiles.sql` + `20260929120000_core_profiles_and_care.sql`, verificado com
diff). Esse arquivo foi **removido** do repositório. Por isso o site publicado hoje compila, mas
quase tudo que usa banco falha até as migrations restantes serem aplicadas.

Nenhuma credencial do Supabase estava disponível nesta sessão (CLI sem login, conector
"claude.ai Supabase" não autorizado).

## Progresso (2ª sessão, 2026-10-12)

- **Passo 1**: o `npx supabase` já está logado e linkado nesta máquina (não precisa de token).
- **Passo 2 feito**: histórico reparado e as 56 migrations restantes aplicadas sem erro. Tipos gerados
  batem com `types.ts` (só formatação/ordem; `profiles_legacy` não existe no banco novo, esperado).
  Seed **não** aplicado. `node supabase/tests/run.cjs`: 323/323 passaram.
- **Passo 3 feito** (exceto Stripe): 14 Edge Functions publicadas; o usuário aplicou os segredos
  (VAPID, `CRON_SECRET`). `LOVABLE_API_KEY` já existia (posta pelo Lovable). O modo automático do
  Claude Code bloqueia `secrets set` e escritas no Vault: peça ao usuário para rodar esses comandos.
- **Passo 4 feito**: as duas entradas do Vault existem; os jobs `nutriconnect-*` rodam com sucesso.
- **Passo 5 parcial**: `uri_allow_list` = previews do Lovable + `localhost:8080` e `:3000`.
  **Falta `site_url`** (hoje `http://localhost:3000`): o site **ainda não foi publicado**. Ao ter a
  URL, faça PATCH em `/v1/projects/mtwtlbbgkzexyaavcboe/config/auth` com `site_url` e acrescente
  `https://<domínio>/**` à lista, **mantendo** as entradas atuais. O template de recuperação **não
  pode** ser trocado no plano gratuito sem SMTP próprio (erro da API); o link do e-mail padrão já
  funciona com `/recuperar-senha` (evento `PASSWORD_RECOVERY`). `config.toml` não tem `[auth]`:
  **não** use `supabase config push`. O token da Management API é pessoal; peça de novo se preciso.
- **Passo 6**: pendente, nenhuma conta existe ainda no banco.
- **Passo 7**: `src/components/android-app.tsx` já aponta para `cainalo/nutriconnect-simple-site`
  (commit `116be0a`). `mobile/` espera a URL publicada.
- **Passo 8**: `tsc` e `build` ok; rotas principais respondem 200 no `npm run dev`; o cliente
  renderiza sem erros no console (Chrome headless).

## O que fazer, em ordem

### 1. Conseguir acesso ao Supabase `mtwtlbbgkzexyaavcboe`

Tente nesta ordem, sem perguntar ao usuário enquanto houver opção:

1. Ver se o conector MCP **claude.ai Supabase** está autorizado (ferramentas `mcp__claude_ai_Supabase__*`).
   Se estiver, use-o para rodar SQL, aplicar migrations, configurar e fazer deploy de functions.
2. Ver se existe `SUPABASE_ACCESS_TOKEN` no ambiente ou `~/.supabase/access-token`
   (`npx supabase projects list` funciona?).
3. Se nada funcionar, peça ao usuário (na mensagem única) para fazer **uma** destas coisas:
   autorizar o conector Supabase em claude.ai → Settings → Connectors, **ou** criar um token em
   https://supabase.com/dashboard/account/tokens e colar no chat.
   O CLI usado é o `npx supabase` (v2.120); não há `supabase` global, `psql` nem `gh` instalados.

### 2. Aplicar as migrations

Com o CLI (`npx supabase link --project-ref mtwtlbbgkzexyaavcboe` antes; se pedir senha do banco,
tente sem, as versões novas usam um papel temporário):

```bash
npx supabase migration list            # confira o que o remoto tem
# Se o remoto listar 20261012195525 (a migration do Lovable):
npx supabase migration repair --status reverted 20261012195525
npx supabase migration repair --status applied 20260929115900 20260929120000
npx supabase db push
```

Se o remoto **não** tiver histórico de migrations, mas as tabelas existirem (`profiles`,
`professionals`, `care_links`...), faça só os dois `repair --status applied` e depois `db push`.
Pelo MCP, faça o equivalente: rode cada arquivo de `supabase/migrations/` a partir de
`20260929120100_clinical_records.sql`, em ordem, parando no primeiro erro para corrigir.

Depois: `npx supabase gen types typescript --linked --schema public` e compare com
`src/integrations/supabase/types.ts` (deve bater; se diferir só em formatação, mantenha o atual).

Seed (`supabase/seed.sql`, contas demo com senha pública `NutriDemo@2026`): **não** aplique por
padrão. Só aplique se o usuário quiser as contas de demonstração para apresentação.

### 3. Segredos das Edge Functions e deploy

```bash
npx supabase secrets set --env-file supabase/secrets.env.local --project-ref mtwtlbbgkzexyaavcboe
npx supabase functions deploy --project-ref mtwtlbbgkzexyaavcboe
```

Faltam valores que só existem nas contas do usuário (peça tudo na mensagem única do passo 1):

| Segredo | Para quê | Sem ele |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` (`sk_test_...`) | pagamento de consultas e assinaturas de membros | pagamentos desligados |
| `STRIPE_PUBLISHABLE_KEY` (`pk_test_...`) | checkout | idem |
| `STRIPE_WEBHOOK_SECRET` | confirmação de pagamento | **não peça**: crie o webhook você mesmo (abaixo) |
| `LOVABLE_API_KEY` | IA (Nina, moderação, tema da semana, leitor de rótulos) | IA cai nos textos/regras de reserva |
| `APP_URL` | links de retorno do Stripe | usa o `Origin` da requisição |
| `CLOUDFLARE_TURN_*` ou `TURN_*` | videoconsulta atrás de NAT restrito | só STUN (funciona na maioria dos casos) |

Webhook do Stripe, assim que tiver a `STRIPE_SECRET_KEY`:

```bash
curl https://api.stripe.com/v1/webhook_endpoints -u "$STRIPE_SECRET_KEY:" \
  -d url=https://mtwtlbbgkzexyaavcboe.supabase.co/functions/v1/stripe-webhook \
  -d "enabled_events[]=checkout.session.completed" -d "enabled_events[]=charge.refunded" \
  -d "enabled_events[]=customer.subscription.updated" -d "enabled_events[]=customer.subscription.deleted" \
  -d "enabled_events[]=invoice.created" -d "enabled_events[]=invoice.paid" \
  -d "enabled_events[]=invoice.payment_failed"
```

Esses são os eventos tratados em `supabase/functions/` hoje. As assinaturas de membros usam Stripe
Connect: veja em `member-connect`/`member-checkout` se o webhook precisa também de
`connect=true` (eventos das contas conectadas). Salve o `secret` (`whsec_...`) da resposta como
`STRIPE_WEBHOOK_SECRET` (nos secrets do Supabase e no `supabase/secrets.env.local`).

### 4. Vault (agendamentos pg_cron → Edge Functions)

No SQL do projeto, com o `CRON_SECRET` de `supabase/secrets.env.local`:

```sql
select vault.create_secret('https://mtwtlbbgkzexyaavcboe.supabase.co/functions/v1', 'nutriconnect_functions_url');
select vault.create_secret('<CRON_SECRET>', 'nutriconnect_cron_secret');
```

Confira que as extensões `pg_cron` e `pg_net` estão ativas (as migrations tentam criar).

### 5. Auth do Supabase

Via Management API (`PATCH https://api.supabase.com/v1/projects/mtwtlbbgkzexyaavcboe/config/auth`
com o token) ou pelo MCP:

- `site_url` = URL publicada do site (descubra no Lovable: normalmente `https://<nome>.lovable.app`;
  se não achar, use o domínio que o usuário informar).
- `uri_allow_list` = `https://<domínio>/**,http://localhost:8080/**,http://localhost:3000/**`.
- Template de recuperação de senha (`mailer_templates_recovery_content`) = conteúdo de
  `supabase/templates/recovery.html` (a tela pede o código `{{ .Token }}`).

### 6. Tornar o usuário admin

Depois que ele tiver conta no site (se ainda não tiver, explique que basta se cadastrar):

```sql
insert into public.platform_admins (user_id)
select id from auth.users where email = 'cainalopes1@gmail.com'
on conflict do nothing;
```

### 7. App Android e links que ainda apontam para a Alice

Estes arquivos ainda usam o site e o repositório da origem:

- `mobile/capacitor.config.json`, `mobile/www/index.html`, `mobile/www/offline.html`,
  `mobile/README.md`: `https://nutri-connect.netlify.app` → URL publicada do usuário.
- `src/components/android-app.tsx` e `mobile/README.md`: release em
  `github.com/alicejardimj2006-max/nutri-connect` → `github.com/cainalo/nutriconnect-simple-site`.

Troque os dois juntos num commit: mexer em `mobile/` dispara `.github/workflows/android.yml`, que
gera o APK e publica a release `android-teste` no repositório do usuário. Confirme na aba Actions
que o workflow passou (sem `gh`, use a API pública do GitHub:
`https://api.github.com/repos/cainalo/nutriconnect-simple-site/actions/runs`).

`netlify.toml` veio da origem e não atrapalha o Lovable; deixe.

### 8. Verificar

- `npm run build` e `npx tsc --noEmit`.
- `npm run dev` e teste: cadastro/login, Espaço (feed), comunidades, perfil, painel do
  profissional, admin (`/admin`), notificação push de teste em Perfil → Configurações → Notificações.
- `node supabase/tests/run.cjs` se houver banco local disponível (ver `supabase/tests/`).
- Commit e push em `main` a cada etapa que funcionar; mantenha o branch sempre compilando.

### 9. Fechar

Apague este arquivo (`PROXIMOS-PASSOS.md`) num commit e diga ao usuário, em poucas linhas, o que
ficou pronto e o que (se algo) ficou faltando por depender dele.
