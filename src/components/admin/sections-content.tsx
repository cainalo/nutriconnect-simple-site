import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, ExternalLink, Pencil, Pin, PinOff, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  ConfirmDialog,
  Empty,
  Pagination,
  Panel,
  QueryError,
  SearchBox,
  btnCls,
  btnDanger,
  btnPrimary,
  dateTime,
  inputCls,
  shortDate,
  useDebounced,
} from "@/components/admin/admin-ui";
import {
  adminActions,
  useAdminAction,
  useAdminPosts,
  useAnnouncements,
  useThemes,
  type AdminPost,
  type Announcement,
  type ThemeRow,
} from "@/lib/admin-api";
import { supabase } from "@/integrations/supabase/client";
import { usePostTypeColor } from "@/lib/post-type";
import { useTr } from "@/components/settings-ui";
import type { Names } from "@/lib/appearance-data";

const PAGE = 20;
const TYPE_LABEL: Record<AdminPost["type"], Names> = {
  receita: ["Receita", "Recipe", "Receta", "Recette"],
  experiencia: ["Experiência", "Experience", "Experiencia", "Expérience"],
  pergunta: ["Pergunta", "Question", "Pregunta", "Question"],
  geral: ["Conversa", "Chat", "Conversación", "Discussion"],
};

// ── Publicações ──────────────────────────────────────────────────────────────

