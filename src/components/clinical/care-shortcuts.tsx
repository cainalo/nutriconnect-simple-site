// Atalhos do início do Acompanhamento para o que mora fora do menu: sintomas, relatório do mês,
// programas, pontos, parceiro de jornada e evolução (grade par, sem card sozinho na última linha).
import { Link } from "@tanstack/react-router";
import {
  Activity,
  FileDown,
  Gift,
  HandHeart,
  LineChart,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { useTr } from "@/components/settings-ui";
import type { Names } from "@/lib/appearance-data";
import { cn } from "@/lib/utils";
import { Card } from "./ui";

interface Shortcut {
  to: string;
  search?: Record<string, string>;
  icon: LucideIcon;
  title: Names;
  text: Names;
}

const SHORTCUTS: Shortcut[] = [
  {
    to: "/acompanhamento/diario",
    search: { aba: "sintomas" },
    icon: Activity,
    title: ["Sintomas", "Symptoms", "Síntomas", "Symptômes"],
    text: [
      "Anote o que sentiu",
      "Log how you felt",
      "Anota lo que sentiste",
      "Notez vos ressentis",
    ],
  },
  {
    to: "/acompanhamento/evolucao",
    icon: FileDown,
    title: ["Relatório do mês", "Monthly report", "Informe del mes", "Rapport du mois"],
    text: [
      "PDF para levar à consulta",
      "PDF to bring to your visit",
      "PDF para la consulta",
      "PDF pour la consultation",
    ],
  },
  {
    to: "/acompanhamento/evolucao",
    icon: LineChart,
    title: ["Minha evolução", "My progress", "Mi evolución", "Mon évolution"],
    text: ["Medidas e gráficos", "Measures and charts", "Medidas y gráficos", "Mesures et courbes"],
  },
  {
    to: "/programas",
    icon: ShoppingBag,
    title: ["Programas", "Programs", "Programas", "Programmes"],
    text: [
      "Criados por profissionais",
      "Made by professionals",
      "Creados por profesionales",
      "Créés par des pros",
    ],
  },
  {
    to: "/recompensas",
    icon: Gift,
    title: [
      "Pontos e recompensas",
      "Points and rewards",
      "Puntos y recompensas",
      "Points et récompenses",
    ],
    text: [
      "Sua semana vale prêmios",
      "Your week earns rewards",
      "Tu semana vale premios",
      "Votre semaine rapporte",
    ],
  },
  {
    to: "/parceiro",
    icon: HandHeart,
    title: ["Parceiro de jornada", "Journey buddy", "Compañero de camino", "Binôme de parcours"],
    text: [
      "Força diária de um amigo",
      "Daily support from a friend",
      "Ánimo diario de un amigo",
      "Le soutien d'un ami",
    ],
  },
];

export function CareShortcuts({ className, wide }: { className?: string; wide?: boolean }) {
  const tr = useTr();
  return (
    <Card className={className} title={tr(["Atalhos", "Shortcuts", "Atajos", "Raccourcis"])}>
      <ul className={cn("grid grid-cols-2 gap-2", wide && "sm:grid-cols-3")}>
        {SHORTCUTS.map((s) => (
          <li key={s.title[0]}>
            <Link
              to={s.to}
              search={s.search}
              className="flex h-full min-h-14 items-center gap-2.5 rounded-2xl border border-border/60 bg-card p-3 transition hover:bg-secondary"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <s.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-tight text-foreground">
                  {tr(s.title)}
                </span>
                <span className="block text-[11px] leading-snug text-muted-foreground">
                  {tr(s.text)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
