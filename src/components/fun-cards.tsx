// Cards interativos das páginas: pequenos jogos, ferramentas e rituais do dia a dia. Cada página
// escolhe os seus em rails-pages.tsx, e a página Funções (/funcoes) reúne todos. O que a pessoa
// registra (água, lista de compras, hábitos, humor, compromisso da semana, refeições com calma e
// quiz) fica na conta, só para ela (ver lib/checkins e water-tracker). Textos nos 4 idiomas.
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Apple,
  Carrot,
  CheckCircle2,
  ChefHat,
  Droplets,
  Cherry,
  Citrus,
  Heart,
  LeafyGreen,
  Leaf,
  PartyPopper,
  Sparkles,
  Star,
  type LucideIcon,
  Copy,
  Dices,
  Flame,
  Lightbulb,
  MessageCircle,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Scale,
  Search,
  Settings2,
  Send,
  Shuffle,
  ShoppingBasket,
  Target,
  Timer,
  Trophy,
  Utensils,
  Activity,
  Brain,
  Dumbbell,
  HeartPulse,
  Stethoscope,
  Wind,
  X,
} from "lucide-react";
import type { ProfessionKey } from "@/lib/clinical/professions";
import { EmojiIcon } from "@/components/emoji-icon";
import { HABIT_CATALOG, MAX_HABITS, MIN_HABITS, useHabitChoice } from "@/lib/habits";
import { MORE_QUESTIONS, type QuizQuestion } from "@/lib/quiz-questions";
import { MORE_TIPS, type TipTheme } from "@/lib/daily-tips";
import { guessSection } from "@/lib/aisles";
import { SECTION_NAMES } from "@/lib/menu";
import { SECTIONS, type Section } from "@/lib/menu.functions";
import { Panel } from "@/components/rail-cards";
import { WaterTracker } from "@/components/water-tracker";
import {
  useAddShoppingItems,
  useDeleteShoppingItems,
  useFridgeItems,
  useShoppingItems,
  useUpdateShoppingItem,
} from "@/lib/fridge";
import { useAuth } from "@/hooks/use-auth";
import { ShareModal } from "@/components/share-modal";
import {
  checkinDay,
  checkinsByDay,
  daysAgo,
  streakOf,
  useCheckins,
  useSaveCheckin,
  weekStartDay,
} from "@/lib/checkins";
import { useCommunities } from "@/lib/social/communities-queries";
import { useI18n } from "@/hooks/use-i18n";
import { pickName, type Names } from "@/lib/appearance-data";
import { td } from "@/lib/i18n/data";
import { playSound } from "@/lib/sounds";
import { themeText } from "@/lib/social/feed";
import { useActiveTheme, useFeed } from "@/lib/social/feed-queries";
import { EXPLORE_TOPICS as TOPICS } from "@/lib/explore-topics";

// ───────────────────────────── Ajudantes ─────────────────────────────

function useTr() {
  const { locale } = useI18n();
  return useCallback((names: Names) => pickName(names, locale), [locale]);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Semente do dia: a "dica do dia" muda sozinha à meia-noite. */
function dayNumber() {
  return Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
}

/** Chuva de emojis para comemorar. `fire()` dispara de novo. */
function useBurst() {
  const [id, setId] = useState(0);
  const fire = useCallback(() => setId((n) => n + 1), []);
  return [id, fire] as const;
}

// Confete de ícones nas cores da marca (sem emojis).
const BURST: { icon: LucideIcon; color: string }[] = [
  { icon: PartyPopper, color: "#d9692a" },
  { icon: Sparkles, color: "#c58a12" },
  { icon: Carrot, color: "#d9692a" },
  { icon: Apple, color: "#d6456b" },
  { icon: LeafyGreen, color: "#4f8a4b" },
  { icon: Citrus, color: "#e8b13b" },
  { icon: Star, color: "#c58a12" },
  { icon: Heart, color: "#d6456b" },
  { icon: Cherry, color: "#be185d" },
  { icon: Leaf, color: "#4f8a4b" },
];

function Burst({ id }: { id: number }) {
  if (!id) return null;
  return (
    <div
      key={id}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
    >
      {BURST.map(({ icon: Icon, color }, i) => {
        const angle = (i / BURST.length) * Math.PI * 2;
        const radius = 90 + (i % 3) * 28;
        return (
          <span
            key={i}
            className="nc-burst absolute left-1/2 top-1/2"
            style={
              {
                "--dx": `${Math.round(Math.cos(angle) * radius)}px`,
                "--dy": `${Math.round(Math.sin(angle) * radius)}px`,
                animationDelay: `${(i % 4) * 40}ms`,
              } as React.CSSProperties
            }
          >
            <Icon className="h-5 w-5" style={{ color }} strokeWidth={2.2} />
          </span>
        );
      })}
    </div>
  );
}

const iconBtn =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold text-foreground transition hover:bg-secondary/70 active:scale-95";
const primaryBtn =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50";
const note = "mt-3 text-[10px] leading-snug text-muted-foreground";

/** Troca {chave} pelo valor no texto. */
const fillN = (text: string, vars: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-secondary">
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-500"
        style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
      />
    </div>
  );
}

// ───────────────────────────── Hidratação ─────────────────────────────

/** Copos de água do dia (registro no servidor, meta ajustável e lembretes): ver water-tracker. */
export function HydrationCard() {
  const tr = useTr();
  const [burst, fire] = useBurst();
  return (
    <Panel
      title={tr(["Água de hoje", "Today's water", "Agua de hoy", "L'eau du jour"])}
      className="relative"
    >
      <Burst id={burst} />
      <WaterTracker onGoalReached={fire} />
    </Panel>
  );
}

// ───────────────────────────── Dica do dia ─────────────────────────────

const TIPS: Names[] = [
  [
    "Prefira água a bebidas adoçadas: refrigerantes e sucos de caixinha trazem muito açúcar.",
    "Prefer water over sweetened drinks: sodas and boxed juices carry a lot of sugar.",
    "Prefiere el agua a las bebidas azucaradas: gaseosas y jugos de caja traen mucha azúcar.",
    "Préférez l'eau aux boissons sucrées : sodas et jus en boîte contiennent beaucoup de sucre.",
  ],
  [
    "Comer com atenção, sem telas, ajuda a perceber a saciedade.",
    "Eating mindfully, without screens, helps you notice fullness.",
    "Comer con atención, sin pantallas, ayuda a percibir la saciedad.",
    "Manger en pleine conscience, sans écrans, aide à ressentir la satiété.",
  ],
  [
    "Frutas, legumes e verduras de cores variadas trazem nutrientes diferentes.",
    "Fruits and vegetables of different colors bring different nutrients.",
    "Frutas y verduras de colores variados aportan nutrientes diferentes.",
    "Les fruits et légumes de couleurs variées apportent des nutriments différents.",
  ],
  [
    "Uma lista de compras reduz o desperdício e as compras por impulso.",
    "A shopping list reduces waste and impulse buying.",
    "Una lista de compras reduce el desperdicio y las compras por impulso.",
    "Une liste de courses réduit le gaspillage et les achats impulsifs.",
  ],
  [
    "Sempre que puder, faça as refeições em horários regulares e em boa companhia.",
    "Whenever you can, eat at regular times and in good company.",
    "Siempre que puedas, come en horarios regulares y en buena compañía.",
    "Dès que possible, mangez à heures régulières et en bonne compagnie.",
  ],
  [
    "Leia o rótulo: quanto menor a lista de ingredientes, em geral mais natural é o alimento.",
    "Read the label: the shorter the ingredient list, the more natural the food usually is.",
    "Lee la etiqueta: cuanto más corta la lista de ingredientes, más natural suele ser el alimento.",
    "Lisez l'étiquette : plus la liste d'ingrédients est courte, plus l'aliment est en général naturel.",
  ],
  [
    "Alimentos in natura ou minimamente processados devem ser a base da alimentação (Guia Alimentar).",
    "Fresh or minimally processed foods should be the basis of your diet (Brazilian Dietary Guidelines).",
    "Los alimentos frescos o mínimamente procesados deben ser la base de la alimentación (Guía Alimentaria).",
    "Les aliments frais ou peu transformés doivent être la base de l'alimentation (Guide alimentaire).",
  ],
  [
    "Arroz com feijão é uma combinação tradicional, saborosa e nutritiva.",
    "Rice and beans is a traditional, tasty and nutritious combination.",
    "Arroz con frijoles es una combinación tradicional, sabrosa y nutritiva.",
    "Riz et haricots : une combinaison traditionnelle, savoureuse et nutritive.",
  ],
  [
    "Cozinhar em casa dá controle sobre o sal, o açúcar e a gordura do prato.",
    "Cooking at home gives you control over the salt, sugar and fat in your meal.",
    "Cocinar en casa te da control sobre la sal, el azúcar y la grasa del plato.",
    "Cuisiner à la maison permet de contrôler le sel, le sucre et les graisses.",
  ],
  [
    "Dormir bem influencia o apetite e a disposição durante o dia.",
    "Sleeping well affects appetite and energy during the day.",
    "Dormir bien influye en el apetito y en la energía durante el día.",
    "Bien dormir influence l'appétit et l'énergie pendant la journée.",
  ],
  [
    "Pequenas caminhadas ao longo do dia também somam para a saúde.",
    "Short walks throughout the day add up for your health.",
    "Las caminatas cortas a lo largo del día también suman para la salud.",
    "De petites marches tout au long de la journée comptent aussi pour la santé.",
  ],
  [
    "Dúvidas sobre a sua alimentação? Um(a) nutricionista orienta de forma individual.",
    "Questions about your diet? A nutritionist can guide you individually.",
    "¿Dudas sobre tu alimentación? Un(a) nutricionista orienta de forma individual.",
    "Des questions sur votre alimentation ? Un(e) nutritionniste vous guide individuellement.",
  ],
];

const TIP_THEMES: Record<TipTheme, { icon: LucideIcon; color: string; name: Names }> = {
  cozinha: { icon: ChefHat, color: "#d9692a", name: ["Cozinha", "Kitchen", "Cocina", "Cuisine"] },
  compras: {
    icon: ShoppingBasket,
    color: "#3b7bbf",
    name: ["Compras", "Shopping", "Compras", "Courses"],
  },
  rotulo: {
    icon: Search,
    color: "#8a5fb0",
    name: ["Rótulos", "Labels", "Etiquetas", "Étiquettes"],
  },
  habito: { icon: Heart, color: "#4f8a4b", name: ["Hábitos", "Habits", "Hábitos", "Habitudes"] },
  agua: {
    icon: Droplets,
    color: "#0f9aa8",
    name: ["Hidratação", "Hydration", "Hidratación", "Hydratation"],
  },
};
const ALL_TIPS: { theme: TipTheme; text: Names }[] = [
  ...TIPS.map((text) => ({ theme: "habito" as const, text })),
  ...MORE_TIPS,
];
const SAVED_TIPS_KEY = "nc_tips_saved";

