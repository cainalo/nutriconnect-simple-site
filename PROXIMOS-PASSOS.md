# Próximos passos (passagem de sessão — 15/10/2026)

**Regra de branches (17/10, vale sempre):** trabalhe e faça push **direto na `main`** (sincroniza com o
Lovable). A branch **`prod` é a que o Netlify publica e gasta crédito**: só leve a `main` para a `prod`
quando o dono mandar. As permissões estão em `.claude/settings.json` (push da `main` liberado, push da
`prod` bloqueado). D5 (17/10): parte 2, cabeçalho das landings Vibrante e Aurora cabe no celular;
parte 3, últimos emojis da tela viraram ícones; parte 4, Configurações e Conquistas da trilha sem
cortes, texto justificado fora de letras miúdas e blocos centralizados; parte 5, palavras longas
(links, hashtags) quebram em vez de serem cortadas na borda do post (era o corte à direita do
Editorial). A bancada monta qualquer página real: `v=page&p=<arquivo da rota sem .tsx>&d=<design>`
(`&dark=1` para o escuro); páginas filhas aparecem sem o layout-pai (sem a margem lateral).
Falta do D5: conferir no site logado de verdade (com dados) e no aparelho do dono.

**Regras contra "cara de site feito por IA" (17/10, valem para tudo que for criado):** nada de
violeta/índigo/turquesa padrão do Tailwind nem fonte Inter/Poppins como identidade; nada de texto em
degradê nem botão em degradê de duas cores (use cor sólida); nada de selo em pílula com brilhos acima
do título; ícone de brilhos (Sparkles) só onde a Nina (IA) age; nada de bolhas de luz desfocadas,
listra lateral grossa em card, passos "01/02/03" nem cards iguais com ícone em cima; textos sem
travessão no meio da frase e sem clichês ("jornada", "transforme", "tudo o que você precisa",
tríades "Sua X. Sua Y. Sua Z."). Prefira fala concreta, do jeito que uma pessoa escreveria.

**Fileiras de botões/filtros simétricas (17/10, pedido do dono):** nada de fileira de pílulas com a
borda direita "torta". Uma regra global em `styles.css` (procure "Fileiras de pílulas") faz toda
fileira com `flex-wrap` de 2 ou mais pílulas preencher a largura, com as duas bordas alinhadas.
Rótulo na mesma fileira das pílulas quebra a regra: ponha o rótulo numa linha própria acima.
`data-free-wrap` desliga a regra numa fileira específica.
Grades: card sozinho na última linha ocupa a linha (2 colunas) ou vai ao meio (3 colunas);
`data-free-grid` desliga. Funções fecha cada seção sem buracos (`src/lib/fill-grid.ts`).

