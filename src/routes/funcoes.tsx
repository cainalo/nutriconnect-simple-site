// Funções: todas as ferramentas do NutriConnect num só lugar, em cards de dois em dois no celular.
// Cada card leva a uma página (Geladeira, Desafios, Tema da semana...) ou abre a ferramenta numa
// gaveta (água, hábitos, lista de compras, quiz...). No celular a página fica na barra inferior; no
// computador, no ícone ao lado da busca. O que a pessoa registra fica na conta (lib/checkins).
import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Award,
  Backpack,
  Brain,
  CalendarDays,
  CalendarRange,
  Carrot,
  ChefHat,
  Dices,
  Droplets,
  HeartHandshake,
  HeartPulse,
  Lightbulb,
  ListChecks,
  MessageCircle,
  NotebookPen,
  Refrigerator,
  Salad,
  Scale,
  ScanBarcode,
  Search,
  ShoppingBasket,
  Smile,
  Sparkles,
  Stethoscope,
  Target,
  Timer,
  Users,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { AppScreen } from "@/components/app-screen";
import { AuthGateLoading } from "@/components/site-chrome";
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
  ProMatchCard,
  QuizCard,
  RecipeRouletteCard,
  ShoppingListCard,
  UnitConverterCard,
  WeeklyPledgeCard,
} from "@/components/fun-cards";
import { useTr } from "@/components/settings-ui";
import { useRequireAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import type { Names } from "@/lib/appearance-data";
import { checkinDay, checkinsByDay, useCheckins, weekStartDay } from "@/lib/checkins";
import { useFeatures, type FeatureKey } from "@/lib/features";
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
  | "combina";

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
  combina: () => <ProMatchCard />,
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
  const badges = useBadges(user?.id);
  const { locale } = useI18n();
  const theme = useActiveTheme(!!user);
  const themeTitle = theme.data ? themeText(theme.data, locale).title : undefined;

  if (!hydrated || !user) return <AuthGateLoading />;

  const visible = (t: Tile) => !t.feature || features[t.feature] || user.isAdmin;

  return (
    <AppScreen>
      <div className="mx-auto w-full max-w-5xl px-4 pb-8 pt-5 sm:px-6">
        <header className="mb-5">
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            {tr(["Funções", "Tools", "Funciones", "Outils"])}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tr([
              "Tudo o que o NutriConnect faz por você, num só lugar.",
              "Everything NutriConnect does for you, in one place.",
              "Todo lo que NutriConnect hace por ti, en un solo lugar.",
              "Tout ce que NutriConnect fait pour vous, au même endroit.",
            ])}
          </p>
        </header>

        {SECTIONS.map((section) => {
          const tiles = section.tiles.filter(visible);
          if (tiles.length === 0) return null;
          return (
            <section key={section.id} className="mb-6" aria-labelledby={`funcoes-${section.id}`}>
              <h2
                id={`funcoes-${section.id}`}
                className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                {tr(section.title)}
              </h2>
              <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                {tiles.map((tile) => (
                  <li key={tile.id}>
                    <TileCard
                      tile={tile}
                      badge={badges[tile.id]}
                      subtitle={tile.id === "tema" ? themeTitle : undefined}
                      onOpen={() => setOpen(tile)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent
          aria-describedby={undefined}
          className="max-h-[88dvh] gap-0 overflow-y-auto rounded-t-3xl p-3 pt-10 max-sm:bottom-0 max-sm:top-auto max-sm:translate-y-0 sm:max-w-md sm:rounded-3xl"
        >
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-3 h-1.5 w-10 -translate-x-1/2 rounded-full bg-border sm:hidden"
          />
          <DialogTitle className="sr-only">{open ? tr(open.title) : ""}</DialogTitle>
          {open?.tool && TOOLS[open.tool]()}
        </DialogContent>
      </Dialog>
    </AppScreen>
  );
}

const tileClass =
  "flex h-full min-h-[7.5rem] w-full cursor-pointer flex-col items-start gap-2 rounded-2xl border border-border/80 bg-card p-3 text-left shadow-xs transition hover:border-accent/40 hover:shadow-soft active:scale-[0.98]";

function TileCard({
  tile,
  badge,
  subtitle,
  onOpen,
}: {
  tile: Tile;
  badge?: string;
  /** Texto real no lugar da descrição (ex.: o título do tema desta semana). */
  subtitle?: string;
  onOpen: () => void;
}) {
  const tr = useTr();
  const body = (
    <>
      <span className="flex w-full items-start justify-between gap-2">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
          style={{
            backgroundColor: `color-mix(in srgb, ${tile.color} 14%, transparent)`,
            color: tile.color,
          }}
        >
          <tile.icon className="h-5 w-5" />
        </span>
        {badge && (
          <span className="max-w-[60%] truncate rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-foreground">
            {badge}
          </span>
        )}
      </span>
      <span className="text-[13px] font-semibold leading-tight text-foreground">
        {tr(tile.title)}
      </span>
      <span className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
        {subtitle ?? tr(tile.text)}
      </span>
    </>
  );
  if (tile.to) {
    return (
      <Link to={tile.to} className={tileClass}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onOpen} className={tileClass}>
      {body}
    </button>
  );
}

/** Resumo de cada card com os dados reais da pessoa (água, hábitos, lista de compras...). */
function useBadges(userId: string | undefined): Record<string, string | undefined> {
  const tr = useTr();
  const checkins = useCheckins(userId);
  const water = useWaterDays(userId, 1);
  const waterSettings = useWaterSettings(userId);
  const shopping = useShoppingItems(userId);

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
    return {
      agua: water.data ? `${glasses}/${goal}` : undefined,
      habitos: today ? `${today.habits.length}/4` : undefined,
      humor: today?.mood != null ? tr(moods[today.mood]) : undefined,
      compromisso: pledged ? `${pledged}/7` : undefined,
      calma: calm ? `${calm}×` : undefined,
      quiz: quiz ? `${quiz}/5` : undefined,
      compras: openItems ? `${openItems}` : undefined,
    };
  }, [checkins.data, water.data, waterSettings.data, shopping.data, tr]);
}
