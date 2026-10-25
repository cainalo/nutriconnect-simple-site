// Lista das seções do console de administração (menu lateral).
import {
  BadgeCheck,
  BookOpen,
  ClipboardCheck,
  Bot,
  Banknote,
  Brain,
  CalendarDays,
  Flag,
  Gift,
  FileText,
  History,
  Inbox,
  LayoutDashboard,
  Megaphone,
  Palette,
  ToggleRight,
  Presentation,
  Settings,
  Share2,
  ShoppingCart,
  Smile,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { Names } from "@/lib/appearance-data";

export type SectionId =
  | "visao"
  | "documentacao"
  | "qualidade"
  | "recompensas"
  | "usuarios"
  | "verificacoes"
  | "contato"
  | "posts"
  | "moderacao"
  | "ia_barrados"
  | "comunidades"
  | "temas"
  | "apresentacao"
  | "anuncios"
  | "redes"
  | "site_features"
  | "site_nina"
  | "site_design"
  | "financeiro"
  | "mercados"
  | "ia"
  | "config"
  | "auditoria";

/** Nomes nos 4 idiomas (pt, en, es, fr), escolhidos com useTr(). */
export interface SectionDef {
  id: SectionId;
  label: Names;
  icon: LucideIcon;
  group: Names;
}

export const SECTIONS: SectionDef[] = [
  {
    id: "visao",
    label: ["Visão geral", "Overview", "Visión general", "Vue d'ensemble"],
    icon: LayoutDashboard,
    group: ["Painel", "Dashboard", "Panel", "Tableau de bord"],
  },
  {
    id: "documentacao",
    label: ["Documentação", "Documentation", "Documentación", "Documentation"],
    icon: BookOpen,
    group: ["Painel", "Dashboard", "Panel", "Tableau de bord"],
  },
  {
    id: "qualidade",
    label: ["Qualidade", "Quality", "Calidad", "Qualité"],
    icon: ClipboardCheck,
    group: ["Painel", "Dashboard", "Panel", "Tableau de bord"],
  },
  {
    id: "usuarios",
    label: ["Pessoas", "People", "Personas", "Personnes"],
    icon: Users,
    group: ["Pessoas", "People", "Personas", "Personnes"],
  },
  {
    id: "verificacoes",
    label: ["Verificações", "Verifications", "Verificaciones", "Vérifications"],
    icon: BadgeCheck,
    group: ["Pessoas", "People", "Personas", "Personnes"],
  },
  {
    id: "contato",
    label: ["Fale conosco", "Contact us", "Contacto", "Nous contacter"],
    icon: Inbox,
    group: ["Pessoas", "People", "Personas", "Personnes"],
  },
  {
    id: "posts",
    label: ["Publicações", "Posts", "Publicaciones", "Publications"],
    icon: FileText,
    group: ["Conteúdo", "Content", "Contenido", "Contenu"],
  },
  {
    id: "ia_barrados",
    label: ["Barrados pela IA", "Blocked by AI", "Bloqueados por la IA", "Bloqués par l'IA"],
    icon: Bot,
    group: ["Conteúdo", "Content", "Contenido", "Contenu"],
  },
  {
    id: "moderacao",
    label: ["Moderação", "Moderation", "Moderación", "Modération"],
    icon: Flag,
    group: ["Conteúdo", "Content", "Contenido", "Contenu"],
  },
  {
    id: "comunidades",
    label: ["Comunidades", "Communities", "Comunidades", "Communautés"],
    icon: UsersRound,
    group: ["Conteúdo", "Content", "Contenido", "Contenu"],
  },
  {
    id: "temas",
    label: ["Temas da semana", "Weekly themes", "Temas de la semana", "Thèmes de la semaine"],
    icon: CalendarDays,
    group: ["Conteúdo", "Content", "Contenido", "Contenu"],
  },
  {
    id: "apresentacao",
    label: ["Apresentação", "Presentation", "Presentación", "Présentation"],
    icon: Presentation,
    group: ["Conteúdo", "Content", "Contenido", "Contenu"],
  },
  {
    id: "anuncios",
    label: ["Anúncios", "Announcements", "Anuncios", "Annonces"],
    icon: Megaphone,
    group: ["Conteúdo", "Content", "Contenido", "Contenu"],
  },
  {
    id: "redes",
    label: ["Redes sociais", "Social media", "Redes sociales", "Réseaux sociaux"],
    icon: Share2,
    group: ["Conteúdo", "Content", "Contenido", "Contenu"],
  },
  {
    id: "site_features",
    label: ["Funcionalidades", "Features", "Funciones", "Fonctionnalités"],
    icon: ToggleRight,
    group: ["Site", "Site", "Sitio", "Site"],
  },
  {
    id: "site_nina",
    label: ["Nina", "Nina", "Nina", "Nina"],
    icon: Smile,
    group: ["Site", "Site", "Sitio", "Site"],
  },
  {
    id: "site_design",
    label: ["Design e imagens", "Design and images", "Diseño e imágenes", "Design et images"],
    icon: Palette,
    group: ["Site", "Site", "Sitio", "Site"],
  },
  {
    id: "financeiro",
    label: ["Financeiro", "Finance", "Finanzas", "Finances"],
    icon: Banknote,
    group: ["Negócio", "Business", "Negocio", "Activité"],
  },
  {
    id: "mercados",
    label: ["Mercados parceiros", "Partner markets", "Mercados asociados", "Marchés partenaires"],
    icon: ShoppingCart,
    group: ["Negócio", "Business", "Negocio", "Activité"],
  },
  {
    id: "recompensas",
    label: ["Recompensas", "Rewards", "Recompensas", "Récompenses"],
    icon: Gift,
    group: ["Negócio", "Business", "Negocio", "Activité"],
  },
  {
    id: "ia",
    label: [
      "Inteligência artificial",
      "Artificial intelligence",
      "Inteligencia artificial",
      "Intelligence artificielle",
    ],
    icon: Brain,
    group: ["Sistema", "System", "Sistema", "Système"],
  },
  {
    id: "config",
    label: ["Configurações", "Settings", "Configuración", "Paramètres"],
    icon: Settings,
    group: ["Sistema", "System", "Sistema", "Système"],
  },
  {
    id: "auditoria",
    label: ["Auditoria", "Audit log", "Auditoría", "Journal d'audit"],
    icon: History,
    group: ["Sistema", "System", "Sistema", "Système"],
  },
];

export const isSectionId = (v: unknown): v is SectionId => SECTIONS.some((s) => s.id === v);
