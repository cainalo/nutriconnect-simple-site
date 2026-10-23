// O que a IA barrou antes de publicar: conteúdo, foto, motivo e quem tentou. O administrador mantém a
// decisão ou libera (a IA errou: a publicação/comentário vai ao ar em nome da pessoa).
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, CalendarDays, Check, ImageOff, Send, ShieldBan } from "lucide-react";
import {
  Badge,
  Empty,
  Pagination,
  Panel,
  QueryError,
  SearchBox,
  StatCard,
  btnCls,
  btnPrimary,
  dateTime,
  useDebounced,
} from "@/components/admin/admin-ui";
import { adminRpc, useAdminAction } from "@/lib/admin-api";
import { supabase } from "@/integrations/supabase/client";
import { useTr } from "@/components/settings-ui";
import type { Names } from "@/lib/appearance-data";

const PAGE = 20;
const BUCKET = "ai-rejections";

export const CODE_LABEL: Record<string, Names> = {
  fora_do_tema: ["Fora do tema", "Off topic", "Fuera de tema", "Hors sujet"],
  imagem_fora_do_tema: [
    "Foto fora do tema",
    "Off-topic photo",
    "Foto fuera de tema",
    "Photo hors sujet",
  ],
  imagem_nao_combina: [
    "Foto não combina",
    "Photo doesn't match",
    "La foto no coincide",
    "La photo ne correspond pas",
  ],
  spam: ["Spam", "Spam", "Spam", "Spam"],
  desinformacao: ["Desinformação", "Misinformation", "Desinformación", "Désinformation"],
  ofensivo: ["Ofensivo", "Offensive", "Ofensivo", "Offensant"],
  assedio: ["Assédio", "Harassment", "Acoso", "Harcèlement"],
  inadequado: ["Inadequado", "Inappropriate", "Inapropiado", "Inapproprié"],
};

const STATUS: readonly { id: string; label: Names }[] = [
  { id: "pendente", label: ["A revisar", "To review", "Por revisar", "À vérifier"] },
  { id: "mantida", label: ["Mantidos", "Kept", "Mantenidos", "Maintenus"] },
  { id: "liberada", label: ["Liberados", "Released", "Liberados", "Débloqués"] },
  { id: "", label: ["Todos", "All", "Todos", "Tous"] },
];

interface Rejection {
  id: string;
  user_id: string;
  user_name: string;
  user_username: string;
  kind: "post" | "comment";
  post_id: string | null;
  title: string | null;
  body: string;
  tags: string[];
  recipe: unknown;
  context: { type?: string; communityId?: string };
  community_name: string | null;
  image_path: string | null;
  code: string;
  message: string;
  status: "pendente" | "mantida" | "liberada";
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  published_id: string | null;
  created_at: string;
  user_rejections_30d: number;
  total: number;
}

interface Summary {
  pending: number;
  today: number;
  last_7d: number;
  by_code: Record<string, number>;
}

export function useAiRejectionsSummary() {
  return useQuery({
    queryKey: ["admin", "ai-rejections", "summary"],
    queryFn: async () => (await adminRpc<Summary[]>("admin_ai_rejections_summary"))[0] ?? null,
    retry: false,
  });
}

/** Foto barrada: bucket privado, aberto com link assinado de 10 minutos. */
function RejectedImage({ path }: { path: string }) {
  const tr = useTr();
  const url = useQuery({
    queryKey: ["admin", "ai-rejections", "img", path],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 600);
      if (error) throw error;
      return data.signedUrl;
    },
    staleTime: 5 * 60_000,
  });
  if (url.isError)
    return (
      <span className="grid h-28 w-28 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground">
        <ImageOff className="h-5 w-5" />
      </span>
    );
  return url.data ? (
    <a href={url.data} target="_blank" rel="noreferrer" className="shrink-0">
      <img
        src={url.data}
        alt={tr(["Foto barrada", "Blocked photo", "Foto bloqueada", "Photo bloquée"])}
        className="h-28 w-28 rounded-xl object-cover"
      />
    </a>
  ) : (
    <span className="h-28 w-28 shrink-0 animate-pulse rounded-xl bg-secondary" />
  );
}