function PostRow({ post, onDelete }: { post: AdminPost; onDelete: (p: AdminPost) => void }) {
  const tr = useTr();
  const color = usePostTypeColor(post.type);
  const hide = useAdminAction(
    adminActions.postHidden,
    post.hidden
      ? tr([
          "Publicação restaurada.",
          "Post restored.",
          "Publicación restaurada.",
          "Publication restaurée.",
        ])
      : tr([
          "Publicação ocultada.",
          "Post hidden.",
          "Publicación ocultada.",
          "Publication masquée.",
        ]),
  );
  const pin = useAdminAction(
    adminActions.postPinned,
    post.pinned
      ? tr([
          "Publicação desafixada.",
          "Post unpinned.",
          "Publicación desfijada.",
          "Publication désépinglée.",
        ])
      : tr(["Publicação fixada.", "Post pinned.", "Publicación fijada.", "Publication épinglée."]),
  );
  return (
    <li
      className="flex flex-wrap gap-4 rounded-2xl border-2 bg-card p-4"
      style={{ borderColor: `color-mix(in srgb, ${color} 55%, var(--border))` }}
    >
      {post.image_url && (
        <img
          src={post.image_url}
          alt=""
          className="h-20 w-20 shrink-0 rounded-xl object-cover"
          loading="lazy"
        />
      )}
      <div className="min-w-0 flex-1 basis-64">
        <p className="flex flex-wrap items-center gap-1.5 text-xs">
          <span
            className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
            style={{ background: color }}
          >
            {tr(TYPE_LABEL[post.type])}
          </span>
          {post.hidden && <Badge tone="bad">{tr(["Oculta", "Hidden", "Oculta", "Masquée"])}</Badge>}
          {post.pinned && (
            <Badge tone="info">{tr(["Fixada", "Pinned", "Fijada", "Épinglée"])}</Badge>
          )}
          {post.reports_pending > 0 && (
            <Badge tone="warn">
              {post.reports_pending}{" "}
              {post.reports_pending > 1
                ? tr(["denúncias", "reports", "denuncias", "signalements"])
                : tr(["denúncia", "report", "denuncia", "signalement"])}
            </Badge>
          )}
          <span className="text-muted-foreground">
            {tr(["por", "by", "por", "par"])}{" "}
            <b className="font-semibold text-foreground">{post.author_name}</b> (@
            {post.author_username}) · {dateTime(post.created_at)}
          </span>
        </p>
        {post.title && (
          <p className="mt-1 font-display text-sm font-bold text-foreground">{post.title}</p>
        )}
        <p className="mt-0.5 line-clamp-3 text-sm text-muted-foreground">{post.body}</p>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {post.reactions} {tr(["reações", "reactions", "reacciones", "réactions"])} ·{" "}
          {post.comments} {tr(["comentários", "comments", "comentarios", "commentaires"])}
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <Link
          to="/explorar"
          search={{ post: post.id }}
          className={btnCls}
          title={tr([
            "Abrir a publicação",
            "Open the post",
            "Abrir la publicación",
            "Ouvrir la publication",
          ])}
        >
          <ExternalLink className="h-3.5 w-3.5" /> {tr(["Ver", "View", "Ver", "Voir"])}
        </Link>
        <button
          type="button"
          disabled={hide.isPending}
          onClick={() => hide.mutate({ post: post.id, hidden: !post.hidden })}
          className={btnCls}
        >
          {post.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {post.hidden
            ? tr(["Restaurar", "Restore", "Restaurar", "Restaurer"])
            : tr(["Ocultar", "Hide", "Ocultar", "Masquer"])}
        </button>
        <button
          type="button"
          disabled={pin.isPending}
          onClick={() => pin.mutate({ post: post.id, pinned: !post.pinned })}
          className={btnCls}
        >
          {post.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          {post.pinned
            ? tr(["Desafixar", "Unpin", "Desfijar", "Désépingler"])
            : tr(["Fixar", "Pin", "Fijar", "Épingler"])}
        </button>
        <button type="button" onClick={() => onDelete(post)} className={btnDanger}>
          <Trash2 className="h-3.5 w-3.5" /> {tr(["Apagar", "Delete", "Eliminar", "Supprimer"])}
        </button>
      </div>
    </li>
  );
}

export function PostsSection() {
  const tr = useTr();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("todos");
  const [offset, setOffset] = useState(0);
  const q = useDebounced(query);
  const posts = useAdminPosts({ query: q, status, offset, limit: PAGE });
  const list = posts.data ?? [];
  const [toDelete, setToDelete] = useState<AdminPost | null>(null);
  const del = useAdminAction(
    adminActions.deletePost,
    tr([
      "Publicação apagada.",
      "Post deleted.",
      "Publicación eliminada.",
      "Publication supprimée.",
    ]),
  );

  return (
    <Panel
      title={tr(["Publicações", "Posts", "Publicaciones", "Publications"])}
      hint={tr([
        "Todas as publicações da rede, incluindo as ocultas. Ocultar mantém o registro; apagar remove de vez.",
        "Every post on the network, including hidden ones. Hiding keeps the record; deleting removes it for good.",
        "Todas las publicaciones de la red, incluidas las ocultas. Ocultar conserva el registro; eliminar lo borra para siempre.",
        "Toutes les publications du réseau, y compris celles masquées. Masquer conserve l'enregistrement ; supprimer l'efface définitivement.",
      ])}
    >
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox
          value={query}
          onChange={(v) => {
            setQuery(v);
            setOffset(0);
          }}
          placeholder={tr([
            "Texto, título ou autor…",
            "Text, title or author…",
            "Texto, título o autor…",
            "Texte, titre ou auteur…",
          ])}
        />
        <div className="flex max-w-full flex-wrap gap-1.5">
          {(
            [
              ["todos", ["Todas", "All", "Todas", "Toutes"]],
              ["denunciados", ["Denunciadas", "Reported", "Denunciadas", "Signalées"]],
              ["ocultos", ["Ocultas", "Hidden", "Ocultas", "Masquées"]],
              ["fixados", ["Fixadas", "Pinned", "Fijadas", "Épinglées"]],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={status === id}
              onClick={() => {
                setStatus(id);
                setOffset(0);
              }}
              className={`shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                status === id
                  ? "border-accent bg-accent-soft text-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {tr(label)}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        {posts.error ? (
          <QueryError error={posts.error} />
        ) : posts.isLoading ? (
          <p className="text-sm text-muted-foreground">
            {tr(["Carregando…", "Loading…", "Cargando…", "Chargement…"])}
          </p>
        ) : list.length === 0 ? (
          <Empty>
            {tr([
              "Nenhuma publicação encontrada.",
              "No posts found.",
              "No se encontraron publicaciones.",
              "Aucune publication trouvée.",
            ])}
          </Empty>
        ) : (
          <ul className="space-y-3">
            {list.map((p) => (
              <PostRow key={p.id} post={p} onDelete={setToDelete} />
            ))}
          </ul>
        )}
        <Pagination offset={offset} limit={PAGE} total={list[0]?.total ?? 0} onChange={setOffset} />
      </div>
      <ConfirmDialog
        open={!!toDelete}
        title={tr([
          "Apagar esta publicação?",
          "Delete this post?",
          "¿Eliminar esta publicación?",
          "Supprimer cette publication ?",
        ])}
        description={tr([
          "Isso remove a publicação, as reações e os comentários. Não dá para desfazer.",
          "This removes the post, its reactions and comments. It can't be undone.",
          "Esto elimina la publicación, las reacciones y los comentarios. No se puede deshacer.",
          "Cela supprime la publication, ses réactions et ses commentaires. C'est irréversible.",
        ])}
        confirmLabel={tr(["Apagar", "Delete", "Eliminar", "Supprimer"])}
        danger
        busy={del.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() =>
          toDelete && del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })
        }
      />
    </Panel>
  );
}

// ── Temas da semana ──────────────────────────────────────────────────────────

const STATUS_LABEL: Record<ThemeRow["status"], Names> = {
  previa: ["Prévia", "Preview", "Vista previa", "Aperçu"],
  ativo: ["Ativo", "Active", "Activo", "Actif"],
  encerrado: ["Encerrado", "Ended", "Finalizado", "Terminé"],
};
const STATUS_TONE = { previa: "info", ativo: "good", encerrado: "default" } as const;

interface ThemeForm {
  id?: string;
  week_start: string;
  status: ThemeRow["status"];
  title: string;
  subtitle: string;
  badge: string;
  description: string;
  question: string;
  poll_question: string;
}

const emptyTheme = (): ThemeForm => {
  // Próximo domingo.
  const d = new Date();
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
  return {
    week_start: d.toISOString().slice(0, 10),
    status: "previa",
    title: "",
    subtitle: "",
    badge: "",
    description: "",
    question: "",
    poll_question: "",
  };
};

export function ThemesSection() {
  const tr = useTr();
  const themes = useThemes();
  const [form, setForm] = useState<ThemeForm | null>(null);
  const save = useAdminAction(
    async (f: ThemeForm) => {
      if (new Date(f.week_start + "T12:00:00").getDay() !== 0)
        throw new Error(
          tr([
            "A semana precisa começar num domingo.",
            "The week must start on a Sunday.",
            "La semana debe empezar en domingo.",
            "La semaine doit commencer un dimanche.",
          ]),
        );
      if (f.title.trim().length < 3 || f.description.trim().length < 10)
        throw new Error(
          tr([
            "Preencha o título e a descrição.",
            "Fill in the title and description.",
            "Completa el título y la descripción.",
            "Remplissez le titre et la description.",
          ]),
        );
      const { data: me } = await supabase.auth.getUser();
      // Só um tema pode estar ativo por vez: o anterior é encerrado.
      if (f.status === "ativo") {
        const q = supabase
          .from("weekly_themes")
          .update({ status: "encerrado" })
          .eq("status", "ativo");
        const { error } = f.id ? await q.neq("id", f.id) : await q;
        if (error) throw new Error(error.message);
      }
      const row = {
        week_start: f.week_start,
        status: f.status,
        title: f.title.trim(),
        subtitle: f.subtitle.trim() || null,
        badge: f.badge.trim() || null,
        description: f.description.trim(),
        question: f.question.trim() || null,
        poll_question: f.poll_question.trim() || null,
        edited_by: me.user?.id ?? null,
        edited_at: new Date().toISOString(),
        ...(f.status === "ativo" ? { activated_at: new Date().toISOString() } : {}),
      };
      const res = f.id
        ? await supabase.from("weekly_themes").update(row).eq("id", f.id)
        : await supabase.from("weekly_themes").insert({ ...row, source: "admin" });
      if (res.error)
        throw new Error(
          res.error.code === "23505"
            ? tr([
                "Já existe um tema para essa semana.",
                "There is already a theme for that week.",
                "Ya existe un tema para esa semana.",
                "Un thème existe déjà pour cette semaine.",
              ])
            : res.error.message,
        );
      void adminActions.log(f.id ? "tema_editado" : "tema_criado", "theme", f.id ?? f.week_start, {
        title: f.title,
        status: f.status,
      });
      setForm(null);
    },
    tr(["Tema salvo.", "Theme saved.", "Tema guardado.", "Thème enregistré."]),
  );

  const edit = (t: ThemeRow) =>
    setForm({
      id: t.id,
      week_start: t.week_start,
      status: t.status,
      title: t.title,
      subtitle: t.subtitle ?? "",
      badge: t.badge ?? "",
      description: t.description,
      question: t.question ?? "",
      poll_question: t.poll_question ?? "",
    });

  const field = (label: string, node: React.ReactNode, wide = false) => (
    <label className={`block space-y-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-semibold text-foreground">{label}</span>
      {node}
    </label>
  );

  return (
    <div className="space-y-4">
      <Panel
        title={tr([
          "Temas da semana",
          "Themes of the week",
          "Temas de la semana",
          "Thèmes de la semaine",
        ])}
        hint={tr([
          "O tema ativo aparece para todos; a prévia aparece só para profissionais. As traduções existentes não são alteradas.",
          "The active theme is shown to everyone; the preview is shown only to professionals. Existing translations aren't changed.",
          "El tema activo lo ve todo el mundo; la vista previa solo la ven los profesionales. Las traducciones existentes no se modifican.",
          "Le thème actif est visible par tous ; l'aperçu n'est visible que par les professionnels. Les traductions existantes ne sont pas modifiées.",
        ])}
        action={
          <button type="button" className={btnPrimary} onClick={() => setForm(emptyTheme())}>
            <Plus className="h-3.5 w-3.5" />{" "}
            {tr(["Novo tema", "New theme", "Nuevo tema", "Nouveau thème"])}
          </button>
        }
      >
        {form && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(form);
            }}
            className="mb-5 grid gap-3 rounded-2xl border border-accent/40 bg-accent-soft/30 p-4 sm:grid-cols-2"
          >
            {field(
              tr(["Semana (domingo)", "Week (Sunday)", "Semana (domingo)", "Semaine (dimanche)"]),
              <input
                type="date"
                required
                value={form.week_start}
                onChange={(e) => setForm({ ...form, week_start: e.target.value })}
                className={inputCls}
              />,
            )}
            {field(
              tr(["Situação", "Status", "Estado", "Statut"]),
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ThemeRow["status"] })}
                className={inputCls}
              >
                {(Object.keys(STATUS_LABEL) as ThemeRow["status"][]).map((s) => (
                  <option key={s} value={s}>
                    {tr(STATUS_LABEL[s])}
                  </option>
                ))}
              </select>,
            )}
            {field(
              tr(["Título", "Title", "Título", "Titre"]),
              <input
                required
                maxLength={120}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputCls}
              />,
              true,
            )}
            {field(
              tr(["Subtítulo", "Subtitle", "Subtítulo", "Sous-titre"]),
              <input
                maxLength={160}
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                className={inputCls}
              />,
            )}
            {field(
              tr(["Selo", "Badge", "Sello", "Badge"]),
              <input
                maxLength={40}
                value={form.badge}
                onChange={(e) => setForm({ ...form, badge: e.target.value })}
                className={inputCls}
              />,
            )}
            {field(
              tr(["Descrição", "Description", "Descripción", "Description"]),
              <textarea
                required
                rows={4}
                maxLength={1200}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={`${inputCls} resize-y`}
              />,
              true,
            )}
            {field(
              tr([
                "Pergunta da semana",
                "Question of the week",
                "Pregunta de la semana",
                "Question de la semaine",
              ]),
              <input
                maxLength={240}
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                className={inputCls}
              />,
              true,
            )}
            {field(
              tr([
                "Pergunta da enquete",
                "Poll question",
                "Pregunta de la encuesta",
                "Question du sondage",
              ]),
              <input
                maxLength={240}
                value={form.poll_question}
                onChange={(e) => setForm({ ...form, poll_question: e.target.value })}
                className={inputCls}
              />,
              true,
            )}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" onClick={() => setForm(null)} className={btnCls}>
                {tr(["Cancelar", "Cancel", "Cancelar", "Annuler"])}
              </button>
              <button type="submit" disabled={save.isPending} className={btnPrimary}>
                {save.isPending
                  ? tr(["Salvando…", "Saving…", "Guardando…", "Enregistrement…"])
                  : tr(["Salvar tema", "Save theme", "Guardar tema", "Enregistrer le thème"])}
              </button>
            </div>
          </form>
        )}

        {themes.error ? (
          <QueryError error={themes.error} />
        ) : themes.isLoading ? (
          <p className="text-sm text-muted-foreground">
            {tr(["Carregando…", "Loading…", "Cargando…", "Chargement…"])}
          </p>
        ) : (themes.data ?? []).length === 0 ? (
          <Empty>
            {tr([
              "Nenhum tema ainda.",
              "No themes yet.",
              "Todavía no hay temas.",
              "Aucun thème pour l'instant.",
            ])}
          </Empty>
        ) : (
          <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70">
            {(themes.data ?? []).map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 bg-card px-4 py-3">
                <div className="min-w-0 flex-1 basis-60">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                    {t.title}{" "}
                    <Badge tone={STATUS_TONE[t.status]}>{tr(STATUS_LABEL[t.status])}</Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tr(["Semana de", "Week of", "Semana del", "Semaine du"])}{" "}
                    {shortDate(t.week_start)} · {tr(["origem:", "source:", "origen:", "origine :"])}{" "}
                    {t.source}
                  </p>
                </div>
                <button type="button" onClick={() => edit(t)} className={btnCls}>
                  <Pencil className="h-3.5 w-3.5" /> {tr(["Editar", "Edit", "Editar", "Modifier"])}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

// ── Anúncios ─────────────────────────────────────────────────────────────────

const LEVELS: Record<Announcement["level"], Names> = {
  info: ["Informação", "Information", "Información", "Information"],
  aviso: ["Aviso", "Warning", "Aviso", "Avertissement"],
  sucesso: ["Novidade", "What's new", "Novedad", "Nouveauté"],
};
const toLocal = (iso: string | null) =>
  iso
    ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";

export function AnnouncementsSection() {
  const tr = useTr();
  const list = useAnnouncements();
  const [form, setForm] = useState<(Partial<Announcement> & { title: string }) | null>(null);
  const [toDelete, setToDelete] = useState<Announcement | null>(null);
  const save = useAdminAction(
    async (a: Partial<Announcement> & { title: string }) => {
      await adminActions.saveAnnouncement(a);
      setForm(null);
    },
    tr(["Anúncio salvo.", "Announcement saved.", "Anuncio guardado.", "Annonce enregistrée."]),
  );
  const del = useAdminAction(
    adminActions.deleteAnnouncement,
    tr(["Anúncio apagado.", "Announcement deleted.", "Anuncio eliminado.", "Annonce supprimée."]),
  );
  const toggle = useAdminAction((a: Announcement) =>
    adminActions.saveAnnouncement({ ...a, active: !a.active }),
  );

  return (
    <Panel
      title={tr(["Anúncios", "Announcements", "Anuncios", "Annonces"])}
      hint={tr([
        "Avisos que aparecem no topo do site para todas as pessoas logadas. Use para manutenção, novidades ou comunicados.",
        "Notices shown at the top of the site to everyone who is signed in. Use them for maintenance, news or announcements.",
        "Avisos que aparecen en la parte superior del sitio para todas las personas con sesión iniciada. Úsalos para mantenimiento, novedades o comunicados.",
        "Messages affichés en haut du site pour toutes les personnes connectées. À utiliser pour la maintenance, les nouveautés ou les communiqués.",
      ])}
      action={
        <button
          type="button"
          className={btnPrimary}
          onClick={() => setForm({ title: "", body: "", level: "info", active: true })}
        >
          <Plus className="h-3.5 w-3.5" />{" "}
          {tr(["Novo anúncio", "New announcement", "Nuevo anuncio", "Nouvelle annonce"])}
        </button>
      }
    >
      {form && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(form);
          }}
          className="mb-5 grid gap-3 rounded-2xl border border-accent/40 bg-accent-soft/30 p-4 sm:grid-cols-2"
        >
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-xs font-semibold text-foreground">
              {tr(["Título", "Title", "Título", "Titre"])}
            </span>
            <input
              required
              maxLength={120}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-xs font-semibold text-foreground">
              {tr([
                "Texto (opcional)",
                "Text (optional)",
                "Texto (opcional)",
                "Texte (facultatif)",
              ])}
            </span>
            <textarea
              rows={3}
              maxLength={600}
              value={form.body ?? ""}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              className={`${inputCls} resize-none`}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-foreground">
              {tr(["Tipo", "Type", "Tipo", "Type"])}
            </span>
            <select
              value={form.level ?? "info"}
              onChange={(e) => setForm({ ...form, level: e.target.value as Announcement["level"] })}
              className={inputCls}
            >
              {(Object.keys(LEVELS) as Announcement["level"][]).map((l) => (
                <option key={l} value={l}>
                  {tr(LEVELS[l])}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-foreground">
              {tr(["Link (opcional)", "Link (optional)", "Enlace (opcional)", "Lien (facultatif)"])}
            </span>
            <input
              value={form.link_url ?? ""}
              onChange={(e) => setForm({ ...form, link_url: e.target.value })}
              placeholder={tr([
                "https://… ou /pagina",
                "https://… or /page",
                "https://… o /pagina",
                "https://… ou /page",
              ])}
              className={inputCls}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-foreground">
              {tr([
                "Começa em (opcional)",
                "Starts on (optional)",
                "Empieza el (opcional)",
                "Commence le (facultatif)",
              ])}
            </span>
            <input
              type="datetime-local"
              value={toLocal(form.starts_at ?? null)}
              onChange={(e) =>
                setForm({
                  ...form,
                  starts_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                })
              }
              className={inputCls}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-foreground">
              {tr([
                "Termina em (opcional)",
                "Ends on (optional)",
                "Termina el (opcional)",
                "Se termine le (facultatif)",
              ])}
            </span>
            <input
              type="datetime-local"
              value={toLocal(form.ends_at ?? null)}
              onChange={(e) =>
                setForm({
                  ...form,
                  ends_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                })
              }
              className={inputCls}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2">
            <input
              type="checkbox"
              checked={form.active ?? true}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="h-5 w-5 accent-[var(--color-accent)]"
            />
            {tr([
              "Publicado (visível dentro do período)",
              "Published (visible during the period)",
              "Publicado (visible dentro del período)",
              "Publiée (visible pendant la période)",
            ])}
          </label>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={() => setForm(null)} className={btnCls}>
              {tr(["Cancelar", "Cancel", "Cancelar", "Annuler"])}
            </button>
            <button type="submit" disabled={save.isPending} className={btnPrimary}>
              {save.isPending
                ? tr(["Salvando…", "Saving…", "Guardando…", "Enregistrement…"])
                : tr([
                    "Salvar anúncio",
                    "Save announcement",
                    "Guardar anuncio",
                    "Enregistrer l'annonce",
                  ])}
            </button>
          </div>
        </form>
      )}

      {list.error ? (
        <QueryError error={list.error} />
      ) : list.isLoading ? (
        <p className="text-sm text-muted-foreground">
          {tr(["Carregando…", "Loading…", "Cargando…", "Chargement…"])}
        </p>
      ) : (list.data ?? []).length === 0 ? (
        <Empty>
          {tr([
            "Nenhum anúncio criado.",
            "No announcements created.",
            "No se ha creado ningún anuncio.",
            "Aucune annonce créée.",
          ])}
        </Empty>
      ) : (
        <ul className="space-y-2">
          {(list.data ?? []).map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3"
            >
              <div className="min-w-0 flex-1 basis-60">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                  {a.title}
                  <Badge
                    tone={a.level === "aviso" ? "warn" : a.level === "sucesso" ? "good" : "info"}
                  >
                    {tr(LEVELS[a.level])}
                  </Badge>
                  <Badge tone={a.active ? "good" : "default"}>
                    {a.active
                      ? tr(["Publicado", "Published", "Publicado", "Publiée"])
                      : tr(["Rascunho", "Draft", "Borrador", "Brouillon"])}
                  </Badge>
                </p>
                {a.body && <p className="line-clamp-2 text-xs text-muted-foreground">{a.body}</p>}
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {a.starts_at
                    ? `${tr(["de", "from", "del", "du"])} ${dateTime(a.starts_at)} `
                    : ""}
                  {a.ends_at
                    ? `${tr(["até", "until", "hasta", "jusqu'au"])} ${dateTime(a.ends_at)}`
                    : tr([
                        "sem data para terminar",
                        "no end date",
                        "sin fecha de fin",
                        "sans date de fin",
                      ])}
                </p>
              </div>
              <button type="button" onClick={() => toggle.mutate(a)} className={btnCls}>
                {a.active
                  ? tr(["Despublicar", "Unpublish", "Despublicar", "Dépublier"])
                  : tr(["Publicar", "Publish", "Publicar", "Publier"])}
              </button>
              <button type="button" onClick={() => setForm(a)} className={btnCls}>
                <Pencil className="h-3.5 w-3.5" /> {tr(["Editar", "Edit", "Editar", "Modifier"])}
              </button>
              <button
                type="button"
                onClick={() => setToDelete(a)}
                className={btnDanger}
                aria-label={tr([
                  "Apagar anúncio",
                  "Delete announcement",
                  "Eliminar anuncio",
                  "Supprimer l'annonce",
                ])}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={!!toDelete}
        title={tr([
          "Apagar este anúncio?",
          "Delete this announcement?",
          "¿Eliminar este anuncio?",
          "Supprimer cette annonce ?",
        ])}
        confirmLabel={tr(["Apagar", "Delete", "Eliminar", "Supprimer"])}
        danger
        busy={del.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() =>
          toDelete && del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })
        }
      />
    </Panel>
  );
}

void toast;
