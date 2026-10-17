// Critérios de qualidade do NutriConnect: cada página, função e funcionalidade do site recebe uma
// nota de 0 a 10 em cada critério (10 = 100%, nada a melhorar). As rodadas de teste e o processo
// estão em docs/QUALIDADE.md; as notas ficam em lib/quality/results.ts e aparecem em Admin →
// Qualidade. Mudar um critério aqui muda o painel e o roteiro de todas as próximas rodadas.

export type CriterionId =
  | "estetica"
  | "layout"
  | "responsividade"
  | "rolagem"
  | "experiencia"
  | "acesso"
  | "acessibilidade"
  | "funcionamento"
  | "utilidade"
  | "desempenho"
  | "textos"
  | "evolucao";

export interface Criterion {
  id: CriterionId;
  /** Nome curto (coluna do painel). */
  name: string;
  /** O que o critério mede. */
  question: string;
  /** O que conferir, item por item, em cada página ou função. */
  checks: string[];
  /** Como chegar à nota: o que vale 10, 7, 4 e 0. */
  scale: { 10: string; 7: string; 4: string; 0: string };
}

export const CRITERIA: Criterion[] = [
  {
    id: "estetica",
    name: "Estética",
    question:
      "É bonito, coerente com a identidade do NutriConnect e sem cara de site feito por IA?",
    checks: [
      "Cores, fontes, cantos e sombras seguem o design escolhido (Natural, Vibrante, Editorial, Aurora)",
      "Funciona no modo claro e no escuro, sem texto apagado ou caixa branca no escuro",
      "Imagens inteiras, nítidas e com sentido (sem recorte em fundo branco), respeitando a chave de fotos do admin",
      "Nada de degradê em texto, brilho exagerado, emoji solto ou ícone genérico demais",
      "Animações suaves, no estilo da página Funções, e que respeitam 'reduzir movimento'",
    ],
    scale: {
      10: "Bonito e coerente em todos os designs e nos dois modos",
      7: "Bonito, com um ou dois detalhes destoando (uma cor, um ícone, uma sombra)",
      4: "Parece de outro site ou tem partes visivelmente quebradas em algum design/modo",
      0: "Feio, sem estilo ou ilegível",
    },
  },
  {
    id: "layout",
    name: "Layout e simetria",
    question: "Os elementos estão alinhados, simétricos e bem distribuídos?",
    checks: [
      "Linhas de botões e filtros fecham simétricas (sem botão sozinho numa linha, sem sobra torta)",
      "Grades sem card órfão nem buraco no fim",
      "Espaçamentos iguais entre blocos parecidos; títulos alinhados com o conteúdo",
      "Hierarquia clara: o mais importante aparece primeiro e maior",
      "Nada encavalado, cortado ou sobreposto",
    ],
    scale: {
      10: "Tudo alinhado e simétrico em todas as larguras",
      7: "Uma ou duas assimetrias pequenas",
      4: "Vários desalinhamentos ou blocos mal distribuídos",
      0: "Desorganizado, elementos sobrepostos",
    },
  },
  {
    id: "responsividade",
    name: "Responsividade",
    question:
      "Funciona bem no celular (360–430 px), no tablet (768 px) e no computador (1280+ px)?",
    checks: [
      "Sem rolagem horizontal em nenhuma largura",
      "Textos sem quebrar no meio da palavra e sem cortar",
      "Botões com área de toque de pelo menos 40 px no celular",
      "Colunas se reorganizam (nada espremido no celular, nada esticado demais no computador)",
      "Funciona no app Android (barra de status, voltar, teclado sobre o campo)",
    ],
    scale: {
      10: "Perfeito nas três larguras e no app",
      7: "Um detalhe em uma largura",
      4: "Problema sério em uma largura (rolagem lateral, corte)",
      0: "Inutilizável no celular",
    },
  },
  {
    id: "rolagem",
    name: "Rolagem e navegação",
    question: "A navegação é fluida, sem rolagens desnecessárias e sem a pessoa se perder?",
    checks: [
      "Sem rolagem dentro de rolagem (caixa com barra própria dentro da página) sem necessidade",
      "O que importa aparece sem rolar muito; listas longas têm busca, filtro ou 'ver mais'",
      "Voltar (botão do navegador/app) leva para onde se espera",
      "Modais e gavetas fecham com Esc, clique fora e botão visível",
      "Ao abrir uma página, ela começa no topo; ao voltar, a posição é mantida",
    ],
    scale: {
      10: "Navegação natural, nenhuma rolagem sobrando",
      7: "Uma rolagem a mais ou um voltar estranho",
      4: "Rolagens aninhadas ou páginas muito longas sem atalho",
      0: "A pessoa se perde ou fica presa",
    },
  },
  {
    id: "experiencia",
    name: "Experiência de uso",
    question: "É fácil e agradável de usar, com poucos passos e retorno claro do que aconteceu?",
    checks: [
      "A pessoa entende o que fazer em poucos segundos, sem ler manual",
      "Ações principais em até 2 toques; nada de formulário maior que o necessário",
      "Retorno a cada ação (mensagem, animação, contador) e confirmação antes de apagar",
      "Estados vazio, carregando e erro explicam o que fazer em seguida",
      "Divertido e acolhedor, sem culpa nem pressão (sem calorias, sem comparação)",
    ],
    scale: {
      10: "Intuitivo e gostoso de usar",
      7: "Um passo confuso ou um retorno faltando",
      4: "Precisa de tentativa e erro para usar",
      0: "Frustrante ou confuso",
    },
  },
  {
    id: "acesso",
    name: "Facilidade de acesso",
    question:
      "A pessoa encontra esta página/função facilmente a partir dos menus e de outras páginas?",
    checks: [
      "Aparece no menu, em Funções ou na busca, com nome que a pessoa reconhece",
      "Há atalhos a partir das páginas relacionadas (ex.: Cardápio ↔ Geladeira ↔ Lista)",
      "O endereço (URL) é claro e um link compartilhado abre direto nela (também no app)",
      "Se depende de login, plano ou perfil, explica por quê e como liberar",
    ],
    scale: {
      10: "Chega-se em 1–2 toques de qualquer lugar lógico",
      7: "Acessível, mas falta um atalho óbvio",
      4: "Escondida; só quem sabe o endereço encontra",
      0: "Não há caminho até ela",
    },
  },
  {
    id: "acessibilidade",
    name: "Acessibilidade",
    question: "Pessoas com deficiência visual, motora ou cognitiva conseguem usar?",
    checks: [
      "Contraste de texto de pelo menos 4,5:1 (3:1 em textos grandes), nos dois modos",
      "Tudo funciona pelo teclado (Tab, Enter, Esc) com foco visível",
      "Botões só com ícone têm nome para leitor de tela (aria-label); imagens têm alt ou são decorativas",
      "Respeita tamanho de fonte maior, 'reduzir movimento' e alto contraste das Configurações",
      "Nada depende só de cor para ser entendido",
    ],
    scale: {
      10: "Usável por teclado e leitor de tela, contraste ok",
      7: "Um ou dois rótulos ou contrastes faltando",
      4: "Partes importantes inacessíveis por teclado ou leitor",
      0: "Inacessível",
    },
  },
  {
    id: "funcionamento",
    name: "Funcionamento",
    question:
      "Tudo funciona de verdade, sem erros, e os dados são salvos e carregados corretamente?",
    checks: [
      "Nenhum erro no console nem tela 'Something went wrong'",
      "Cada botão faz o que diz; salvar persiste ao recarregar e em outro aparelho",
      "Funciona sem login quando deveria, e pede login quando precisa",
      "Lida com internet lenta/sem internet sem perder o que a pessoa digitou",
      "Limites, permissões e regras (alergias, plano, nível) são respeitados",
    ],
    scale: {
      10: "Tudo funciona, inclusive casos de erro",
      7: "Funciona, com um caso de borda falhando",
      4: "Uma ação principal falha às vezes",
      0: "Quebrado",
    },
  },
  {
    id: "utilidade",
    name: "Utilidade e proposta",
    question: "Cumpre o que promete e é útil de verdade para a alimentação e o cuidado da pessoa?",
    checks: [
      "Resolve um problema real do público (paciente, família, profissional)",
      "Entrega tudo o que o nome e a descrição prometem",
      "Funciona sem IA quando possível (a IA é ajuda, não dependência)",
      "Conversa com o resto da plataforma (lista de compras, acompanhamento, trilha)",
      "Conteúdo de saúde correto e baseado em fontes (Guia Alimentar, OMS, Anvisa)",
    ],
    scale: {
      10: "Indispensável e completo no que propõe",
      7: "Útil, mas falta uma parte da proposta",
      4: "Útil só em parte ou pouco usado",
      0: "Não serve para nada ou contradiz a proposta",
    },
  },
  {
    id: "desempenho",
    name: "Desempenho",
    question: "Abre e responde rápido, inclusive no celular e com internet fraca?",
    checks: [
      "A página aparece em até 2 s no 4G; ações respondem na hora (otimista) ou mostram progresso",
      "Imagens leves (JPG/WebP comprimidos, carregamento preguiçoso)",
      "Sem travadas ao rolar ou animar; nada baixado sem necessidade",
      "Listas grandes carregam aos poucos",
    ],
    scale: {
      10: "Instantâneo",
      7: "Rápido, com um ponto lento",
      4: "Lento de forma perceptível",
      0: "Trava ou demora demais",
    },
  },
  {
    id: "textos",
    name: "Textos e idiomas",
    question: "Os textos são claros, corretos, sem tiques de IA e completos nos 4 idiomas?",
    checks: [
      "Português correto, frases curtas, tom acolhedor e direto",
      "Inglês, espanhol e francês completos (nada em português ao trocar o idioma)",
      "Sem tiques de IA (travessões em excesso, 'mergulhe', 'jornada incrível', listas de três adjetivos)",
      "Termos de saúde corretos e sem promessas (sem calorias, sem dieta milagrosa)",
    ],
    scale: {
      10: "Textos impecáveis nos 4 idiomas",
      7: "Um trecho sem tradução ou um texto confuso",
      4: "Vários textos faltando tradução ou com erros",
      0: "Textos quebrados ou incompreensíveis",
    },
  },
  {
    id: "evolucao",
    name: "Completude",
    question: "Já tem tudo o que deveria ou ainda faltam recursos importantes?",
    checks: [
      "Comparar com o que apps de referência oferecem na mesma função",
      "Listar o que daria para adicionar (sem IA de preferência) e o quanto faria falta",
      "Dados da pessoa aproveitados (histórico, preferências, geladeira, plano)",
      "Pode ser personalizado ou ajustado pela pessoa quando faz sentido",
    ],
    scale: {
      10: "Completo; o que falta é detalhe",
      7: "Falta um recurso que faria diferença",
      4: "Faltam vários recursos esperados",
      0: "Só o esqueleto da função",
    },
  },
];

export const CRITERION_BY_ID = Object.fromEntries(CRITERIA.map((c) => [c.id, c])) as Record<
  CriterionId,
  Criterion
>;
