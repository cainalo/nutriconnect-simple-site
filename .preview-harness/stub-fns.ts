export const rewriteSocialText = async () => ({ text: "" });
const idea = (i: number) => ({ format: ["post", "carrossel", "reels", "story"][i % 4], title: ["5 trocas simples no mercado", "Mito ou verdade: glúten engorda?", "Lancheira em 3 minutos", "Água: quanto beber de verdade"][i % 4], hook: ["Você não precisa cortar o pão.", "Spoiler: não é bem assim.", "Sem receita complicada.", "Não existe número mágico."][i % 4], caption: "Uma legenda de exemplo com duas ou três frases para ver como o card se comporta com texto real.\n\nSalve para lembrar na próxima ida ao mercado.", slides: i % 4 === 1 ? [{ title: "O mito", text: "" }, { title: "O que a ciência diz", text: "" }, { title: "Na prática", text: "" }] : [], script: "", hashtags: ["nutricao", "comidadeverdade", "saude"], cta: "Salve", visual_idea: "", pillar: ["Mercado", "Mitos", "Rotina", "Hidratação"][i % 4], best_time: "Qua às 19h" });
export const suggestSocialPosts = async () => { await new Promise((r) => setTimeout(r, 600)); return { ideas: [0, 1, 2, 3].map(idea) }; };
export const NETWORKS = [
  "instagram",
  "tiktok",
  "facebook",
  "linkedin",
  "youtube",
  "x",
  "outro",
] as const;
export type Network = (typeof NETWORKS)[number];
export const FORMATS = ["post", "carrossel", "reels", "story", "video", "texto"] as const;
export type PostFormat = (typeof FORMATS)[number];
export const GOALS = ["engajamento", "alcance", "autoridade", "conversao", "comunidade"] as const;
export type Goal = (typeof GOALS)[number];
export const socialTrendsBrief = async () => ({ opportunities: [{ titulo: "Dia Mundial da Alimentação", por_que: "Data de 16/10 com muita busca e o tema da semana combina.", ideia: "Carrossel com 5 trocas de ultraprocessados por comida de verdade.", formato: "Carrossel", quando: "16/10 às 12h" }, { titulo: "Volta da lancheira", por_que: "#lancheira subiu 40% no app.", ideia: "Reels mostrando uma lancheira em 3 minutos.", formato: "Reels", quando: "Domingo à noite" }, { titulo: "Feira de outubro", por_que: "Estação de manga e abacaxi.", ideia: "Post com o que comprar na feira este mês.", formato: "Post", quando: "Sábado de manhã" }] }); export const analyzeSocialProfile = async () => ({});
