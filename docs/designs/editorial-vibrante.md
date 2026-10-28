# Tema Editorial Vibrante

O tema **Editorial Vibrante** é uma identidade visual opcional do NutriConnect inspirada na linguagem editorial contemporânea do projeto Pórtico. A referência orienta a composição, a tipografia, o uso de superfícies quentes e os cards-pôster; o nome, a wordmark e o símbolo continuam sendo próprios do NutriConnect.

## Como testar e publicar

1. Entre no painel administrativo e abra **Design do site**.
2. Encontre **Editorial Vibrante** e selecione **Testar neste navegador**. A prévia é local e não muda a configuração publicada.
3. Use a alternância claro/escuro da galeria para comparar os dois modos.
4. Confira a seção **Comparação visual**, que mostra o mesmo conteúdo no tema atual e no Editorial Vibrante.
5. Quando estiver satisfeito, escolha **Publicar no site** e confirme. A configuração é gravada pelo mecanismo de configuração de site já existente.

## Como reverter para o tema anterior

Volte a **Design do site** e publique o tema que estava usando antes, ou publique **Natural** para restaurar o visual original. A prévia volta ao tema publicado quando você sai da tela administrativa. Não são apagados dados, conteúdo, contas ou preferências.

## Sistema visual

- **Papel quente:** #F7EFDF; superfície clara: #FFF9EF; superfície secundária: #EFE2CD.
- **Azul-petróleo:** #0F4C5C, estrutura e navegação.
- **Terracota:** #C8402A, destaques e ações.
- **Ocre:** #D4A017, indicadores e cards que usam texto escuro #10282E.
- **Ameixa:** #6B3A6E; verde-oliva: #556B2F; cores alternativas de cards.
- **Fraunces:** títulos editoriais; **Inter Tight:** interface, controles e texto operacional.

Cards de publicações, estatísticas e atalhos podem usar superfícies inteiramente coloridas. Texto claro é empregado nos fundos escuros; o ocre recebe tinta escura para preservar contraste. O CSS do tema respeita prefers-reduced-motion e a opção existente de movimento reduzido.

## Marca vetorial original

- `public/brand/nutriconnect-wordmark.svg`: wordmark vetorial de duas cores.
- `public/brand/nutriconnect-wordmark-reverse.svg`: wordmark para o modo escuro.
- `public/brand/nutriconnect-mark.svg`: símbolo isolado de folhas sobre uma tigela.
- `public/icons/nutriconnect-app.svg`: composição quadrada para ícone de aplicativo.
- `public/favicon.svg`: favicon vetorial, usado quando Editorial Vibrante está selecionado.

O ID interno `portico` é mantido para preservar configurações já gravadas com essa chave. O nome exibido no painel é **Editorial Vibrante**. O favicon acompanha o tema selecionado; ao reverter, o favicon original é restaurado. Nenhuma alteração é feita no repositório Pórtico.

## Navegação e composição das páginas

O tema inclui um cabeçalho próprio em duas faixas: marca e ações no topo; seções com ícones, estados ativos e contador de notificações na segunda linha em telas largas. No celular, a faixa secundária vira uma barra inferior de navegação estilo aplicativo, com publicação central e conta. Ambas consomem o mesmo `useHideOnScroll(pathname)` e recebem o mesmo `data-hidden`; assim, recolhem ao rolar para baixo e reaparecem ao subir, inclusive nas telas que avisam por `CHROME_HIDE_EVENT`. O botão Voltar usa o histórico de navegação e cai para o início apropriado quando não existe uma página anterior no histórico.

As páginas com cabeçalho contextual têm uma composição editorial própria: chamada em versalete, título grande em Fraunces, texto de contexto, filete de seção e imagem em moldura geométrica com selo de ícone. O restante das páginas preserva seus mesmos componentes, rotas e dados, mas menus, diálogos, tabelas, formulários, estados de foco e cartões seguem as regras visuais do tema. A estrutura responsiva mantém a barra inferior fora da área do conteúdo e considera a safe area do celular.

### Experiência do feed

O Espaço de Hoje também tem tratamento próprio no Editorial Vibrante: abertura com saudação editorial, destaque da conversa semanal, atalhos em cards-pôster e um feed em grade assimétrica (a primeira publicação ocupa maior área; as seguintes formam uma composição de notas). Os filtros são uma régua segmentada em vez de pílulas genéricas. Em celulares, a grade vira uma coluna, o cabeçalho se reorganiza e a área de rolagem recebe espaço inferior extra para que o dock não esconda o último cartão nem a ação de carregar mais.

A apresentação editorial contextual funciona também com as fotos opcionais desligadas: usa uma composição gráfica própria com anéis e ícone da seção em vez de cair no cabeçalho de outro tema.
