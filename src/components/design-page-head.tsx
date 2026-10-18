// Cabeçalho de página próprio de cada design do site, mostrado no topo das páginas internas
// (Comunidades, Desafios, Acompanhamento, Painel...), inclusive no Natural; Espaço e Funções
// já têm abertura própria. Texto, ícone e a foto da área (ou só ícones, no site sem fotos):
// nada aqui muda o conteúdo da página.
import { useRouterState } from "@tanstack/react-router";
import {
  Award,
  Bell,
  CalendarDays,
  FolderOpen,
  LineChart,
  MessageCircle,
  NotebookPen,
  ScanLine,
  Target,
  Utensils,
  BookOpenText,
  CalendarRange,
  Apple,
  Backpack,
  Carrot,
  ChefHat,
  HeartHandshake,
  HeartPulse,
  House,
  LayoutDashboard,
  Leaf,
  Refrigerator,
  Search,
  ShoppingBag,
  Stethoscope,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTr } from "@/components/settings-ui";
import { useDesignId } from "@/lib/site-design";
import { useSitePhotos } from "@/lib/site-photos";
import type { Names } from "@/lib/appearance-data";

interface HeadDef {
  icon: LucideIcon;
  color: string;
  title: Names;
  text: Names;
}

const HEADS: Record<string, HeadDef> = {
  "/comunidades": {
    icon: Users,
    color: "#3b7bbf",
    title: ["Comunidades", "Communities", "Comunidades", "Communautés"],
    text: [
      "Encontre gente que come, cozinha e cuida como você.",
      "Find people who eat, cook and care like you.",
      "Encuentra gente que come, cocina y se cuida como tú.",
      "Trouvez des gens qui mangent, cuisinent et prennent soin comme vous.",
    ],
  },
  "/desafios": {
    icon: Award,
    color: "#c58a12",
    title: ["Desafios", "Challenges", "Desafíos", "Défis"],
    text: [
      "Hábitos em boa companhia, com check-in diário.",
      "Habits in good company, with daily check-ins.",
      "Hábitos en buena compañía, con registro diario.",
      "Des habitudes bien accompagnées, avec validation quotidienne.",
    ],
  },
  "/explorar": {
    icon: Search,
    color: "#0f9aa8",
    title: ["Explorar", "Explore", "Explorar", "Explorer"],
    text: [
      "Busque receitas, pessoas, profissionais e comunidades.",
      "Search recipes, people, professionals and communities.",
      "Busca recetas, personas, profesionales y comunidades.",
      "Cherchez recettes, personnes, professionnels et communautés.",
    ],
  },
  "/notificacoes": {
    icon: Bell,
    color: "#d6456b",
    title: ["Notificações", "Notifications", "Notificaciones", "Notifications"],
    text: [
      "O que aconteceu desde a sua última visita.",
      "What happened since your last visit.",
      "Lo que pasó desde tu última visita.",
      "Ce qui s'est passé depuis votre dernière visite.",
    ],
  },
  "/profissionais": {
    icon: Stethoscope,
    color: "#5b6fd6",
    title: ["Profissionais", "Professionals", "Profesionales", "Professionnels"],
    text: [
      "Profissionais de saúde verificados, perto de você.",
      "Verified health professionals, close to you.",
      "Profesionales de la salud verificados, cerca de ti.",
      "Professionnels de santé vérifiés, près de chez vous.",
    ],
  },
  "/acompanhamento": {
    icon: HeartPulse,
    color: "#8a5fb0",
    title: ["Meu acompanhamento", "My care", "Mi seguimiento", "Mon suivi"],
    text: [
      "Plano, diário, metas e consultas num só lugar.",
      "Plan, diary, goals and visits in one place.",
      "Plan, diario, metas y consultas en un solo lugar.",
      "Plan, journal, objectifs et consultations au même endroit.",
    ],
  },
  "/painel": {
    icon: LayoutDashboard,
    color: "#2f7d6d",
    title: ["Painel clínico", "Clinical panel", "Panel clínico", "Panneau clinique"],
    text: [
      "Pacientes, agenda, planos e financeiro do seu consultório.",
      "Patients, schedule, plans and finances of your practice.",
      "Pacientes, agenda, planes y finanzas de tu consultorio.",
      "Patients, agenda, plans et finances de votre cabinet.",
    ],
  },
  "/programas": {
    icon: ShoppingBag,
    color: "#d9692a",
    title: ["Programas", "Programs", "Programas", "Programmes"],
    text: [
      "Programas criados por profissionais para os seus objetivos.",
      "Programs by professionals for your goals.",
      "Programas de profesionales para tus objetivos.",
      "Des programmes de professionnels pour vos objectifs.",
    ],
  },
  "/receitas": {
    icon: BookOpenText,
    color: "#d9692a",
    title: ["Receitas", "Recipes", "Recetas", "Recettes"],
    text: [
      "Receitas da comunidade, com o passo a passo.",
      "Community recipes, step by step.",
      "Recetas de la comunidad, paso a paso.",
      "Recettes de la communauté, pas à pas.",
    ],
  },
  "/cardapio": {
    icon: ChefHat,
    color: "#d9692a",
    title: ["Cardápio da semana", "Weekly menu", "Menú semanal", "Menu de la semaine"],
    text: [
      "Planeje a semana com orçamento e lista de compras.",
      "Plan the week with a budget and shopping list.",
      "Planifica la semana con presupuesto y lista de compras.",
      "Planifiez la semaine avec budget et liste de courses.",
    ],
  },
  "/geladeira": {
    icon: Refrigerator,
    color: "#0f9aa8",
    title: ["Geladeira", "Fridge", "Nevera", "Frigo"],
    text: [
      "Receitas com o que você já tem em casa.",
      "Recipes with what you already have at home.",
      "Recetas con lo que ya tienes en casa.",
      "Des recettes avec ce que vous avez déjà.",
    ],
  },
  "/feira": {
    icon: CalendarRange,
    color: "#4f8a4b",
    title: [
      "Calendário da feira",
      "Market calendar",
      "Calendario de temporada",
      "Calendrier de saison",
    ],
    text: [
      "Frutas e verduras da estação, na sua região.",
      "Seasonal fruit and vegetables in your region.",
      "Frutas y verduras de temporada en tu región.",
      "Fruits et légumes de saison dans votre région.",
    ],
  },
  "/convites": {
    icon: Users,
    color: "#3b7bbf",
    title: ["Convites", "Invitations", "Invitaciones", "Invitations"],
    text: [
      "Convites para administrar comunidades e participar delas.",
      "Invitations to run and join communities.",
      "Invitaciones para administrar comunidades y participar en ellas.",
      "Invitations pour administrer des communautés et y participer.",
    ],
  },
  "/verificacao": {
    icon: Stethoscope,
    color: "#2f7d6d",
    title: [
      "Verificação profissional",
      "Professional verification",
      "Verificación profesional",
      "Vérification professionnelle",
    ],
    text: [
      "Envie o seu registro para receber o selo de verificado.",
      "Submit your registration to get the verified badge.",
      "Envía tu registro para recibir el sello de verificado.",
      "Envoyez votre inscription pour obtenir le badge vérifié.",
    ],
  },
  "/lancheira": {
    icon: Backpack,
    color: "#c58a12",
    title: ["Lancheira da semana", "Weekly lunchbox", "Lonchera semanal", "Goûter de la semaine"],
    text: [
      "Lanches para a escola, pensados para cada criança.",
      "School snacks, planned for each child.",
      "Meriendas escolares, pensadas para cada niño.",
      "Des goûters pour l'école, pensés pour chaque enfant.",
    ],
  },
  "/parceiro": {
    icon: HeartHandshake,
    color: "#d6456b",
    title: ["Parceiro de jornada", "Journey partner", "Compañero de camino", "Partenaire de route"],
    text: [
      "Força todo dia, de um amigo para outro.",
      "Daily encouragement, from one friend to another.",
      "Ánimo cada día, de un amigo a otro.",
      "Du soutien chaque jour, d'un ami à l'autre.",
    ],
  },
  "/casa": {
    icon: House,
    color: "#2f7d6d",
    title: ["Minha casa", "My home", "Mi casa", "Ma maison"],
    text: [
      "Uma lista, uma geladeira e um cardápio para a família toda.",
      "One list, one fridge and one menu for the whole family.",
      "Una lista, una nevera y un menú para toda la familia.",
      "Une liste, un frigo et un menu pour toute la famille.",
    ],
  }, // Páginas internas do acompanhamento: a faixa diz em que página a pessoa está.
  "/acompanhamento/plano": {
    icon: Utensils,
    color: "#8a5fb0",
    title: ["Plano alimentar", "Meal plan", "Plan alimentario", "Plan alimentaire"],
    text: [
      "O plano do seu profissional, com substituições.",
      "Your professional's plan, with swaps.",
      "El plan de tu profesional, con sustituciones.",
      "Le plan de votre pro, avec équivalences.",
    ],
  },
  "/acompanhamento/diario": {
    icon: NotebookPen,
    color: "#8a5fb0",
    title: ["Diário", "Diary", "Diario", "Journal"],
    text: [
      "Refeições, fome, saciedade e sintomas.",
      "Meals, hunger, fullness and symptoms.",
      "Comidas, hambre, saciedad y síntomas.",
      "Repas, faim, satiété et symptômes.",
    ],
  },
  "/acompanhamento/metas": {
    icon: Target,
    color: "#8a5fb0",
    title: ["Metas", "Goals", "Metas", "Objectifs"],
    text: [
      "O que você combinou fazer, dia a dia.",
      "What you agreed to do, day by day.",
      "Lo que acordaste hacer, día a día.",
      "Ce que vous avez convenu, jour après jour.",
    ],
  },
  "/acompanhamento/rotulos": {
    icon: ScanLine,
    color: "#8a5fb0",
    title: ["Leitor de rótulos", "Label reader", "Lector de etiquetas", "Lecteur d'étiquettes"],
    text: [
      "Código de barras, lupa da Anvisa e comparação.",
      "Barcode, warning labels and comparison.",
      "Código de barras, sellos y comparación.",
      "Code-barres, alertes et comparaison.",
    ],
  },
  "/acompanhamento/evolucao": {
    icon: LineChart,
    color: "#8a5fb0",
    title: ["Evolução", "Progress", "Evolución", "Évolution"],
    text: [
      "Medidas, gráficos e o relatório do mês.",
      "Measures, charts and the monthly report.",
      "Medidas, gráficos y el informe del mes.",
      "Mesures, courbes et rapport du mois.",
    ],
  },
  "/acompanhamento/consultas": {
    icon: CalendarDays,
    color: "#8a5fb0",
    title: ["Consultas", "Appointments", "Consultas", "Consultations"],
    text: [
      "Próximas consultas e o histórico.",
      "Upcoming visits and history.",
      "Próximas consultas e historial.",
      "Consultations à venir et historique.",
    ],
  },
  "/acompanhamento/mensagens": {
    icon: MessageCircle,
    color: "#8a5fb0",
    title: ["Mensagens", "Messages", "Mensajes", "Messages"],
    text: [
      "Conversa com o seu profissional.",
      "Chat with your professional.",
      "Conversación con tu profesional.",
      "Échanges avec votre pro.",
    ],
  },
  "/acompanhamento/exames": {
    icon: FolderOpen,
    color: "#8a5fb0",
    title: ["Exames", "Tests", "Exámenes", "Examens"],
    text: [
      "Seus exames e documentos.",
      "Your tests and documents.",
      "Tus exámenes y documentos.",
      "Vos examens et documents.",
    ],
  },
};

