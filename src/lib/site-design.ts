// Designs completos do site, escolhidos pelo admin (chave "site_design" em platform_settings).
// Cada design é um conjunto de variáveis CSS (cores, raio, fonte, sombras) e de regras de
// superfície declaradas em styles.css sob html[data-design="<id>"]. O padrão ("natural") não
// escreve nada. A personalização de cada pessoa (appearance.ts) escreve estilos inline no <html>,
// então continua valendo por cima do design do site. Modelos de post, regras de rolagem e
// layouts não dependem do design.
import { useEffect } from "react";
import { useSiteConfigs } from "@/lib/site-config";

export type SiteDesignId = "natural" | "vibrante" | "editorial" | "aurora";

export interface SiteDesign {
  id: SiteDesignId;
  name: string;
  tagline: string;
  description: string;
  /** Cores da miniatura na galeria do admin (claro e escuro). */
  swatch: {
    bg: string;
    card: string;
    primary: string;
    accent: string;
    ink: string;
    darkBg: string;
    darkCard: string;
  };
  radius: number;
  headingFont: string;
}

export const SITE_DESIGNS: SiteDesign[] = [
  {
    id: "natural",
    name: "Natural",
    tagline: "O visual de sempre",
    description:
      "Creme, verde oliva e terracota, com títulos em serifa. Acolhedor e sereno, o design original do NutriConnect.",
    swatch: {
      bg: "#faf7f0",
      card: "#fffdfa",
      primary: "#555f36",
      accent: "#b4532a",
      ink: "#342d24",
      darkBg: "#1f1b15",
      darkCard: "#27221b",
    },
    radius: 16,
    headingFont: "Libre Baskerville, serif",
  },
  {
    id: "vibrante",
    name: "Vibrante",
    tagline: "O estilo de Funções em todo o site",
    description:
      "Cantos bem arredondados, verde fresco com laranja, cards que sobem ao toque e fundo com degradê suave. Energia e alegria, como na página Funções e no Estúdio.",
    swatch: {
      bg: "#f2faf4",
      card: "#ffffff",
      primary: "#15803d",
      accent: "#f97316",
      ink: "#14281c",
      darkBg: "#0f1a14",
      darkCard: "#16241b",
    },
    radius: 24,
    headingFont: "Nunito, sans-serif",
  },
  {
    id: "editorial",
    name: "Editorial",
    tagline: "Revista de saúde",
    description:
      "Papel off-white, tinta escura, cantos quase retos, linhas finas no lugar de sombras e títulos em serifa grande. Sóbrio e de leitura confortável.",
    swatch: {
      bg: "#f6f2e9",
      card: "#fbf9f3",
      primary: "#1f3a2e",
      accent: "#c2410c",
      ink: "#1a1915",
      darkBg: "#16150f",
      darkCard: "#1d1c15",
    },
    radius: 6,
    headingFont: "Playfair Display, serif",
  },
  {
    id: "aurora",
    name: "Aurora",
    tagline: "Vidro e luz",
    description:
      "Cards em vidro fosco sobre um fundo de luzes turquesa e violeta, cantos amplos e tipografia geométrica. Moderno, leve e tecnológico.",
    swatch: {
      bg: "#eef3fb",
      card: "#ffffff",
      primary: "#0f766e",
      accent: "#7c3aed",
      ink: "#14213d",
      darkBg: "#0b1220",
      darkCard: "#131c2e",
    },
    radius: 28,
    headingFont: "Poppins, sans-serif",
  },
];

export const DEFAULT_DESIGN: SiteDesignId = "natural";
export const DESIGN_STORAGE_KEY = "nc_site_design";

export function readSiteDesign(raw: unknown): SiteDesignId {
  const id = raw && typeof raw === "object" ? (raw as { id?: unknown }).id : raw;
  return SITE_DESIGNS.some((d) => d.id === id) ? (id as SiteDesignId) : DEFAULT_DESIGN;
}

/** Aplica o design no <html> (atributo data-design) e guarda para a próxima visita. */
export function applySiteDesign(id: SiteDesignId) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (id === DEFAULT_DESIGN) root.removeAttribute("data-design");
  else root.setAttribute("data-design", id);
  try {
    if (id === DEFAULT_DESIGN) window.localStorage.removeItem(DESIGN_STORAGE_KEY);
    else window.localStorage.setItem(DESIGN_STORAGE_KEY, id);
  } catch {
    // sem armazenamento: vale só nesta sessão
  }
}

/** Liga o design salvo pelo admin ao site inteiro. Chamado uma vez na raiz. */
export function useSiteDesign() {
  const { data } = useSiteConfigs();
  const id = readSiteDesign(data?.site_design);
  const loaded = data !== undefined;
  useEffect(() => {
    // Enquanto a configuração não chegou, mantém o que o script de abertura aplicou.
    if (loaded) applySiteDesign(id);
  }, [loaded, id]);
  return id;
}

/** Roda antes da primeira pintura: usa o design da última visita para não piscar o padrão. */
export const DESIGN_INIT_SCRIPT = `(function(){try{var v=localStorage.getItem("${DESIGN_STORAGE_KEY}");if(v&&/^[a-z]{2,20}$/.test(v))document.documentElement.setAttribute("data-design",v);}catch(e){}})();`;
