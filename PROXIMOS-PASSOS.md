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
| `b6d9697` | S1 — Estúdio de redes sociais no admin (seção "Redes sociais")                                |
| `289789d` | M4 — Habilitação para teleconsulta (CFN 760/2023)                                             |
| (este)    | Migrations e Edge Functions aplicadas em produção; higiene do relatório de segurança          |

Build (`npx vite build`), tipos (`npx tsc --noEmit -p .`) e lint (`npx eslint .`, só avisos de
fast-refresh que já existiam) passam em todos.

## Banco e Edge Functions: em dia (14/10/2026)

Todas as migrations do repositório estão aplicadas no Supabase de produção (`mtwtlbbgkzexyaavcboe`),
com as versões do registro (`supabase_migrations.schema_migrations`) iguais aos nomes dos arquivos,
até `20261015120000_advisor_hygiene`. As Edge Functions `ai-chat`, `program-checkout`,
`stripe-webhook` e `push-send` foram publicadas com o código atual.

Como mexer no banco a partir daqui: o conector "Supabase" do claude.ai está autorizado (leitura e
gravação liberadas nas permissões do conector). Leitura funciona sempre; gravações grandes podem ser
barradas pela verificação de segurança do modo automático do Claude Code. Nesse caso, gere um SQL
único com as migrations novas (entre `begin;` e `commit;`) e peça ao dono para colar no Supabase →
SQL Editor (https://supabase.com/dashboard/project/mtwtlbbgkzexyaavcboe/sql/new), ou peça a ele para
liberar `mcp__claude_ai_Supabase__apply_migration` em `/permissions`. Ao aplicar pelo conector, o
registro ganha a hora do servidor como versão: corrija para o nome do arquivo com um `update` em
`supabase_migrations.schema_migrations`.

## Como testar sem acesso ao banco (usado em todos os itens desta sessão)

`supabase/tests/run-local.mjs` aplica todas as migrations num Postgres em WebAssembly (PGlite) com
imitações do Supabase e roda `supabase/tests/social_security.sql`. Instruções no topo do arquivo.
Resultado atual: **61+10 migrations aplicadas, 462 testes, 0 falhas**. Sempre que criar migration,
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

- **M4 (feito)**: card "Teleconsulta" em /painel/configuracoes; análise em Admin → Verificações, com o
  interruptor "Exigir habilitação para atender online" (começa desligado; ao ligar, o banco recusa
  consulta online de quem não foi aprovado). Ligue só depois que os profissionais enviarem o cadastro.
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