function useHead(): (HeadDef & { photo: string }) | null {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const key = "/" + (pathname.split("/")[1] ?? "");
  // Só a página principal de cada área (as de detalhe já têm o próprio título).
  const depth = pathname.split("/").filter(Boolean).length;
  const allowDeeper = key === "/acompanhamento" || key === "/painel";
  if (depth > 1 && !allowDeeper) return null;
  const def = HEADS[pathname.replace(/\/$/, "")] ?? HEADS[key];
  return def ? { ...def, photo: `/images/heads${key}.jpg` } : null;
}

/** Ícones que flutuam na faixa, como na abertura de Funções (só enfeite; some em telas estreitas). */
function Floaters({
  icon: Icon,
  color,
  light,
}: {
  icon: LucideIcon;
  color: string;
  light?: boolean;
}) {
  const items: { I: LucideIcon; c: string; cls: string; d: string }[] = [
    { I: Icon, c: color, cls: "right-[30%] top-3", d: "0s" },
    { I: Apple, c: "#d6456b", cls: "right-[16%] bottom-3", d: "-1.4s" },
    { I: Carrot, c: "#d9692a", cls: "right-6 top-4", d: "-2.2s" },
    { I: Leaf, c: "#4f8a4b", cls: "right-[44%] bottom-4", d: "-3s" },
  ];
  return (
    <>
      {items.map(({ I, c, cls, d }, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`nc-floaty pointer-events-none absolute hidden opacity-50 md:block ${cls}`}
          style={{ animationDelay: d }}
        >
          <I className="h-5 w-5" style={{ color: light ? "rgb(255 255 255 / 0.8)" : c }} />
        </span>
      ))}
    </>
  );
}

