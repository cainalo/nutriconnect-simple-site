// Apresentação (/apresentacao) no admin: mostra o que está publicado e o que está em rascunho, e abre
// o editor, que é a própria apresentação em tela cheia.
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Pencil } from "lucide-react";
import { btnCls, btnPrimary, Panel, QueryError } from "@/components/admin/admin-ui";
import {
  PresentationEditor,
  stableJson,
  usePresentationRows,
} from "@/components/admin/presentation-editor";
import { useTr } from "@/components/settings-ui";
import type { Names } from "@/lib/appearance-data";

const NAMES: Record<string, Names> = {
  "pt-BR": ["Português", "Portuguese", "Portugués", "Portugais"],
  en: ["Inglês", "English", "Inglés", "Anglais"],
  es: ["Espanhol", "Spanish", "Español", "Espagnol"],
  fr: ["Francês", "French", "Francés", "Français"],
  layout: [
    "Equipe, fotos e ordem",
    "Team, photos and order",
    "Equipo, fotos y orden",
    "Équipe, photos et ordre",
  ],
};

export function PresentationSection() {
  const tr = useTr();
  const rows = usePresentationRows();
  const [open, setOpen] = useState(false);

  if (rows.error) return <QueryError error={rows.error} />;
  const list = rows.data ?? [];

  return (
    <>
      <Panel
        title={tr(["Apresentação", "Presentation", "Presentación", "Présentation"])}
        hint={tr([
          "Edite a própria apresentação, com a mesma aparência que o usuário vê. Nada vai ao ar sem Publicar.",
          "Edit the presentation itself, looking just as users see it. Nothing goes live until you Publish.",
          "Edita la presentación misma, con el mismo aspecto que ve el usuario. Nada se publica sin Publicar.",
          "Modifiez la présentation elle-même, telle que l'utilisateur la voit. Rien n'est mis en ligne sans Publier.",
        ])}
      >
        <ul className="mb-4 grid gap-2 sm:grid-cols-2">
          {list.map((r) => {
            const pending = stableJson(r.draft) !== stableJson(r.published);
            return (
              <li
                key={r.key}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm"
              >
                <span className="font-medium">{NAMES[r.key] ? tr(NAMES[r.key]) : r.key}</span>
                <span
                  className={
                    pending
                      ? "text-xs font-semibold text-amber-600"
                      : "text-xs text-muted-foreground"
                  }
                >
                  {pending
                    ? tr([
                        "alterações não publicadas",
                        "unpublished changes",
                        "cambios sin publicar",
                        "modifications non publiées",
                      ])
                    : tr(["publicado", "published", "publicado", "publié"])}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btnPrimary}
            onClick={() => setOpen(true)}
            disabled={!rows.data}
          >
            <Pencil className="h-3.5 w-3.5" />{" "}
            {tr([
              "Editar apresentação",
              "Edit presentation",
              "Editar presentación",
              "Modifier la présentation",
            ])}
          </button>
          <Link to="/apresentacao" className={btnCls} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />{" "}
            {tr(["Ver publicada", "View published", "Ver publicada", "Voir la version publiée"])}
          </Link>
        </div>
      </Panel>
      {open && <PresentationEditor onClose={() => setOpen(false)} />}
    </>
  );
}
