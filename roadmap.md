# Roadmap

## Em andamento

- [x] Criar o webhook no painel do Stripe e salvar `STRIPE_WEBHOOK_SECRET` (passos em docs/painel-clinico.md)
- [x] Testar o fluxo de pagamento com cartão de teste e, depois, trocar para as chaves reais
- [x] Remover do Supabase as funções antigas `mp-*` (`npx supabase functions delete <nome>`) e a tabela `professional_mp_accounts`
- [ ] Preencher os dados da empresa em `src/lib/legal.ts` (ver docs/conformidade-legal.md)

## App Android (aprovado em 11/10/2026, antes da N9)

App nativo com Capacitor (pasta `mobile/`), ID `br.com.nutriconnect.app`, APK gerado no GitHub Actions.

1. [x] A1 — App base: ícone, abertura, barra de status, voltar, tela sem conexão, APK de teste
2. [ ] A2 — Notificações nativas (Firebase Cloud Messaging)
3. [ ] A3 — Câmera e código de barras nativos (ML Kit)
4. [ ] A4 — Compartilhar do Android, links que abrem o app, vibração
5. [ ] A5 — Publicação no Google Play (assinatura, ficha da loja, segurança dos dados, teste fechado)

## Próximas funções (aprovadas em 09/10/2026, nesta ordem)

Cada item ganha o próprio commit depois de testado.

1. [x] N1 — App instalável (PWA) + notificações (lembretes de refeição, água, consulta, desafio)
2. [x] N2 — Água do dia (registro em um toque, com lembretes)
3. [x] M5 — Metas com sequência gentil (sem culpa) e gráficos de progresso
4. [x] M1 — Leitor de rótulos completo: código de barras (Open Food Facts), lupa "ALTO EM" da Anvisa, grupo NOVA, histórico e comparação
5. [x] M7 — Diário com foto comentada pela Nina (educativo, sem calorias)
6. [x] N7 — Modo sem números (fome, saciedade e emoção; sinais de alerta → ajuda profissional)
7. [x] M2 — Nina que conhece o acompanhamento (plano e metas, com permissão do paciente)
8. [x] N4 — "O que tem na geladeira?" (receitas com o que há em casa, aproveitamento integral)
9. [x] N3 — Cardápio semanal com orçamento e lista de compras única
10. [x] N5 — Calendário da feira (frutas e verduras da estação por região)
11. [x] N8 — Lancheira da semana (lanche escolar, ligada aos perfis infantis)
12. [x] M3 — Painel do profissional: relatório de adesão, paciente sem registrar há 7 dias, modelos de plano
13. [x] N9 — Relatório "Minha evolução" (PDF mensal)
14. [x] M4 — Verificação com e-Nutricionista para teleconsulta (Resolução CFN 760/23)
15. [x] N12 — Descobrir a nutri ideal (questionário de compatibilidade)
16. [x] M6 — Trilhas com certificado e revisão espaçada
17. [x] N6 — Parceiro de jornada (dupla de apoio com check-in diário)
18. [x] M8 — Eventos ao vivo nas comunidades ("Pergunte à nutri": perguntas antes, votação, respostas fixadas)
19. [x] N11 — Nina por voz (falar e ouvir as respostas)
20. [x] N10 — Loja de programas dos profissionais (Stripe; taxa igual à das assinaturas de membros, de 20% a 10% pelo nível)

## Grupo familiar — "Minha casa" (aprovado em 13/10/2026, depois do N6 e antes do M8)


Pessoas que moram juntas compartilham, em tempo real, o que é da casa. Nada clínico é compartilhado
(diário, metas, peso, plano do nutricionista, check-ins). Uma casa por pessoa, até 8 adultos;
papéis responsável e membro; convite por link/código ou entre amigos.

1. [x] F1 — Casa, convites e membros + lista de compras única em tempo real (quem adicionou, quem comprou)
2. [x] F2 — Geladeira da casa (sai do navegador para o banco) + cardápio da semana da casa (porções = nº de pessoas)
3. [x] F3 — Lancheiras das crianças editáveis pelos adultos da casa + mural de recados

## Compras nos mercados (sugestão de voluntário na apresentação, aprovada em 13/10/2026)

Integração com mercados/lojas para comprar os produtos das receitas, da lista de compras e do plano
alimentar escrito pelo profissional, gerando receita para a plataforma (links de afiliado).