/** Liberar: copia a foto para o bucket público (na pasta do administrador) e publica em nome da pessoa. */
async function release(r: Rejection, tr: (names: Names) => string) {
  let imageUrl: string | null = null;
  if (r.kind === "post" && r.image_path) {
    const { data: blob, error } = await supabase.storage.from(BUCKET).download(r.image_path);
    if (error)
      throw new Error(
        `${tr(["Não foi possível abrir a foto:", "Couldn't open the photo:", "No se pudo abrir la foto:", "Impossible d'ouvrir la photo :"])} ${error.message}`,
      );
    const { data: auth } = await supabase.auth.getUser();
    const ext = r.image_path.split(".").pop() ?? "jpg";
    const dest = `${auth.user?.id}/${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage
      .from("post-images")
      .upload(dest, blob, { contentType: blob.type || "image/jpeg", upsert: false });
    if (up.error)
      throw new Error(
        `${tr(["Não foi possível copiar a foto:", "Couldn't copy the photo:", "No se pudo copiar la foto:", "Impossible de copier la photo :"])} ${up.error.message}`,
      );
    imageUrl = supabase.storage.from("post-images").getPublicUrl(dest).data.publicUrl;
  }
  return adminRpc("admin_ai_rejection_decide", {
    p_id: r.id,
    p_release: true,
    p_image_url: imageUrl,
  });
}

function RejectionRow({ r }: { r: Rejection }) {
  const tr = useTr();
  const keep = useAdminAction(
    () => adminRpc("admin_ai_rejection_decide", { p_id: r.id, p_release: false }),
    tr([
      "Decisão da IA mantida.",
      "AI decision kept.",
      "Decisión de la IA mantenida.",
      "Décision de l'IA maintenue.",
    ]),
  );
  const free = useAdminAction(
    () => release(r, tr),
    tr([
      "Conteúdo liberado e publicado.",
      "Content released and published.",
      "Contenido liberado y publicado.",
      "Contenu débloqué et publié.",
    ]),
  );
  const busy = keep.isPending || free.isPending;

  return (
    <li className="flex flex-wrap gap-4 rounded-2xl border border-border bg-card p-4">
      {r.image_path && <RejectedImage path={r.image_path} />}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge tone="bad">{CODE_LABEL[r.code] ? tr(CODE_LABEL[r.code]) : r.code}</Badge>
          <Badge>
            {r.kind === "post"
              ? tr(["Publicação", "Post", "Publicación", "Publication"])
              : tr(["Comentário", "Comment", "Comentario", "Commentaire"])}
          </Badge>
          {r.context?.type && <Badge>{r.context.type}</Badge>}
          {r.community_name && <Badge tone="info">{r.community_name}</Badge>}
          {r.status === "mantida" && (
            <Badge tone="warn">{tr(["Mantido", "Kept", "Mantenido", "Maintenu"])}</Badge>
          )}
          {r.status === "liberada" && (
            <Badge tone="good">{tr(["Liberado", "Released", "Liberado", "Débloqué"])}</Badge>
          )}
          <span className="text-muted-foreground">{dateTime(r.created_at)}</span>
        </div>
        <p className="text-sm">
          <strong>{r.user_name}</strong>{" "}
          <span className="text-muted-foreground">@{r.user_username}</span>
          {r.user_rejections_30d > 2 && (
            <span className="ml-2 text-xs font-semibold text-rose-600">
              {r.user_rejections_30d}{" "}
              {tr([
                "barrados nos últimos 30 dias",
                "blocked in the last 30 days",
                "bloqueados en los últimos 30 días",
                "bloqués ces 30 derniers jours",
              ])}
            </span>
          )}
        </p>
        {r.title && <p className="font-semibold">{r.title}</p>}
        {r.body && <p className="whitespace-pre-wrap text-sm text-foreground/90">{r.body}</p>}
        {r.tags.length > 0 && (
          <p className="text-xs text-muted-foreground">{r.tags.map((t) => `#${t}`).join(" ")}</p>
        )}
        {r.recipe != null && (
          <p className="text-xs text-muted-foreground">
            {tr([
              "Inclui uma receita.",
              "Includes a recipe.",
              "Incluye una receta.",
              "Contient une recette.",
            ])}
          </p>
        )}
        <p className="rounded-xl bg-secondary/60 px-3 py-2 text-xs">
          <span className="font-semibold">
            {tr([
              "O que a pessoa viu:",
              "What the person saw:",
              "Lo que vio la persona:",
              "Ce que la personne a vu :",
            ])}
          </span>{" "}
          {r.message}
        </p>
        {r.status !== "pendente" && r.reviewed_by_name && (
          <p className="text-xs text-muted-foreground">
            {tr(["Revisado por", "Reviewed by", "Revisado por", "Vérifié par"])}{" "}
            {r.reviewed_by_name} {tr(["em", "on", "el", "le"])} {dateTime(r.reviewed_at)}
          </p>
        )}
        {r.status === "pendente" && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              className={btnCls}
              disabled={busy}
              onClick={() => keep.mutate(undefined)}
            >
              <Check className="h-3.5 w-3.5" />{" "}
              {tr(["A IA acertou", "The AI was right", "La IA acertó", "L'IA avait raison"])}
            </button>
            <button
              type="button"
              className={btnPrimary}
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    r.kind === "post"
                      ? tr([
                          "Publicar este conteúdo em nome da pessoa? Ela será avisada.",
                          "Publish this content on the person's behalf? They'll be notified.",
                          "¿Publicar este contenido en nombre de la persona? Se le avisará.",
                          "Publier ce contenu au nom de la personne ? Elle sera prévenue.",
                        ])
                      : tr([
                          "Publicar este comentário em nome da pessoa? Ela será avisada.",
                          "Publish this comment on the person's behalf? They'll be notified.",
                          "¿Publicar este comentario en nombre de la persona? Se le avisará.",
                          "Publier ce commentaire au nom de la personne ? Elle sera prévenue.",
                        ]),
                  )
                )
                  free.mutate(undefined);
              }}
            >
              <Send className="h-3.5 w-3.5" />{" "}
              {tr([
                "Liberar e publicar",
                "Release and publish",
                "Liberar y publicar",
                "Débloquer et publier",
              ])}
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

