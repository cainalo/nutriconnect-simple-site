# Próximos passos (passagem de sessão — 14/10/2026)

Leia este arquivo inteiro antes de mexer no projeto. Ele diz o que foi feito, o que está pendente e
em que ordem continuar. O roadmap oficial é o `roadmap.md`; o `AGENTS.md` tem as regras do Lovable
(não reescrever histórico publicado; manter a branch `main` funcionando, porque cada push vai para o
Lovable e para o site).

## Como o dono quer que se trabalhe

- Ele **não quer rodar comandos**: execute tudo você mesmo e só peça algo quando for impossível
  (credencial, conta externa, decisão de produto).
- Ele pediu para **seguir até terminar sem perguntar** a cada etapa. Um commit por item, testado,
  com push para `main`.
- Textos do app nos 4 idiomas (pt-BR, en, es, fr) no padrão `tr([pt, en, es, fr])`.
- Mensagens de commit em português, terminando com
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## O que foi feito nesta sessão (tudo já está no GitHub, em `main`)

| Commit    | Item                                                                                          |
| --------- | --------------------------------------------------------------------------------------------- |
| `0fd75e9` | N6 — Parceiro de jornada (`/parceiro`)                                                        |
| `5a149dc` | F1 — Minha casa: casa, convites, lista de compras em tempo real (`/casa`)                     |
| `1d8add5` | Site funciona antes das migrations (lista de compras e dupla tolerantes)                      |
| `6c4ec17` | F2 — Geladeira e cardápio da casa                                                             |
| `4d0934e` | F3 — Lancheiras compartilhadas e mural da casa                                                |
| `1805d8e` | M8 — Eventos ao vivo nas comunidades ("Pergunte à nutri", `/evento/$eventId`)                 |
| `f92b8b5` | N11 — Nina por voz (Web Speech API do navegador)                                              |
| `bdd7201` | Migration: pontuação máxima para `cainalopes1805@gmail.com`                                   |
| `d878b9d` | N10 — Loja de programas (`/programas`, `/painel/programas`, Edge Function `program-checkout`) |
| `fdf29d1` | Admin: botão "Pontuação máxima (nível 5)"; contorno do menu do painel clínico corrigido       |
| `985c0c7` | R1 — Compras nos mercados parceiros (botão "Comprar" + seção "Mercados parceiros" no admin)   |
| (este)    | S1 — Estúdio de redes sociais no admin (seção "Redes sociais")                                |

Build (`npx vite build`), tipos (`npx tsc --noEmit -p .`) e lint (`npx eslint .`, só avisos de
fast-refresh que já existiam) passam em todos.

## PENDENTE 1 (o mais importante): aplicar as migrations no banco real

**Nenhuma migration desta sessão está no Supabase de produção** (projeto `mtwtlbbgkzexyaavcboe`).
Foi conferido em 14/10 sondando a API REST com a chave pública: `daily_checkins` existe, mas
`journey_pairs`, `households`, `fridge_items`, `household_notes`, `community_events`,
`pro_programs`, `market_partners` (e `social_posts`) não existem. O site está no ar com o código novo e **funciona**
(as telas novas degradam com elegância), mas dupla, casa, eventos, loja e mercados só passam a
funcionar depois das migrations.

Migrations pendentes, nesta ordem:

```
supabase/migrations/20261014110000_journey_partner.sql
supabase/migrations/20261014120000_households.sql
supabase/migrations/20261014130000_household_kitchen.sql
supabase/migrations/20261014140000_household_lunch_board.sql
supabase/migrations/20261014150000_community_events.sql
supabase/migrations/20261014160000_program_store.sql
supabase/migrations/20261014170000_max_pro_score_owner.sql
supabase/migrations/20261014180000_market_partners.sql
supabase/migrations/20261015100000_social_studio.sql
```

Por que não foram aplicadas: nesta máquina a CLI do Supabase recusa o token
(`SUPABASE_ACCESS_TOKEN` do ambiente e o login salvo: "Invalid access token"), não há senha do banco
(`SUPABASE_DB_PASSWORD`), não há `gh`, e o conector "claude.ai Supabase" não está autorizado.

Caminhos para aplicar (do mais fácil para o dono ao mais técnico):

1. **Conector do Supabase no claude.ai**: se o dono autorizar o conector "Supabase" nas
   configurações de conectores do claude.ai, aplique as 9 migrations por ele, na ordem.
2. **Arquivo único já pronto**: `APLICAR-NO-SUPABASE.sql` na raiz do projeto (fora do git, listado em
   `.git/info/exclude`). Tem as 9 migrations numa transação (`begin`/`commit`, se algo falhar nada é
   aplicado) e registra as versões em `supabase_migrations.schema_migrations` se essa tabela
   existir. Basta colar no Supabase → SQL Editor → Run. Foi testado no PGlite sobre o estado atual do
   banco (até `20261014100000`) e os 450 testes passaram. Se o arquivo sumir, recrie concatenando as
   9 migrations acima entre `begin;` e `commit;`.
3. **CLI**: com um token válido (`npx supabase login`) ou `SUPABASE_DB_PASSWORD`:
   `npx supabase link --project-ref mtwtlbbgkzexyaavcboe` e `npx supabase db push`.
   Neste Windows o `curl` precisa de `--ssl-no-revoke`.

