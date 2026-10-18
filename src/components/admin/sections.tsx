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

export interface SectionDef {
  id: SectionId;
  label: string;
  icon: LucideIcon;
  group: string;
}

export const SECTIONS: SectionDef[] = [
  { id: "visao", label: "Visão geral", icon: LayoutDashboard, group: "Painel" },
  { id: "documentacao", label: "Documentação", icon: BookOpen, group: "Painel" },
  { id: "qualidade", label: "Qualidade", icon: ClipboardCheck, group: "Painel" },
  { id: "usuarios", label: "Pessoas", icon: Users, group: "Pessoas" },
  { id: "verificacoes", label: "Verificações", icon: BadgeCheck, group: "Pessoas" },
  { id: "contato", label: "Fale conosco", icon: Inbox, group: "Pessoas" },
  { id: "posts", label: "Publicações", icon: FileText, group: "Conteúdo" },
  { id: "ia_barrados", label: "Barrados pela IA", icon: Bot, group: "Conteúdo" },
  { id: "moderacao", label: "Moderação", icon: Flag, group: "Conteúdo" },
  { id: "comunidades", label: "Comunidades", icon: UsersRound, group: "Conteúdo" },
  { id: "temas", label: "Temas da semana", icon: CalendarDays, group: "Conteúdo" },
  { id: "apresentacao", label: "Apresentação", icon: Presentation, group: "Conteúdo" },
  { id: "anuncios", label: "Anúncios", icon: Megaphone, group: "Conteúdo" },
  { id: "redes", label: "Redes sociais", icon: Share2, group: "Conteúdo" },
  { id: "site_features", label: "Funcionalidades", icon: ToggleRight, group: "Site" },
  { id: "site_nina", label: "Nina", icon: Smile, group: "Site" },
  { id: "site_design", label: "Design e imagens", icon: Palette, group: "Site" },
  { id: "financeiro", label: "Financeiro", icon: Banknote, group: "Negócio" },
  { id: "mercados", label: "Mercados parceiros", icon: ShoppingCart, group: "Negócio" },
  { id: "recompensas", label: "Recompensas", icon: Gift, group: "Negócio" },
  { id: "ia", label: "Inteligência artificial", icon: Brain, group: "Sistema" },
  { id: "config", label: "Configurações", icon: Settings, group: "Sistema" },
  { id: "auditoria", label: "Auditoria", icon: History, group: "Sistema" },
];

export const isSectionId = (v: unknown): v is SectionId => SECTIONS.some((s) => s.id === v);
