# Os 24 fluxos do pacote de auditoria × testes que existem

Situação em 23/10/2026. "Banco" = `supabase/tests/social_security.sql` (543 testes de acesso e regras
por papel, rodando com PGlite); "Unidade" = `npm test`; "Telas" = `npm run test:e2e` (harness com
dados sintéticos: rolagem lateral, alvos de toque, erros de JS, WCAG). Nenhum teste usa dado real.

| Fluxo | Coberto hoje | Falta |
|---|---|---|
| F01 Geladeira → receitas → lista | Banco: lista pessoal (dono põe/marca; outra pessoa não vê nem põe) | E2E com sessão real |
| F02 Cardápio → lista | Banco: cardápio próprio, começa na segunda, item vai para a lista com a seção | E2E com sessão real |
| F03 Feira → cardápio | Telas | Teste de regra da época por região |
| F04/F05 Lancheira e casa | Banco: 33 testes de casa (código, morador, lista da casa, "comprado por") | Concorrência entre dois moradores |
| F06 Água/hábitos → push → relatório | Banco: 17 (água nunca negativa, dias antigos travados, hábitos da lista) | Envio real do push |
| F07 Hábitos → desafios com amigos → pontos | Banco: 40 (liga, convites, resgate, saldo, idempotência semanal) | — |
| F08 Diário → adesão | Banco: só vinculado vê a adesão | — |
| F09 Plano → próxima refeição → lista | Telas | Teste de banco do atalho para a lista |
| F10 Sintomas → resumo | Banco: 7 (só o paciente anota; profissional vinculado lê, não apaga) | — |
| F11 Dados do mês → PDF | Telas | Conteúdo do PDF (unidade) |
| F12 Agenda → pagamento → teleconsulta | Banco: horários, desconto de membro, habilitação para teleconsulta; Unidade: regras do webhook | Stripe em modo de teste (sem ambiente nesta sessão) |
| F13 Consulta → avaliação → diretório | Banco: 13 (só quem teve consulta passada avalia; resposta; ocultar) | — |
| F14 Verificação → teleconsulta | Banco: não se auto-verifica; pedido de habilitação | Fluxo do admin com documentos |
| F15 Programa → acesso → estorno | Banco: módulos só para quem comprou, estorno tira o acesso; Unidade: estorno antes da confirmação | Stripe em modo de teste |
| F16 Membros → conteúdo e desconto | Banco: 30 (nível, conteúdo exclusivo, 20% de desconto, cancelando mantém até o fim); Unidade: confirmação reenviada não reativa | — |
| F17 Ação social → notificação | Banco: 12 (aviso com nome, ninguém cria aviso para outro) | Destino do clique (E2E) |
| F18 Denúncia → fila → decisão | Banco: 11 (oculta para os outros, autor não reverte, pontos descontados uma vez) | — |
| F19 Idioma → experiência toda | Unidade: títulos da aba e mensagens da moderação; Telas | Admin parcial (em andamento) |
| F20 Função desligada → menu/URL | Telas | Teste de navegação com função desligada |
| F21 Consentimento da Nina | Banco: 4 (sem permissão não usa; autoriza; revoga; estranho não vê); Unidade: chave por quem vê + paciente | — |
| F22 Receita/plano → loja parceira | Telas | Regras do parceiro |
| F23 Preferências de push | Banco: 3 (categoria desligada não vira push; app não chama o envio) | Assinatura expirada |
| F24 Exportação/exclusão | Banco: exportação inclui registros, jornada, casa, perguntas; exclusão recusada com assinatura paga e sem sobra de dados da pessoa | Storage e Stripe (função account-delete) em ambiente de teste |

Testes de navegador com sessão real (duas contas sintéticas, troca de conta, falha de rede)
precisam de um projeto Supabase de teste e de chaves do Stripe em modo de teste, que esta sessão
não tem.