**Site animado como Funções (17/10, pedido do dono):** regras no fim de `styles.css` ("Site
animado") fazem os cards das páginas entrarem em cascata, links/botões com fundo de card subirem
ao passar o mouse e inclinarem na direção dele (`src/lib/tilt.ts`, ligado no `__root`) e botões
afundarem ao toque. A faixa de título de cada página (`design-page-head.tsx`) existe em todos os
designs, inclusive o Natural, com ícones flutuando. Tudo respeita "reduzir movimento".

**Atualização de 15/10 (leia primeiro):** o rumo do projeto mudou; veja a seção "Rumo definido em
15/10/2026" do `roadmap.md`. Feitos: D1 (seletor "Design do site" no admin, `src/lib/site-design.ts`),
D2 (navegação própria por design em `src/components/site-chrome-designs.tsx`), D3 (landing por design
em `landing-designs.tsx`, abertura do Espaço em `espaco-intro.tsx`, colunas laterais via
`[data-rail-col]` no `styles.css`). Os 4 designs (Natural, Vibrante, Editorial, Aurora) devem ser
sites distintos, não só cores. Falta o D4 (Funções, Perfil, Comunidades, Desafios, Acompanhamento e
painel clínico por design) e o D5 (revisão em prints). O dono quer o **mínimo de IA possível** em
funções novas. Para ver as telas sem login: `.preview-harness` (`v=landing&d=<design>`,
`v=header&d=<design>`, `v=rails&d=<design>`; `stub-auth.ts` simula uma pessoa logada).
O texto abaixo é da sessão anterior (14/10).

**Fechamento da etapa de designs (15/10):** colunas laterais removidas do site (cards delas só em
Funções, "Meus cards", que o dono mandou tirar em 17/10, e o card de nível em Desafios); páginas em largura total; posts em colunas
independentes (`src/components/post-masonry.tsx`, 3 colunas, cada uma medida sozinha); Editorial como
jornal antigo (textura, letra gótica, cor por tipo em tinta velha, matérias inteiras em colunas
contínuas, "Ver mais" só no celular). 56 posts de exemplo gravados no banco (migrations
`20261015160000_demo_posts_exemplo` e `..160100_demo_posts_interacoes`; autores = perfis de exemplo
`00000000-0000-4000-a000-*`, exceto Helena Souza, que está suspensa). Para apagar:
`delete from public.posts where id::text like '00000000-0000-4000-b000-%';`.
Pendente: D5 (revisar tudo em print no site logado, celular e modo escuro) e o corte à direita que o
dono viu no Editorial pelo celular (não reproduzido na bancada; há uma trava de largura em
`styles.css` para telas < 1024 px). Próximas etapas combinadas: S2, turbinar funções (T1), app (A3/A4),
marketplace (P1), X1–X7, modo escola (E1) e monetização (C1).

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
| `69fbefd` | Migrations e Edge Functions aplicadas em produção; higiene do relatório de segurança          |
| `109a59b` | S2 — Estúdio de redes sociais reformulado (ver seção S2 abaixo; trabalho ainda em andamento)  |

Build (`npx vite build`), tipos (`npx tsc --noEmit -p .`) e lint (`npx eslint .`, só avisos de
fast-refresh que já existiam) passam em todos.

## Banco e Edge Functions: em dia (14/10/2026)

Todas as migrations do repositório estão aplicadas no Supabase de produção (`mtwtlbbgkzexyaavcboe`),
com as versões do registro (`supabase_migrations.schema_migrations`) iguais aos nomes dos arquivos,
até `20261015140000_social_media_bank` (bucket `social-media` do banco de imagens, aplicado em
14/10 pelo conector). As Edge Functions `ai-chat`, `program-checkout`,
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

## S2 — Estúdio reformulado (em andamento; CONTINUE POR AQUI)

Pedidos do dono (14/10), todos valem: estúdio muito mais interativo, moderno, limpo, em cards e
animado, **inspirado na página de Funções** (`src/routes/funcoes.tsx`: tiles em degradê que inclinam
com o mouse, Nina animada, ícones flutuando, títulos de seção com traço); criar post a partir de
ideias e modelos com **prévia exata de cada rede**; **sem emojis em lugar nenhum** (regra do site: só
ícones); modelos mais variados; **banco de imagens**; tudo alinhado, nada saindo dos espaços,
elegante e sem imperfeições.

Feito (compila, lint e build passam; conferido em prints):

- `src/lib/post-art.ts`: 11 layouts (clássico, centralizado, editorial, moldura, dado, lista, troca
  "em vez de → prefira", enquete, citação, mito × verdade, receita), 11 temas, **ícone em selo no
  lugar de emoji** (emojis digitados são removidos da arte), foto do banco ou URL, "zona segura" no
  vertical 9:16 (margens maiores e conteúdo longe da faixa que a interface do Reels/TikTok cobre),
  títulos nunca passam da largura.
- `src/lib/art-icons.ts`: 90 ícones do Lucide gerados do pacote (script estava em
  `%TEMP%/gen-icons.mjs`; para acrescentar ícones, copie `__iconNode` de
  `node_modules/lucide-react/dist/esm/icons/<nome>.js`).
- `src/lib/social-templates.ts`: 29 modelos sem emojis, com ícones, alguns com foto, usando todos os
  layouts; categorias com ícone e cor (`CATEGORY_STYLE`). Dados citados são reais (Guia Alimentar,
  OMS 400 g, Dia Mundial da Alimentação 16/10).
- Banco de imagens: 38 fotos curadas em `public/images/social/` (+ miniaturas em `thumbs/`, créditos
  em `CREDITS.md`, licença Unsplash) + fotos já existentes do site; biblioteca da equipe no bucket
  `social-media` (`src/lib/social-media.ts`, `src/components/admin/social/image-bank.tsx`).
- Kit visual: `src/components/admin/social/kit.tsx` (StudioCard, Tile, SectionTitle, IconBadge,
  ArtIcon, Floaters, EmptyState) e `kit-styles.ts` (campos, botões, cor/ícone de rede, formato e
  status). A classe `.st-root` (em `styles.css`) desliga o texto justificado do site dentro do estúdio.
- Editor (`composer.tsx`) refeito: etapas em tiles com barra de progresso e botões Voltar/Próximo;
  seções em cards; rede e formato como cards com ícone; reescrita por IA em cards; aviso e botão
  "Remover emojis"; Visual com **miniatura real do post em cada layout**, paletas, seletor de ícones,
  banco de imagens e "texto da capa" (`design.body`, vazio = automático por `coverBody()` em
  `use-art.ts`); Publicar com nota, checklist (inclui "sem emojis") e ações em tiles.
- Início (`dashboard.tsx`) no estilo de Funções (Nina, atalhos em tiles, funil com contagem animada,
  modelos em destaque, recentes, próximos 7 dias, datas). Quadro (`board.tsx`) e Modelos
  (`templates-gallery.tsx`) refeitos. Navegação do estúdio (`studio.tsx`) com cor por aba.
- IA (`social-studio.functions.ts`): prompt proíbe emojis e o servidor remove os que vierem.
- Prévias (`previews.tsx`): emojis e símbolos trocados por ícones; adesivo do Stories removido (cobria
  a arte); linha de reações do Facebook sem encavalar.

Próximos passos, nesta ordem:

1. **Conferir em print** o que foi mexido por último e ainda não foi visto: prévias (Stories, TikTok,
   Facebook, LinkedIn), quadro com colunas flexíveis, galeria sem justificado, artes verticais com a
   nova margem direita e o editorial vertical (`split` 0.46), moldura no paisagem.
2. **Refazer no mesmo estilo as abas que ainda estão no visual antigo**: `ideas-tab.tsx` (Ideias com
   IA), `calendar-tab.tsx`, `trends-tab.tsx`, `profiles-tab.tsx`. Usar `StudioCard`, `Tile`,
   `SectionTitle`, `EmptyState` e as cores de `kit-styles.ts`; nada de emoji (trocar por ícones).
3. Conferir o editor na largura de celular (375 px) e no **modo escuro**.
4. Testar em produção o envio de foto para a biblioteca da equipe e o download da arte com essa foto
   (o canvas precisa de CORS do Storage; `loadImage` já usa `crossOrigin`).
5. Registrar S2 no `roadmap.md` e commitar.

Como conferir visualmente (sem login): `.preview-harness/` monta as telas do estúdio isoladas, com
Supabase e IA simulados. `npx vite build --config .preview-harness/vite.config.mjs` e depois
`npx vite preview --config .preview-harness/vite.config.mjs --port 4179`; abra
`http://localhost:4179/?v=...` com `v=dash`, `board`, `gallery`, `grid&t=<id do modelo>` (prévias
das 8 redes), `arts&size=feed|story|paisagem` (todas as artes) ou `composer&t=<id>&click=Visual`.
Print pelo Edge headless: `"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless
--disable-gpu --hide-scrollbars --window-size=1440,1000 --virtual-time-budget=12000
--screenshot=<arquivo.png> <url>` (o arquivo demora alguns segundos para aparecer).

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
  `src/lib/social-studio.functions.ts`, `src/lib/post-art.ts`, `src/lib/art-icons.ts`,
  `src/lib/social-templates.ts`, `src/lib/social-media.ts`, `src/lib/social-calendar.ts`.
- Tipos do Supabase (`src/integrations/supabase/types.ts`) foram editados à mão para as tabelas
  novas. **Nunca rode o prettier nesse arquivo** (ele reformata o arquivo inteiro).