/** Foto da área, presa à direita da faixa e dissolvida para a esquerda (só enfeite). */
function HeadPhoto({
  src,
  className = "",
  fade = 45,
}: {
  src: string;
  className?: string;
  fade?: number;
}) {
  const mask = `linear-gradient(to right, transparent, black ${fade}%)`;
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-y-0 right-0 overflow-hidden ${className}`}
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    >
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        className="nc-kenburns absolute inset-0 h-full w-full object-cover"
      />
    </span>
  );
}

export function DesignPageHead() {
  const design = useDesignId();
  const head = useHead();
  const tr = useTr();
  const photos = useSitePhotos();
  if (!head) return null;
  if (!photos) return <PlainHead design={design} head={head} />;
  const Icon = head.icon;

  if (design === "natural") {
    // Mesma linguagem da abertura de Funções: fundo de cores suaves que corre devagar, a foto da
    // área se fundindo nele pela direita e o selo do ícone que gira de leve ao passar o mouse.
    return (
      <div data-design-head className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6">
        <div
          className="nc-tile-in nc-gradient-pan group relative flex min-h-32 items-center gap-4 overflow-hidden rounded-[1.75rem] border border-border/60 p-5 shadow-soft sm:min-h-40 sm:p-7"
          style={{
            background: `linear-gradient(120deg, color-mix(in srgb, ${head.color} 22%, var(--card)), color-mix(in srgb, #f6c27a 22%, var(--card)), color-mix(in srgb, #9fd18c 20%, var(--card)), color-mix(in srgb, ${head.color} 16%, var(--card)))`,
          }}
        >
          <HeadPhoto src={head.photo} className="w-[42%] sm:w-[58%]" fade={55} />
          <span
            className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-md transition duration-300 group-hover:-rotate-6 group-hover:scale-110 sm:h-14 sm:w-14"
            style={{
              background: `linear-gradient(145deg, ${head.color}, color-mix(in srgb, ${head.color} 70%, #000))`,
            }}
          >
            <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
          </span>
          <div className="relative min-w-0 max-w-[60%] sm:max-w-[48%]">
            <p className="!text-left font-display text-xl font-bold leading-tight text-foreground sm:text-3xl">
              {tr(head.title)}
            </p>
            <p className="mt-1 !text-left text-sm text-foreground/80">{tr(head.text)}</p>
          </div>
        </div>
      </div>
    );
  }

  if (design === "vibrante") {
    // A foto enche a faixa e a cor da área a cobre pela esquerda, deixando a imagem aparecer à direita.
    return (
      <div data-design-head className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6">
        <div className="nc-tile-in group relative flex min-h-32 items-center gap-4 overflow-hidden rounded-[2rem] p-5 text-white shadow-card sm:min-h-40 sm:p-7">
          <img
            src={head.photo}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="nc-kenburns pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: `linear-gradient(100deg, ${head.color} 30%, color-mix(in srgb, ${head.color} 60%, transparent) 62%, color-mix(in srgb, ${head.color} 15%, transparent))`,
            }}
          />
          <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/25 backdrop-blur-sm transition duration-300 group-hover:-rotate-6 group-hover:scale-110 sm:h-14 sm:w-14">
            <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
          </span>
          <div className="relative min-w-0 max-w-[65%] sm:max-w-[50%]">
            <p className="!text-left font-display text-xl font-black text-white drop-shadow sm:text-3xl">
              {tr(head.title)}
            </p>
            <p className="!text-left text-sm text-white/95 drop-shadow">{tr(head.text)}</p>
          </div>
        </div>
      </div>
    );
  }

  if (design === "editorial") {
    // A foto entra como gravura de jornal: tons de sépia e moldura fina, sob o título.
    return (
      <div data-design-head className="nc-tile-in mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6">
        <div className="border-y-4 border-double border-foreground py-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">
            {tr(["Seção", "Section", "Sección", "Rubrique"])}
          </p>
          <p className="mt-1 !text-center font-display text-3xl font-bold leading-none sm:text-4xl">
            {tr(head.title)}
          </p>
          <p className="mt-1.5 !text-center text-sm italic text-muted-foreground">
            {tr(head.text)}
          </p>
          <div className="relative mt-3 h-28 overflow-hidden border border-foreground sm:h-40">
            <img
              src={head.photo}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              className="nc-kenburns absolute inset-0 h-full w-full object-cover contrast-110 grayscale sepia-[.45]"
            />
          </div>
        </div>
      </div>
    );
  }

  // aurora: a foto fica dentro da cápsula de vidro, do lado direito.
  return (
    <div data-design-head className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6">
      <div className="nc-tile-in group relative flex min-h-24 items-center gap-3 overflow-hidden rounded-full border border-foreground/10 bg-card/60 py-3 pl-3 pr-6 shadow-xl backdrop-blur-xl sm:min-h-28">
        <HeadPhoto src={head.photo} className="w-[40%] sm:w-[50%]" fade={60} />
        <span
          className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full text-white shadow-md transition duration-300 group-hover:-rotate-6 group-hover:scale-110 sm:h-14 sm:w-14"
          style={{ background: head.color }}
        >
          <Icon className="h-6 w-6" />
        </span>
        <div className="relative min-w-0 max-w-[60%] sm:max-w-[50%]">
          <p className="!text-left font-display text-lg font-semibold text-primary sm:text-2xl">
            {tr(head.title)}
          </p>
          <p className="!text-left text-xs text-muted-foreground sm:text-sm">{tr(head.text)}</p>
        </div>
      </div>
    </div>
  );
}

