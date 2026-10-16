// Rascunho do editor de posts e as artes geradas ao vivo para a prévia (capa + slides).
import { useEffect, useRef, useState } from "react";
import type { Json, TablesInsert } from "@/integrations/supabase/types";
import { drawArt, type ArtLayout, type ArtSize, type PostDesign } from "@/lib/post-art";
import { slidesOf, type PostStatus, type SocialPost, type Slide } from "@/lib/social-studio";
import type { Network, PostFormat } from "@/lib/social-studio.functions";
import type { SocialTemplate } from "@/lib/social-templates";

export interface Draft {
  id?: string;
  title: string;
  network: Network;
  format: PostFormat;
  hook: string;
  caption: string;
  slides: Slide[];
  script: string;
  hashtags: string[];
  cta: string;
  pillar: string;
  visual_idea: string;
  status: PostStatus;
  scheduled_for: string | null;
  is_template: boolean;
  profile_id: string | null;
  design: PostDesign;
}

export const EMPTY_DRAFT: Draft = {
  title: "",
  network: "instagram",
  format: "post",
  hook: "",
  caption: "",
  slides: [],
  script: "",
  hashtags: [],
  cta: "",
  pillar: "",
  visual_idea: "",
  status: "rascunho",
  scheduled_for: null,
  is_template: false,
  profile_id: null,
  design: { layout: "classico", theme: "oliva", icon: "", kicker: "" },
};

/** Design salvo → design do editor (posts antigos com emoji ficam sem ícone: regra do site). */
function designFrom(raw: unknown): PostDesign {
  const { emoji: _legacy, ...rest } = (raw ?? {}) as PostDesign;
  return { ...EMPTY_DRAFT.design, ...rest };
}

export function draftFromPost(p: SocialPost): Draft {
  return {
    id: p.id,
    title: p.title,
    network: p.network as Network,
    format: p.format as PostFormat,
    hook: p.hook,
    caption: p.caption,
    slides: slidesOf(p),
    script: p.script,
    hashtags: p.hashtags,
    cta: p.cta,
    pillar: p.pillar,
    visual_idea: p.visual_idea,
    status: p.status as PostStatus,
    scheduled_for: p.scheduled_for,
    is_template: p.is_template,
    profile_id: p.profile_id,
    design: designFrom(p.design),
  };
}

export function draftFromTemplate(t: SocialTemplate): Draft {
  return {
    ...EMPTY_DRAFT,
    title: t.title,
    network: t.network,
    format: t.format,
    hook: t.hook,
    caption: t.caption,
    slides: t.slides.map((s) => ({ ...s })),
    script: t.script,
    hashtags: [...t.hashtags],
    cta: t.cta,
    pillar: t.name,
    design: { ...EMPTY_DRAFT.design, ...t.design },
  };
}

export function draftToRow(d: Draft): TablesInsert<"social_posts"> {
  return {
    title: d.title.trim() || "Sem título",
    network: d.network,
    format: d.format,
    hook: d.hook,
    caption: d.caption,
    slides: d.slides.filter((s) => s.title || s.text) as unknown as Json,
    script: d.script,
    hashtags: d.hashtags.slice(0, 30),
    cta: d.cta,
    pillar: d.pillar,
    visual_idea: d.visual_idea,
    status: d.status,
    scheduled_for: d.scheduled_for,
    is_template: d.is_template,
    profile_id: d.profile_id,
    design: d.design as unknown as Json,
    source: "manual",
  };
}

