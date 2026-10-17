// Abertura do Espaço de hoje em cada design do site, acima da lista de posts. O design Natural não
// tem abertura. Os posts, os filtros e a rolagem do feed não mudam.
import { Link } from "@tanstack/react-router";
import { Award, ChefHat, LayoutGrid, Refrigerator, Sparkles, type LucideIcon } from "lucide-react";
import { useTr } from "@/components/settings-ui";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useDesignId } from "@/lib/site-design";
import { cn } from "@/lib/utils";
import type { Names } from "@/lib/appearance-data";

interface Shortcut {
  to: "/nina" | "/desafios" | "/geladeira" | "/cardapio" | "/funcoes";
  icon: LucideIcon;
  label: Names;
  color: string;
}

const SHORTCUTS: Shortcut[] = [
  {
    to: "/nina",
    icon: Sparkles,
    label: ["Falar com a Nina", "Talk to Nina", "Hablar con Nina", "Parler à Nina"],
    color: "#8a5fb0",
  },
  {
    to: "/desafios",
    icon: Award,
    label: ["Desafios", "Challenges", "Desafíos", "Défis"],
    color: "#c58a12",
  },
  {
    to: "/geladeira",
    icon: Refrigerator,
    label: ["Geladeira", "Fridge", "Nevera", "Frigo"],
    color: "#0f9aa8",
  },
  { to: "/cardapio", icon: ChefHat, label: ["Cardápio", "Menu", "Menú", "Menu"], color: "#d9692a" },
  {
    to: "/funcoes",
    icon: LayoutGrid,
    label: ["Todas as funções", "All tools", "Todas las funciones", "Toutes les fonctions"],
    color: "#2f7d6d",
  },
];

function useGreeting() {
  const tr = useTr();
  const hour = new Date().getHours();
  const first = hour < 12 ? 0 : hour < 18 ? 1 : 2;
  const greetings: Names[] = [
    ["Bom dia", "Good morning", "Buenos días", "Bonjour"],
    ["Boa tarde", "Good afternoon", "Buenas tardes", "Bon après-midi"],
    ["Boa noite", "Good evening", "Buenas noches", "Bonsoir"],
  ];
  return tr(greetings[first]);
}

export function EspacoIntro({ themeTitle }: { themeTitle?: string | null }) {
  const design = useDesignId();
  const { user } = useAuth();
  const { locale } = useI18n();
  const tr = useTr();
  const greeting = useGreeting();
  const name = user?.name?.split(" ")[0] ?? "";
  if (design === "natural") return null;

  if (design === "vibrante") {
    return (
      <section className="mb-6 overflow-hidden rounded-[2rem] bg-primary p-5 text-primary-foreground shadow-card">
        <p className="!text-left font-display text-2xl font-black text-white sm:text-3xl">
          {greeting}, {name}!
        </p>
        <p className="mt-1 !text-left text-sm text-white/85">
          {themeTitle
            ? tr([
                "Tema da semana: ",
                "This week's theme: ",
                "Tema de la semana: ",
                "Thème de la semaine : ",
              ]) + themeTitle
            : tr([
                "O que vamos cuidar hoje?",
                "What shall we look after today?",
                "¿Qué cuidamos hoy?",
                "De quoi prend-on soin aujourd'hui ?",
              ])}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {SHORTCUTS.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="flex flex-col items-start gap-2 rounded-2xl bg-white/15 p-3 text-xs font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/25"
            >
              <s.icon className="h-5 w-5" />
              {tr(s.label)}
            </Link>
          ))}
        </div>
      </section>
    );
  }

  if (design === "editorial") {
    const date = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
    return (
      <section className="mb-8 border-y-2 border-foreground py-5 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">
          {tr(["Edição de hoje", "Today's edition", "Edición de hoy", "Édition du jour"])} · {date}
        </p>
        <h2 className="mt-2 !text-center font-display text-3xl font-bold leading-tight sm:text-4xl">
          {themeTitle ?? `${greeting}, ${name}`}
        </h2>
        {themeTitle && (
          <p className="mt-2 !text-center text-sm italic text-muted-foreground">
            {greeting}, {name}.{" "}
            {tr([
              "Esta semana, a conversa gira em torno deste tema.",
              "This week, the conversation revolves around this theme.",
              "Esta semana, la conversación gira en torno a este tema.",
              "Cette semaine, la conversation tourne autour de ce thème.",
            ])}
          </p>
        )}
      </section>
    );
  }

  // aurora
  return (
    <section className="mb-6">
      <p className="mb-3 !text-left font-display text-2xl font-semibold">
        {greeting}, {name}
      </p>
      <div className="flex flex-wrap gap-2">
        {SHORTCUTS.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-card/60 px-4 py-2 text-sm font-semibold shadow-lg backdrop-blur-xl transition hover:-translate-y-0.5",
            )}
          >
            <s.icon className="h-4 w-4" style={{ color: s.color }} />
            {tr(s.label)}
          </Link>
        ))}
      </div>
    </section>
  );
}