/** Versão anterior, sem foto (Admin → Design e imagens → "Site anterior"). */
function PlainHead({ design, head }: { design: string; head: HeadDef }) {
  const tr = useTr();
  const Icon = head.icon;

  if (design === "natural") {
    // Mesma linguagem da abertura de Funções: fundo de cores suaves que corre devagar, ícones
    // flutuando e o selo do ícone que gira de leve ao passar o mouse.
    return (
      <div data-design-head className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6">
        <div
          className="nc-tile-in nc-gradient-pan group relative flex items-center gap-4 overflow-hidden rounded-[1.75rem] border border-border/60 p-4 shadow-soft sm:p-5"
          style={{
            background: `linear-gradient(120deg, color-mix(in srgb, ${head.color} 22%, var(--card)), color-mix(in srgb, #f6c27a 22%, var(--card)), color-mix(in srgb, #9fd18c 20%, var(--card)), color-mix(in srgb, ${head.color} 16%, var(--card)))`,
          }}
        >
          <Floaters icon={Icon} color={head.color} />
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-md transition duration-300 group-hover:-rotate-6 group-hover:scale-110"
            style={{
              background: `linear-gradient(145deg, ${head.color}, color-mix(in srgb, ${head.color} 70%, #000))`,
            }}
          >
            <Icon className="h-6 w-6" />
          </span>
          <div className="relative min-w-0">
            <p className="!text-left font-display text-xl font-bold leading-tight text-foreground sm:text-2xl">
              {tr(head.title)}
            </p>
            <p className="mt-0.5 !text-left text-sm text-foreground/75">{tr(head.text)}</p>
          </div>
        </div>
      </div>
    );
  }

  if (design === "vibrante") {
    return (
      <div data-design-head className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6">
        <div
          className="nc-tile-in group relative flex items-center gap-4 overflow-hidden rounded-[2rem] p-4 text-white shadow-card sm:p-5"
          style={{
            background: `linear-gradient(120deg, ${head.color}, color-mix(in srgb, ${head.color} 70%, #000))`,
          }}
        >
          <Floaters icon={Icon} color={head.color} light />
          <Icon className="nc-floaty pointer-events-none absolute -right-3 -top-3 h-28 w-28 text-white/15" />
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/25 transition duration-300 group-hover:-rotate-6 group-hover:scale-110">
            <Icon className="h-6 w-6" />
          </span>
          <div className="relative min-w-0">
            <p className="!text-left font-display text-xl font-black text-white sm:text-2xl">
              {tr(head.title)}
            </p>
            <p className="!text-left text-sm text-white/90">{tr(head.text)}</p>
          </div>
        </div>
      </div>
    );
  }

  if (design === "editorial") {
    return (
      <div data-design-head className="nc-tile-in mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6">
        <div className="border-y-4 border-double border-foreground py-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">
            {tr(["Seção", "Section", "Sección", "Rubrique"])}
          </p>
          <p className="mt-1 !text-center font-display text-3xl font-bold leading-none sm:text-4xl">
            {tr(head.title)}
          </p>
          <p className="mt-1.5 !text-center text-sm italic text-muted-foreground">
            {tr(head.text)}
          </p>
        </div>
      </div>
    );
  }

  // aurora
  return (
    <div data-design-head className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6">
      <div className="nc-tile-in group relative flex items-center gap-3 overflow-hidden rounded-full border border-foreground/10 bg-card/60 py-2 pl-2 pr-6 shadow-xl backdrop-blur-xl">
        <Floaters icon={Icon} color={head.color} />
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white transition duration-300 group-hover:-rotate-6 group-hover:scale-110"
          style={{ background: head.color }}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="relative min-w-0">
          <p className="!text-left font-display text-lg font-semibold text-primary">
            {tr(head.title)}
          </p>
          <p className="!text-left truncate text-xs text-muted-foreground">{tr(head.text)}</p>
        </div>
      </div>
    </div>
  );
}
