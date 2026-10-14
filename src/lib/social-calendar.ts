// Datas de saúde, nutrição e comportamento do calendário brasileiro que rendem conteúdo no estúdio
// de redes sociais (S1). Sem `day`, a campanha vale o mês inteiro.
export interface HealthDate {
  month: number; // 1–12
  day?: number;
  title: string;
  /** Gancho de conteúdo para a nutrição. */
  angle: string;
}

export const HEALTH_DATES: HealthDate[] = [
  {
    month: 1,
    title: "Janeiro Branco (saúde mental)",
    angle: "relação com a comida e bem-estar emocional",
  },
  { month: 1, day: 1, title: "Ano-novo", angle: "metas gentis e realistas, sem dietas da moda" },
  {
    month: 2,
    day: 4,
    title: "Dia Mundial do Câncer",
    angle: "alimentação protetora e comida de verdade",
  },
  { month: 2, title: "Carnaval", angle: "hidratação, lanches práticos e recuperação" },
  { month: 3, day: 4, title: "Dia Mundial da Obesidade", angle: "cuidado sem estigma e sem culpa" },
  {
    month: 3,
    day: 8,
    title: "Dia Internacional da Mulher",
    angle: "nutrição em cada fase da vida da mulher",
  },
  { month: 4, day: 7, title: "Dia Mundial da Saúde", angle: "hábitos simples que fazem diferença" },
  { month: 4, title: "Páscoa", angle: "chocolate com equilíbrio e sem terrorismo nutricional" },
  {
    month: 5,
    day: 31,
    title: "Dia Mundial sem Tabaco",
    angle: "alimentação de quem está parando de fumar",
  },
  { month: 5, title: "Dia das Mães (2º domingo)", angle: "receitas afetivas e cuidado em família" },
  {
    month: 6,
    day: 5,
    title: "Dia Mundial do Meio Ambiente",
    angle: "aproveitamento integral e menos desperdício",
  },
  {
    month: 6,
    title: "Festas juninas",
    angle: "comidas típicas da estação (milho, amendoim, pinhão)",
  },
  { month: 7, title: "Julho Amarelo (hepatites virais)", angle: "saúde do fígado e alimentação" },
  { month: 7, title: "Férias escolares", angle: "lanches e refeições com as crianças em casa" },
  {
    month: 8,
    title: "Agosto Dourado (aleitamento materno)",
    angle: "amamentação e alimentação da mãe",
  },
  {
    month: 8,
    day: 31,
    title: "Dia do Nutricionista",
    angle: "o que faz um(a) nutricionista e mitos da profissão",
  },
  { month: 8, title: "Dia dos Pais (2º domingo)", angle: "homens e cuidado com a saúde" },
  {
    month: 9,
    title: "Setembro Amarelo (prevenção do suicídio)",
    angle: "acolhimento e saúde mental",
  },
  { month: 9, day: 29, title: "Dia Mundial do Coração", angle: "comida que faz bem ao coração" },
  { month: 9, title: "Início da primavera", angle: "frutas e verduras da estação" },
  { month: 10, title: "Outubro Rosa", angle: "alimentação e prevenção do câncer de mama" },
  {
    month: 10,
    day: 12,
    title: "Dia das Crianças",
    angle: "alimentação infantil divertida e lancheira",
  },
  {
    month: 10,
    day: 16,
    title: "Dia Mundial da Alimentação",
    angle: "comida de verdade e o Guia Alimentar",
  },
  { month: 11, title: "Novembro Azul", angle: "saúde do homem e alimentação" },
  { month: 11, day: 14, title: "Dia Mundial do Diabetes", angle: "rótulos, carboidratos e mitos" },
  {
    month: 12,
    day: 1,
    title: "Dia Mundial de Luta contra a AIDS",
    angle: "alimentação e imunidade",
  },
  { month: 12, title: "Festas de fim de ano", angle: "ceia equilibrada, sobras e sem culpa" },
];

/** Datas do mês de `date` e do próximo (para planejar com antecedência). */
export function upcomingHealthDates(date = new Date()): HealthDate[] {
  const m = date.getMonth() + 1;
  const next = (m % 12) + 1;
  return HEALTH_DATES.filter(
    (d) => (d.month === m && (!d.day || d.day >= date.getDate())) || d.month === next,
  );
}
