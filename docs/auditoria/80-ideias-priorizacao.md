# As 80 ideias novas: priorização para discovery (NC-DISC-016)

As ideias do pacote são hipóteses, não funções a construir agora (o próprio pacote manda fechar P0/P1 antes). Esta lista só ordena **o que investigar primeiro**. Nada foi implementado.

**Como a nota foi feita** (heurística, reproduzível com o CSV do pacote): prioridade do pacote (P0 = 6, P1 = 4, P2 = 2) + facilidade (S = 3, M = 2, L = 1) + 0,5 por função existente que a ideia reaproveita (até 2) − 1 quando envolve saúde, crianças ou IA, porque exige revisão de profissional de saúde e jurídica antes. A nota não mede demanda: falta conversar com usuários reais.

## Para discovery primeiro (as 8 maiores notas)

Para cada uma, antes de construir: entrevistar 5 a 8 pessoas da persona, confirmar a dor, definir uma métrica de sucesso e um critério para desistir, e desenhar o MVP sobre as funções que já existem.

| # | Ideia | Persona | MVP proposto no pacote | Reaproveita | Revisão clínica? |
|---|---|---|---|---|---|
| I75 | Prevenção de segredos no CI e inventário de credenciais | Engenharia/admin | Scanner de working tree/histórico, allowlist de variáveis públicas e playbook de rotação. | GitHub, Supabase, Netlify, Stripe, IA, push. | não |
| I02 | Substituições por alergia com bloqueio conservador | Usuário, responsável, profissional | Taxonomia estruturada de alergia/intolerância/preferência; regras server-side e explicação de incerteza de rótulos. | Perfil, receitas, lancheira, lista e plano. | sim |
| I17 | Centro de consentimentos granular por finalidade | Usuário/profissional | Finalidade, destinatário, versão, data, revogação e conexão real com API/RLS. | Nina, acompanhamento, teleconsulta, analytics e perfil. | não |
| I33 | Conciliação de financeiro e repasses | Profissional/admin | Ledger imutável de eventos confirmados, export CSV e alarme de divergência. | Financeiro, Stripe, programas, membros e checkout. | não |
| I24 | Encaminhamento seguro para sintomas/alertas | Paciente/profissional | Orientações de escopo e encaminhamento aprovadas por profissional responsável; mensagens claras. | Diário de sintomas, Nina e acompanhamento. | sim |
| I77 | Catálogo de dados por finalidade e retenção | Admin/DPO/equipe | Registro de campo, sensibilidade, finalidade, retenção, acesso e fornecedor; atualizar em PR. | Banco, Storage, IA, Stripe, push e analytics. | não |
| I01 | Despensa com validade e alertas de desperdício | Usuário comum/família | Adicionar validade opcional, origem, estado consumido/descartado e alerta configurável; sugerir receita compatível. | Geladeira, receitas, cardápio, lista, push e Minha casa. | sim |
| I13 | Lista de compras offline com reconciliação | Usuário/família | Fila local limitada e versionada, status pendente e reconciliação idempotente ao reconectar. | Minha casa, lista, PWA/app. | não |

## Todas, em ordem

