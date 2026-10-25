// Galeria de modelos do estúdio: os modelos prontos do NutriConnect (por categoria) e os salvos pela
// equipe, em cards com a capa real de cada um.
import { useState } from "react";
import { BookMarked, Pencil, Shapes, Sparkles, Wand2 } from "lucide-react";
import { FORMAT_LABEL, NETWORK_LABEL, type SocialPost } from "@/lib/social-studio";
import type { Network, PostFormat } from "@/lib/social-studio.functions";
import {
  CATEGORY_LABEL,
  CATEGORY_STYLE,
  TEMPLATES,
  type SocialTemplate,
  type TemplateCategory,
} from "@/lib/social-templates";
import { cn } from "@/lib/utils";
import { useTr } from "@/components/settings-ui";
import { ArtIcon, EmptyState } from "@/components/admin/social/kit";
import { NETWORK_STYLE, badgeBg } from "@/components/admin/social/kit-styles";
import { PostThumb, TemplateThumb } from "@/components/admin/social/template-thumb";

type Filter = TemplateCategory | "todos" | "equipe";

export function TemplatesGallery({
  posts,
  onUseTemplate,
  onUseTeam,
  onEditTeam,
}: {
  posts: SocialPost[];
  onUseTemplate: (t: SocialTemplate) => void;
  onUseTeam: (p: SocialPost) => void;
  onEditTeam: (p: SocialPost) => void;
}) {
  const tr = useTr();
  const [cat, setCat] = useState<Filter>("todos");
  const team = posts.filter((p) => p.is_template);
  const list = TEMPLATES.filter((t) => cat === "todos" || t.category === cat);
  const filters = ["todos", ...Object.keys(CATEGORY_LABEL), "equipe"] as Filter[];

  return (
    <div className="@container min-w-0 space-y-4">
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5">
        {filters.map((c) => {
          const on = cat === c;
          const color =
            c === "todos" ? "#3f4727" : c === "equipe" ? "#b4532a" : CATEGORY_STYLE[c].color;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition",
                on
                  ? "border-transparent text-white shadow-sm"
                  : "border-border/70 bg-card text-muted-foreground hover:text-foreground",
              )}
              style={on ? { background: badgeBg(color) } : undefined}
            >
              {c === "todos" ? (
                <Shapes className="h-3.5 w-3.5" />
              ) : c === "equipe" ? (
                <BookMarked className="h-3.5 w-3.5" />
              ) : (
                <ArtIcon name={CATEGORY_STYLE[c].icon} className="h-3.5 w-3.5" />
              )}
              {c === "todos"
                ? `${tr(["Todos", "All", "Todos", "Tous"])} (${TEMPLATES.length})`
                : c === "equipe"
                  ? `${tr(["Da equipe", "Team", "Del equipo", "De l’équipe"])} (${team.length})`
                  : CATEGORY_LABEL[c]}
            </button>
          );
        })}
      </div>

      {cat === "equipe" ? (
        team.length === 0 ? (
          <EmptyState
            icon={BookMarked}
            color="#b4532a"
            title={tr([
              "Nenhum modelo da equipe ainda",
              "No team templates yet",
              "Aún no hay plantillas del equipo",
              "Aucun modèle de l’équipe pour l’instant",
            ])}
            text={tr([
              "No editor, em Publicar, use “Salvar como modelo” para guardar os formatos favoritos aqui.",
              "In the editor, under Publish, use “Save as template” to keep your favorite formats here.",
              "En el editor, en Publicar, usa “Guardar como plantilla” para guardar aquí tus formatos favoritos.",
              "Dans l’éditeur, sous Publier, utilisez « Enregistrer comme modèle » pour garder vos formats préférés ici.",
            ])}
          />
        ) : (
          <ul className="grid grid-cols-2 gap-3 @2xl:grid-cols-3 @4xl:grid-cols-4 @6xl:grid-cols-6">
            {team.map((p, k) => {
              const net = NETWORK_STYLE[p.network as Network] ?? NETWORK_STYLE.outro;
              return (
                <li key={p.id} className="min-w-0">
                  <article
                    className="nc-tile-in st-card group overflow-hidden rounded-[1.25rem] border border-border/60 bg-card"
                    style={{ animationDelay: `${Math.min(k, 16) * 40}ms` }}
                  >
                    <div className="relative overflow-hidden">
                      <PostThumb
                        post={p}
                        className="aspect-[4/5] w-full transition duration-500 group-hover:scale-[1.04]"
                      />
                      <span
                        className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-lg text-white shadow"
                        style={{ background: badgeBg(net.color) }}
                      >
                        <net.icon className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="truncate text-xs font-bold text-foreground">{p.title}</p>
                      <p className="truncate text-[10.5px] text-muted-foreground">
                        {NETWORK_LABEL[p.network as Network]} ·{" "}
                        {FORMAT_LABEL[p.format as PostFormat]}
                      </p>
                      <div className="mt-2.5 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => onUseTeam(p)}
                          className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-full bg-accent text-[11px] font-bold text-accent-foreground transition hover:bg-accent/90"
                        >
                          <Wand2 className="h-3.5 w-3.5" />{" "}
                          {tr(["Usar", "Use", "Usar", "Utiliser"])}
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditTeam(p)}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border/70 text-muted-foreground transition hover:text-foreground"
                          aria-label={tr([
                            "Editar modelo",
                            "Edit template",
                            "Editar plantilla",
                            "Modifier le modèle",
                          ])}
                          title={tr([
                            "Editar modelo",
                            "Edit template",
                            "Editar plantilla",
                            "Modifier le modèle",
                          ])}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )
      ) : (
        <ul className="grid grid-cols-2 gap-3 @2xl:grid-cols-3 @4xl:grid-cols-4 @6xl:grid-cols-6">
          {list.map((t, k) => {
            const net = NETWORK_STYLE[t.network];
            const cs = CATEGORY_STYLE[t.category];
            return (
              <li key={t.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => onUseTemplate(t)}
                  className="nc-tile-in st-card group flex h-full w-full flex-col overflow-hidden rounded-[1.25rem] border border-border/60 bg-card text-left"
                  style={{ animationDelay: `${Math.min(k, 16) * 40}ms` }}
                >
                  <div className="relative overflow-hidden">
                    <TemplateThumb
                      template={t}
                      className="aspect-[4/5] w-full transition duration-500 group-hover:scale-[1.04]"
                    />
                    <span
                      className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-lg text-white shadow"
                      style={{ background: badgeBg(net.color) }}
                    >
                      <net.icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="absolute inset-x-2 bottom-2 flex translate-y-2 items-center justify-center gap-1 rounded-full bg-white/95 py-1.5 text-[11px] font-bold text-neutral-900 opacity-0 shadow-lg transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      <Sparkles className="h-3 w-3" />{" "}
                      {tr([
                        "Usar este modelo",
                        "Use this template",
                        "Usar esta plantilla",
                        "Utiliser ce modèle",
                      ])}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    <p className="truncate text-xs font-bold text-foreground">{t.name}</p>
                    <p className="mt-0.5 line-clamp-2 min-h-[2.4em] text-[10.5px] leading-snug text-muted-foreground">
                      {t.description}
                    </p>
                    <p
                      className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-semibold"
                      style={{ color: cs.color }}
                    >
                      <ArtIcon name={cs.icon} className="h-3 w-3" />
                      <span className="truncate">
                        {CATEGORY_LABEL[t.category]} · {FORMAT_LABEL[t.format]}
                      </span>
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
