// Tipos do catálogo do site (lib/quality/catalog.ts): cada página, função e funcionalidade, com o
// que faz e como usar. Alimenta Admin → Documentação e Admin → Qualidade.

export type CatalogKind = "pagina" | "funcao" | "funcionalidade";

export type AreaId =
  | "entrada"
  | "social"
  | "dia"
  | "cozinha"
  | "trilha"
  | "cuidado"
  | "profissional"
  | "conta"
  | "admin"
  | "institucional"
  | "app";

export interface Area {
  id: AreaId;
  name: string;
  text: string;
}

/** Card interativo que a documentação pode abrir para testar a função (componentes de fun-cards). */
export type DemoId =
  | "HydrationCard"
  | "HabitCheckinCard"
  | "MoodCard"
  | "MindfulMealCard"
  | "WeeklyPledgeCard"
  | "QuizCard"
  | "IcebreakerCard"
  | "DailyTipCard"
  | "ShoppingListCard"
  | "RecipeRouletteCard"
  | "PlateBuilderCard"
  | "CookingTimerCard"
  | "UnitConverterCard"
  | "CommunityRouletteCard"
  | "ExploreTopicsCard"
  | "ProMatchCard";

export interface CatalogItem {
  /** Identificador estável (usado nas notas de results.ts e no nome do print). */
  id: string;
  kind: CatalogKind;
  area: AreaId;
  title: string;
  /** Endereço no site, quando é uma página (ou a página onde a função mora). */
  route?: string;
  /** Quem usa: "Todos", "Quem tem conta", "Pacientes", "Profissionais", "Administradores"… */
  audience: string;
  /** Para que serve, em uma ou duas frases. */
  summary: string;
  /** O que dá para fazer ali, item por item. */
  features: string[];
  /** Passo a passo do uso mais comum. */
  howTo: string[];
  /** Print em public/images/docs/<id>.jpg. */
  shot?: boolean;
  /** Card interativo para testar dentro da documentação. */
  demo?: DemoId;
}
