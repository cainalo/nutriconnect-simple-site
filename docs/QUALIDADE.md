# Rodadas de qualidade do NutriConnect

O dono pediu rodadas de teste em **todas as páginas, funções e funcionalidades** do site, com nota de
**0 a 10 em cada critério** (10 = 100%). A meta é levar todos os critérios de todas as partes a 10,
etapa por etapa. Este arquivo explica como fazer uma rodada; qualquer sessão deve conseguir seguir
sozinha.

## Onde está cada coisa

| O quê | Onde |
|---|---|
| Os 12 critérios (o que olhar, como dar nota) | `src/lib/quality/criteria.ts` |
| Tudo o que existe no site (páginas, funções, funcionalidades), com o que cada um faz | `src/lib/quality/catalog.ts` |
| As notas de cada rodada | `src/lib/quality/results.ts` |
| Painel com as notas (por item e por critério, com evolução) | Admin → **Qualidade** |
| Documentação do site para o dono aprender a usar | Admin → **Documentação** (lê o mesmo catálogo) |
| Prints usados na documentação | `public/images/docs/<id do item>.jpg` |

**Atenção ao que é “função”:** função é **algo que o site faz** (consulta on-line, acompanhamento,
diário alimentar, geladeira, grupo familiar, cardápio, feed…), não a página Funções (que só reúne
atalhos). No catálogo: `funcao` = o que o site faz; `funcionalidade` = uma parte menor de uma função
(menu ⋯ do post, pagar a consulta); `pagina` = tela simples (login, termos, configurações).

O catálogo é a **fonte única**: página nova no site = item novo no catálogo (senão ela não aparece na
documentação nem é avaliada).

## Os critérios (resumo)

1. **Estética**: bonito, coerente com o design escolhido, sem cara de IA, claro e escuro.
2. **Layout e simetria**: alinhado, simétrico, sem órfãos nem sobreposição.
3. **Responsividade**: celular, tablet, computador e app Android; sem rolagem lateral.
4. **Rolagem e navegação**: sem rolagens desnecessárias ou aninhadas; voltar funciona.
5. **Experiência de uso**: intuitivo, poucos passos, retorno claro, estados vazio/erro.
6. **Facilidade de acesso**: fácil de achar a partir dos menus e páginas relacionadas.
7. **Acessibilidade**: contraste, teclado, leitor de tela, movimento reduzido.
8. **Funcionamento**: sem erros, salva e carrega, casos de borda.
9. **Utilidade e proposta**: útil de verdade e cumpre o que promete.
10. **Desempenho**: rápido no celular e com internet fraca.
11. **Textos e idiomas**: claros, sem tiques de IA, completos em pt/en/es/fr.
12. **Completude**: o que ainda falta para a função estar completa.

Cada critério tem, em `criteria.ts`, a lista do que conferir e a régua (o que vale 10, 7, 4 e 0).
Use notas inteiras de 0 a 10; 10 só quando não há nada a melhorar naquele critério.

## Como fazer uma rodada

1. **Escolha o recorte**: uma área do catálogo (ex.: "Cozinha e compras") ou uma lista de itens. Uma
   rodada não precisa cobrir tudo; o painel mostra o que já foi avaliado e quando.
2. **Veja cada item de verdade**:
   - Prints sem login pelo harness (`.preview-harness`, ver `PROXIMOS-PASSOS.md`):
     `npx vite build --config .preview-harness/vite.config.mjs` e
     `npx vite preview --config .preview-harness/vite.config.mjs --port 4179`; abra
     `?v=page&p=<arquivo da rota sem .tsx>` (ex.: `p=feira&uf=SP`), `&d=vibrante|editorial|aurora`,
     `&dark=1`. Tire prints em **390 px** e **1280 px** (Playwright em `scratchpad/pw/shot.mjs`
     de sessões anteriores, ou um script novo igual).
   - Cards de Funções sozinhos: `?v=card&c=<NomeDoCard>`.
   - Leia o código do item para conferir o funcionamento (salvar, erros, permissões, idiomas).
   - Se o banco simulado do harness não guarda dados, teste a lógica com um script separado (veja o
     teste de `src/lib/menu-fill.ts` feito com esbuild) e diga isso na avaliação.
3. **Dê as notas**: para cada item, uma nota por critério, com a régua do `criteria.ts`. Seja
   honesto: nota alta sem ter visto é pior que nota baixa.
4. **Anote o que melhorar**: em `improve`, frases curtas e acionáveis ("Filtro do mês não cabe em
   390 px", "Falta tradução do aviso de alergia em francês"). Em `good`, o que não se pode perder.
5. **Grave a rodada**: acrescente um objeto no **fim** de `ROUNDS` em `results.ts` (número da rodada,
   data, método e os itens). Nunca apague rodadas antigas: o painel mostra a evolução.
6. **Mostre ao dono**: um resumo por item (nota média e os piores critérios) e as melhorias
   propostas, em ordem de impacto. Ele decide o que atacar primeiro.
7. **Corrija e reavalie**: a próxima rodada reavalia os itens corrigidos; repita até tudo chegar a 10.

## Regras que valem em todas as rodadas

- Seguir as regras do dono em `PROXIMOS-PASSOS.md` (simetria, sem cara de IA, animado, 4 idiomas,
  trabalhar na `main`, nunca subir para a `prod` sem ordem).
- Avaliar nos **quatro designs** (Natural, Vibrante, Editorial, Aurora) e nos modos claro e escuro
  pelo menos uma vez por item.
- Avaliar com e sem as fotos do site (Admin → Design e imagens → Imagens do site).
- Nota média do item = média dos critérios avaliados; nota da área = média dos itens.