/** Legenda completa como vai para a rede: texto + CTA + hashtags. */
export function composeCaption(d: Pick<Draft, "caption" | "cta" | "hashtags">) {
  return [
    d.caption.trim(),
    d.cta.trim(),
    d.hashtags.length ? d.hashtags.map((h) => `#${h}`).join(" ") : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Modos de prévia (cada rede no seu formato). */
export type PreviewMode =
  "ig-feed" | "ig-story" | "ig-reels" | "tiktok" | "facebook" | "linkedin" | "x" | "youtube";

export const PREVIEW_LABEL: Record<PreviewMode, string> = {
  "ig-feed": "Instagram · Feed",
  "ig-story": "Instagram · Stories",
  "ig-reels": "Instagram · Reels",
  tiktok: "TikTok",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  x: "X",
  youtube: "YouTube",
};

/** Prévia que combina com a rede e o formato do post. */
export function defaultPreview(network: Network, format: PostFormat): PreviewMode {
  if (network === "instagram")
    return format === "story"
      ? "ig-story"
      : format === "reels" || format === "video"
        ? "ig-reels"
        : "ig-feed";
  if (network === "tiktok") return "tiktok";
  if (network === "facebook") return "facebook";
  if (network === "linkedin") return "linkedin";
  if (network === "x") return "x";
  if (network === "youtube") return "youtube";
  return "ig-feed";
}

/** Tamanho da arte para cada prévia. */
export function artSizeFor(mode: PreviewMode, format: PostFormat): ArtSize {
  if (mode === "ig-story" || mode === "ig-reels" || mode === "tiktok") return "story";
  if (mode === "youtube") return format === "reels" || format === "story" ? "story" : "paisagem";
  if (mode === "x") return "paisagem";
  if (mode === "linkedin") return "quadrado";
  return "feed";
}

/** Limite de caracteres da legenda em cada rede. */
export const CAPTION_LIMIT: Record<PreviewMode, number> = {
  "ig-feed": 2200,
  "ig-story": 2200,
  "ig-reels": 2200,
  tiktok: 2200,
  facebook: 63206,
  linkedin: 3000,
  x: 280,
  youtube: 5000,
};

/** Layout dos slides internos do carrossel (capas especiais viram o clássico). */
export function slideLayout(layout: ArtLayout): ArtLayout {
  return layout === "mito" ||
    layout === "receita" ||
    layout === "citacao" ||
    layout === "dado" ||
    layout === "comparativo" ||
    layout === "pergunta"
    ? "classico"
    : layout;
}

/** Texto que vai na capa: o "texto da arte" do design ou, se vazio, o que combina com o layout. */
export function coverBody(d: Draft, handle?: string) {
  const layout = d.design.layout ?? "classico";
  if (d.design.body?.trim()) return d.design.body;
  const slides = d.format === "carrossel" ? d.slides.filter((s) => s.title || s.text) : [];
  // Itens de lista vindos da legenda ("• ...", "1. ...", "→ ...", "A) ...").
  const captionItems = d.caption
    .split("\n")
    .filter((l) => /^\s*([•\-→]|\d+[.)]|[A-D]\))\s*/.test(l))
    .map((l) => l.replace(/^\s*[A-D]\)\s*/, ""))
    .join("\n");
  const firstParagraph = d.caption.split(/\n\s*\n/)[0] ?? "";
  if (layout === "citacao") return handle ? `@${handle}` : "NutriConnect";
  if (layout === "mito") return slides[0]?.text || firstParagraph;
  if (
    layout === "lista" ||
    layout === "receita" ||
    layout === "comparativo" ||
    layout === "pergunta"
  )
    return captionItems || slides[0]?.text || "";
  if (layout === "dado" || layout === "editorial" || layout === "moldura")
    return d.hook && d.hook !== d.title ? d.hook : firstParagraph;
  return d.title && d.hook !== d.title ? d.hook : "";
}

/**
 * Artes da prévia (data URLs): a capa e, no carrossel, um slide por imagem. Redesenha com um
 * pequeno atraso enquanto a pessoa digita, em escala reduzida para ficar leve.
 */
export function useArtImages(d: Draft, size: ArtSize, handle?: string, scale = 0.5) {
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const key = JSON.stringify([
    d.title,
    d.hook,
    d.caption.slice(0, 200),
    d.slides,
    d.design,
    d.format,
    size,
    handle,
  ]);

  useEffect(() => {
    const my = ++seq.current;
    setBusy(true);
    const timer = window.setTimeout(async () => {
      const theme = d.design.theme ?? "oliva";
      const layout = d.design.layout ?? "classico";
      const slides = d.format === "carrossel" ? d.slides.filter((s) => s.title || s.text) : [];
      const total = slides.length ? slides.length + 1 : 1;
      const base = {
        size,
        theme,
        layout,
        handle,
        icon: d.design.icon,
        image: d.design.image,
        scale,
      };
      const out: string[] = [];
      try {
        out.push(
          (
            await drawArt({
              ...base,
              kicker: d.design.kicker,
              title: d.title || d.hook || "Seu título aqui",
              body: coverBody(d, handle),
              page: { index: 1, total },
            })
          ).toDataURL("image/jpeg", 0.85),
        );
        for (let i = 0; i < slides.length; i++) {
          if (my !== seq.current) return;
          const s = slides[i];
          out.push(
            (
              await drawArt({
                ...base,
                layout: slideLayout(layout),
                title: s.title || d.title,
                body: s.text,
                page: { index: i + 2, total },
              })
            ).toDataURL("image/jpeg", 0.85),
          );
        }
      } finally {
        if (my === seq.current) {
          setImages(out);
          setBusy(false);
        }
      }
    }, 220);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, scale]);

  return { images, busy };
}
