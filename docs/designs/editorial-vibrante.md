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
