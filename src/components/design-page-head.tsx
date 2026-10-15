// Cabeçalho de página próprio de cada design do site, mostrado no topo das páginas internas
// (Comunidades, Desafios, Acompanhamento, Painel...). O design Natural não tem; Espaço e Funções
// já têm abertura própria. Só texto e ícone: nada aqui muda o conteúdo da página.
import { useRouterState } from "@tanstack/react-router";
import {
  Award,
  Bell,
  BookOpenText,
  CalendarRange,
  ChefHat,
  HeartPulse,
  House,
  LayoutDashboard,
  Refrigerator,
  Search,
  ShoppingBag,
  Stethoscope,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTr } from "@/components/settings-ui";
import { useDesignId } from "@/lib/site-design";
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
  "/casa": {
    icon: House,
    color: "#2f7d6d",
    title: ["Minha casa", "My home", "Mi casa", "Ma maison"],
    text: [
      "Quem mora junto compartilha compras, geladeira e cardápio.",
      "People who live together share shopping, fridge and menu.",
      "Quienes viven juntos comparten compras, nevera y menú.",
      "Ceux qui vivent ensemble partagent courses, frigo et menu.",
    ],
  },
};

function useHead(): HeadDef | null {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const key = "/" + (pathname.split("/")[1] ?? "");
  // Só a página principal de cada área (as de detalhe já têm o próprio título).
  const depth = pathname.split("/").filter(Boolean).length;
  const allowDeeper = key === "/acompanhamento" || key === "/painel";
  if (depth > 1 && !allowDeeper) return null;
  return HEADS[key] ?? null;
}

export function DesignPageHead() {
  const design = useDesignId();
  const head = useHead();
  const tr = useTr();
  if (design === "natural" || !head) return null;
  const Icon = head.icon;

  if (design === "vibrante") {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6">
        <div
          className="relative flex items-center gap-4 overflow-hidden rounded-[2rem] p-4 text-white shadow-card sm:p-5"
          style={{
            background: `linear-gradient(120deg, ${head.color}, color-mix(in srgb, ${head.color} 55%, var(--accent)))`,
          }}
        >
          <Icon className="pointer-events-none absolute -right-3 -top-3 h-28 w-28 text-white/15" />
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/25">
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
      <div className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6">
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
    <div className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6">
      <div className="flex items-center gap-3 rounded-full border border-foreground/10 bg-card/60 py-2 pl-2 pr-6 shadow-xl backdrop-blur-xl">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white"
          style={{ background: `linear-gradient(135deg, ${head.color}, var(--accent))` }}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="!text-left bg-gradient-to-r from-primary to-accent bg-clip-text font-display text-lg font-semibold text-transparent">
            {tr(head.title)}
          </p>
          <p className="!text-left truncate text-xs text-muted-foreground">{tr(head.text)}</p>
        </div>
      </div>
    </div>
  );
}
