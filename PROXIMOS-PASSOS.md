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

Build (`npx vite build`), tipos (`npx tsc --noEmit -p .`) e lint (`npx eslint .`, só avisos de
fast-refresh que já existiam) passam em todos.

## PENDENTE 1 (o mais importante): aplicar as migrations no banco real

**Nenhuma migration desta sessão está no Supabase de produção** (projeto `mtwtlbbgkzexyaavcboe`).
Foi conferido em 14/10 sondando a API REST com a chave pública: `daily_checkins` existe, mas
`journey_pairs`, `households`, `fridge_items`, `household_notes`, `community_events`,
`pro_programs` e `market_partners` não existem. O site está no ar com o código novo e **funciona**
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
```

Por que não foram aplicadas: nesta máquina a CLI do Supabase recusa o token
(`SUPABASE_ACCESS_TOKEN` do ambiente e o login salvo: "Invalid access token"), não há senha do banco
(`SUPABASE_DB_PASSWORD`), não há `gh`, e o conector "claude.ai Supabase" não está autorizado.

Caminhos para aplicar (do mais fácil para o dono ao mais técnico):

1. **Conector do Supabase no claude.ai**: se o dono autorizar o conector "Supabase" nas
   configurações de conectores do claude.ai, aplique as 8 migrations por ele, na ordem.
2. **Arquivo único já pronto**: `APLICAR-NO-SUPABASE.sql` na raiz do projeto (fora do git, listado em
   `.git/info/exclude`). Tem as 8 migrations numa transação (`begin`/`commit`, se algo falhar nada é
   aplicado) e registra as versões em `supabase_migrations.schema_migrations` se essa tabela
   existir. Basta colar no Supabase → SQL Editor → Run. Foi testado no PGlite sobre o estado atual do
   banco (até `20261014100000`) e os 443 testes passaram. Se o arquivo sumir, recrie concatenando as
   8 migrations acima entre `begin;` e `commit;`.
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
```

Sem o deploy do `push-send`, o push dos avisos novos chega como "Você tem um novo aviso" (o resto
funciona). O webhook do Stripe já escuta `checkout.session.completed` e `charge.refunded`, que são
os eventos usados pela loja de programas.

## Como testar sem acesso ao banco (usado em todos os itens desta sessão)

`supabase/tests/run-local.mjs` aplica todas as migrations num Postgres em WebAssembly (PGlite) com
imitações do Supabase e roda `supabase/tests/social_security.sql`. Instruções no topo do arquivo.
Resultado atual: **61+8 migrations aplicadas, 443 testes, 0 falhas**. Sempre que criar migration,
adicione testes ao `social_security.sql` (blocos `if to_regclass(...) is not null then ... end if;`)
e rode o harness. Atenção: no `as_user`, texto com espaço ou vírgula volta entre aspas; use valores
sem espaço nas comparações.

## Próximo item a construir: S1 — Estúdio de redes sociais (admin)

Pedido do dono (13/10): "No painel do admin, uma ferramenta completa de criação de posts para
Instagram e outras redes, onde nossa IA analise o nosso perfil (via link ou outra opção), sugira
ideias de posts e de engajamento, crie modelos de postagens e acompanhe as tendências do momento,
como um verdadeiro profissional de redes sociais." **Hoje só para o admin; no futuro pode ser
vendida aos profissionais, mas não agora** — construa sem acoplar demais ao admin (dados por dono,
cota de IA própria) para facilitar isso depois.

Limitações reais a respeitar (já explicadas ao dono): o Instagram não permite ler um perfil só pelo
link (bloqueia leitura automática; a API oficial exige app aprovado pela Meta). A IA também não
navega na internet em tempo real. Desenho sugerido:

- **Perfis**: cadastrar as redes (Instagram, TikTok, Facebook, LinkedIn, YouTube) com link, e o
  admin cola bio, legendas recentes e números (seguidores, curtidas, alcance) ou envia **prints**
  (a IA lê imagens: `aiChat` em `src/lib/ai-gateway.server.ts` aceita `image`).
- **Análise por IA**: diagnóstico do perfil (tom, frequência, temas, o que engaja), pontos fortes e
  o que melhorar.
- **Ideias e modelos**: posts, carrosséis (texto de cada slide), roteiros de Reels, legendas,
  hashtags e CTAs, no tom da marca; salvar como modelos reutilizáveis.
- **Calendário editorial** da semana/mês com status (ideia → rascunho → aprovado → publicado).
- **Tendências** a partir do que o projeto tem: posts em alta da rede (`feed_ranked`), tema da
  semana, dúvidas da Nina, alimentos da estação (`src/lib/season.ts`), datas comemorativas de saúde
  e nutrição do Brasil. Deixe claro na tela que não são tendências "ao vivo" do Instagram.
- **Arte**: gerar a imagem do post no navegador (canvas) com as cores/mascotes do NutriConnect, para
  baixar em PNG (feed 1080×1350 e story 1080×1920).
- Técnico: nova seção em `src/components/admin/sections.tsx` + `src/routes/admin.tsx` (grupo
  "Negócio" ou "Conteúdo"); tabelas `social_profiles`, `social_ideas`/`social_posts` com RLS de
  `is_platform_admin()` e coluna de dono; funções de servidor no padrão de
  `src/lib/menu.functions.ts` (`createServerFn` + `requireSupabaseAuth` + `aiChat`); se precisar de
  novo tipo de cota de IA, ampliar a constraint `ai_usage_kind_check` (ver migrations de `ai_usage`)
  e a Edge Function `ai-chat` (que precisaria de deploy).

Ao terminar o S1, marque no `roadmap.md` e faça commit + push.

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
- Tipos do Supabase (`src/integrations/supabase/types.ts`) foram editados à mão para as tabelas
  novas. **Nunca rode o prettier nesse arquivo** (ele reformata o arquivo inteiro).
