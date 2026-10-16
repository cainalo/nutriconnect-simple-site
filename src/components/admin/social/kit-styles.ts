// Estilos compartilhados do estúdio de redes sociais: campos, botões e a identidade (cor e ícone) de
// cada rede, formato e status — no mesmo vocabulário visual da página de Funções.
import {
  AlignLeft,
  BadgeCheck,
  CheckCircle2,
  CircleDashed,
  Clapperboard,
  Clock,
  Facebook,
  GalleryHorizontal,
  Globe,
  Image,
  Instagram,
  Lightbulb,
  Linkedin,
  Music2,
  PenLine,
  Twitter,
  Video,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import type { PostStatus } from "@/lib/social-studio";
import type { Network, PostFormat } from "@/lib/social-studio.functions";

export const field =
  "block w-full min-w-0 rounded-2xl border border-border/70 bg-background/90 px-4 py-2.5 text-sm text-foreground shadow-[inset_0_1px_0_rgba(0,0,0,0.02)] outline-none transition placeholder:text-muted-foreground/70 hover:border-border focus:border-accent focus:bg-background focus:ring-4 focus:ring-accent/15";
export const btnPrimary =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-bold text-accent-foreground shadow-soft transition hover:-translate-y-0.5 hover:bg-accent/90 hover:shadow-lg active:translate-y-0 disabled:pointer-events-none disabled:opacity-50";
export const btnSoft =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-border/70 bg-card px-4 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-sm active:translate-y-0 disabled:pointer-events-none disabled:opacity-50";
export const btnIcon =
  "grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground";

/** Mistura uma cor com o fundo do cartão (funciona no claro e no escuro). */
export const tint = (color: string, pct: number) =>
  `color-mix(in srgb, ${color} ${pct}%, var(--card))`;
/** Degradê de card colorido, igual aos tiles da página de Funções. */
export const tileBg = (color: string, color2 = color, a = 18, b = 30) =>
  `linear-gradient(140deg, ${tint(color, a)} 0%, ${tint(color2, b)} 100%)`;
/** Selo de ícone em degradê. */
export const badgeBg = (color: string) =>
  `linear-gradient(145deg, ${color}, color-mix(in srgb, ${color} 70%, #000))`;

export const NETWORK_STYLE: Record<Network, { icon: LucideIcon; color: string; color2: string }> = {
  instagram: { icon: Instagram, color: "#d6456b", color2: "#f39b4d" },
  tiktok: { icon: Music2, color: "#1f2937", color2: "#25c2c9" },
  facebook: { icon: Facebook, color: "#1f6fe5", color2: "#6ea8ff" },
  linkedin: { icon: Linkedin, color: "#0a66c2", color2: "#5aa1e3" },
  youtube: { icon: Youtube, color: "#e0302a", color2: "#ff8a7a" },
  x: { icon: Twitter, color: "#27272a", color2: "#9ca3af" },
  outro: { icon: Globe, color: "#555f36", color2: "#a3b37a" },
};

export const FORMAT_STYLE: Record<PostFormat, { icon: LucideIcon; hint: string }> = {
  post: { icon: Image, hint: "Uma imagem" },
  carrossel: { icon: GalleryHorizontal, hint: "Várias imagens" },
  reels: { icon: Clapperboard, hint: "Vídeo vertical" },
  story: { icon: CircleDashed, hint: "24 horas" },
  video: { icon: Video, hint: "Vídeo longo" },
  texto: { icon: AlignLeft, hint: "Só texto" },
};

export const STATUS_STYLE: Record<PostStatus, { icon: LucideIcon; color: string }> = {
  ideia: { icon: Lightbulb, color: "#c58a12" },
  rascunho: { icon: PenLine, color: "#3b7bbf" },
  aprovado: { icon: BadgeCheck, color: "#7a5cc4" },
  agendado: { icon: Clock, color: "#d6456b" },
  publicado: { icon: CheckCircle2, color: "#2f8a5b" },
};
