// Miniaturas das artes (modelos e posts) desenhadas no navegador, com cache e brilho enquanto
// carregam. Usam a mesma capa do editor (coverBody), então o card mostra exatamente o que vai sair.
import { useEffect, useState } from "react";
import { drawArt, type ArtInput } from "@/lib/post-art";
import type { SocialPost } from "@/lib/social-studio";
import type { SocialTemplate } from "@/lib/social-templates";
import { cn } from "@/lib/utils";
import {
  coverBody,
  draftFromPost,
  draftFromTemplate,
  type Draft,
} from "@/components/admin/social/use-art";

const cache = new Map<string, string>();

export function ArtThumb({ input, className }: { input: ArtInput; className?: string }) {
  const key = JSON.stringify(input);
  const [src, setSrc] = useState(() => cache.get(key) ?? "");
  useEffect(() => {
    const hit = cache.get(key);
    if (hit) {
      setSrc(hit);
      return;
    }
    let alive = true;
    void drawArt(input).then((c) => {
      const url = c.toDataURL("image/jpeg", 0.86);
      cache.set(key, url);
      if (alive) setSrc(url);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return src ? (
    <img
      src={src}
      alt=""
      draggable={false}
      className={cn("block object-cover animate-in fade-in duration-500", className)}
    />
  ) : (
    <div className={cn("st-shimmer bg-secondary", className)} />
  );
}

/** Capa de um rascunho no feed 4:5. */
export function DraftThumb({
  draft,
  scale = 0.3,
  className,
}: {
  draft: Draft;
  scale?: number;
  className?: string;
}) {
  return (
    <ArtThumb
      className={className}
      input={{
        size: "feed",
        theme: draft.design.theme ?? "oliva",
        layout: draft.design.layout ?? "classico",
        icon: draft.design.icon,
        kicker: draft.design.kicker,
        image: draft.design.image,
        title: draft.title || draft.hook || "Sem título",
        body: coverBody(draft, "nutriconnect"),
        handle: "nutriconnect",
        scale,
      }}
    />
  );
}

export function TemplateThumb({
  template,
  className,
}: {
  template: SocialTemplate;
  className?: string;
}) {
  return <DraftThumb draft={draftFromTemplate(template)} className={className} />;
}

/** Miniatura de um post salvo, a partir do design dele. */
export function PostThumb({ post, className }: { post: SocialPost; className?: string }) {
  return <DraftThumb draft={draftFromPost(post)} scale={0.24} className={className} />;
}