export function AiRejectionsSection() {
  const tr = useTr();
  const [status, setStatus] = useState<string>("pendente");
  const [code, setCode] = useState<string>("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const q = useDebounced(query);
  const summary = useAiRejectionsSummary();
  const list = useQuery({
    queryKey: ["admin", "ai-rejections", status, code, q, offset],
    queryFn: () =>
      adminRpc<Rejection[]>("admin_ai_rejections", {
        p_status: status || null,
        p_code: code || null,
        p_search: q,
        p_limit: PAGE,
        p_offset: offset,
      }),
  });
  const rows = list.data ?? [];
  const s = summary.data;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={tr(["A revisar", "To review", "Por revisar", "À vérifier"])}
          value={s?.pending ?? "–"}
          icon={Bot}
          tone={s?.pending ? "alert" : "default"}
        />
        <StatCard
          label={tr(["Barrados hoje", "Blocked today", "Bloqueados hoy", "Bloqués aujourd'hui"])}
          value={s?.today ?? "–"}
          icon={ShieldBan}
        />
        <StatCard
          label={tr(["Últimos 7 dias", "Last 7 days", "Últimos 7 días", "7 derniers jours"])}
          value={s?.last_7d ?? "–"}
          icon={CalendarDays}
        />
      </div>

      <Panel
        title={tr([
          "Barrados pela IA",
          "Blocked by the AI",
          "Bloqueados por la IA",
          "Bloqués par l'IA",
        ])}
        hint={tr([
          "Publicações e comentários que a IA reprovou antes de irem ao ar. O conteúdo fica guardado por 30 dias só para esta revisão.",
          "Posts and comments the AI rejected before they went live. The content is kept for 30 days for this review only.",
          "Publicaciones y comentarios que la IA rechazó antes de publicarse. El contenido se guarda 30 días solo para esta revisión.",
          "Publications et commentaires refusés par l'IA avant leur mise en ligne. Le contenu est conservé 30 jours uniquement pour cette vérification.",
        ])}
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {STATUS.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={status === o.id}
              className={status === o.id ? btnPrimary : btnCls}
              onClick={() => {
                setStatus(o.id);
                setOffset(0);
              }}
            >
              {tr(o.label)}
            </button>
          ))}
          <select
            className="rounded-full border border-border bg-card px-3 py-2 text-xs"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setOffset(0);
            }}
            aria-label={tr(["Motivo", "Reason", "Motivo", "Motif"])}
          >
            <option value="">
              {tr(["Todos os motivos", "All reasons", "Todos los motivos", "Tous les motifs"])}
            </option>
            {Object.entries(CODE_LABEL).map(([id, label]) => (
              <option key={id} value={id}>
                {tr(label)}
                {s?.by_code?.[id] ? ` (${s.by_code[id]})` : ""}
              </option>
            ))}
          </select>
          <div className="min-w-[14rem] flex-1">
            <SearchBox
              value={query}
              onChange={(v) => {
                setQuery(v);
                setOffset(0);
              }}
              placeholder={tr([
                "Buscar por texto ou pessoa",
                "Search by text or person",
                "Buscar por texto o persona",
                "Rechercher par texte ou personne",
              ])}
            />
          </div>
        </div>

        <QueryError error={list.error ?? summary.error} />
        {list.isLoading ? (
          <p className="text-sm text-muted-foreground">
            {tr(["Carregando…", "Loading…", "Cargando…", "Chargement…"])}
          </p>
        ) : rows.length === 0 ? (
          <Empty icon={Bot}>
            {tr(["Nada por aqui.", "Nothing here.", "Nada por aquí.", "Rien ici."])}
          </Empty>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <RejectionRow key={r.id} r={r} />
            ))}
          </ul>
        )}
        <Pagination offset={offset} limit={PAGE} total={rows[0]?.total ?? 0} onChange={setOffset} />
      </Panel>
    </div>
  );
}
