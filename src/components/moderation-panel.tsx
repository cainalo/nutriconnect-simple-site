import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTr } from "@/components/settings-ui";
import type { Names } from "@/lib/appearance-data";

type QueueItem = {
  target_type: "post" | "comment" | "user";
  target_id: string;
  reports: number;
  reasons: string[];
  last_report_at: string;
  hidden: boolean;
  preview: string | null;
  author_name: string | null;
};

const TARGETS: Record<string, Names> = {
  post: ["Publicação", "Post", "Publicación", "Publication"],
  comment: ["Comentário", "Comment", "Comentario", "Commentaire"],
  user: ["Perfil", "Profile", "Perfil", "Profil"],
};
const REASONS: Record<string, Names> = {
  spam: ["Spam/golpe", "Spam/scam", "Spam/estafa", "Spam/arnaque"],
  desinformacao: ["Desinformação", "Misinformation", "Desinformación", "Désinformation"],
  ofensivo: ["Ofensivo", "Offensive", "Ofensivo", "Offensant"],
  assedio: ["Assédio", "Harassment", "Acoso", "Harcèlement"],
  inadequado: ["Impróprio", "Inappropriate", "Inapropiado", "Inapproprié"],
  outro: ["Outro", "Other", "Otro", "Autre"],
};

/** Fila de denúncias (inclui as abertas pela moderação automática por IA). */
export function ModerationPanel({ onCount }: { onCount?: (n: number) => void }) {
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const tr = useTr();
  // A mensagem de erro do carregamento usa o idioma atual sem recriar o load a cada render.
  const trRef = useRef(tr);
  trRef.current = tr;
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("moderation_queue");
    if (error) {
      toast.error(
        trRef.current([
          "Não foi possível carregar as denúncias.",
          "Couldn't load the reports.",
          "No se pudieron cargar las denuncias.",
          "Impossible de charger les signalements.",
        ]),
      );
      setItems([]);
      return;
    }
    const rows = (data ?? []) as QueueItem[];
    setItems(rows);
    onCount?.(rows.length);
  }, [onCount]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (item: QueueItem, hide: boolean) => {
    const key = `${item.target_type}:${item.target_id}`;
    setBusy(key);
    const { error } = await supabase.rpc("resolve_reports", {
      p_target_type: item.target_type,
      p_target_id: item.target_id,
      p_hide: hide,
    });
    setBusy(null);
    if (error)
      return void toast.error(
        tr([
          "Não foi possível registrar a decisão.",
          "Couldn't record the decision.",
          "No se pudo registrar la decisión.",
          "Impossible d'enregistrer la décision.",
        ]),
      );
    toast.success(
      hide
        ? tr([
            "Conteúdo mantido oculto.",
            "Content kept hidden.",
            "Contenido mantenido oculto.",
            "Contenu maintenu masqué.",
          ])
        : tr([
            "Conteúdo restaurado.",
            "Content restored.",
            "Contenido restaurado.",
            "Contenu rétabli.",
          ]),
    );
    await load();
  };

  if (items === null)
    return (
      <p className="text-sm text-muted-foreground">
        {tr(["Carregando…", "Loading…", "Cargando…", "Chargement…"])}
      </p>
    );
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
        {tr([
          "Nenhuma denúncia pendente.",
          "No pending reports.",
          "No hay denuncias pendientes.",
          "Aucun signalement en attente.",
        ])}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const key = `${item.target_type}:${item.target_id}`;
        return (
          <li key={key} className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-full bg-secondary px-2.5 py-0.5 font-bold">
                {tr(TARGETS[item.target_type])}
              </span>
              <span className="text-muted-foreground">
                {item.reports} {tr(["denúncia(s)", "report(s)", "denuncia(s)", "signalement(s)"])} ·{" "}
                {item.reasons.map((r) => (REASONS[r] ? tr(REASONS[r]) : r)).join(", ")}
              </span>
              {item.hidden && (
                <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 font-bold text-destructive">
                  {tr(["Oculto", "Hidden", "Oculto", "Masqué"])}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {tr(["Autor", "Author", "Autor", "Auteur"])}: {item.author_name ?? "—"}
            </p>
            <p className="mt-1 whitespace-pre-line text-sm text-foreground">
              {item.preview || tr(["(sem texto)", "(no text)", "(sin texto)", "(sans texte)"])}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy === key}
                onClick={() => decide(item, true)}
                className="rounded-full bg-destructive px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {tr(["Manter oculto", "Keep hidden", "Mantener oculto", "Garder masqué"])}
              </button>
              <button
                type="button"
                disabled={busy === key}
                onClick={() => decide(item, false)}
                className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold hover:bg-secondary disabled:opacity-60"
              >
                {tr([
                  "Restaurar (improcedente)",
                  "Restore (unfounded)",
                  "Restaurar (improcedente)",
                  "Rétablir (non fondé)",
                ])}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