| Nota | # | Ideia | Área | Prioridade | Esforço | Revisão clínica? |
|---|---|---|---|---|---|---|
| 8.5 | I75 | Prevenção de segredos no CI e inventário de credenciais | Segurança | P0 | M | não |
| 8.0 | I02 | Substituições por alergia com bloqueio conservador | Cozinha/saúde | P0 | L | sim |
| 8.0 | I17 | Centro de consentimentos granular por finalidade | Privacidade | P0 | L | não |
| 8.0 | I33 | Conciliação de financeiro e repasses | Profissional/admin | P0 | L | não |
| 7.5 | I24 | Encaminhamento seguro para sintomas/alertas | Clínico/segurança | P0 | L | sim |
| 7.5 | I77 | Catálogo de dados por finalidade e retenção | Privacidade | P0 | L | não |
| 7.0 | I01 | Despensa com validade e alertas de desperdício | Cozinha | P1 | M | sim |
| 7.0 | I13 | Lista de compras offline com reconciliação | Cozinha/app | P1 | M | não |
| 7.0 | I16 | Taxonomia de preferências alimentares | Cozinha | P1 | M | sim |
| 7.0 | I21 | Check-in alimentar sem contagem de calorias | Bem-estar | P1 | M | não |
| 7.0 | I39 | Histórico e reversão de ações de admin | Admin/segurança | P0 | L | não |
| 7.0 | I42 | Workflow de revisão e expiração de conteúdo | Admin/educação | P1 | M | não |
| 7.0 | I57 | Catálogo de funções com maturidade e disponibilidade | Governança | P1 | S | não |
| 7.0 | I76 | Backup, RPO/RTO e restore testado | Operação | P0 | L | não |
| 6.5 | I08 | Calendário sazonal com fontes regionais | Cozinha/educação | P3 | S | não |
| 6.5 | I09 | Ficha de origem e licença de receitas/imagens | Conteúdo/admin | P1 | M | não |
| 6.5 | I12 | Modo baixo consumo de dados | Plataforma/app | P1 | M | não |
| 6.5 | I34 | Perfil profissional com credenciais verificáveis | Marketplace | P1 | M | não |
| 6.5 | I60 | Controle granular de exportação/compartilhamento | Privacidade | P1 | M | não |
| 6.5 | I64 | Auditoria de respostas da Nina | IA/segurança | P0 | L | sim |
| 6.5 | I73 | Selo de conteúdo revisado com validade | Governança clínica | P1 | M | sim |
| 6.5 | I78 | Notificações discretas para saúde | Privacidade/app | P1 | S | sim |
| 6.0 | I06 | Planejamento de reaproveitamento de sobras | Cozinha | P2 | M | não |
| 6.0 | I11 | Planejamento por tempo, habilidade e equipamentos | Cozinha | P2 | M | não |
| 6.0 | I18 | Presets de acessibilidade | Acessibilidade | P1 | M | não |
| 6.0 | I23 | Biblioteca editorial com fonte, revisor e validade | Educação | P1 | M | sim |
| 6.0 | I25 | Check-up técnico antes da teleconsulta | Clínico | P1 | M | sim |
| 6.0 | I28 | Documentos clínicos com expiração e acesso auditado | Clínico/privacidade | P0 | L | sim |
| 6.0 | I41 | Fila de solicitações LGPD com SLA | Admin/privacidade | P0 | L | sim |
| 6.0 | I45 | Mapa de dependências de feature flags | Admin | P1 | M | não |
| 6.0 | I55 | Painel de regressão visual e acessibilidade em CI | Qualidade | P1 | M | não |
| 6.0 | I56 | Ciclo de qualidade com owner e evidência | Governança | P1 | S | sim |
| 6.0 | I65 | Modo demonstração segregado para vendas/formação | B2B/admin | P1 | M | não |
| 6.0 | I74 | Revisão periódica de permissões administrativas | Segurança | P0 | L | sim |
| 5.5 | I05 | Receitas escaláveis por porções e unidade | Cozinha | P2 | M | não |
| 5.5 | I14 | Widget Android de água/lista | App/retention | P3 | M | não |
| 5.5 | I15 | Lembretes configuráveis de rotina alimentar | Bem-estar | P2 | S | não |
| 5.5 | I38 | Agenda com buffers e regras de modalidade | Clínico | P1 | M | sim |
| 5.5 | I40 | Painel de saúde das integrações | Admin/Ops | P1 | M | sim |
| 5.5 | I63 | Conteúdo editorial em leitura fácil e áudio | Acessibilidade/educação | P2 | M | não |
| 5.5 | I67 | Importar receita de documento privado | Cozinha | P3 | M | não |
| 5.5 | I70 | Campanhas locais de alimentação e feira | Comunidade | P3 | M | não |
| 5.0 | I04 | Modo de cozinhar passo a passo com voz | Cozinha/acessibilidade | P2 | M | não |
| 5.0 | I10 | Importar/exportar lista e cardápio | Cozinha/dados | P3 | M | não |
| 5.0 | I30 | Plano alimentar versionado com diffs | Clínico | P1 | M | sim |
| 5.0 | I51 | Suporte acessível para idosos e cuidadores | Novos públicos | P2 | M | não |
| 5.0 | I59 | Ajuda contextual buscável | Suporte | P2 | S | não |
| 4.5 | I03 | Orçamento por preços de varejistas com fonte e data | Cozinha/mercado | P2 | L | não |
| 4.5 | I07 | Busca semântica de receitas por problema cotidiano | Descoberta/cozinha | P2 | M | sim |
| 4.5 | I37 | Métricas agregadas para criadores de conteúdo | Profissional/negócio | P3 | M | não |
| 4.5 | I47 | Modo universitário com casos simulados | Educação/formação | P3 | M | não |
| 4.5 | I53 | Integração opcional com calendário | Produtividade | P2 | M | não |
| 4.5 | I68 | Biblioteca de substituições revisadas | Cozinha/educação | P2 | M | sim |
| 4.0 | I19 | Pesquisa pós-tarefa de baixa fricção | Produto | P2 | M | não |
| 4.0 | I20 | Recomendações explicáveis e desligáveis | Descoberta | P2 | M | sim |
| 4.0 | I22 | Resumo de barreiras práticas para o acompanhamento | Clínico/bem-estar | P2 | M | sim |
| 4.0 | I26 | Lista de espera para horários cancelados | Clínico | P2 | M | sim |
| 4.0 | I29 | Assistente de adesão com sugestões revisáveis | Clínico | P2 | M | sim |
| 4.0 | I43 | Estúdio social com revisão antes de publicar | Marketing | P2 | M | não |
| 4.0 | I44 | Métricas de sucesso de tarefa com privacidade | Produto/admin | P2 | M | não |
| 4.0 | I48 | Kit de educação alimentar para organizações comunitárias | Impacto social | P3 | L | não |
| 3.5 | I27 | Formulários pré-consulta reutilizáveis | Clínico | P2 | M | sim |
| 3.5 | I31 | Ciclo de acompanhamento com revisão de metas | Clínico | P2 | M | sim |
| 3.5 | I36 | Programas com progresso e conteúdo acessível | Marketplace/educação | P2 | M | sim |
| 3.5 | I49 | Pesquisa consentida com dados agregados | Pesquisa | P3 | L | não |
| 3.5 | I58 | Centro unificado de notificações e relevância | Comunicação | P2 | M | sim |
| 3.5 | I61 | Mentoria entre profissionais com regras de sigilo | Novos públicos | P3 | M | sim |
| 3.5 | I62 | Marketplace de oficinas e grupos educativos | Monetização | P3 | L | não |
| 3.5 | I69 | Diretório de cozinhas solidárias e bancos de alimentos | Impacto social | P3 | L | não |
| 3.5 | I72 | Painel educativo agregado para educadores | Educação | P3 | L | não |
| 3.5 | I79 | Controles de feed por tema, ocultar e silenciar | Social | P2 | M | sim |
| 3.5 | I80 | Expansão internacional com regras locais completas | Expansão | P3 | L | não |
| 3.0 | I32 | Painel de cancelamentos/no-show por período | Clínico/negócio | P2 | M | sim |
| 3.0 | I35 | Mensagens clínicas com anexos seguros | Clínico | P2 | L | sim |
| 3.0 | I46 | Modo escola para educação alimentar não clínica | Novos públicos | P3 | L | sim |
| 3.0 | I50 | Benefício corporativo sem vigilância individual | B2B | P3 | L | sim |
| 3.0 | I66 | Onboarding personalizável que pode ser pulado | Onboarding | P2 | M | sim |
| 3.0 | I71 | Delegação limitada para cuidador | Família/cuidado | P2 | L | sim |
| 2.5 | I52 | Checklist de transição/encerramento de acompanhamento | Clínico | P3 | L | sim |
| 2.5 | I54 | Canal de WhatsApp opt-in | Mensageria | P3 | L | sim |

## Adiadas de propósito

Ideias com nota até 3 ficam fora do próximo ciclo: sem dor comprovada ou com custo alto para o benefício que se espera agora. Voltam a ser avaliadas quando houver dados de uso.