/** Uma dica por dia (a mesma o dia todo), com tema; dá para pedir outra e salvar as preferidas. */
export function DailyTipCard() {
  const tr = useTr();
  const [shift, setShift] = useState(0);
  const [saved, setSaved] = useState<string[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  useEffect(() => {
    try {
      const raw = JSON.parse(window.localStorage.getItem(SAVED_TIPS_KEY) ?? "[]");
      if (Array.isArray(raw)) setSaved(raw);
    } catch {
      // sem armazenamento
    }
  }, []);
  const tip = ALL_TIPS[(dayNumber() * 5 + shift) % ALL_TIPS.length];
  const theme = TIP_THEMES[tip.theme];
  const isSaved = saved.includes(tip.text[0]);
  const persist = (next: string[]) => {
    setSaved(next);
    try {
      window.localStorage.setItem(SAVED_TIPS_KEY, JSON.stringify(next));
    } catch {
      // sem armazenamento
    }
  };
  const toggleSave = () => {
    persist(isSaved ? saved.filter((x) => x !== tip.text[0]) : [...saved, tip.text[0]]);
    playSound(isSaved ? "click" : "success");
  };
  const savedTips = ALL_TIPS.filter((t) => saved.includes(t.text[0]));

  return (
    <Panel title={tr(["Dica do dia", "Tip of the day", "Consejo del día", "Astuce du jour"])}>
      {showSaved ? (
        savedTips.length ? (
          <ul className="space-y-2">
            {savedTips.map((t) => {
              const th = TIP_THEMES[t.theme];
              return (
                <li
                  key={t.text[0]}
                  className="flex gap-2 rounded-xl bg-secondary/50 p-2.5 text-left text-xs leading-snug"
                >
                  <th.icon className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: th.color }} />
                  <span className="flex-1">{tr(t.text)}</span>
                  <button
                    type="button"
                    onClick={() => persist(saved.filter((x) => x !== t.text[0]))}
                    className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                    aria-label={tr(["Remover", "Remove", "Quitar", "Supprimer"])}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            {tr([
              "Nenhuma dica salva ainda. Toque no coração para guardar uma.",
              "No saved tips yet. Tap the heart to keep one.",
              "Aún no hay consejos guardados. Toca el corazón para guardar uno.",
              "Aucune astuce enregistrée. Touchez le cœur pour en garder une.",
            ])}
          </p>
        )
      ) : (
        <div className="flex gap-3">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white"
            style={{ background: theme.color }}
          >
            <theme.icon className="h-5 w-5" />
          </span>
          <div key={shift} className="nc-pop-in min-w-0">
            <p
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: theme.color }}
            >
              {tr(theme.name)}
            </p>
            <p className="mt-0.5 text-left text-sm leading-relaxed text-foreground">
              {tr(tip.text)}
            </p>
          </div>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowSaved((v) => !v)}
          className="cursor-pointer text-[11px] font-bold text-primary hover:underline"
        >
          {showSaved
            ? tr(["Voltar à dica", "Back to the tip", "Volver al consejo", "Retour à l'astuce"])
            : `${tr(["Salvas", "Saved", "Guardados", "Enregistrées"])} (${saved.length})`}
        </button>
        {!showSaved && (
          <span className="flex gap-1.5">
            <button
              type="button"
              onClick={toggleSave}
              aria-pressed={isSaved}
              className={`${iconBtn} ${isSaved ? "!bg-accent !text-accent-foreground" : ""}`}
              aria-label={tr([
                "Salvar dica",
                "Save tip",
                "Guardar consejo",
                "Enregistrer l'astuce",
              ])}
            >
              <Heart className={`h-3 w-3 ${isSaved ? "fill-current" : ""}`} />
            </button>
            <button type="button" className={iconBtn} onClick={() => setShift((n) => n + 1)}>
              <Shuffle className="h-3 w-3" />
              {tr(["Outra dica", "Another tip", "Otro consejo", "Autre astuce"])}
            </button>
          </span>
        )}
      </div>
    </Panel>
  );
}

// ───────────────────────────── Quiz relâmpago ─────────────────────────────

type Question = QuizQuestion;

const BASE_QUESTIONS: Question[] = [
  {
    q: [
      "Qual destes alimentos é fonte de vitamina C?",
      "Which of these foods is a source of vitamin C?",
      "¿Cuál de estos alimentos es fuente de vitamina C?",
      "Lequel de ces aliments est une source de vitamine C ?",
    ],
    options: [
      ["Arroz branco", "White rice", "Arroz blanco", "Riz blanc"],
      ["Laranja", "Orange", "Naranja", "Orange"],
      ["Pão francês", "French bread", "Pan francés", "Pain"],
    ],
    answer: 1,
    why: [
      "Frutas cítricas, como laranja e acerola, são ricas em vitamina C.",
      "Citrus fruits, like oranges and acerola, are rich in vitamin C.",
      "Las frutas cítricas, como la naranja y la acerola, son ricas en vitamina C.",
      "Les agrumes, comme l'orange et l'acérola, sont riches en vitamine C.",
    ],
  },
  {
    q: [
      "Segundo o Guia Alimentar brasileiro, qual deve ser a base da alimentação?",
      "According to the Brazilian Dietary Guidelines, what should be the basis of your diet?",
      "Según la Guía Alimentaria brasileña, ¿cuál debe ser la base de la alimentación?",
      "Selon le Guide alimentaire brésilien, quelle doit être la base de l'alimentation ?",
    ],
    options: [
      ["Ultraprocessados", "Ultra-processed foods", "Ultraprocesados", "Ultra-transformés"],
      [
        "Alimentos in natura ou minimamente processados",
        "Fresh or minimally processed foods",
        "Alimentos frescos o mínimamente procesados",
        "Aliments frais ou peu transformés",
      ],
      ["Suplementos", "Supplements", "Suplementos", "Compléments"],
    ],
    answer: 1,
    why: [
      "Priorize alimentos frescos, como frutas, legumes, feijões, arroz e ovos.",
      "Prioritize fresh foods such as fruits, vegetables, beans, rice and eggs.",
      "Prioriza alimentos frescos, como frutas, verduras, frijoles, arroz y huevos.",
      "Privilégiez les aliments frais : fruits, légumes, haricots, riz et œufs.",
    ],
  },
  {
    q: [
      "Qual destes é uma boa fonte de ferro de origem vegetal?",
      "Which of these is a good plant source of iron?",
      "¿Cuál de estos es una buena fuente de hierro de origen vegetal?",
      "Lequel de ces aliments est une bonne source de fer végétal ?",
    ],
    options: [
      ["Feijão", "Beans", "Frijoles", "Haricots"],
      ["Refrigerante", "Soda", "Gaseosa", "Soda"],
      ["Margarina", "Margarine", "Margarina", "Margarine"],
    ],
    answer: 0,
    why: [
      "Feijões e lentilhas têm ferro. Combinar com uma fonte de vitamina C ajuda a absorver melhor.",
      "Beans and lentils contain iron. Pairing them with vitamin C helps absorption.",
      "Los frijoles y las lentejas tienen hierro. Combinarlos con vitamina C ayuda a absorberlo.",
      "Haricots et lentilles contiennent du fer. Les associer à la vitamine C aide l'absorption.",
    ],
  },
  {
    q: [
      "As fibras alimentares ajudam principalmente em quê?",
      "What do dietary fibers mainly help with?",
      "¿En qué ayudan principalmente las fibras alimentarias?",
      "À quoi servent principalement les fibres alimentaires ?",
    ],
    options: [
      [
        "No funcionamento do intestino",
        "Bowel function",
        "El funcionamiento del intestino",
        "Le fonctionnement de l'intestin",
      ],
      ["Na queda de cabelo", "Hair loss", "La caída del cabello", "La chute des cheveux"],
      ["Na visão noturna", "Night vision", "La visión nocturna", "La vision nocturne"],
    ],
    answer: 0,
    why: [
      "Frutas, verduras, grãos integrais e leguminosas são ricos em fibras.",
      "Fruits, vegetables, whole grains and legumes are rich in fiber.",
      "Las frutas, verduras, cereales integrales y legumbres son ricos en fibra.",
      "Fruits, légumes, céréales complètes et légumineuses sont riches en fibres.",
    ],
  },
  {
    q: [
      "Qual é a melhor bebida para se hidratar no dia a dia?",
      "What is the best everyday drink for hydration?",
      "¿Cuál es la mejor bebida para hidratarse a diario?",
      "Quelle est la meilleure boisson pour s'hydrater au quotidien ?",
    ],
    options: [
      ["Refrigerante", "Soda", "Gaseosa", "Soda"],
      ["Suco de caixinha", "Boxed juice", "Jugo de caja", "Jus en boîte"],
      ["Água", "Water", "Agua", "Eau"],
    ],
    answer: 2,
    why: [
      "A água hidrata sem açúcar adicionado.",
      "Water hydrates with no added sugar.",
      "El agua hidrata sin azúcar añadido.",
      "L'eau hydrate sans sucre ajouté.",
    ],
  },
  {
    q: [
      "Qual destes alimentos é fonte de cálcio?",
      "Which of these foods is a source of calcium?",
      "¿Cuál de estos alimentos es fuente de calcio?",
      "Lequel de ces aliments est une source de calcium ?",
    ],
    options: [
      ["Açúcar", "Sugar", "Azúcar", "Sucre"],
      ["Óleo", "Oil", "Aceite", "Huile"],
      ["Leite e iogurte", "Milk and yogurt", "Leche y yogur", "Lait et yaourt"],
    ],
    answer: 2,
    why: [
      "Leite e derivados são as fontes mais conhecidas; couve e sardinha também têm cálcio.",
      "Milk and dairy are the best-known sources; kale and sardines also have calcium.",
      "La leche y derivados son las fuentes más conocidas; la col rizada y las sardinas también tienen calcio.",
      "Le lait et ses dérivés sont les sources les plus connues ; le chou kale et les sardines aussi.",
    ],
  },
  {
    q: [
      "Qual destes é um exemplo de ultraprocessado?",
      "Which of these is an example of an ultra-processed food?",
      "¿Cuál de estos es un ejemplo de ultraprocesado?",
      "Lequel de ces produits est ultra-transformé ?",
    ],
    options: [
      ["Salgadinho de pacote", "Packaged chips", "Snack de paquete", "Chips en sachet"],
      [
        "Feijão cozido em casa",
        "Home-cooked beans",
        "Frijoles cocidos en casa",
        "Haricots cuits maison",
      ],
      ["Banana", "Banana", "Plátano", "Banane"],
    ],
    answer: 0,
    why: [
      "Ultraprocessados levam muitos aditivos e costumam ter excesso de sal, açúcar e gordura.",
      "Ultra-processed foods contain many additives and often too much salt, sugar and fat.",
      "Los ultraprocesados llevan muchos aditivos y suelen tener exceso de sal, azúcar y grasa.",
      "Les ultra-transformés contiennent beaucoup d'additifs, de sel, de sucre et de gras.",
    ],
  },
  {
    q: [
      "Quais nutrientes fornecem energia ao corpo?",
      "Which nutrients provide energy to the body?",
      "¿Qué nutrientes aportan energía al cuerpo?",
      "Quels nutriments fournissent de l'énergie au corps ?",
    ],
    options: [
      ["Só vitaminas", "Vitamins only", "Solo vitaminas", "Seulement les vitamines"],
      [
        "Carboidratos, proteínas e gorduras",
        "Carbohydrates, proteins and fats",
        "Carbohidratos, proteínas y grasas",
        "Glucides, protéines et lipides",
      ],
      [
        "Água e sais minerais",
        "Water and minerals",
        "Agua y sales minerales",
        "Eau et sels minéraux",
      ],
    ],
    answer: 1,
    why: [
      "Esses são os macronutrientes. Vitaminas, minerais e água não fornecem calorias.",
      "Those are the macronutrients. Vitamins, minerals and water provide no calories.",
      "Son los macronutrientes. Las vitaminas, los minerales y el agua no aportan calorías.",
      "Ce sont les macronutriments. Vitamines, minéraux et eau n'apportent pas de calories.",
    ],
  },
];

const QUESTIONS: Question[] = [...BASE_QUESTIONS, ...MORE_QUESTIONS];
const ROUND = 5;
const SEEN_KEY = "nc_quiz_seen";

function readSeen(): string[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

/** Alternativas em ordem sorteada (a certa não fica sempre no mesmo lugar). */
function shuffleOptions(q: Question): Question {
  const order = shuffled([0, 1, 2]);
  return {
    ...q,
    options: order.map((i) => q.options[i]) as Question["options"],
    answer: order.indexOf(q.answer) as Question["answer"],
  };
}

/** Rodada nova: primeiro as perguntas que a pessoa ainda não viu neste aparelho. */
function newRound(): Question[] {
  const seen = new Set(readSeen());
  const fresh = shuffled(QUESTIONS.filter((q) => !seen.has(q.q[0])));
  const old = shuffled(QUESTIONS.filter((q) => seen.has(q.q[0])));
  const round = [...fresh, ...old].slice(0, ROUND);
  try {
    const next = [
      ...readSeen().filter((id) => !round.some((q) => q.q[0] === id)),
      ...round.map((q) => q.q[0]),
    ];
    // Quando todas já foram vistas, recomeça o ciclo guardando só a rodada atual.
    const keep = next.length >= QUESTIONS.length ? round.map((q) => q.q[0]) : next;
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(keep));
  } catch {
    // sem armazenamento: sorteio simples
  }
  return round.map(shuffleOptions);
}

function shuffled<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function QuizCard() {
  const tr = useTr();
  const { user } = useAuth();
  const checkins = useCheckins(user?.id);
  const save = useSaveCheckin(user?.id);
  // Recorde dos últimos 30 dias (cada dia guarda o melhor resultado do dia).
  const best = Math.max(0, ...(checkins.data ?? []).map((c) => c.quiz_best ?? 0));
  const [burst, fire] = useBurst();
  const [round, setRound] = useState<Question[]>(() => QUESTIONS.slice(0, ROUND));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const finished = index >= ROUND;

  // Sorteia a rodada só no navegador (evita diferença com o HTML do servidor).
  useEffect(() => setRound(newRound()), []);

  const q = round[Math.min(index, ROUND - 1)];

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const right = i === q.answer;
    if (right) setScore((s) => s + 1);
    playSound(right ? "success" : "error");
  };

  const next = () => {
    const last = index + 1 >= ROUND;
    setIndex((n) => n + 1);
    setPicked(null);
    if (last) {
      const final = score;
      const today = checkinDay();
      const todayBest = checkinsByDay(checkins.data).get(today)?.quiz_best ?? -1;
      if (user && final > todayBest) save.mutate({ day: today, patch: { quiz_best: final } });
      if (final >= 4) {
        fire();
        playSound("achievement");
      }
    }
  };

  const again = () => {
    setRound(newRound());
    setIndex(0);
    setPicked(null);
    setScore(0);
  };

  return (
    <Panel
      title={tr(["Quiz relâmpago", "Quick quiz", "Quiz relámpago", "Quiz éclair"])}
      className="relative"
      action={
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
          <Trophy className="h-3 w-3" />
          {best}/{ROUND}
          <span className="sr-only">
            {tr(["recorde do mês", "best this month", "récord del mes", "record du mois"])}
          </span>
        </span>
      }
    >
      <Burst id={burst} />
      {finished ? (
        <div className="py-2 text-center">
          <p className="text-3xl font-black text-foreground">
            {score}/{ROUND}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {score >= 4
              ? tr(["Mandou bem!", "Great job!", "¡Muy bien!", "Bravo !"])
              : score >= 2
                ? tr([
                    "Quase lá! Tente de novo.",
                    "Almost there! Try again.",
                    "¡Casi! Inténtalo de nuevo.",
                    "Presque ! Réessayez.",
                  ])
                : tr([
                    "Que tal rever a trilha de aprendizado?",
                    "How about revisiting the learning trail?",
                    "¿Y si repasas la ruta de aprendizaje?",
                    "Et si vous revoyiez le parcours d'apprentissage ?",
                  ])}
          </p>
          <button type="button" className={`${primaryBtn} mt-3`} onClick={again}>
            <RotateCcw className="h-3.5 w-3.5" />
            {tr(["Jogar de novo", "Play again", "Jugar de nuevo", "Rejouer"])}
          </button>
        </div>
      ) : (
        <div>
          <Bar value={index + (picked !== null ? 1 : 0)} max={ROUND} />
          <p className="mt-3 text-sm font-semibold leading-snug text-foreground">{tr(q.q)}</p>
          <div className="mt-3 space-y-2">
            {q.options.map((opt, i) => {
              const isAnswer = i === q.answer;
              const state =
                picked === null
                  ? "border-border/70 bg-secondary/40 hover:bg-secondary"
                  : isAnswer
                    ? "border-emerald-500/50 bg-emerald-500/15 text-foreground"
                    : i === picked
                      ? "border-destructive/50 bg-destructive/10 text-foreground"
                      : "border-border/50 bg-secondary/20 opacity-60";
              return (
                <button
                  key={i}
                  type="button"
                  disabled={picked !== null}
                  onClick={() => choose(i)}
                  className={`w-full cursor-pointer rounded-xl border px-3 py-2 text-left text-xs font-medium transition active:scale-[0.98] disabled:cursor-default ${state}`}
                >
                  {tr(opt)}
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <div className="nc-pop-in mt-3 rounded-xl bg-accent-soft/60 p-3 text-xs leading-relaxed text-foreground">
              {tr(q.why)}
              <div className="mt-2 text-right">
                <button type="button" className={primaryBtn} onClick={next}>
                  {index + 1 >= ROUND
                    ? tr(["Ver resultado", "See result", "Ver resultado", "Voir le résultat"])
                    : tr(["Próxima", "Next", "Siguiente", "Suivante"])}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

// ───────────────────────────── Monte seu prato ─────────────────────────────

type Group = "veg" | "protein" | "carb";
interface Food {
  emoji: string;
  name: Names;
  group: Group;
}

const FOODS: Food[] = [
  { emoji: "🥗", name: ["Salada", "Salad", "Ensalada", "Salade"], group: "veg" },
  { emoji: "🥬", name: ["Couve", "Kale", "Col rizada", "Chou kale"], group: "veg" },
  { emoji: "🍅", name: ["Tomate", "Tomato", "Tomate", "Tomate"], group: "veg" },
  { emoji: "🥦", name: ["Brócolis", "Broccoli", "Brócoli", "Brocoli"], group: "veg" },
  { emoji: "🥕", name: ["Cenoura", "Carrot", "Zanahoria", "Carotte"], group: "veg" },
  { emoji: "🥒", name: ["Abobrinha", "Zucchini", "Calabacín", "Courgette"], group: "veg" },
  { emoji: "🫘", name: ["Feijão", "Beans", "Frijoles", "Haricots"], group: "protein" },
  { emoji: "🥚", name: ["Ovo", "Egg", "Huevo", "Œuf"], group: "protein" },
  { emoji: "🐟", name: ["Peixe", "Fish", "Pescado", "Poisson"], group: "protein" },
  { emoji: "🍗", name: ["Frango", "Chicken", "Pollo", "Poulet"], group: "protein" },
  { emoji: "🥩", name: ["Carne", "Beef", "Carne", "Bœuf"], group: "protein" },
  { emoji: "🌰", name: ["Lentilha", "Lentils", "Lentejas", "Lentilles"], group: "protein" },
  { emoji: "🍚", name: ["Arroz", "Rice", "Arroz", "Riz"], group: "carb" },
  { emoji: "🍠", name: ["Batata-doce", "Sweet potato", "Batata", "Patate douce"], group: "carb" },
  { emoji: "🥔", name: ["Mandioca", "Cassava", "Yuca", "Manioc"], group: "carb" },
  { emoji: "🌽", name: ["Milho", "Corn", "Maíz", "Maïs"], group: "carb" },
  { emoji: "🍝", name: ["Macarrão", "Pasta", "Pasta", "Pâtes"], group: "carb" },
  {
    emoji: "🍞",
    name: ["Pão integral", "Whole-grain bread", "Pan integral", "Pain complet"],
    group: "carb",
  },
];

/** Porções no prato (cada toque é uma porção). */
const MAX_ON_PLATE = 8;

/** Cor de cada grupo do prato (verduras, proteínas, energia). */
const GROUP_COLOR: Record<Group, string> = { veg: "#4f8a4b", protein: "#d9692a", carb: "#c58a12" };
/** Parte ideal do prato para cada grupo (Guia Alimentar: metade legumes e verduras). */
const GROUP_IDEAL: Record<Group, number> = { veg: 0.5, protein: 0.25, carb: 0.25 };
const GROUP_NAMES: Record<Group, Names> = {
  veg: ["Legumes e verduras", "Vegetables", "Verduras", "Légumes"],
  protein: ["Proteínas", "Proteins", "Proteínas", "Protéines"],
  carb: ["Energia", "Energy", "Energía", "Énergie"],
};
const GROUPS: Group[] = ["veg", "protein", "carb"];

/** Fatia de pizza (SVG) de `from` a `to` (frações da volta), raio r, centro 50,50. */
function slice(from: number, to: number, r: number) {
  if (to - from >= 0.999) return `M50 ${50 - r} A${r} ${r} 0 1 1 49.99 ${50 - r} Z`;
  const pt = (f: number) => {
    const a = f * 2 * Math.PI - Math.PI / 2;
    return `${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`;
  };
  return `M50 50 L${pt(from)} A${r} ${r} 0 ${to - from > 0.5 ? 1 : 0} 1 ${pt(to)} Z`;
}

/** Cor de cada humor, do mais animado ao mais difícil. */
const MOOD_COLORS = ["#4f8a4b", "#84a331", "#c58a12", "#d6456b"];

/** Monte o prato tocando nos alimentos: o card avalia o equilíbrio (metade legumes e verduras). */
export function PlateBuilderCard() {
  const tr = useTr();
  const [plate, setPlate] = useState<number[]>([]);
  const counts = useMemo(() => {
    const c: Record<Group, number> = { veg: 0, protein: 0, carb: 0 };
    plate.forEach((i) => (c[FOODS[i].group] += 1));
    return c;
  }, [plate]);

  const message = (() => {
    if (plate.length === 0)
      return tr([
        "Toque nos alimentos para montar o seu prato.",
        "Tap the foods to build your plate.",
        "Toca los alimentos para armar tu plato.",
        "Touchez les aliments pour composer votre assiette.",
      ]);
    if (counts.veg === 0)
      return tr([
        "Faltam legumes e verduras: eles devem ocupar cerca de metade do prato.",
        "Vegetables are missing: they should fill about half the plate.",
        "Faltan verduras: deben ocupar cerca de la mitad del plato.",
        "Il manque des légumes : ils devraient occuper environ la moitié de l'assiette.",
      ]);
    if (counts.protein === 0)
      return tr([
        "Falta uma fonte de proteína: feijão, ovo, peixe, carnes…",
        "A protein source is missing: beans, egg, fish, meat…",
        "Falta una fuente de proteína: frijoles, huevo, pescado, carne…",
        "Il manque une source de protéines : haricots, œuf, poisson, viande…",
      ]);
    if (counts.carb === 0)
      return tr([
        "Falta uma fonte de energia: arroz, batata, mandioca, milho…",
        "An energy source is missing: rice, potato, cassava, corn…",
        "Falta una fuente de energía: arroz, papa, mandioca, maíz…",
        "Il manque une source d'énergie : riz, pomme de terre, manioc, maïs…",
      ]);
    if (counts.veg * 2 >= plate.length)
      return tr([
        "Prato colorido e equilibrado!",
        "A colorful, balanced plate!",
        "¡Plato colorido y equilibrado!",
        "Une assiette colorée et équilibrée !",
      ]);
    return tr([
      "Quase! Tente deixar metade do prato com legumes e verduras.",
      "Almost! Try to make half the plate vegetables.",
      "¡Casi! Intenta que la mitad del plato sean verduras.",
      "Presque ! Essayez de remplir la moitié de l'assiette de légumes.",
    ]);
  })();

  const add = (i: number) => {
    if (plate.length >= MAX_ON_PLATE) return;
    setPlate((p) => [...p, i]);
    playSound("click");
  };

  return (
    <Panel
      title={tr([
        "Monte seu prato",
        "Build your plate",
        "Arma tu plato",
        "Composez votre assiette",
      ])}
      action={
        plate.length > 0 ? (
          <button
            type="button"
            onClick={() => setPlate([])}
            className="cursor-pointer text-muted-foreground hover:text-foreground"
            aria-label={tr(["Limpar", "Clear", "Limpiar", "Vider"])}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        ) : undefined
      }
    >
      <div className="relative mx-auto h-36 w-36">
        <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
          <circle cx="50" cy="50" r="48" className="fill-card stroke-border" strokeWidth="2" />
          {/* Proporção ideal, tracejada: metade verduras, um quarto proteína, um quarto energia. */}
          {[0, 0.5, 0.75].map((f) => {
            const a = f * 2 * Math.PI - Math.PI / 2;
            return (
              <line
                key={f}
                x1="50"
                y1="50"
                x2={50 + 42 * Math.cos(a)}
                y2={50 + 42 * Math.sin(a)}
                className="stroke-border"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            );
          })}
          {(() => {
            let at = 0;
            return GROUPS.map((g) => {
              const part = plate.length ? counts[g] / plate.length : 0;
              const d = part > 0 ? slice(at, at + part, 40) : null;
              at += part;
              return d ? (
                <path key={g} d={d} fill={GROUP_COLOR[g]} opacity={0.85} className="nc-pop-in" />
              ) : null;
            });
          })()}
          <circle cx="50" cy="50" r="40" fill="none" className="stroke-card" strokeWidth="1.5" />
        </svg>
        {plate.length === 0 && (
          <span className="absolute inset-0 grid place-items-center text-[11px] font-semibold text-muted-foreground">
            {tr(["Prato vazio", "Empty plate", "Plato vacío", "Assiette vide"])}
          </span>
        )}
      </div>
      <dl className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        {GROUPS.map((g) => (
          <div key={g}>
            <dt className="font-semibold" style={{ color: GROUP_COLOR[g] }}>
              {tr(GROUP_NAMES[g])}
            </dt>
            <dd className="tabular-nums text-muted-foreground">
              {plate.length ? Math.round((counts[g] / plate.length) * 100) : 0}% /{" "}
              {Math.round(GROUP_IDEAL[g] * 100)}%
            </dd>
          </div>
        ))}
      </dl>
      <p
        key={message}
        className="nc-pop-in mt-3 min-h-[2.5rem] text-center text-xs font-medium leading-snug text-foreground"
      >
        {message}
      </p>
      {GROUPS.map((g) => (
        <div key={g} className="mt-2">
          <p
            className="mb-1 text-[10px] font-bold uppercase tracking-wider"
            style={{ color: GROUP_COLOR[g] }}
          >
            {tr(GROUP_NAMES[g])}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {FOODS.map((f, i) =>
              f.group === g ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => add(i)}
                  disabled={plate.length >= MAX_ON_PLATE}
                  className={`${iconBtn} disabled:opacity-40`}
                >
                  <span style={{ color: GROUP_COLOR[f.group] }}>
                    <EmojiIcon emoji={f.emoji} className="h-4 w-4" />
                  </span>
                  {tr(f.name)}
                </button>
              ) : null,
            )}
          </div>
        </div>
      ))}
      {plate.length > 0 && (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          {plate.map((i) => tr(FOODS[i].name)).join(" · ")}
        </p>
      )}
      <p className={note}>
        {tr([
          "Inspirado no Guia Alimentar para a População Brasileira. Não substitui orientação profissional.",
          "Inspired by the Brazilian Dietary Guidelines. It does not replace professional advice.",
          "Inspirado en la Guía Alimentaria brasileña. No sustituye la orientación profesional.",
          "Inspiré du Guide alimentaire brésilien. Ne remplace pas un avis professionnel.",
        ])}
      </p>
    </Panel>
  );
}

// ───────────────────────────── Roleta de receitas ─────────────────────────────

type RouletteFilter = "todas" | "geladeira" | "rapidas" | "faceis";

/** Texto sem acento e em minúsculas, para comparar ingredientes. */
const plain = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/** Minutos do campo "tempo de preparo" ("30 min", "1h", "1 h 20 min"); null se não der. */
function prepMinutes(text: string | undefined): number | null {
  if (!text) return null;
  const t = plain(text);
  const h = /(\d+)\s*h/.exec(t);
  const m = /(\d+)\s*m/.exec(t);
  if (!h && !m) {
    const n = /(\d+)/.exec(t);
    return n ? Number(n[1]) : null;
  }
  return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
}

/** Receita da comunidade sorteada, com filtros: o que tem na Geladeira, rápidas (até 30 min) e
 *  fáceis. Não repete as últimas sorteadas. */
export function RecipeRouletteCard() {
  const tr = useTr();
  const { user } = useAuth();
  const feed = useFeed({ scope: "todos", type: "receita", limit: 60 });
  const fridge = useFridgeItems(user?.id);
  const [filter, setFilter] = useState<RouletteFilter>("todas");
  const [shownId, setShownId] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const recent = useRef<string[]>([]);
  const timer = useRef<number | null>(null);

  useEffect(() => () => void (timer.current && window.clearInterval(timer.current)), []);

  const all = useMemo(() => feed.data ?? [], [feed.data]);
  const fridgeTerms = useMemo(
    () => fridge.items.map(plain).filter((t) => t.length >= 3),
    [fridge.items],
  );
  const pool = useMemo(() => {
    if (filter === "todas") return all;
    return all.filter((r) => {
      if (filter === "rapidas") {
        const min = prepMinutes(r.recipeData?.prepTime);
        return min !== null && min <= 30;
      }
      if (filter === "faceis") return r.recipeData?.difficulty === "Fácil";
      const hay = plain([r.title ?? "", r.text, ...(r.recipeData?.ingredients ?? [])].join(" "));
      return fridgeTerms.some((t) => hay.includes(t));
    });
  }, [all, filter, fridgeTerms]);

  if (all.length === 0) return null;

  const spin = () => {
    if (spinning || pool.length === 0) return;
    setSpinning(true);
    // Sorteia entre as que não saíram por último (se sobrar alguma).
    const fresh = pool.filter((r) => !recent.current.includes(r.id));
    const choices = fresh.length ? fresh : pool;
    const final = choices[Math.floor(Math.random() * choices.length)];
    let ticks = 0;
    timer.current = window.setInterval(() => {
      ticks += 1;
      if (ticks >= 12) {
        if (timer.current) window.clearInterval(timer.current);
        setShownId(final.id);
        recent.current = [final.id, ...recent.current].slice(0, Math.min(5, pool.length - 1));
        setSpinning(false);
        playSound("success");
      } else {
        setShownId(pool[Math.floor(Math.random() * pool.length)].id);
        playSound("click");
      }
    }, 90);
  };

  const recipe = all.find((r) => r.id === shownId) ?? null;
  const filters: { id: RouletteFilter; label: Names }[] = [
    { id: "todas", label: ["Todas", "All", "Todas", "Toutes"] },
    {
      id: "geladeira",
      label: ["Com o que tenho", "With what I have", "Con lo que tengo", "Avec ce que j'ai"],
    },
    { id: "rapidas", label: ["Rápidas", "Quick", "Rápidas", "Rapides"] },
    { id: "faceis", label: ["Fáceis", "Easy", "Fáciles", "Faciles"] },
  ];
  const minutes = prepMinutes(recipe?.recipeData?.prepTime);

  return (
    <Panel
      title={tr([
        "Roleta de receitas",
        "Recipe roulette",
        "Ruleta de recetas",
        "Roulette de recettes",
      ])}
    >
      <div className="mb-3 flex flex-wrap gap-1.5" role="group">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => {
              setFilter(f.id);
              setShownId(null);
            }}
            className={`${iconBtn} ${filter === f.id ? "!bg-primary !text-primary-foreground" : ""}`}
          >
            {tr(f.label)}
          </button>
        ))}
      </div>
      <div className="grid min-h-[6rem] place-items-center overflow-hidden rounded-2xl bg-secondary/40 text-center">
        {recipe ? (
          <div className={`w-full ${spinning ? "opacity-60" : "nc-pop-in"}`}>
            {recipe.image && !spinning && (
              <img src={recipe.image} alt="" className="h-28 w-full object-cover" loading="lazy" />
            )}
            <div className="p-3">
              <p className="text-sm font-bold text-foreground">{recipe.title || "—"}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {recipe.authorName}
                {!spinning && minutes !== null && ` · ${minutes} min`}
                {!spinning && recipe.recipeData?.difficulty && ` · ${recipe.recipeData.difficulty}`}
              </p>
            </div>
          </div>
        ) : (
          <p className="p-3 text-xs text-muted-foreground">
            {pool.length === 0
              ? filter === "geladeira"
                ? tr([
                    "Nenhuma receita com o que está na sua Geladeira. Marque mais itens lá.",
                    "No recipes with what's in your Fridge. Add more items there.",
                    "Ninguna receta con lo que hay en tu Nevera. Marca más artículos allí.",
                    "Aucune recette avec ce qu'il y a dans votre Frigo. Ajoutez des éléments.",
                  ])
                : tr([
                    "Nenhuma receita com esse filtro ainda.",
                    "No recipes with this filter yet.",
                    "Aún no hay recetas con este filtro.",
                    "Pas encore de recettes avec ce filtre.",
                  ])
              : tr([
                  "Sem ideia do que cozinhar? Gire a roleta!",
                  "No idea what to cook? Spin the roulette!",
                  "¿Sin idea de qué cocinar? ¡Gira la ruleta!",
                  "Pas d'idée de quoi cuisiner ? Tournez la roulette !",
                ])}
          </p>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className={primaryBtn}
          onClick={spin}
          disabled={spinning || pool.length === 0}
        >
          <Dices className={`h-3.5 w-3.5 ${spinning ? "animate-spin" : ""}`} />
          {tr(["Girar", "Spin", "Girar", "Tourner"])}
          <span className="font-semibold opacity-80">({pool.length})</span>
        </button>
        {recipe && !spinning && (
          <Link
            to="/explorar"
            search={{ post: recipe.id }}
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            <ChefHat className="h-3.5 w-3.5" />
            {tr(["Ver receita", "See recipe", "Ver receta", "Voir la recette"])}
          </Link>
        )}
      </div>
    </Panel>
  );
}

// ───────────────────────────── Timer de cozinha ─────────────────────────────

const fmt = (s: number) =>
  s >= 3600
    ? `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
    : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;

/** Atalhos por alimento (tempos usuais de cozimento; variam com a panela e o fogo). */
const TIMER_PRESETS: { name: Names; min: number }[] = [
  { name: ["Ovo mole", "Soft egg", "Huevo tibio", "Œuf mollet"], min: 6 },
  { name: ["Ovo cozido", "Hard egg", "Huevo duro", "Œuf dur"], min: 10 },
  { name: ["Macarrão", "Pasta", "Pasta", "Pâtes"], min: 10 },
  { name: ["Arroz", "Rice", "Arroz", "Riz"], min: 18 },
  { name: ["Legumes no vapor", "Steamed veg", "Verduras al vapor", "Légumes vapeur"], min: 12 },
  {
    name: [
      "Feijão na pressão",
      "Beans (pressure)",
      "Frijoles (olla exprés)",
      "Haricots (autocuiseur)",
    ],
    min: 30,
  },
  { name: ["Bolo", "Cake", "Bizcocho", "Gâteau"], min: 40 },
];

interface KitchenTimer {
  id: string;
  label: string;
  total: number;
  /** Hora (ms) em que termina, se estiver correndo. */
  endsAt: number | null;
  /** Segundos restantes quando pausado. */
  left: number;
  done: boolean;
}

const TIMERS_KEY = "nc_kitchen_timers";
const MAX_TIMERS = 6;

function loadTimers(): KitchenTimer[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(TIMERS_KEY) ?? "[]");
    return Array.isArray(raw) ? (raw as KitchenTimer[]).slice(0, MAX_TIMERS) : [];
  } catch {
    return [];
  }
}

const leftOf = (t: KitchenTimer, now: number) =>
  t.endsAt ? Math.max(0, Math.round((t.endsAt - now) / 1000)) : t.left;

type WakeLockNav = Navigator & {
  wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
};

/** Vários timers ao mesmo tempo, com nome; continuam depois de recarregar a página. Ao terminar:
 *  som, vibração e aviso do navegador (se a pessoa já permitiu avisos). A tela fica acesa
 *  enquanto algum timer corre, quando o aparelho deixa. */
export function CookingTimerCard() {
  const tr = useTr();
  const [timers, setTimers] = useState<KitchenTimer[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [minutes, setMinutes] = useState("10");
  const [label, setLabel] = useState("");
  const [burst, fire] = useBurst();
  const loaded = useRef(false);

  useEffect(() => {
    setTimers(loadTimers());
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      window.localStorage.setItem(TIMERS_KEY, JSON.stringify(timers));
    } catch {
      // sem armazenamento: os timers valem só nesta aba
    }
  }, [timers]);

  const running = timers.some((t) => t.endsAt);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [running]);

  // Tela acesa enquanto algum timer corre.
  useEffect(() => {
    if (!running) return;
    let lock: { release: () => Promise<void> } | null = null;
    let cancelled = false;
    (navigator as WakeLockNav).wakeLock
      ?.request("screen")
      .then((l) => (cancelled ? void l.release() : (lock = l)))
      .catch(() => {});
    return () => {
      cancelled = true;
      void lock?.release().catch(() => {});
    };
  }, [running]);

  // Timers que acabaram de chegar a zero.
  useEffect(() => {
    const finished = timers.filter((t) => t.endsAt && t.endsAt <= now);
    if (finished.length === 0) return;
    setTimers((list) =>
      list.map((t) =>
        finished.some((f) => f.id === t.id) ? { ...t, endsAt: null, left: 0, done: true } : t,
      ),
    );
    fire();
    playSound("achievement");
    for (const t of finished) {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          new Notification(tr(["Tempo!", "Time's up!", "¡Tiempo!", "Temps écoulé !"]), {
            body: t.label,
            tag: "nc-timer-" + t.id,
          });
        } catch {
          // alguns navegadores só mostram avisos pelo service worker
        }
      }
    }
  }, [now, timers, fire, tr]);

  const add = (mins: number, name: string) => {
    if (!(mins > 0) || timers.length >= MAX_TIMERS) return;
    const total = Math.round(mins * 60);
    const t: KitchenTimer = {
      id: Math.random().toString(36).slice(2, 9),
      label: name.trim() || `${mins} min`,
      total,
      endsAt: Date.now() + total * 1000,
      left: total,
      done: false,
    };
    setNow(Date.now());
    setTimers((list) => [...list, t]);
    setLabel("");
    playSound("click");
  };
  const update = (id: string, f: (t: KitchenTimer) => KitchenTimer) =>
    setTimers((list) => list.map((t) => (t.id === id ? f(t) : t)));
  const toggle = (t: KitchenTimer) =>
    update(t.id, (x) =>
      x.endsAt
        ? { ...x, endsAt: null, left: leftOf(x, Date.now()) }
        : { ...x, endsAt: Date.now() + (x.done ? x.total : x.left) * 1000, done: false },
    );
  const plusMinute = (t: KitchenTimer) =>
    update(t.id, (x) =>
      x.endsAt
        ? { ...x, endsAt: x.endsAt + 60_000, total: x.total + 60 }
        : { ...x, left: (x.done ? 0 : x.left) + 60, total: x.total + 60, done: false },
    );
  const remove = (id: string) => setTimers((list) => list.filter((t) => t.id !== id));

  const radius = 44;
  const circ = 2 * Math.PI * radius;
  const field =
    "rounded-xl border border-input bg-background px-2.5 py-2 text-xs text-foreground outline-none focus:border-accent";

  return (
    <Panel
      title={tr([
        "Timer de cozinha",
        "Kitchen timer",
        "Temporizador de cocina",
        "Minuteur de cuisine",
      ])}
      className="relative"
    >
      <Burst id={burst} />
      {timers.length > 0 && (
        <ul className="mb-3 space-y-2">
          {timers.map((t) => {
            const left = leftOf(t, now);
            const progress = t.total > 0 ? left / t.total : 0;
            return (
              <li
                key={t.id}
                className={`flex items-center gap-3 rounded-2xl border px-3 py-2 ${
                  t.done
                    ? "nc-pop-in border-accent bg-accent/10"
                    : "border-border/70 bg-secondary/30"
                }`}
              >
                <svg viewBox="0 0 100 100" className="h-11 w-11 shrink-0 -rotate-90" aria-hidden>
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    strokeWidth="10"
                    className="stroke-secondary"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    strokeWidth="10"
                    strokeLinecap="round"
                    className="stroke-accent transition-[stroke-dashoffset] duration-300"
                    strokeDasharray={circ}
                    strokeDashoffset={circ * (1 - progress)}
                  />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">{t.label}</p>
                  <p
                    className={`text-lg font-black leading-tight tabular-nums ${t.done ? "text-accent" : "text-foreground"}`}
                  >
                    {t.done ? tr(["Tempo!", "Time's up!", "¡Tiempo!", "Terminé !"]) : fmt(left)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => plusMinute(t)}
                  className={iconBtn}
                  aria-label={tr([
                    "Mais 1 minuto",
                    "1 more minute",
                    "1 minuto más",
                    "1 minute de plus",
                  ])}
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => toggle(t)}
                  className="grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90"
                  aria-label={
                    t.endsAt
                      ? tr(["Pausar", "Pause", "Pausar", "Pause"])
                      : tr(["Continuar", "Resume", "Continuar", "Reprendre"])
                  }
                >
                  {t.endsAt ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : t.done ? (
                    <RotateCcw className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                  aria-label={tr(["Remover", "Remove", "Quitar", "Supprimer"])}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {timers.length < MAX_TIMERS ? (
        <>
          <div className="flex flex-wrap gap-1.5">
            {TIMER_PRESETS.map((p) => (
              <button
                key={p.min + p.name[0]}
                type="button"
                onClick={() => add(p.min, tr(p.name))}
                className={iconBtn}
              >
                {tr(p.name)} · {p.min} min
              </button>
            ))}
          </div>
          <form
            className="mt-3 grid grid-cols-[4.5rem_1fr_auto] gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              add(Number(minutes.replace(",", ".")), label);
            }}
          >
            <input
              type="number"
              min="0.5"
              max="600"
              step="0.5"
              inputMode="decimal"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className={field}
              aria-label={tr(["Minutos", "Minutes", "Minutos", "Minutes"])}
            />
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={40}
              placeholder={tr([
                "Nome (opcional)",
                "Name (optional)",
                "Nombre (opcional)",
                "Nom (facultatif)",
              ])}
              className={`${field} min-w-0`}
            />
            <button type="submit" className={primaryBtn}>
              <Plus className="h-3.5 w-3.5" />
              {tr(["Iniciar", "Start", "Iniciar", "Démarrer"])}
            </button>
          </form>
        </>
      ) : (
        <p className="text-center text-[11px] text-muted-foreground">
          {tr([
            "Até 6 timers ao mesmo tempo.",
            "Up to 6 timers at once.",
            "Hasta 6 temporizadores a la vez.",
            "Jusqu'à 6 minuteurs à la fois.",
          ])}
        </p>
      )}
      <p className={note}>
        {tr([
          "Os timers continuam se você recarregar a página. Tempos dos atalhos são aproximados.",
          "Timers keep going if you reload the page. Shortcut times are approximate.",
          "Los temporizadores siguen si recargas la página. Los tiempos de los atajos son aproximados.",
          "Les minuteurs continuent si vous rechargez la page. Les durées des raccourcis sont approximatives.",
        ])}
      </p>
    </Panel>
  );
}

// ───────────────────────────── Medidas da cozinha ─────────────────────────────

interface Ingredient {
  name: Names;
  /** Gramas de 1 xícara de chá (240 ml). `null` = líquido medido em ml. */
  gramsPerCup: number | null;
}

// Equivalências caseiras usuais (aproximadas; variam com a marca e o jeito de medir).
const INGREDIENTS: Ingredient[] = [
  { name: ["Água / leite", "Water / milk", "Agua / leche", "Eau / lait"], gramsPerCup: null },
  {
    name: ["Farinha de trigo", "Wheat flour", "Harina de trigo", "Farine de blé"],
    gramsPerCup: 120,
  },
  {
    name: ["Açúcar refinado", "Granulated sugar", "Azúcar refinada", "Sucre en poudre"],
    gramsPerCup: 180,
  },
  {
    name: ["Açúcar mascavo", "Brown sugar", "Azúcar mascabado", "Sucre complet"],
    gramsPerCup: 150,
  },
  { name: ["Arroz cru", "Raw rice", "Arroz crudo", "Riz cru"], gramsPerCup: 185 },
  { name: ["Feijão cru", "Dry beans", "Frijoles crudos", "Haricots secs"], gramsPerCup: 190 },
  {
    name: ["Aveia em flocos", "Rolled oats", "Avena en hojuelas", "Flocons d'avoine"],
    gramsPerCup: 90,
  },
  { name: ["Fubá", "Cornmeal", "Harina de maíz", "Semoule de maïs"], gramsPerCup: 120 },
  { name: ["Amido de milho", "Cornstarch", "Maicena", "Fécule de maïs"], gramsPerCup: 150 },
  { name: ["Polvilho", "Tapioca starch", "Almidón de yuca", "Fécule de manioc"], gramsPerCup: 150 },
  {
    name: ["Farinha de mandioca", "Cassava flour", "Harina de yuca", "Farine de manioc"],
    gramsPerCup: 150,
  },
  { name: ["Cacau em pó", "Cocoa powder", "Cacao en polvo", "Cacao en poudre"], gramsPerCup: 90 },
  { name: ["Leite em pó", "Powdered milk", "Leche en polvo", "Lait en poudre"], gramsPerCup: 120 },
  {
    name: ["Coco ralado", "Grated coconut", "Coco rallado", "Noix de coco râpée"],
    gramsPerCup: 80,
  },
  { name: ["Queijo ralado", "Grated cheese", "Queso rallado", "Fromage râpé"], gramsPerCup: 80 },
  { name: ["Manteiga", "Butter", "Mantequilla", "Beurre"], gramsPerCup: 200 },
  { name: ["Óleo / azeite", "Oil / olive oil", "Aceite", "Huile"], gramsPerCup: 220 },
  { name: ["Mel", "Honey", "Miel", "Miel"], gramsPerCup: 340 },
  { name: ["Sal", "Salt", "Sal", "Sel"], gramsPerCup: 290 },
];

// Fração de 1 xícara de chá (240 ml).
const UNITS: { name: Names; cup: number }[] = [
  { name: ["xícara", "cup", "taza", "tasse"], cup: 1 },
  {
    name: ["copo americano", "small glass (190 ml)", "vaso (190 ml)", "verre (190 ml)"],
    cup: 190 / 240,
  },
  { name: ["colher de sopa", "tablespoon", "cucharada", "cuillère à soupe"], cup: 15 / 240 },
  {
    name: ["colher de sobremesa", "dessert spoon", "cuchara de postre", "cuillère à dessert"],
    cup: 10 / 240,
  },
  { name: ["colher de chá", "teaspoon", "cucharadita", "cuillère à café"], cup: 5 / 240 },
  { name: ["ml", "ml", "ml", "ml"], cup: 1 / 240 },
];

const MULTIPLIERS = [0.5, 1, 2, 3];

/** Número curto: até 2 casas, sem zeros à direita, com vírgula no português/espanhol/francês. */
function shortNumber(n: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: n < 10 ? 2 : n < 100 ? 1 : 0,
  }).format(n);
}

export function UnitConverterCard() {
  const tr = useTr();
  const { locale } = useI18n();
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState(0);
  const [ing, setIng] = useState(1);
  const [toWeight, setToWeight] = useState(true);
  const [times, setTimes] = useState(1);

  const switchMode = (weightMode: boolean) => {
    if (weightMode === toWeight) return;
    setToWeight(weightMode);
    setAmount(weightMode ? "1" : "100");
  };

  const item = INGREDIENTS[ing];
  const liquid = item.gramsPerCup === null;
  const perCup = item.gramsPerCup ?? 240;
  const qty = Number(amount.replace(",", "."));
  const valid = Number.isFinite(qty) && qty > 0;
  const base = valid ? qty * times : 0;

  // Medida → gramas (ou ml).
  const weight = Math.round(base * UNITS[unit].cup * perCup);
  // Gramas (ou ml) → medidas caseiras mais úteis.
  const cups = base / perCup;
  const asMeasures = [
    { name: UNITS[0].name, v: cups },
    { name: UNITS[2].name, v: cups / UNITS[2].cup },
    { name: UNITS[4].name, v: cups / UNITS[4].cup },
  ];

  const field =
    "w-full rounded-xl border border-input bg-background px-2.5 py-2 text-xs text-foreground outline-none focus:border-accent";
  const seg = (on: boolean) =>
    `flex-1 cursor-pointer rounded-full px-2 py-1.5 text-[11px] font-bold transition ${
      on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
    }`;
  const massUnit = liquid ? "ml" : "g";

  return (
    <Panel
      title={tr([
        "Medidas da cozinha",
        "Kitchen measures",
        "Medidas de cocina",
        "Mesures de cuisine",
      ])}
    >
      <div className="mb-3 flex gap-1 rounded-full bg-secondary/60 p-1" role="group">
        <button
          type="button"
          className={seg(toWeight)}
          onClick={() => switchMode(true)}
          aria-pressed={toWeight}
        >
          {tr(["Medida → gramas", "Measure → grams", "Medida → gramos", "Mesure → grammes"])}
        </button>
        <button
          type="button"
          className={seg(!toWeight)}
          onClick={() => switchMode(false)}
          aria-pressed={!toWeight}
        >
          {tr(["Gramas → medida", "Grams → measure", "Gramos → medida", "Grammes → mesure"])}
        </button>
      </div>
      <div className="grid grid-cols-[4.5rem_1fr] gap-2">
        <input
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={field}
          aria-label={tr(["Quantidade", "Amount", "Cantidad", "Quantité"])}
        />
        {toWeight ? (
          <select value={unit} onChange={(e) => setUnit(Number(e.target.value))} className={field}>
            {UNITS.map((u, i) => (
              <option key={i} value={i}>
                {tr(u.name)}
              </option>
            ))}
          </select>
        ) : (
          <span className={`${field} flex items-center font-semibold`}>{massUnit}</span>
        )}
      </div>
      <select
        value={ing}
        onChange={(e) => setIng(Number(e.target.value))}
        className={`${field} mt-2`}
      >
        {INGREDIENTS.map((x, i) => (
          <option key={i} value={i}>
            {tr(x.name)}
          </option>
        ))}
      </select>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="text-[11px] font-semibold text-muted-foreground">
          {tr(["Receita", "Recipe", "Receta", "Recette"])}
        </span>
        {MULTIPLIERS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setTimes(m)}
            aria-pressed={times === m}
            className={`${iconBtn} ${times === m ? "!bg-accent !text-accent-foreground" : ""}`}
          >
            ×{m === 0.5 ? "½" : m}
          </button>
        ))}
      </div>
      {toWeight ? (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-accent-soft/60 py-3 text-foreground">
          <Scale className="h-4 w-4 text-accent" />
          <span className="text-lg font-black tabular-nums">≈ {valid ? weight : 0}</span>
          <span className="text-xs font-semibold">{massUnit}</span>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-border/60 rounded-2xl bg-accent-soft/60 px-3 text-foreground">
          {asMeasures.map((m, i) => (
            <li key={i} className="flex items-baseline justify-between py-2">
              <span className="text-xs font-semibold">{tr(m.name)}</span>
              <span className="text-base font-black tabular-nums">
                ≈ {valid ? shortNumber(m.v, locale) : 0}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className={note}>
        {tr([
          "Valores aproximados: xícara de chá de 240 ml, copo americano de 190 ml. Varia com a marca e com o jeito de medir.",
          "Approximate values: 240 ml cup, 190 ml glass. They vary with brand and how you measure.",
          "Valores aproximados: taza de 240 ml, vaso de 190 ml. Varían con la marca y la forma de medir.",
          "Valeurs approximatives : tasse de 240 ml, verre de 190 ml. Elles varient selon la marque et la mesure.",
        ])}
      </p>
    </Panel>
  );
}

// ───────────────────────────── Lista de compras ─────────────────────────────

/** Lista de compras na conta (vale em todos os aparelhos; a Geladeira manda os faltantes para cá). */
export function ShoppingListCard() {
  const tr = useTr();
  const { user } = useAuth();
  const list = useShoppingItems(user?.id);
  const addItems = useAddShoppingItems(user?.id);
  const update = useUpdateShoppingItem();
  const remove = useDeleteShoppingItems();
  const [draft, setDraft] = useState("");
  const items = list.data ?? [];

  // Itens da versão antiga (só neste aparelho) sobem para a conta uma vez.
  useEffect(() => {
    if (!user || !list.isSuccess) return;
    const key = `nc_fun_shopping_${user.id}`;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      window.localStorage.removeItem(key);
      const legacy = (JSON.parse(raw) as { text?: string; done?: boolean }[])
        .filter((i) => !i.done && typeof i.text === "string")
        .map((i) => i.text as string);
      if (legacy.length) addItems.mutate({ texts: legacy });
    } catch {
      /* sem armazenamento: nada a migrar */
    }
  }, [user, list.isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  // Vários itens de uma vez, separados por vírgula ou ponto e vírgula.
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const texts = draft
      .split(/[,;\n]/)
      .map((t) => t.trim().slice(0, 80))
      .filter(Boolean);
    if (!texts.length || !user) return;
    addItems.mutate({ texts });
    setDraft("");
    playSound("click");
  };
  const done = items.filter((i) => i.done);
  // Agrupado pela seção do mercado (a do Cardápio, ou adivinhada pelo nome do item).
  const groups = SECTIONS.map((sec) => ({
    sec,
    list: items.filter((it) => ((it.section as Section | null) ?? guessSection(it.text)) === sec),
  })).filter((g) => g.list.length > 0);

  return (
    <Panel
      title={tr(["Lista de compras", "Shopping list", "Lista de compras", "Liste de courses"])}
      action={
        done.length > 0 ? (
          <button
            type="button"
            className="cursor-pointer text-[11px] font-semibold text-primary hover:underline"
            onClick={() => remove.mutate(done.map((i) => i.id))}
          >
            {tr(["Limpar marcados", "Clear checked", "Quitar marcados", "Retirer cochés"])}
          </button>
        ) : undefined
      }
    >
      <form onSubmit={add} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={80}
          placeholder={tr([
            "Ex.: tomate, aveia, ovos",
            "E.g. tomato, oats, eggs",
            "Ej.: tomate, avena, huevos",
            "Ex. : tomate, avoine, œufs",
          ])}
          className="min-w-0 flex-1 rounded-xl border border-input bg-background px-2.5 py-2 text-xs outline-none focus:border-accent"
        />
        <button
          type="submit"
          className={primaryBtn}
          disabled={!user}
          aria-label={tr(["Adicionar", "Add", "Añadir", "Ajouter"])}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </form>
      {items.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <ShoppingBasket className="h-4 w-4" />
          {tr([
            "Anote o que falta para as suas receitas.",
            "Jot down what your recipes need.",
            "Anota lo que falta para tus recetas.",
            "Notez ce qu'il manque pour vos recettes.",
          ])}
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1">
              <Bar value={done.length} max={items.length} />
            </div>
            <span className="text-[11px] font-bold tabular-nums text-foreground">
              {done.length}/{items.length}
            </span>
          </div>
          <div className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
            {groups.map(({ sec, list: group }) => (
              <section key={sec}>
                <p className="mb-0.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {tr(SECTION_NAMES[sec])}
                  <span className="tabular-nums">{group.filter((i) => !i.done).length}</span>
                </p>
                <ul className="space-y-0.5">
                  {group.map((it) => (
                    <li
                      key={it.id}
                      className="group flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-secondary/60"
                    >
                      <button
                        type="button"
                        onClick={() => update.mutate({ id: it.id, done: !it.done })}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                        aria-pressed={it.done}
                      >
                        <CheckCircle2
                          className={`h-4 w-4 shrink-0 ${it.done ? "text-accent" : "text-muted-foreground/50"}`}
                        />
                        <span
                          className={`truncate text-xs ${it.done ? "text-muted-foreground line-through" : "text-foreground"}`}
                        >
                          {it.text}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => remove.mutate([it.id])}
                        className="cursor-pointer text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100 focus:opacity-100"
                        aria-label={tr(["Remover", "Remove", "Quitar", "Retirer"])}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
      <div className="mt-3 flex flex-col items-start gap-1">
        <Link to="/geladeira" className="text-[11px] font-semibold text-accent hover:underline">
          {tr([
            "O que dá para fazer com o que tenho? →",
            "What can I make with what I have? →",
            "¿Qué puedo hacer con lo que tengo? →",
            "Que faire avec ce que j'ai ? →",
          ])}
        </Link>
        <Link to="/cardapio" className="text-[11px] font-semibold text-accent hover:underline">
          {tr([
            "Cardápio da semana e lista por seção →",
            "Weekly menu and list by aisle →",
            "Menú semanal y lista por sección →",
            "Menu de la semaine et liste par rayon →",
          ])}
        </Link>
      </div>
    </Panel>
  );
}

// ───────────────────────────── Hábitos do dia ─────────────────────────────

/** Hábitos do dia na conta: a pessoa escolhe quais acompanhar; sequência de dias com 3 ou mais,
 *  barras dos últimos 7 dias e o mapa das últimas 5 semanas. */
export function HabitCheckinCard() {
  const tr = useTr();
  const { locale } = useI18n();
  const { user } = useAuth();
  const checkins = useCheckins(user?.id);
  const save = useSaveCheckin(user?.id);
  const { chosen, ids, save: saveChoice } = useHabitChoice();
  const [burst, fire] = useBurst();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [view, setView] = useState<"week" | "month">("week");
  const today = checkinDay();
  const map = useMemo(() => checkinsByDay(checkins.data), [checkins.data]);
  const marked = map.get(today)?.habits ?? [];
  const markedChosen = marked.filter((id) => ids.includes(id));
  const streak = streakOf(map, (c) => (c?.habits.length ?? 0) >= MIN_HABITS);
  const week = Array.from({ length: 7 }, (_, i) => map.get(daysAgo(6 - i))?.habits.length ?? 0);
  // 5 semanas de segunda a domingo, terminando na semana atual.
  const month = useMemo(() => {
    const monday = new Date(weekStartDay() + "T12:00:00");
    monday.setDate(monday.getDate() - 28);
    return Array.from({ length: 35 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const day = checkinDay(d);
      return { day, n: map.get(day)?.habits.length ?? 0, future: day > today };
    });
  }, [map, today]);

  const toggle = (id: string) => {
    if (!user) return;
    const has = marked.includes(id);
    const nextList = has ? marked.filter((x) => x !== id) : [...marked, id];
    save.mutate(
      { day: today, patch: { habits: nextList } },
      { onError: (err) => toast.error((err as Error).message) },
    );
    if (!has && ids.every((h) => nextList.includes(h))) {
      fire();
      playSound("achievement");
    } else {
      playSound(has ? "click" : "success");
    }
  };

  const openEditor = () => {
    setDraft(ids);
    setEditing(true);
  };
  const toggleDraft = (id: string) =>
    setDraft((d) =>
      d.includes(id) ? d.filter((x) => x !== id) : d.length < MAX_HABITS ? [...d, id] : d,
    );
  const saveDraft = () =>
    saveChoice.mutate(draft, {
      onSuccess: () => setEditing(false),
      onError: (err) => toast.error((err as Error).message),
    });

  const shade = (n: number) =>
    n >= MIN_HABITS ? "bg-accent" : n > 0 ? "bg-accent/40" : "bg-secondary";

  return (
    <Panel
      title={tr(["Hábitos de hoje", "Today's habits", "Hábitos de hoy", "Habitudes du jour"])}
      className="relative"
      action={
        <span className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 text-xs font-bold ${streak > 0 ? "text-accent" : "text-muted-foreground"}`}
          >
            <Flame className="h-3.5 w-3.5" />
            {streak}
          </span>
          {user && !editing && (
            <button
              type="button"
              onClick={openEditor}
              className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              aria-label={tr([
                "Escolher hábitos",
                "Choose habits",
                "Elegir hábitos",
                "Choisir les habitudes",
              ])}
              title={tr([
                "Escolher hábitos",
                "Choose habits",
                "Elegir hábitos",
                "Choisir les habitudes",
              ])}
            >
              <Settings2 className="h-4 w-4" />
            </button>
          )}
        </span>
      }
    >
      <Burst id={burst} />
      {editing ? (
        <div>
          <p className="mb-2 text-[11px] text-muted-foreground">
            {fillN(
              tr([
                "Escolha de {min} a {max} hábitos para acompanhar ({n} escolhidos).",
                "Pick {min} to {max} habits to track ({n} chosen).",
                "Elige de {min} a {max} hábitos para seguir ({n} elegidos).",
                "Choisissez de {min} à {max} habitudes à suivre ({n} choisies).",
              ]),
              { min: MIN_HABITS, max: MAX_HABITS, n: draft.length },
            )}
          </p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {HABIT_CATALOG.map((h) => {
              const on = draft.includes(h.id);
              const full = !on && draft.length >= MAX_HABITS;
              return (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => toggleDraft(h.id)}
                    aria-pressed={on}
                    disabled={full}
                    className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      on
                        ? "border-primary/50 bg-primary/10 text-foreground"
                        : "border-border/70 bg-secondary/40 text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <h.icon className={`h-4 w-4 shrink-0 ${on ? "text-primary" : ""}`} />
                    <span className="flex-1">{tr(h.name)}</span>
                    <CheckCircle2
                      className={`h-4 w-4 shrink-0 ${on ? "text-primary" : "text-muted-foreground/30"}`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary"
            >
              {tr(["Cancelar", "Cancel", "Cancelar", "Annuler"])}
            </button>
            <button
              type="button"
              onClick={saveDraft}
              disabled={draft.length < MIN_HABITS || saveChoice.isPending}
              className="cursor-pointer rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {tr(["Salvar", "Save", "Guardar", "Enregistrer"])}
            </button>
          </div>
        </div>
      ) : (
        <>
          <ul className="space-y-1.5">
            {chosen.map((h) => {
              const on = marked.includes(h.id);
              return (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => toggle(h.id)}
                    aria-pressed={on}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-left text-xs font-medium transition active:scale-[0.98] ${
                      on
                        ? "border-accent/40 bg-accent/10 text-foreground"
                        : "border-border/70 bg-secondary/40 text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <h.icon className="h-5 w-5 shrink-0 text-accent" />
                    <span className="flex-1">{tr(h.name)}</span>
                    <CheckCircle2
                      className={`h-4 w-4 shrink-0 ${on ? "text-accent" : "text-muted-foreground/40"}`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-3">
            <Bar value={markedChosen.length} max={chosen.length} />
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground">
              {view === "week"
                ? tr(["Últimos 7 dias", "Last 7 days", "Últimos 7 días", "7 derniers jours"])
                : tr([
                    "Últimas 5 semanas",
                    "Last 5 weeks",
                    "Últimas 5 semanas",
                    "5 dernières semaines",
                  ])}
            </span>
            <button
              type="button"
              onClick={() => setView(view === "week" ? "month" : "week")}
              className="cursor-pointer text-[11px] font-bold text-primary hover:underline"
            >
              {view === "week"
                ? tr(["Ver o mês", "See the month", "Ver el mes", "Voir le mois"])
                : tr(["Ver a semana", "See the week", "Ver la semana", "Voir la semaine"])}
            </button>
          </div>
          {view === "week" ? (
            <div className="mt-2 flex items-end gap-1">
              {week.map((n, i) => (
                <span
                  key={i}
                  title={String(n)}
                  className={`flex-1 rounded-sm ${shade(n)}`}
                  style={{ height: `${6 + Math.min(n, MAX_HABITS) * 3}px` }}
                />
              ))}
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-7 gap-1">
              {month.slice(0, 7).map((c) => (
                <span
                  key={"h" + c.day}
                  className="text-center text-[9px] font-bold uppercase text-muted-foreground"
                >
                  {new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(
                    new Date(c.day + "T12:00:00"),
                  )}
                </span>
              ))}
              {month.map((c) => (
                <span
                  key={c.day}
                  title={`${c.day.split("-").reverse().join("/")}: ${c.n}`}
                  className={`h-5 rounded-md sm:h-6 ${c.future ? "bg-transparent" : shade(c.n)} ${
                    c.day === today ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : ""
                  }`}
                />
              ))}
            </div>
          )}
          <p className={note}>
            {tr([
              "Marque 3 ou mais por dia para manter a sequência",
              "Check 3 or more a day to keep your streak",
              "Marca 3 o más al día para mantener la racha",
              "Cochez 3 ou plus par jour pour garder votre série",
            ])}
          </p>
        </>
      )}
    </Panel>
  );
}

// ───────────────────────────── Compromisso da semana ─────────────────────────────

/** Os 7 dias (AAAA-MM-DD) da semana que começa na segunda-feira `monday`. */
function weekDays(monday: string): string[] {
  const start = new Date(monday + "T12:00:00");
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return checkinDay(d);
  });
}

export function WeeklyPledgeCard() {
  const tr = useTr();
  const { locale } = useI18n();
  const { user } = useAuth();
  const theme = useActiveTheme();
  const checkins = useCheckins(user?.id);
  const save = useSaveCheckin(user?.id);
  const [burst, fire] = useBurst();
  const week = weekStartDay();
  const dates = useMemo(() => weekDays(week), [week]);
  const map = useMemo(() => checkinsByDay(checkins.data), [checkins.data]);
  const days = dates.flatMap((d, i) => (map.get(d)?.pledge ? [i] : []));
  const todayIndex = (new Date().getDay() + 6) % 7;
  const labels = useMemo(
    () =>
      dates.map((d) =>
        new Intl.DateTimeFormat(locale, { weekday: "short" })
          .format(new Date(d + "T12:00:00"))
          .replace(".", ""),
      ),
    [dates, locale],
  );

  const title = theme.data ? themeText(theme.data, locale).title : null;
  // Semanas anteriores (as 4 antes desta): quantos dias com o compromisso em cada uma.
  const past = useMemo(
    () =>
      [4, 3, 2, 1].map((back) => {
        const d = new Date(week + "T12:00:00");
        d.setDate(d.getDate() - back * 7);
        const mon = checkinDay(d);
        return {
          mon,
          n: weekDays(mon).filter((day) => map.get(day)?.pledge).length,
        };
      }),
    [week, map],
  );
  const best = Math.max(days.length, ...past.map((p) => p.n));

  const toggle = (i: number) => {
    if (i > todayIndex || !user) return;
    const has = days.includes(i);
    const next = has ? days.filter((x) => x !== i) : [...days, i];
    save.mutate({ day: dates[i], patch: { pledge: !has } });
    if (!has && next.length === 7) {
      fire();
      playSound("achievement");
    } else {
      playSound(has ? "click" : "success");
    }
  };

  return (
    <Panel
      title={tr([
        "Compromisso da semana",
        "Weekly pledge",
        "Compromiso de la semana",
        "Engagement de la semaine",
      ])}
      className="relative"
    >
      <Burst id={burst} />
      {title && <p className="mb-3 text-sm font-semibold leading-snug text-foreground">{title}</p>}
      <p className="mb-2 text-[11px] text-muted-foreground">
        {tr([
          "Toque nos dias em que você praticou:",
          "Tap the days you practiced:",
          "Toca los días que practicaste:",
          "Touchez les jours où vous avez pratiqué :",
        ])}
      </p>
      <div className="grid grid-cols-7 gap-1.5">
        {labels.map((label, i) => {
          const on = days.includes(i);
          const future = i > todayIndex;
          return (
            <button
              key={i}
              type="button"
              disabled={future}
              onClick={() => toggle(i)}
              aria-pressed={on}
              className={`grid h-12 cursor-pointer place-items-center rounded-xl border text-[10px] font-bold uppercase transition active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 ${
                on
                  ? "border-accent bg-accent text-accent-foreground"
                  : i === todayIndex
                    ? "border-accent/50 bg-accent/10 text-foreground"
                    : "border-border/70 bg-secondary/40 text-muted-foreground hover:bg-secondary"
              }`}
            >
              <span>{on ? "✓" : label.slice(0, 3)}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1">
          <Bar value={days.length} max={7} />
        </div>
        <span className="text-xs font-bold text-foreground">{days.length}/7</span>
      </div>
      {past.some((p) => p.n > 0) && (
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
            {tr([
              "Semanas anteriores",
              "Previous weeks",
              "Semanas anteriores",
              "Semaines précédentes",
            ])}
            {best > 0 && ` · ${tr(["melhor", "best", "mejor", "meilleure"])}: ${best}/7`}
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {past.map((p) => (
              <div key={p.mon} className="text-center">
                <div className="flex h-8 items-end overflow-hidden rounded-md bg-secondary/60">
                  <div
                    className="w-full rounded-md bg-accent/70"
                    style={{ height: `${(p.n / 7) * 100}%` }}
                  />
                </div>
                <span className="text-[9px] tabular-nums text-muted-foreground">
                  {p.mon.slice(8, 10)}/{p.mon.slice(5, 7)} · {p.n}/7
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <Link
        to="/tema-da-semana"
        className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
      >
        <Target className="h-3 w-3" />
        {tr(["Ver o tema", "See the theme", "Ver el tema", "Voir le thème"])}
      </Link>
    </Panel>
  );
}

// ───────────────────────────── Comunidades ─────────────────────────────

export function CommunityRouletteCard() {
  const tr = useTr();
  const { user } = useAuth();
  const communitiesQuery = useCommunities(false, !!user);
  const pool = useMemo(() => {
    const communities = (communitiesQuery.data ?? []).filter((c) => c.status !== "pendente");
    const notMine = communities.filter((c) => !c.isMember);
    return notMine.length > 0 ? notMine : communities;
  }, [communitiesQuery.data]);
  const [shown, setShown] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => void (timer.current && window.clearInterval(timer.current)), []);

  if (pool.length === 0) return null;

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    let ticks = 0;
    timer.current = window.setInterval(() => {
      ticks += 1;
      setShown(Math.floor(Math.random() * pool.length));
      playSound("click");
      if (ticks >= 10) {
        if (timer.current) window.clearInterval(timer.current);
        setSpinning(false);
        playSound("success");
      }
    }, 100);
  };

  const c = shown !== null ? pool[shown] : null;
  return (
    <Panel
      title={tr([
        "Sorteie uma comunidade",
        "Pick a community",
        "Sortea una comunidad",
        "Tirez une communauté",
      ])}
    >
      <div className="grid min-h-[5rem] place-items-center rounded-2xl bg-secondary/40 p-3 text-center">
        {c ? (
          <div className={spinning ? "opacity-60" : "nc-pop-in"}>
            <p className="text-sm font-bold text-foreground">{c.name}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {td(c.category)} · {c.memberCount} {tr(["membros", "members", "miembros", "membres"])}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {tr([
              "Quer conhecer gente nova? Sorteie uma comunidade!",
              "Want to meet new people? Pick a community!",
              "¿Quieres conocer gente nueva? ¡Sortea una comunidad!",
              "Envie de rencontrer du monde ? Tirez une communauté !",
            ])}
          </p>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button type="button" className={primaryBtn} onClick={spin} disabled={spinning}>
          <Dices className={`h-3.5 w-3.5 ${spinning ? "animate-spin" : ""}`} />
          {tr(["Sortear", "Pick", "Sortear", "Tirer"])}
        </button>
        {c && !spinning && (
          <Link
            to="/comunidades/$slug"
            params={{ slug: c.slug }}
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {tr(["Conhecer", "Visit", "Conocer", "Découvrir"])}
          </Link>
        )}
      </div>
    </Panel>
  );
}

const STARTERS: Names[] = [
  [
    "Qual receita da sua infância você nunca esqueceu?",
    "Which childhood recipe do you never forget?",
    "¿Qué receta de tu infancia nunca olvidas?",
    "Quelle recette de votre enfance n'oubliez-vous jamais ?",
  ],
  [
    "Qual hábito simples mais melhorou a sua rotina alimentar?",
    "Which simple habit improved your eating routine the most?",
    "¿Qué hábito sencillo mejoró más tu rutina alimentaria?",
    "Quelle habitude simple a le plus amélioré votre alimentation ?",
  ],
  [
    "Qual é o seu lanche saudável favorito para levar na bolsa?",
    "What's your favorite healthy snack to carry around?",
    "¿Cuál es tu merienda saludable favorita para llevar?",
    "Quel est votre en-cas sain préféré à emporter ?",
  ],
  [
    "Qual ingrediente você descobriu há pouco tempo e amou?",
    "Which ingredient did you recently discover and love?",
    "¿Qué ingrediente descubriste hace poco y amaste?",
    "Quel ingrédient avez-vous découvert récemment et adoré ?",
  ],
  [
    "Como você organiza as compras da semana?",
    "How do you organize your weekly shopping?",
    "¿Cómo organizas las compras de la semana?",
    "Comment organisez-vous vos courses de la semaine ?",
  ],
  [
    "Que prato típico da sua região todo mundo deveria provar?",
    "Which dish from your region should everyone try?",
    "¿Qué plato típico de tu región todos deberían probar?",
    "Quel plat de votre région tout le monde devrait-il goûter ?",
  ],
];

export function IcebreakerCard() {
  const tr = useTr();
  const [i, setI] = useState(() => dayNumber() % STARTERS.length);
  const [copied, setCopied] = useState(false);
  const text = tr(STARTERS[i % STARTERS.length]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* sem permissão para copiar */
    }
  };

  return (
    <Panel
      title={tr(["Puxe assunto", "Start a chat", "Inicia una charla", "Lancez la conversation"])}
    >
      <p
        key={i}
        className="nc-pop-in rounded-2xl bg-secondary/40 p-3 text-sm font-medium leading-relaxed text-foreground"
      >
        “{text}”
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={iconBtn} onClick={() => setI((n) => n + 1)}>
          <Shuffle className="h-3 w-3" />
          {tr(["Outra", "Another", "Otra", "Autre"])}
        </button>
        <button type="button" className={iconBtn} onClick={copy}>
          <Copy className="h-3 w-3" />
          {copied
            ? tr(["Copiado!", "Copied!", "¡Copiado!", "Copié !"])
            : tr(["Copiar", "Copy", "Copiar", "Copier"])}
        </button>
        {/* Publica a pergunta na rede (abre o Publicar já preenchido). */}
        <ShareModal
          initialPost={{ type: "pergunta", text }}
          triggerButton={
            <button type="button" className={primaryBtn}>
              <Send className="h-3 w-3" />
              {tr(["Perguntar", "Ask", "Preguntar", "Demander"])}
            </button>
          }
        />
      </div>
    </Panel>
  );
}

// ───────────────────────────── Explorar e profissionais ─────────────────────────────

/** Atalhos de busca: preenchem o campo da página Explorar. */
export function ExploreTopicsCard() {
  const tr = useTr();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <Panel
      title={tr([
        "Temas para explorar",
        "Topics to explore",
        "Temas para explorar",
        "Thèmes à explorer",
      ])}
    >
      <div className="flex flex-wrap gap-1.5">
        {TOPICS.map((topic, i) => (
          <button
            key={i}
            type="button"
            className={iconBtn}
            onClick={() => {
              // Na própria Explorar o card só preenche a busca; fora dela, leva até lá.
              if (pathname.startsWith("/explorar"))
                window.dispatchEvent(new CustomEvent("explore:query", { detail: tr(topic) }));
              else void navigate({ to: "/explorar", search: { q: tr(topic) } });
              playSound("click");
            }}
          >
            <Search className="h-3 w-3" />
            {tr(topic)}
          </button>
        ))}
      </div>
    </Panel>
  );
}

// Cada necessidade leva à profissão que cuida dela (as chaves vêm de professionKey).
const PRO_GOALS: { label: Names; profession: ProfessionKey; icon: typeof Utensils }[] = [
  {
    label: ["Alimentação e dieta", "Food and diet", "Alimentación y dieta", "Alimentation"],
    profession: "nutricao",
    icon: Utensils,
  },
  {
    label: [
      "Saúde, sintomas e exames",
      "Health, symptoms and tests",
      "Salud, síntomas y exámenes",
      "Santé, symptômes et examens",
    ],
    profession: "medicina",
    icon: Stethoscope,
  },
  {
    label: [
      "Emoções e relação com a comida",
      "Emotions and food",
      "Emociones y relación con la comida",
      "Émotions et rapport à la nourriture",
    ],
    profession: "psicologia",
    icon: Brain,
  },
  {
    label: [
      "Treino e condicionamento",
      "Training and fitness",
      "Entrenamiento y condición física",
      "Entraînement et forme",
    ],
    profession: "educacao_fisica",
    icon: Dumbbell,
  },
  {
    label: [
      "Dor, postura e reabilitação",
      "Pain, posture and rehab",
      "Dolor, postura y rehabilitación",
      "Douleur, posture et rééducation",
    ],
    profession: "fisioterapia",
    icon: Activity,
  },
  {
    label: [
      "Cuidados, curativos e pressão",
      "Care, dressings and blood pressure",
      "Cuidados, curaciones y presión",
      "Soins, pansements et tension",
    ],
    profession: "enfermagem",
    icon: HeartPulse,
  },
];

/** Escolha um objetivo e a lista de profissionais filtra sozinha. */
export function ProMatchCard() {
  const tr = useTr();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onDirectory = pathname.startsWith("/profissionais");
  const [goal, setGoal] = useState<number | null>(null);
  return (
    <Panel
      title={tr([
        "Qual profissional combina com você?",
        "Which professional fits you?",
        "¿Qué profesional te conviene?",
        "Quel professionnel vous convient ?",
      ])}
    >
      <div className="space-y-1.5">
        {PRO_GOALS.map((g, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={goal === i}
            onClick={() => {
              playSound("click");
              // Fora da lista de profissionais, leva até ela já filtrada.
              if (!onDirectory) {
                void navigate({ to: "/profissionais", search: { profissao: g.profession } });
                return;
              }
              setGoal(i);
              window.dispatchEvent(new CustomEvent("pros:profession", { detail: g.profession }));
            }}
            className={`flex w-full cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-medium transition active:scale-[0.98] ${
              goal === i
                ? "border-accent/50 bg-accent/10 text-foreground"
                : "border-border/70 bg-secondary/40 text-muted-foreground hover:bg-secondary"
            }`}
          >
            <g.icon className="h-3.5 w-3.5 shrink-0" />
            {tr(g.label)}
          </button>
        ))}
      </div>
      {goal !== null && (
        <button
          type="button"
          className="mt-2 cursor-pointer text-[11px] font-semibold text-primary hover:underline"
          onClick={() => {
            setGoal(null);
            window.dispatchEvent(new CustomEvent("pros:profession", { detail: "" }));
          }}
        >
          {tr(["Limpar filtro", "Clear filter", "Quitar filtro", "Effacer le filtre"])}
        </button>
      )}
    </Panel>
  );
}

// ───────────────────────────── Bem-estar ─────────────────────────────

const MOODS: { emoji: string; label: Names; reply: Names }[] = [
  {
    emoji: "😄",
    label: ["Ótima", "Great", "Genial", "Super"],
    reply: [
      "Que bom! Anote o que fez bem hoje para repetir depois.",
      "Wonderful! Note what felt good today to repeat it.",
      "¡Qué bien! Anota lo que te hizo bien hoy para repetirlo.",
      "Super ! Notez ce qui vous a fait du bien pour le refaire.",
    ],
  },
  {
    emoji: "🙂",
    label: ["Boa", "Good", "Buena", "Bien"],
    reply: [
      "Ótimo ritmo. Um copo de água e uma pausa para comer com calma ajudam a manter.",
      "Nice pace. A glass of water and a calm meal help keep it going.",
      "Buen ritmo. Un vaso de agua y una comida tranquila ayudan a mantenerlo.",
      "Beau rythme. Un verre d'eau et un repas au calme aident à le garder.",
    ],
  },
  {
    emoji: "😐",
    label: ["Normal", "Okay", "Normal", "Moyenne"],
    reply: [
      "Dias assim acontecem. Escolha uma coisa pequena e gentil para o seu prato hoje.",
      "Days like this happen. Pick one small, kind thing for your plate today.",
      "Estos días pasan. Elige algo pequeño y amable para tu plato hoy.",
      "Ça arrive. Choisissez une petite chose bienveillante pour votre assiette.",
    ],
  },
  {
    emoji: "😔",
    label: ["Pesada", "Heavy", "Pesada", "Difficile"],
    reply: [
      "Sinto muito. Se a comida estiver pesando, conversar com um(a) profissional pode ajudar.",
      "I'm sorry. If food is weighing on you, talking to a professional can help.",
      "Lo siento. Si la comida te pesa, hablar con un(a) profesional puede ayudar.",
      "Désolé. Si la nourriture vous pèse, parler à un(e) professionnel(le) peut aider.",
    ],
  },
];

/** Padrões simples dos últimos dias (sem IA): dia da semana mais difícil e hábitos nos dias bons
 *  e nos difíceis. Só aparecem com registros suficientes. */
function moodInsights(
  rows: { day: string; mood: number | null; habits: string[] }[],
  locale: string,
  tr: (n: Names) => string,
): string[] {
  const withMood = rows.filter((r) => r.mood !== null) as {
    day: string;
    mood: number;
    habits: string[];
  }[];
  if (withMood.length < 7) return [];
  const out: string[] = [];
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const overall = avg(withMood.map((r) => r.mood));
  // Dia da semana com média bem mais pesada que a geral (ao menos 2 registros).
  const byDow = new Map<number, number[]>();
  for (const r of withMood) {
    const dow = new Date(r.day + "T12:00:00").getDay();
    byDow.set(dow, [...(byDow.get(dow) ?? []), r.mood]);
  }
  let worst: { dow: number; m: number } | null = null;
  for (const [dow, ms] of byDow)
    if (
      ms.length >= 2 &&
      avg(ms) >= 2 &&
      avg(ms) - overall >= 0.75 &&
      (!worst || avg(ms) > worst.m)
    )
      worst = { dow, m: avg(ms) };
  if (worst) {
    const ref = new Date(2026, 0, 4 + worst.dow); // 4/1/2026 foi domingo
    const name = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(ref);
    out.push(
      tr([
        `Os dias de ${name} têm sido mais pesados. Vale planejar algo gostoso e simples para esse dia.`,
        `${name[0].toUpperCase() + name.slice(1)}s have felt heavier. It may help to plan something tasty and simple for that day.`,
        `Los días de ${name} han sido más pesados. Puede ayudar planear algo rico y sencillo para ese día.`,
        `Le ${name} a été plus difficile. Prévoir quelque chose de bon et simple ce jour-là peut aider.`,
      ]),
    );
  }
  // Hábitos marcados nos dias bons (ótima/boa) e nos difíceis (normal/pesada).
  const good = withMood.filter((r) => r.mood <= 1).map((r) => r.habits.length);
  const hard = withMood.filter((r) => r.mood >= 2).map((r) => r.habits.length);
  if (good.length >= 2 && hard.length >= 2) {
    const g = avg(good);
    const h = avg(hard);
    if (g - h >= 1) {
      const f = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 1 });
      out.push(
        tr([
          `Nos dias bons você marcou em média ${f(g)} hábitos; nos difíceis, ${f(h)}. Cuidar do básico parece ajudar.`,
          `On good days you checked ${f(g)} habits on average; on hard days, ${f(h)}. The basics seem to help.`,
          `En los días buenos marcaste en promedio ${f(g)} hábitos; en los difíciles, ${f(h)}. Cuidar lo básico parece ayudar.`,
          `Les bons jours, vous avez coché ${f(g)} habitudes en moyenne ; les jours difficiles, ${f(h)}. Les bases semblent aider.`,
        ]),
      );
    }
  }
  return out;
}

export function MoodCard() {
  const tr = useTr();
  const { locale } = useI18n();
  const { user } = useAuth();
  const checkins = useCheckins(user?.id);
  const save = useSaveCheckin(user?.id);
  const [view, setView] = useState<"week" | "month">("week");
  const today = checkinDay();
  const map = useMemo(() => checkinsByDay(checkins.data), [checkins.data]);
  const picked = map.get(today)?.mood ?? null;
  const lastWeek = Array.from({ length: 7 }, (_, i) => {
    const day = daysAgo(6 - i);
    return { day, mood: map.get(day)?.mood ?? null };
  });
  // 5 semanas de segunda a domingo, terminando na semana atual.
  const month = useMemo(() => {
    const monday = new Date(weekStartDay() + "T12:00:00");
    monday.setDate(monday.getDate() - 28);
    return Array.from({ length: 35 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const day = checkinDay(d);
      return { day, mood: map.get(day)?.mood ?? null, future: day > today };
    });
  }, [map, today]);
  const counts = [0, 1, 2, 3].map((m) => month.filter((c) => c.mood === m).length);
  const logged = counts.reduce((a, b) => a + b, 0);
  const insights = useMemo(
    () =>
      moodInsights(
        (checkins.data ?? []).map((c) => ({ day: c.day, mood: c.mood, habits: c.habits })),
        locale,
        tr,
      ),
    [checkins.data, locale, tr],
  );
  const dayLabel = (day: string) =>
    new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(new Date(day + "T12:00:00"));

  return (
    <Panel
      title={tr([
        "Como está a sua relação com a comida hoje?",
        "How is your relationship with food today?",
        "¿Cómo está tu relación con la comida hoy?",
        "Comment va votre rapport à la nourriture aujourd'hui ?",
      ])}
    >
      <div className="grid grid-cols-4 gap-1.5">
        {MOODS.map((m, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={picked === i}
            onClick={() => {
              if (!user) return;
              save.mutate({ day: today, patch: { mood: i } });
              playSound("click");
            }}
            className={`grid cursor-pointer place-items-center gap-0.5 rounded-xl border py-2 transition active:scale-90 ${
              picked === i
                ? "border-accent bg-accent/10"
                : "border-border/70 bg-secondary/40 hover:bg-secondary"
            }`}
          >
            <span style={{ color: MOOD_COLORS[i] }}>
              <EmojiIcon emoji={m.emoji} className="h-7 w-7" />
            </span>
            <span className="text-[10px] font-semibold text-muted-foreground">{tr(m.label)}</span>
          </button>
        ))}
      </div>
      {picked !== null && (
        <div
          key={picked}
          className="nc-pop-in mt-3 rounded-xl bg-accent-soft/60 p-3 text-xs leading-relaxed text-foreground"
        >
          {tr(MOODS[picked].reply)}
          {picked === 3 && (
            <Link
              to="/profissionais"
              className="mt-2 block text-[11px] font-bold text-primary hover:underline"
            >
              {tr([
                "Encontrar um(a) profissional →",
                "Find a professional →",
                "Encontrar un(a) profesional →",
                "Trouver un(e) professionnel(le) →",
              ])}
            </Link>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-muted-foreground">
          {view === "week"
            ? tr(["Últimos 7 dias", "Last 7 days", "Últimos 7 días", "7 derniers jours"])
            : tr([
                "Últimas 5 semanas",
                "Last 5 weeks",
                "Últimas 5 semanas",
                "5 dernières semaines",
              ])}
        </span>
        <button
          type="button"
          onClick={() => setView(view === "week" ? "month" : "week")}
          className="cursor-pointer text-[11px] font-bold text-primary hover:underline"
        >
          {view === "week"
            ? tr(["Ver o mês", "See the month", "Ver el mes", "Voir le mois"])
            : tr(["Ver a semana", "See the week", "Ver la semana", "Voir la semaine"])}
        </button>
      </div>
      {view === "week" ? (
        <div className="mt-2 grid grid-cols-7 gap-1">
          {lastWeek.map(({ day, mood }) => (
            <div key={day} className="grid place-items-center gap-0.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: mood === null ? "var(--color-secondary)" : MOOD_COLORS[mood] }}
                title={mood === null ? "—" : tr(MOODS[mood].label)}
              />
              <span className="text-[9px] uppercase text-muted-foreground">{dayLabel(day)}</span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {month.slice(0, 7).map((c) => (
              <span
                key={"h" + c.day}
                className="text-center text-[9px] font-bold uppercase text-muted-foreground"
              >
                {dayLabel(c.day)}
              </span>
            ))}
            {month.map((c) => (
              <span
                key={c.day}
                title={`${c.day.split("-").reverse().join("/")}: ${c.mood === null ? "—" : tr(MOODS[c.mood].label)}`}
                className={`h-5 rounded-md sm:h-6 ${c.day === today ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : ""}`}
                style={{
                  background: c.future
                    ? "transparent"
                    : c.mood === null
                      ? "var(--color-secondary)"
                      : MOOD_COLORS[c.mood],
                }}
              />
            ))}
          </div>
          {logged > 0 && (
            <>
              <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-secondary">
                {counts.map((n, i) =>
                  n ? (
                    <span
                      key={i}
                      style={{ width: `${(n / logged) * 100}%`, background: MOOD_COLORS[i] }}
                    />
                  ) : null,
                )}
              </div>
              <dl className="mt-1.5 grid grid-cols-4 gap-1 text-center text-[10px]">
                {MOODS.map((m, i) => (
                  <div key={i}>
                    <dt className="font-semibold" style={{ color: MOOD_COLORS[i] }}>
                      {tr(m.label)}
                    </dt>
                    <dd className="tabular-nums text-muted-foreground">{counts[i]}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </>
      )}
      {insights.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {insights.map((t) => (
            <li
              key={t}
              className="flex gap-2 rounded-xl bg-secondary/50 px-3 py-2 text-left text-[11px] leading-snug text-foreground"
            >
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              {t}
            </li>
          ))}
        </ul>
      )}
      <p className={note}>
        {tr([
          "Registro só seu, salvo na sua conta. Nenhum profissional vê.",
          "A private log saved to your account. No professional sees it.",
          "Registro solo tuyo, guardado en tu cuenta. Ningún profesional lo ve.",
          "Un journal privé, enregistré dans votre compte. Aucun professionnel ne le voit.",
        ])}
      </p>
    </Panel>
  );
}

const MEAL_TIPS: Names[] = [
  [
    "Mastigue devagar e sinta os sabores.",
    "Chew slowly and taste the flavors.",
    "Mastica despacio y siente los sabores.",
    "Mâchez lentement et savourez.",
  ],
  [
    "Pouse os talheres entre uma garfada e outra.",
    "Put your cutlery down between bites.",
    "Apoya los cubiertos entre bocado y bocado.",
    "Posez vos couverts entre deux bouchées.",
  ],
  [
    "Respire fundo e observe a cor e o cheiro do prato.",
    "Breathe deeply and notice the color and smell of your plate.",
    "Respira hondo y observa el color y el olor del plato.",
    "Respirez profondément et observez la couleur et l'odeur de l'assiette.",
  ],
  [
    "Perceba a saciedade: você ainda sente fome?",
    "Notice fullness: are you still hungry?",
    "Percibe la saciedad: ¿todavía tienes hambre?",
    "Écoutez votre satiété : avez-vous encore faim ?",
  ],
];

const MEAL_KEY = "nc_mindful_meal";
const BREATH_SECONDS = 60;
/** Ciclo de respiração: 4 s inspirando, 6 s soltando o ar. */
const INHALE = 4;
const CYCLE = 10;
const HUNGER_WORDS: Names[] = [
  ["Sem fome", "Not hungry", "Sin hambre", "Pas faim"],
  ["Pouca", "A little", "Poca", "Un peu"],
  ["Média", "Some", "Media", "Moyenne"],
  ["Bastante", "Quite", "Bastante", "Beaucoup"],
  ["Muita", "Very", "Mucha", "Très"],
];
const FULL_WORDS: Names[] = [
  ["Ainda com fome", "Still hungry", "Aún con hambre", "Encore faim"],
  ["Quase", "Almost", "Casi", "Presque"],
  ["Satisfeito(a)", "Satisfied", "Satisfecho(a)", "Rassasié(e)"],
  ["Cheio(a)", "Full", "Lleno(a)", "Plein(e)"],
  ["Cheio(a) demais", "Too full", "Demasiado lleno(a)", "Trop plein(e)"],
];

type MealPhase = "idle" | "breath" | "meal" | "done";
interface MealState {
  phase: MealPhase;
  /** Hora (ms) de início da fase atual, se correndo. */
  startedAt: number | null;
  /** Segundos já passados quando pausado. */
  elapsed: number;
  hunger: number | null;
  full: number | null;
}
const IDLE: MealState = { phase: "idle", startedAt: null, elapsed: 0, hunger: null, full: null };

/** Refeição com calma: 1 minuto de respiração guiada, um relógio de 20 minutos com dicas, e a
 *  fome antes e a saciedade depois. Continua se a página recarregar; a tela fica acesa. */
export function MindfulMealCard() {
  const tr = useTr();
  const { user } = useAuth();
  const checkins = useCheckins(user?.id);
  const save = useSaveCheckin(user?.id);
  const [st, setSt] = useState<MealState>(IDLE);
  const [now, setNow] = useState(() => Date.now());
  const [burst, fire] = useBurst();
  const loaded = useRef(false);
  const GOAL = 20 * 60;
  const map = useMemo(() => checkinsByDay(checkins.data), [checkins.data]);
  const weekFrom = weekStartDay();
  const thisWeek = (checkins.data ?? [])
    .filter((c) => c.day >= weekFrom)
    .reduce((sum, c) => sum + c.mindful_meals, 0);
  // Conta a refeição concluída no dia (lido na hora, não no começo do relógio).
  const countMeal = useRef(() => {});
  countMeal.current = () => {
    if (!user) return;
    const today = checkinDay();
    const done = map.get(today)?.mindful_meals ?? 0;
    save.mutate({ day: today, patch: { mindful_meals: Math.min(10, done + 1) } });
  };

  useEffect(() => {
    try {
      const raw = JSON.parse(window.localStorage.getItem(MEAL_KEY) ?? "null");
      if (raw && typeof raw === "object" && raw.phase) setSt({ ...IDLE, ...raw });
    } catch {
      // sem armazenamento
    }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      window.localStorage.setItem(MEAL_KEY, JSON.stringify(st));
    } catch {
      // sem armazenamento
    }
  }, [st]);

  const running = st.startedAt !== null && (st.phase === "breath" || st.phase === "meal");
  const secs = running ? st.elapsed + Math.floor((now - (st.startedAt ?? now)) / 1000) : st.elapsed;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [running]);

  // Tela acesa enquanto o relógio corre.
  useEffect(() => {
    if (!running) return;
    let lock: { release: () => Promise<void> } | null = null;
    let cancelled = false;
    (navigator as WakeLockNav).wakeLock
      ?.request("screen")
      .then((l) => (cancelled ? void l.release() : (lock = l)))
      .catch(() => {});
    return () => {
      cancelled = true;
      void lock?.release().catch(() => {});
    };
  }, [running]);

  // Fim da respiração: começa a refeição. Fim da refeição: conta o dia.
  useEffect(() => {
    if (st.phase === "breath" && running && secs >= BREATH_SECONDS) {
      setSt((x) => ({ ...x, phase: "meal", startedAt: Date.now(), elapsed: 0 }));
      playSound("success");
    } else if (st.phase === "meal" && running && secs >= GOAL) {
      setSt((x) => ({ ...x, phase: "done", startedAt: null, elapsed: GOAL }));
      fire();
      playSound("achievement");
      countMeal.current();
    }
  }, [secs, st.phase, running, GOAL, fire]);

  const start = (withBreath: boolean) => {
    setNow(Date.now());
    setSt((x) => ({
      ...x,
      phase: withBreath ? "breath" : "meal",
      startedAt: Date.now(),
      elapsed: 0,
      full: null,
    }));
    playSound("click");
  };
  const togglePause = () =>
    setSt((x) =>
      x.startedAt !== null
        ? { ...x, startedAt: null, elapsed: secs }
        : { ...x, startedAt: Date.now() - 0, elapsed: x.elapsed },
    );
  const reset = () => setSt(IDLE);
  const finishEarly = () => {
    setSt((x) => ({ ...x, phase: "done", startedAt: null, elapsed: secs }));
    playSound("success");
  };

  const inhaling = st.phase === "breath" && secs % CYCLE < INHALE;
  const tip = MEAL_TIPS[Math.floor(secs / 30) % MEAL_TIPS.length];
  const progress = st.phase === "meal" ? Math.min(1, secs / GOAL) : st.phase === "done" ? 1 : 0;
  const r = 44;
  const c = 2 * Math.PI * r;
  const scale = (i: number | null, words: Names[], onPick: (n: number) => void, color: string) => (
    <div className="grid grid-cols-5 gap-1">
      {words.map((w, n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPick(n)}
          aria-pressed={i === n}
          className="cursor-pointer rounded-lg border px-0.5 py-1.5 text-[10px] font-semibold leading-tight transition [overflow-wrap:anywhere]"
          style={
            i === n
              ? { background: color, borderColor: color, color: "white" }
              : { borderColor: "var(--color-border)" }
          }
        >
          {tr(w)}
        </button>
      ))}
    </div>
  );

  const compare = (() => {
    if (st.hunger === null || st.full === null) return null;
    if (st.full === 2)
      return tr([
        "Você parou satisfeito(a): é esse o ponto que o corpo agradece.",
        "You stopped satisfied: that's the point your body thanks you for.",
        "Paraste satisfecho(a): ese es el punto que el cuerpo agradece.",
        "Vous vous êtes arrêté(e) rassasié(e) : c'est le bon point.",
      ]);
    if (st.full >= 3)
      return tr([
        "Passou um pouco do ponto, e tudo bem. Na próxima, pause no meio e confira a fome.",
        "A bit past the point, and that's okay. Next time, pause halfway and check your hunger.",
        "Te pasaste un poco, y está bien. La próxima vez, haz una pausa a la mitad y revisa el hambre.",
        "Un peu au-delà, ce n'est pas grave. La prochaine fois, faites une pause à mi-repas.",
      ]);
    return tr([
      "Ainda com fome? Pode comer mais, com a mesma calma.",
      "Still hungry? You can eat more, just as calmly.",
      "¿Todavía con hambre? Puedes comer más, con la misma calma.",
      "Encore faim ? Vous pouvez reprendre, avec le même calme.",
    ]);
  })();

  return (
    <Panel
      title={tr([
        "Refeição com calma",
        "Mindful meal",
        "Comida con calma",
        "Repas en pleine conscience",
      ])}
      className="relative"
    >
      <Burst id={burst} />
      <div className="relative mx-auto grid h-36 w-36 place-items-center">
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r={r} fill="none" strokeWidth="5" className="stroke-secondary" />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            className="stroke-accent transition-[stroke-dashoffset] duration-500"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - progress)}
          />
        </svg>
        <div
          className="grid h-20 w-20 place-items-center rounded-full bg-accent/15 text-accent"
          style={{
            transform: `scale(${st.phase === "breath" ? (inhaling ? 1.3 : 0.9) : 1})`,
            transition: `transform ${inhaling ? INHALE : CYCLE - INHALE}s ease-in-out`,
          }}
        >
          <Wind className="h-7 w-7" />
        </div>
      </div>

      {st.phase === "idle" && (
        <>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {tr([
              "Comer com calma leva cerca de 20 minutos. Antes, como está a sua fome?",
              "A calm meal takes about 20 minutes. First, how hungry are you?",
              "Comer con calma lleva unos 20 minutos. Antes, ¿cómo está tu hambre?",
              "Un repas calme dure environ 20 minutes. D'abord, quelle est votre faim ?",
            ])}
          </p>
          <div className="mt-2">
            {scale(st.hunger, HUNGER_WORDS, (n) => setSt((x) => ({ ...x, hunger: n })), "#c58a12")}
          </div>
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" className={primaryBtn} onClick={() => start(true)}>
              <Wind className="h-3.5 w-3.5" />
              {tr([
                "Respirar e começar",
                "Breathe and start",
                "Respirar y empezar",
                "Respirer et commencer",
              ])}
            </button>
            <button type="button" className={iconBtn} onClick={() => start(false)}>
              <Timer className="h-3 w-3" />
              {tr(["Só o relógio", "Timer only", "Solo el reloj", "Minuteur seul"])}
            </button>
          </div>
        </>
      )}

      {(st.phase === "breath" || st.phase === "meal") && (
        <>
          <p className="mt-2 text-center text-2xl font-black tabular-nums text-foreground">
            {st.phase === "breath" ? fmt(Math.max(0, BREATH_SECONDS - secs)) : fmt(secs)}
          </p>
          <p
            key={st.phase === "breath" ? String(inhaling) : tip[0]}
            className="nc-pop-in mt-1 min-h-[2.25rem] text-center text-xs text-muted-foreground"
          >
            {st.phase === "breath"
              ? inhaling
                ? tr([
                    "Inspire devagar pelo nariz…",
                    "Breathe in slowly through your nose…",
                    "Inspira despacio por la nariz…",
                    "Inspirez lentement par le nez…",
                  ])
                : tr([
                    "Solte o ar com calma…",
                    "Breathe out slowly…",
                    "Suelta el aire con calma…",
                    "Expirez doucement…",
                  ])
              : tr(tip)}
          </p>
          <div className="mt-2 flex justify-center gap-2">
            <button type="button" className={primaryBtn} onClick={togglePause}>
              {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {running
                ? tr(["Pausar", "Pause", "Pausar", "Pause"])
                : tr(["Continuar", "Resume", "Continuar", "Reprendre"])}
            </button>
            {st.phase === "meal" && (
              <button type="button" className={iconBtn} onClick={finishEarly}>
                {tr(["Terminei", "I'm done", "Terminé", "J'ai fini"])}
              </button>
            )}
            <button
              type="button"
              className={iconBtn}
              onClick={reset}
              aria-label={tr(["Recomeçar", "Restart", "Reiniciar", "Recommencer"])}
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>
        </>
      )}

      {st.phase === "done" && (
        <>
          <p className="mt-2 text-center text-xs font-semibold text-foreground">
            {tr([
              "E agora, como está?",
              "How do you feel now?",
              "¿Y ahora, cómo estás?",
              "Et maintenant ?",
            ])}
          </p>
          <div className="mt-2">
            {scale(st.full, FULL_WORDS, (n) => setSt((x) => ({ ...x, full: n })), "#4f8a4b")}
          </div>
          {compare && (
            <p className="nc-pop-in mt-3 rounded-xl bg-accent-soft/60 p-3 text-left text-xs leading-relaxed text-foreground">
              {st.hunger !== null &&
                `${tr(["Fome antes", "Hunger before", "Hambre antes", "Faim avant"])}: ${tr(HUNGER_WORDS[st.hunger])}. `}
              {compare}
            </p>
          )}
          <div className="mt-3 flex justify-center">
            <button type="button" className={iconBtn} onClick={reset}>
              <RotateCcw className="h-3 w-3" />
              {tr(["Nova refeição", "New meal", "Nueva comida", "Nouveau repas"])}
            </button>
          </div>
        </>
      )}

      {thisWeek > 0 && (
        <p className="mt-3 text-center text-[11px] font-semibold text-accent">
          {thisWeek === 1
            ? tr([
                "1 refeição com calma nesta semana",
                "1 mindful meal this week",
                "1 comida con calma esta semana",
                "1 repas en pleine conscience cette semaine",
              ])
            : tr([
                `${thisWeek} refeições com calma nesta semana`,
                `${thisWeek} mindful meals this week`,
                `${thisWeek} comidas con calma esta semana`,
                `${thisWeek} repas en pleine conscience cette semaine`,
              ])}
        </p>
      )}
    </Panel>
  );
}
