// Funções: todas as ferramentas do NutriConnect num só lugar, em cards de dois em dois no celular.
// Cada card leva a uma página (Geladeira, Desafios, Tema da semana...) ou abre a ferramenta numa
// gaveta (água, hábitos, lista de compras, quiz...). No celular a página fica na barra inferior; no
// computador, no ícone ao lado da busca. O que a pessoa registra fica na conta (lib/checkins).
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Apple,
  ArrowRight,
  Award,
  Backpack,
  Brain,
  CalendarDays,
  CalendarRange,
  Carrot,
  CheckCheck,
  ChefHat,
  CookingPot,
  Dices,
  Droplets,
  FileText,
  Flame,
  HandHeart,
  HeartHandshake,
  HeartPulse,
  House,
  Leaf,
  Lightbulb,
  ListChecks,
  MessageCircle,
  NotebookPen,
  Refrigerator,
  Salad,
  Scale,
  ScanBarcode,
  Search,
  ShoppingBag,
  ShoppingBasket,
  Smile,
  Sparkles,
  Stethoscope,
  Sun,
  Target,
  Timer,
  Trophy,
  Users,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { AppScreen } from "@/components/app-screen";
import { AuthGateLoading } from "@/components/site-chrome";
import { TileArt, type ArtData, type ArtId } from "@/components/funcoes-art";
import { NinaLive } from "@/components/nina-live";
import { useAdultTrailProgress } from "@/components/rail-cards";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  CommunityRouletteCard,
  CookingTimerCard,
  DailyTipCard,
  ExploreTopicsCard,
  HabitCheckinCard,
  HydrationCard,
  IcebreakerCard,
  MindfulMealCard,
  MoodCard,
  PlateBuilderCard,
  QuizCard,
  RecipeRouletteCard,
  ShoppingListCard,
  UnitConverterCard,
  WeeklyPledgeCard,
} from "@/components/fun-cards";
import { MonthlyReportCard } from "@/components/monthly-report-card";
import { ProMatchQuiz } from "@/components/pro-match-quiz";
import { useTr } from "@/components/settings-ui";
import { useRequireAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import type { Names } from "@/lib/appearance-data";
import { checkinDay, checkinsByDay, useCheckins, weekStartDay } from "@/lib/checkins";
import { fillSpans, useGridColumns } from "@/lib/fill-grid";
import { useHabitChoice } from "@/lib/habits";
import { useFeatures, type FeatureKey } from "@/lib/features";
import { getActiveStreak } from "@/lib/learning-trail";
import { cn } from "@/lib/utils";
import { useShoppingItems } from "@/lib/fridge";
import { themeText } from "@/lib/social/feed";
import { useActiveTheme } from "@/lib/social/feed-queries";
import { useWaterDays, useWaterSettings, waterDay, DEFAULT_GOAL } from "@/lib/water";

export const Route = createFileRoute("/funcoes")({
  head: () => ({
    meta: [
      { title: "Funções — NutriConnect" },
      {
        name: "description",
        content:
          "Água do dia, hábitos, lista de compras, desafios, tema da semana, geladeira, cardápio e outras ferramentas do NutriConnect.",
      },
    ],
  }),
  component: FuncoesPage,
});

type ToolId =
  | "agua"
  | "habitos"
  | "humor"
  | "compromisso"
  | "calma"
  | "compras"
  | "roleta"
  | "prato"
  | "timer"
  | "medidas"
  | "quiz"
  | "dica"
  | "assunto"
  | "comunidade"
  | "temas"
  | "combina"
  | "relatorio";

const TOOLS: Record<ToolId, () => ReactNode> = {
  agua: () => <HydrationCard />,
  habitos: () => <HabitCheckinCard />,
  humor: () => <MoodCard />,
  compromisso: () => <WeeklyPledgeCard />,
  calma: () => <MindfulMealCard />,
  compras: () => <ShoppingListCard />,
  roleta: () => <RecipeRouletteCard />,
  prato: () => <PlateBuilderCard />,
  timer: () => <CookingTimerCard />,
  medidas: () => <UnitConverterCard />,
  quiz: () => <QuizCard />,
  dica: () => <DailyTipCard />,
  assunto: () => <IcebreakerCard />,
  comunidade: () => <CommunityRouletteCard />,
  temas: () => <ExploreTopicsCard />,
  combina: () => <ProMatchQuiz />,
  relatorio: () => <MonthlyReportCard />,
};

/** Um card da grade: abre uma ferramenta (`tool`) ou leva a uma página (`to`). */
interface Tile {
  id: string;
  icon: LucideIcon;
  /** Cor forte (ícone e desenho) e a segunda cor do degradê do card. */
  color: string;
  color2: string;
  /** Desenho animado do card. */
  art: ArtId;
  /** No mosaico: ocupa duas colunas ou duas linhas. */
  span?: "wide" | "tall";
  title: Names;
  text: Names;
  tool?: ToolId;
  to?: string;
  /** Some quando a administração desliga a funcionalidade. */
  feature?: FeatureKey;
}

interface Section {
  id: string;
  icon: LucideIcon;
  color: string;
  title: Names;
  tiles: Tile[];
}

const SECTIONS: Section[] = [
  {
    id: "dia",
    icon: Sun,
    color: "#e0902e",
    title: ["Seu dia", "Your day", "Tu día", "Votre journée"],
    tiles: [
      {
        id: "agua",
        art: "water",
        color2: "#67c3f3",
        span: "wide",
        icon: Droplets,
        color: "#3b7bbf",
        tool: "agua",
        title: ["Água de hoje", "Today's water", "Agua de hoy", "L'eau du jour"],
        text: [
          "Copos do dia e lembretes",
          "Glasses and reminders",
          "Vasos y recordatorios",
          "Verres et rappels",
        ],
      },
      {
        id: "habitos",
        art: "habits",
        color2: "#a3d977",
        icon: ListChecks,
        color: "#4f8a4b",
        tool: "habitos",
        title: ["Hábitos de hoje", "Today's habits", "Hábitos de hoy", "Habitudes du jour"],
        text: [
          "Água, verduras, movimento e sono",
          "Water, veggies, moving, sleep",
          "Agua, verduras, movimiento, sueño",
          "Eau, légumes, bouger, sommeil",
        ],
      },
      {
        id: "humor",
        art: "mood",
        color2: "#f59ab5",
        icon: Smile,
        color: "#d6456b",
        tool: "humor",
        title: ["Como me sinto", "How I feel", "Cómo me siento", "Mon ressenti"],
        text: [
          "Sua relação com a comida hoje",
          "Your relationship with food today",
          "Tu relación con la comida hoy",
          "Votre rapport à la nourriture",
        ],
      },
      {
        id: "calma",
        art: "breath",
        color2: "#c4a5e8",
        span: "wide",
        icon: Wind,
        color: "#8a5fb0",
        tool: "calma",
        title: ["Refeição com calma", "Mindful meal", "Comida con calma", "Repas en conscience"],
        text: [
          "20 minutos guiados à mesa",
          "20 guided minutes",
          "20 minutos guiados",
          "20 minutes guidées",
        ],
      },
    ],
  },
  {
    id: "participar",
    icon: Trophy,
    color: "#c58a12",
    title: ["Participar", "Take part", "Participar", "Participer"],
    tiles: [
      {
        id: "desafios",
        art: "trophy",
        color2: "#f4c84a",
        span: "tall",
        icon: Award,
        color: "#c58a12",
        to: "/desafios",
        feature: "desafios",
        title: ["Desafios", "Challenges", "Desafíos", "Défis"],
        text: [
          "Em grupo, com check-in diário",
          "Group challenges, daily check-in",
          "En grupo, con check-in diario",
          "En groupe, check-in quotidien",
        ],
      },
      {
        id: "tema",
        art: "theme",
        color2: "#a9d18e",
        span: "wide",
        icon: CalendarDays,
        color: "#4f8a4b",
        to: "/tema-da-semana",
        feature: "tema",
        title: ["Tema da semana", "Weekly theme", "Tema de la semana", "Thème de la semaine"],
        text: [
          "O assunto da comunidade",
          "The community topic",
          "El tema de la comunidad",
          "Le sujet de la communauté",
        ],
      },
      {
        id: "compromisso",
        art: "target",
        color2: "#f6a76b",
        icon: Target,
        color: "#d9692a",
        tool: "compromisso",
        feature: "tema",
        title: [
          "Compromisso da semana",
          "Weekly pledge",
          "Compromiso semanal",
          "Engagement de la semaine",
        ],
        text: [
          "Pratique o tema todo dia",
          "Practice the theme daily",
          "Practica el tema cada día",
          "Pratiquez le thème",
        ],
      },
      {
        id: "quiz",
        art: "quiz",
        color2: "#9aa8f0",
        icon: Brain,
        color: "#5b6fd6",
        tool: "quiz",
        title: ["Quiz relâmpago", "Quick quiz", "Quiz relámpago", "Quiz éclair"],
        text: [
          "5 perguntas sobre alimentação",
          "5 food questions",
          "5 preguntas de alimentación",
          "5 questions sur l'alimentation",
        ],
      },
      {
        id: "assunto",
        art: "chat",
        color2: "#6fd3dc",
        icon: MessageCircle,
        color: "#0f9aa8",
        tool: "assunto",
        title: ["Puxe assunto", "Start a chat", "Inicia una charla", "Lancez la conversation"],
        text: [
          "Uma pergunta para a rede",
          "A question for the network",
          "Una pregunta para la red",
          "Une question pour le réseau",
        ],
      },
      {
        id: "comunidade",
        art: "people",
        color2: "#8fbbe8",
        icon: Users,
        color: "#3b7bbf",
        tool: "comunidade",
        feature: "comunidades",
        title: [
          "Sorteie uma comunidade",
          "Pick a community",
          "Sortea una comunidad",
          "Tirez une communauté",
        ],
        text: [
          "Conheça gente nova",
          "Meet new people",
          "Conoce gente nueva",
          "Rencontrez du monde",
        ],
      },
      {
        id: "parceiro",
        art: "pair",
        color2: "#f3a0b5",
        icon: HandHeart,
        color: "#c2416a",
        to: "/parceiro",
        title: [
          "Parceiro de jornada",
          "Journey buddy",
          "Compañero de camino",
          "Binôme de parcours",
        ],
        text: [
          "Uma dupla com check-in diário",
          "A pair with a daily check-in",
          "Una pareja con registro diario",
          "Un binôme avec un point par jour",
        ],
      },
      {
        id: "temas",
        art: "search",
        color2: "#74d0d9",
        icon: Search,
        color: "#0f9aa8",
        tool: "temas",
        feature: "explorar",
        title: [
          "Temas para explorar",
          "Topics to explore",
          "Temas para explorar",
          "Thèmes à explorer",
        ],
        text: [
          "Atalhos de busca",
          "Search shortcuts",
          "Atajos de búsqueda",
          "Raccourcis de recherche",
        ],
      },
      {
        id: "dica",
        art: "bulb",
        color2: "#f7d66b",
        icon: Lightbulb,
        color: "#c58a12",
        tool: "dica",
        title: ["Dica do dia", "Tip of the day", "Consejo del día", "Astuce du jour"],
        text: [
          "Uma ideia simples por dia",
          "One simple idea a day",
          "Una idea simple al día",
          "Une idée simple par jour",
        ],
      },
    ],
  },
  {
    id: "cozinha",
    icon: CookingPot,
    color: "#d9692a",
    title: ["Cozinha e compras", "Kitchen and shopping", "Cocina y compras", "Cuisine et courses"],
    tiles: [
      {
        id: "compras",
        art: "basket",
        color2: "#f6b07a",
        span: "tall",
        icon: ShoppingBasket,
        color: "#d9692a",
        tool: "compras",
        title: ["Lista de compras", "Shopping list", "Lista de compras", "Liste de courses"],
        text: [
          "Na conta, em todos os aparelhos",
          "Saved to your account",
          "En tu cuenta",
          "Dans votre compte",
        ],
      },
      {
        id: "casa",
        art: "house",
        color2: "#9fd3b0",
        icon: House,
        color: "#2f8a5b",
        to: "/casa",
        title: ["Minha casa", "My home", "Mi casa", "Ma maison"],
        text: [
          "Lista de compras com quem mora junto",
          "Shared list with your household",
          "Lista compartida con tu familia",
          "Liste partagée avec votre foyer",
        ],
      },
      {
        id: "geladeira",
        art: "fridge",
        color2: "#9fd0f0",
        span: "wide",
        icon: Refrigerator,
        color: "#3b7bbf",
        to: "/geladeira",
        feature: "receitas",
        title: [
          "O que tem na geladeira?",
          "What's in the fridge?",
          "¿Qué hay en la nevera?",
          "Qu'y a-t-il au frigo ?",
        ],
        text: [
          "Receitas com o que você tem",
          "Recipes with what you have",
          "Recetas con lo que tienes",
          "Recettes avec ce que vous avez",
        ],
      },
      {
        id: "cardapio",
        art: "calendar",
        color2: "#9fd18c",
        icon: CalendarRange,
        color: "#4f8a4b",
        to: "/cardapio",
        feature: "receitas",
        title: ["Cardápio da semana", "Weekly menu", "Menú semanal", "Menu de la semaine"],
        text: [
          "Com orçamento e lista única",
          "With budget and one list",
          "Con presupuesto y lista",
          "Avec budget et liste",
        ],
      },
      {
        id: "feira",
        art: "carrot",
        color2: "#f7a26a",
        icon: Carrot,
        color: "#d9692a",
        to: "/feira",
        feature: "receitas",
        title: [
          "Calendário da feira",
          "Market calendar",
          "Calendario de feria",
          "Calendrier du marché",
        ],
        text: [
          "O que está na estação",
          "What's in season",
          "Lo que está de temporada",
          "Ce qui est de saison",
        ],
      },
      {
        id: "lancheira",
        art: "backpack",
        color2: "#f2cf6b",
        icon: Backpack,
        color: "#c58a12",
        to: "/lancheira",
        feature: "receitas",
        title: [
          "Lancheira da semana",
          "Weekly lunchbox",
          "Lonchera semanal",
          "Goûter de la semaine",
        ],
        text: [
          "Lanches para a escola",
          "School snacks",
          "Meriendas escolares",
          "Goûters pour l'école",
        ],
      },
      {
        id: "receitas",
        art: "chef",
        color2: "#f39bb0",
        icon: ChefHat,
        color: "#d6456b",
        to: "/receitas",
        feature: "receitas",
        title: ["Receitas", "Recipes", "Recetas", "Recettes"],
        text: [
          "As receitas da comunidade",
          "Community recipes",
          "Recetas de la comunidad",
          "Recettes de la communauté",
        ],
      },
      {
        id: "roleta",
        art: "dice",
        color2: "#c9a6ea",
        icon: Dices,
        color: "#8a5fb0",
        tool: "roleta",
        feature: "receitas",
        title: [
          "Roleta de receitas",
          "Recipe roulette",
          "Ruleta de recetas",
          "Roulette de recettes",
        ],
        text: [
          "Sem ideia do que cozinhar?",
          "No idea what to cook?",
          "¿Sin idea de qué cocinar?",
          "Pas d'idée ?",
        ],
      },
      {
        id: "prato",
        art: "plate",
        color2: "#a7d58f",
        icon: Salad,
        color: "#4f8a4b",
        tool: "prato",
        title: ["Monte seu prato", "Build your plate", "Arma tu plato", "Composez votre assiette"],
        text: [
          "Veja se o prato está equilibrado",
          "Check your plate's balance",
          "Mira si está equilibrado",
          "Vérifiez l'équilibre",
        ],
      },
      {
        id: "timer",
        art: "timer",
        color2: "#f6a76b",
        icon: Timer,
        color: "#d9692a",
        tool: "timer",
        title: ["Timer de cozinha", "Kitchen timer", "Temporizador", "Minuteur"],
        text: ["Com alarme no fim", "With an alarm", "Con alarma", "Avec alarme"],
      },
      {
        id: "medidas",
        art: "scale",
        color2: "#a7b3f2",
        icon: Scale,
        color: "#5b6fd6",
        tool: "medidas",
        title: ["Conversor de medidas", "Unit converter", "Conversor de medidas", "Convertisseur"],
        text: [
          "Xícaras, colheres e gramas",
          "Cups, spoons and grams",
          "Tazas, cucharas y gramos",
          "Tasses, cuillères, grammes",
        ],
      },
    ],
  },
  {
    id: "cuidado",
    icon: HeartPulse,
    color: "#d6456b",
    title: ["Cuidado e saúde", "Care and health", "Cuidado y salud", "Soins et santé"],
    tiles: [
      {
        id: "profissionais",
        art: "stetho",
        color2: "#9fb0f0",
        span: "wide",
        icon: Stethoscope,
        color: "#5b6fd6",
        to: "/profissionais",
        feature: "profissionais",
        title: [
          "Encontrar profissional",
          "Find a professional",
          "Encontrar profesional",
          "Trouver un pro",
        ],
        text: [
          "Verificados, com consulta por vídeo",
          "Verified, video consults",
          "Verificados, por video",
          "Vérifiés, en vidéo",
        ],
      },
      {
        id: "combina",
        art: "hearts",
        color2: "#f6a5bd",
        icon: HeartHandshake,
        color: "#d6456b",
        tool: "combina",
        feature: "profissionais",
        title: [
          "Qual profissional combina?",
          "Which pro fits you?",
          "¿Qué profesional te conviene?",
          "Quel pro vous convient ?",
        ],
        text: [
          "Escolha o que você precisa",
          "Pick what you need",
          "Elige lo que necesitas",
          "Choisissez votre besoin",
        ],
      },
      {
        id: "programas",
        art: "bag",
        color2: "#f2b8d0",
        icon: ShoppingBag,
        color: "#b8457a",
        to: "/programas",
        title: ["Programas", "Programs", "Programas", "Programmes"],
        text: [
          "Criados por profissionais, em módulos",
          "By professionals, in modules",
          "De profesionales, en módulos",
          "Par des pros, en modules",
        ],
      },
      {
        id: "acompanhamento",
        art: "pulse",
        color2: "#f39bb0",
        icon: HeartPulse,
        color: "#d6456b",
        to: "/acompanhamento",
        title: ["Meu acompanhamento", "My care", "Mi seguimiento", "Mon suivi"],
        text: [
          "Plano, metas e consultas",
          "Plan, goals and consults",
          "Plan, metas y consultas",
          "Plan, objectifs, consultations",
        ],
      },
      {
        id: "relatorio",
        art: "report",
        color2: "#9fd18c",
        icon: FileText,
        color: "#4f8a4b",
        tool: "relatorio",
        title: [
          "Minha evolução (PDF)",
          "My progress (PDF)",
          "Mi evolución (PDF)",
          "Mon évolution (PDF)",
        ],
        text: [
          "O seu mês num relatório",
          "Your month in a report",
          "Tu mes en un informe",
          "Votre mois en un rapport",
        ],
      },
      {
        id: "diario",
        art: "notebook",
        color2: "#f4cf7a",
        icon: NotebookPen,
        color: "#c58a12",
        to: "/acompanhamento/diario",
        title: ["Diário alimentar", "Food diary", "Diario alimentario", "Journal alimentaire"],
        text: [
          "Com foto comentada pela Nina",
          "With photos and Nina's notes",
          "Con foto y notas de Nina",
          "Avec photos et Nina",
        ],
      },
      {
        id: "rotulos",
        art: "barcode",
        color2: "#7fd6dc",
        icon: ScanBarcode,
        color: "#0f9aa8",
        to: "/acompanhamento/rotulos",
        title: ["Leitor de rótulos", "Label reader", "Lector de etiquetas", "Lecteur d'étiquettes"],
        text: [
          "Código de barras e selo ALTO EM",
          "Barcode and warning labels",
          "Código de barras y sellos",
          "Code-barres et alertes",
        ],
      },
      {
        id: "nina",
        art: "sparkles",
        color2: "#c9a6ea",
        span: "wide",
        icon: Sparkles,
        color: "#8a5fb0",
        to: "/nina",
        feature: "nina",
        title: ["Nutri Nina", "Nutri Nina", "Nutri Nina", "Nutri Nina"],
        text: [
          "Tire dúvidas com a IA",
          "Ask the AI",
          "Pregunta a la IA",
          "Posez vos questions à l'IA",
        ],
      },
    ],
  },
];

function FuncoesPage() {
  const { user, hydrated } = useRequireAuth();
  const tr = useTr();
  const features = useFeatures();
  const [open, setOpen] = useState<Tile | null>(null);
  const { badges, art, today } = useTileData(user?.id);
  const { locale } = useI18n();
  const theme = useActiveTheme(!!user);
  const themeTitle = theme.data ? themeText(theme.data, locale).title : undefined;

  if (!hydrated || !user) return <AuthGateLoading />;

  const visible = (t: Tile) => !t.feature || features[t.feature] || user.isAdmin;
  // Ordem de entrada em cascata pela página toda.
  let order = 0;

  return (
    <AppScreen>
      {/* Sem colunas laterais: os cards usam a largura toda da tela (ver rails-pages). */}
      <div className="@container mx-auto w-full max-w-[120rem] px-4 pb-10 pt-5 sm:px-6 lg:px-10">
        <Hero name={user.name} today={today} />

        {SECTIONS.map((section) => {
          const tiles = section.tiles.filter(visible);
          if (tiles.length === 0) return null;
          return (
            <section key={section.id} className="mb-7" aria-labelledby={`funcoes-${section.id}`}>
              <h2
                id={`funcoes-${section.id}`}
                className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-foreground"
              >
                <span
                  className="grid h-8 w-8 place-items-center rounded-xl text-white shadow-sm"
                  style={{ background: section.color }}
                >
                  <section.icon className="h-4 w-4" />
                </span>
                {tr(section.title)}
                <span
                  aria-hidden="true"
                  className="ml-1 h-[3px] flex-1 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${section.color}, transparent)`,
                    opacity: 0.35,
                  }}
                />
              </h2>
              <TileGrid tiles={tiles}>
                {(tile) => (
                  <TileCard
                    tile={tile}
                    index={order++}
                    badge={badges[tile.id]}
                    data={art[tile.id] ?? {}}
                    subtitle={tile.id === "tema" ? themeTitle : undefined}
                    onOpen={() => setOpen(tile)}
                  />
                )}
              </TileGrid>
            </section>
          );
        })}
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent
          aria-describedby={undefined}
          className="max-h-[88dvh] gap-0 overflow-y-auto rounded-t-[2rem] border-0 p-0 max-sm:bottom-0 max-sm:top-auto max-sm:translate-y-0 sm:max-w-md sm:rounded-[2rem]"
        >
          {open && (
            <>
              <div
                className="relative overflow-hidden px-5 pb-4 pt-6"
                style={{ background: tileBackground(open) }}
              >
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 top-2.5 h-1.5 w-10 -translate-x-1/2 rounded-full bg-foreground/15 sm:hidden"
                />
                <div className="flex items-center gap-3">
                  <span
                    className="nc-pop grid h-11 w-11 place-items-center rounded-2xl text-white shadow-md"
                    style={{ background: open.color }}
                  >
                    <open.icon className="h-6 w-6" />
                  </span>
                  <DialogTitle className="font-display text-xl font-bold text-foreground">
                    {tr(open.title)}
                  </DialogTitle>
                </div>
              </div>
              <div className="min-w-0 p-3">{open.tool && TOOLS[open.tool]()}</div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppScreen>
  );
}

/** Abertura da página: a Nina cumprimenta e mostra o resumo do dia. */
function Hero({
  name,
  today,
}: {
  name: string;
  today: { water?: string; habits?: string; streak: number };
}) {
  const tr = useTr();
  const [action, setAction] = useState<"wave" | "talk" | "idle">("wave");
  useEffect(() => {
    const a = window.setTimeout(() => setAction("talk"), 1800);
    const b = window.setTimeout(() => setAction("idle"), 4200);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, []);
  const hour = new Date().getHours();
  const hello =
    hour < 12
      ? tr(["Bom dia", "Good morning", "Buenos días", "Bonjour"])
      : hour < 18
        ? tr(["Boa tarde", "Good afternoon", "Buenas tardes", "Bon après-midi"])
        : tr(["Boa noite", "Good evening", "Buenas noches", "Bonsoir"]);
  const first = name.split(" ")[0] || name;
  const floaters = [
    { Icon: Apple, c: "#d6456b", cls: "left-[46%] top-3", d: "0s" },
    { Icon: Carrot, c: "#d9692a", cls: "right-6 top-5", d: "-1.4s" },
    { Icon: Leaf, c: "#4f8a4b", cls: "right-[28%] bottom-4", d: "-2.2s" },
    { Icon: Droplets, c: "#3b7bbf", cls: "right-[12%] bottom-10", d: "-3s" },
    { Icon: Sparkles, c: "#c58a12", cls: "left-[62%] bottom-6", d: "-0.6s" },
  ];
  return (
    <section
      data-funcoes-hero
      className="nc-tile-in nc-gradient-pan relative mb-7 overflow-hidden rounded-[2rem] border border-border/60 p-4 shadow-soft sm:p-6"
      style={{
        background:
          "linear-gradient(120deg, color-mix(in srgb, #f6c27a 30%, var(--card)), color-mix(in srgb, #9fd18c 26%, var(--card)), color-mix(in srgb, #9fb0f0 26%, var(--card)), color-mix(in srgb, #f39bb0 26%, var(--card)))",
      }}
    >
      {floaters.map(({ Icon, c, cls, d }, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`nc-floaty pointer-events-none absolute hidden opacity-60 @xl:block ${cls}`}
          style={{ animationDelay: d }}
        >
          <Icon className="h-6 w-6" style={{ color: c }} />
        </span>
      ))}
      <div className="relative flex items-center gap-3 sm:gap-5">
        <NinaLive
          action={action}
          framing="bust"
          className="h-28 w-24 shrink-0 sm:h-36 sm:w-32"
          label={tr([
            "Nutri Nina acenando",
            "Nutri Nina waving",
            "Nutri Nina saludando",
            "Nutri Nina qui salue",
          ])}
        />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">
            {tr(["Funções", "Tools", "Funciones", "Outils"])}
          </h1>
          <p className="relative mt-2 inline-block rounded-2xl rounded-tl-sm bg-card/90 px-3 py-2 text-sm font-medium text-foreground shadow-xs">
            {hello}, {first}!{" "}
            {tr([
              "O que vamos fazer hoje?",
              "What shall we do today?",
              "¿Qué hacemos hoy?",
              "On fait quoi aujourd’hui ?",
            ])}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {today.water && (
              <Chip icon={Droplets} color="#3b7bbf">
                {today.water}
              </Chip>
            )}
            {today.habits && (
              <Chip icon={CheckCheck} color="#4f8a4b">
                {today.habits}
              </Chip>
            )}
            {today.streak > 0 && (
              <Chip icon={Flame} color="#d9692a">
                {today.streak} {tr(["dias", "days", "días", "jours"])}
              </Chip>
            )}
            <Link
              to="/desafios"
              className="group inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-[11px] font-bold text-accent-foreground shadow-soft transition hover:bg-accent/90"
            >
              {tr([
                "Continuar a trilha",
                "Continue the trail",
                "Seguir la ruta",
                "Continuer le parcours",
              ])}
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Chip({
  icon: Icon,
  color,
  children,
}: {
  icon: LucideIcon;
  color: string;
  children: ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{ background: `color-mix(in srgb, ${color} 16%, var(--card))`, color }}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

/** Degradê de cada card nas cores dele (claro e escuro: mistura com a cor do cartão do tema). */
const tileBackground = (t: Tile) =>
  `linear-gradient(140deg, color-mix(in srgb, ${t.color} 20%, var(--card)) 0%, color-mix(in srgb, ${t.color2} 34%, var(--card)) 100%)`;

/** Grade de tiles de uma seção: encaixe denso e, medido o número de colunas, os últimos tiles
 *  crescem até a seção fechar sem buracos (lib/fill-grid). */
function TileGrid({ tiles, children }: { tiles: Tile[]; children: (tile: Tile) => ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const cols = useGridColumns(ref);
  const spans = useMemo(
    () =>
      fillSpans(
        tiles.map((t) => ({
          w: t.span === "wide" ? 2 : 1,
          h: t.span === "tall" && cols >= 3 ? 2 : 1,
        })),
        cols,
      ),
    [tiles, cols],
  );
  return (
    <ul
      ref={ref}
      data-funcoes-grid
      className="grid auto-rows-[minmax(8.75rem,auto)] grid-cols-2 gap-3 [grid-auto-flow:dense] @2xl:grid-cols-3 @4xl:grid-cols-4 @6xl:grid-cols-5 @[90rem]:grid-cols-6 @[110rem]:grid-cols-7"
    >
      {tiles.map((tile, i) => (
        <li
          key={tile.id}
          className={
            cols
              ? undefined
              : cn(tile.span === "wide" && "col-span-2", tile.span === "tall" && "@2xl:row-span-2")
          }
          style={
            cols ? { gridColumn: `span ${spans[i].w}`, gridRow: `span ${spans[i].h}` } : undefined
          }
        >
          {children(tile)}
        </li>
      ))}
    </ul>
  );
}

const tileClass =
  "nc-tile group relative flex h-full w-full cursor-pointer flex-col items-start gap-2 overflow-hidden rounded-[1.6rem] border p-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring";

function TileCard({
  tile,
  index,
  badge,
  data,
  subtitle,
  onOpen,
}: {
  tile: Tile;
  index: number;
  badge?: string;
  data: ArtData;
  /** Texto real no lugar da descrição (ex.: o título do tema desta semana). */
  subtitle?: string;
  onOpen: () => void;
}) {
  const tr = useTr();
  const ref = useRef<HTMLElement | null>(null);
  // Inclina o card na direção do mouse (só com mouse; no toque ele só afunda um pouco).
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.setProperty("--rx", `${(-y * 7).toFixed(2)}deg`);
    ref.current.style.setProperty("--ry", `${(x * 9).toFixed(2)}deg`);
  };
  const onLeave = () => {
    ref.current?.style.removeProperty("--rx");
    ref.current?.style.removeProperty("--ry");
  };
  const tall = tile.span === "tall";
  const props = {
    className: tileClass,
    onPointerMove: onMove,
    onPointerLeave: onLeave,
    style: {
      background: tileBackground(tile),
      borderColor: `color-mix(in srgb, ${tile.color} 22%, transparent)`,
      "--tile": tile.color,
    } as CSSProperties,
  };
  const body = (
    <>
      <TileArt id={tile.art} color={tile.color} data={data} />
      <span className="relative flex w-full items-start justify-between gap-2">
        <span
          className={cn(
            "grid shrink-0 place-items-center rounded-2xl text-white shadow-md transition duration-300 group-hover:-rotate-6 group-hover:scale-110",
            tall ? "h-12 w-12" : "h-10 w-10",
          )}
          style={{
            background: `linear-gradient(145deg, ${tile.color}, color-mix(in srgb, ${tile.color} 70%, #000))`,
          }}
        >
          <tile.icon className={tall ? "h-6 w-6" : "h-5 w-5"} />
        </span>
        {badge && (
          <span
            className="nc-pop max-w-[60%] truncate rounded-full px-2 py-0.5 text-[10px] font-black text-white shadow-sm"
            style={{ background: tile.color }}
          >
            {badge}
          </span>
        )}
      </span>
      <span
        className={cn(
          "relative mt-auto font-bold leading-tight",
          tall ? "text-base" : "text-[13px]",
        )}
        style={{ color: `color-mix(in srgb, ${tile.color} 45%, var(--foreground))` }}
      >
        {tr(tile.title)}
      </span>
      <span
        className={cn(
          "relative max-w-[78%] text-[11px] leading-snug text-foreground/70",
          subtitle ? "line-clamp-3 font-semibold" : "line-clamp-2",
        )}
      >
        {subtitle ?? tr(tile.text)}
      </span>
    </>
  );
  return (
    <div className="nc-tile-in h-full" style={{ animationDelay: `${Math.min(index, 24) * 45}ms` }}>
      {tile.to ? (
        <Link to={tile.to} ref={(el) => void (ref.current = el)} {...props}>
          {body}
        </Link>
      ) : (
        <button type="button" onClick={onOpen} ref={(el) => void (ref.current = el)} {...props}>
          {body}
        </button>
      )}
    </div>
  );
}

/** Dados reais da pessoa para os cards: selos (água, hábitos, lista...) e o que os desenhos mostram. */
function useTileData(userId: string | undefined) {
  const tr = useTr();
  const checkins = useCheckins(userId);
  const water = useWaterDays(userId, 1);
  const waterSettings = useWaterSettings(userId);
  const shopping = useShoppingItems(userId);
  const trail = useAdultTrailProgress(userId);
  const { ids: habitIds } = useHabitChoice();

  return useMemo(() => {
    const map = checkinsByDay(checkins.data);
    const today = map.get(checkinDay());
    const weekFrom = weekStartDay();
    const week = (checkins.data ?? []).filter((c) => c.day >= weekFrom);
    const glasses = water.data?.find((d) => d.day === waterDay())?.glasses ?? 0;
    const goal = waterSettings.data?.goal_glasses ?? DEFAULT_GOAL;
    const openItems = (shopping.data ?? []).filter((i) => !i.done).length;
    const pledged = week.filter((c) => c.pledge).length;
    const calm = week.reduce((s, c) => s + c.mindful_meals, 0);
    const quiz = Math.max(0, ...(checkins.data ?? []).map((c) => c.quiz_best ?? 0));
    const moods: Names[] = [
      ["Ótima", "Great", "Genial", "Super"],
      ["Boa", "Good", "Buena", "Bien"],
      ["Normal", "Okay", "Normal", "Moyenne"],
      ["Pesada", "Heavy", "Pesada", "Difficile"],
    ];
    const habits = (today?.habits ?? []).filter((id) => habitIds.includes(id)).length;
    const badges: Record<string, string | undefined> = {
      agua: water.data ? `${glasses}/${goal}` : undefined,
      habitos: today ? `${habits}/${habitIds.length}` : undefined,
      humor: today?.mood != null ? tr(moods[today.mood]) : undefined,
      compromisso: pledged ? `${pledged}/7` : undefined,
      calma: calm ? `${calm}×` : undefined,
      quiz: quiz ? `${quiz}/5` : undefined,
      compras: openItems ? `${openItems}` : undefined,
    };
    const art: Record<string, ArtData> = {
      agua: { fill: goal ? glasses / goal : 0 },
      habitos: { habits, habitsTotal: habitIds.length },
      humor: { mood: today?.mood ?? null },
    };
    return {
      badges,
      art,
      today: {
        water: water.data ? `${glasses}/${goal}` : undefined,
        habits: today ? `${habits}/${habitIds.length}` : undefined,
        streak: trail ? getActiveStreak(trail) : 0,
      },
    };
  }, [checkins.data, water.data, waterSettings.data, shopping.data, trail, tr, habitIds]);
}