1. [x] R1 — Mercados parceiros: botão "Comprar" na receita, na lista de compras e no plano alimentar; parceiros e códigos de afiliado no painel do admin; cliques medidos

## Estúdio de redes sociais no admin (pedido em 13/10/2026)

Ferramenta de social media com IA no painel do admin: análise dos perfis (Instagram e outras redes, a
partir do link e de prints/legendas/números enviados), ideias de posts e de engajamento, modelos de
postagem, calendário e tendências do momento. Hoje só para o admin; no futuro pode ser vendida aos
profissionais (não agora).

1. [x] S1 — Estúdio de redes sociais: perfis, análise por IA, ideias, modelos, calendário e tendências

## Feito
- [x] Trilha como história de RPG: capítulos, inimigos por parada, batalha durante a lição e cenas de filme (cutscenes) com música
- [x] Página Funções em tela cheia, com cards animados e cores próprias
- [x] Todas as migrations foram aplicadas no banco remoto com sucesso.
- [x] Checkout, webhook e estorno do Stripe como Edge Functions (`stripe-checkout`, `stripe-webhook`, `stripe-refund`), já publicadas
- [x] Mercado Pago removido do app
- [x] Chave secreta do Stripe salva (integração BYOK habilitada)
- [x] Gerar nova LOVABLE_API_KEY e salvar no Supabase (rotacionada + sincronizada; gateway respondeu 200)
- [x] IA (Nina, resumo clínico e moderação) via Edge Functions `ai-chat` e `moderate-content`
- [x] Adequação à LGPD, Marco Civil e ECA Digital (docs/conformidade-legal.md)

## Rumo definido em 15/10/2026 (conversa de planejamento)

Decisões do dono: visual primeiro; **mínimo de IA possível** em novas ideias (preferir recursos
determinísticos); um commit por item, autônomo.

### Designs do site (reformulado em 15/10)

Os designs **não** são só cores: cada um é um "site recriado por outro designer", com as mesmas
funcionalidades, mas navegação, menus, posição das coisas e estilo de página próprios. O seletor
do admin (Design do site) escolhe qual está no ar.

1. [x] D1 — Seletor no admin + tema visual (cores, cantos, fontes) dos 4 designs (base técnica)
2. [x] D2 — Casca por design: Vibrante (barra lateral + dock), Editorial (capa de revista, sem barra inferior), Aurora (cápsula flutuante + dock de vidro + paleta Ctrl+K); falta conferir em prints
3. [x] D3 — Página inicial (landing) e abertura do Espaço com composição própria por design (feed e posts intactos); colunas laterais redesenhadas em cada design (cards coloridos, colunas de jornal, vidro)
4. [ ] D4 — Funções, Perfil, Comunidades, Desafios, Acompanhamento, Painel clínico por design
5. [ ] D5 — Revisão final em prints (celular, escuro), mantendo modelos de post e regras de rolagem

### Funções e expansão

6. [ ] S2 — Terminar abas Ideias, Calendário, Tendências e Perfis do estúdio no novo estilo
7. [ ] T1 — Turbinar as funções existentes, uma por commit, já no visual novo
8. [ ] A3 — App: câmera e código de barras nativos; A4 — compartilhar, links que abrem o app, vibração
9. [ ] A2 / A5 — dependem de Firebase e da conta do Google Play
10. [ ] P1 — Marketplace de consultas (busca por especialidade, avaliações verificadas, agenda, pagamento)
11. [ ] X1 — Diário de sintomas e alimentação com correlações (para levar à consulta)
12. [ ] X2 — Lembretes de consulta e de exames (e-mail e push, confirmação de presença)
13. [ ] X3 — Desafios entre amigos e ligas semanais (ranking gentil, sem culpa)
14. [ ] X4 — Pontos e recompensas (desconto na Loja de programas, brindes de parceiros)
15. [ ] X5 — Receitas da comunidade (coleções salvas; tabela nutricional de base fixa, TACO)
16. [ ] X6 — Modo família e cuidador (acompanha hábitos de criança/idoso sem ver dados clínicos)
17. [ ] X7 — Acessibilidade: leitura em voz alta das trilhas, contraste máximo, Libras
18. [ ] E1 — Modo escola (escolas e professores usam a plataforma; escopo a definir)
19. [ ] C1 — Plano comercial: marketing, precificação, metas (documento em docs/comercial.md)