Depois de aplicar, rode os testes de segurança no banco real:
`npx supabase db query --linked -f supabase/tests/social_security.sql` (termina de propósito com um
erro "RESULTADOS: [...]"; procure `"ok": false`).

Observação: o dono já aparece no **nível 5** (não se sabe como; a migration de pontuação não estava
aplicada). A migration `20261014170000` é idempotente (só soma pontos se estiver abaixo de 2.000).

## PENDENTE 2: publicar Edge Functions

Mudaram nesta sessão e precisam de deploy (mesma limitação de credencial):

```
npx supabase functions deploy push-send        # textos dos avisos novos (dupla_, casa_, evento_, programa_vendido)
npx supabase functions deploy stripe-webhook    # grava compra de programa e estorno
npx supabase functions deploy program-checkout  # nova (verify_jwt = false já está em supabase/config.toml)
npx supabase functions deploy ai-chat           # cota de IA "social" do estúdio (até lá o estúdio usa a cota "summary")
```

Sem o deploy do `push-send`, o push dos avisos novos chega como "Você tem um novo aviso" (o resto
funciona). O webhook do Stripe já escuta `checkout.session.completed` e `charge.refunded`, que são
os eventos usados pela loja de programas.

## Como testar sem acesso ao banco (usado em todos os itens desta sessão)

`supabase/tests/run-local.mjs` aplica todas as migrations num Postgres em WebAssembly (PGlite) com
imitações do Supabase e roda `supabase/tests/social_security.sql`. Instruções no topo do arquivo.
Resultado atual: **61+9 migrations aplicadas, 450 testes, 0 falhas**. Sempre que criar migration,
adicione testes ao `social_security.sql` (blocos `if to_regclass(...) is not null then ... end if;`)
e rode o harness. Atenção: no `as_user`, texto com espaço ou vírgula volta entre aspas; use valores
sem espaço nas comparações.

## S1 — Estúdio de redes sociais (feito em 14/10)

Seção "Redes sociais" no admin (`src/components/admin/social/`): perfis com diagnóstico da IA (bio,
legendas, números e print), ideias por objetivo e formato (post, carrossel com slides, roteiro de
Reels/story, hashtags, CTA), editor com "Melhorar com IA", modelos, calendário editorial com datas de
saúde, tendências internas (`social_trends`, só conteúdo público) e arte em PNG no navegador
(`src/lib/post-art.ts`). Servidor: `src/lib/social-studio.functions.ts` (regras de ética do CFN no
prompt). Acesso pelo banco em `social_studio_allowed()` (hoje = admin). **Pode virar recurso pago dos
profissionais no futuro, mas não agora** (pedido do dono): para liberar, troque a regra de
`social_studio_allowed()` e a política "todos os admins veem tudo" por "cada um vê o seu".

Ideias para depois: publicar direto pela API da Meta (exige app aprovado pela Meta e conta
comercial), métricas automáticas do Instagram (Graph API) e gerar imagens com IA.

## Outros pendentes do roadmap (dependem de algo externo)

- **M4** — Verificação e-Nutricionista para teleconsulta (CFN 760/23): sem API pública do CFN;
  proposta já discutida: etapa manual (número + comprovante, aprovação no admin) na verificação
  existente (`src/routes/verificacao.tsx`); só quem passar aparece como "atende online".
- **A2–A5** (app Android): A2 precisa de projeto no Firebase (`google-services.json`), A3/A4 são
  código no `mobile/`, A5 precisa da conta da Google Play.
- **Dados da empresa** em `src/lib/legal.ts` (razão social, CNPJ, endereço, nome do encarregado de
  dados): só o dono pode informar.
- **R1**: os parceiros Mercado Livre e Amazon foram cadastrados sem código de afiliado; o dono precisa
  se inscrever nos programas de afiliados e colar o código no admin (Mercados parceiros). Ver
  CONAR/CDC: o aviso de link de parceiro já aparece no app.

## Mapa rápido do que existe (para não refazer)

- Casa: `src/lib/household.ts`, `src/components/household-panel.tsx`, rotas `src/routes/casa*.tsx`;
  tempo real da casa ligado uma vez em `src/components/app-screen.tsx` (`HouseholdLive`).
- Lista de compras/geladeira/cardápio cientes da casa: `src/lib/fridge.ts`, `src/lib/menu.ts`.
- Dupla: `src/lib/journey.ts`, `src/components/journey-panel.tsx`.
- Eventos: `src/lib/community-events.ts`, `src/components/community-events.tsx`,
  `src/routes/evento.$eventId.tsx`.
- Voz da Nina: `src/lib/voice.ts`, `src/routes/nina.tsx`.
- Loja: `src/lib/programs.ts`, `src/routes/programas*.tsx`, `src/routes/painel.programas.tsx`,
  `supabase/functions/program-checkout`.
- Mercados: `src/lib/markets.ts`, `src/components/buy-at-market.tsx`,
  `src/components/admin/sections-markets.tsx`.
- Estúdio de redes sociais: `src/components/admin/social/`, `src/lib/social-studio.ts`,
  `src/lib/social-studio.functions.ts`, `src/lib/post-art.ts`, `src/lib/social-calendar.ts`.
- Tipos do Supabase (`src/integrations/supabase/types.ts`) foram editados à mão para as tabelas
  novas. **Nunca rode o prettier nesse arquivo** (ele reformata o arquivo inteiro).
