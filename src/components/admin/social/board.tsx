// Quadro (kanban) do estúdio: uma coluna por status; arraste os cards para mudar o status.
import { useState, type DragEvent } from "react";
import { toast } from "sonner";
import { CalendarDays, Copy, GripVertical, Plus, Search } from "lucide-react";
import {
  FORMAT_LABEL,
  NETWORK_LABEL,
  STATUSES,
  STATUS_LABEL,
  useDuplicatePost,
  useUpdatePost,
  type PostStatus,
  type SocialPost,
} from "@/lib/social-studio";
import { NETWORKS, type Network, type PostFormat } from "@/lib/social-studio.functions";
import { cn } from "@/lib/utils";
import {
  NETWORK_STYLE,
  STATUS_STYLE,
  badgeBg,
  btnPrimary,
  field,
  tint,
} from "@/components/admin/social/kit-styles";
import { PostThumb } from "@/components/admin/social/template-thumb";
import { useTr } from "@/components/settings-ui";

export function StudioBoard({
  posts,
  onOpen,
  onNew,
}: {
  posts: SocialPost[];
  onOpen: (p: SocialPost) => void;
  onNew: () => void;
}) {
  const tr = useTr();
  const update = useUpdatePost();
  const duplicate = useDuplicatePost();
  const [network, setNetwork] = useState<Network | "todas">("todas");
  const [q, setQ] = useState("");
  const [over, setOver] = useState<PostStatus | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const term = q.trim().toLowerCase();
  const list = posts.filter(
    (p) =>
      !p.is_template &&
      (network === "todas" || p.network === network) &&
      (!term || `${p.title} ${p.caption} ${p.pillar}`.toLowerCase().includes(term)),
  );

  const drop = (status: PostStatus) => (e: DragEvent) => {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData("text/plain") || dragId;
    const post = posts.find((p) => p.id === id);
    if (!post || post.status === status) return;
    update.mutate(
      { id: post.id, status },
      {
        onSuccess: () => toast.success(`“${post.title}” → ${STATUS_LABEL[status]}`),
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <label className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tr([
              "Buscar posts",
              "Search posts",
              "Buscar posts",
              "Rechercher des posts",
            ])}
            className={cn(field, "h-10 rounded-full py-0 pl-10")}
          />
        </label>
        <div className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-0.5">
          {(["todas", ...NETWORKS] as (Network | "todas")[]).map((n) => {
            const on = network === n;
            const st = n === "todas" ? null : NETWORK_STYLE[n];
            return (
              <button
                key={n}
                type="button"
                onClick={() => setNetwork(n)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition",
                  on
                    ? "border-transparent text-white shadow-sm"
                    : "border-border/70 bg-card text-muted-foreground hover:text-foreground",
                )}
                style={on ? { background: badgeBg(st?.color ?? "#3f4727") } : undefined}
              >
                {st && <st.icon className="h-3.5 w-3.5" />}
                {n === "todas"
                  ? tr(["Todas as redes", "All networks", "Todas las redes", "Tous les réseaux"])
                  : NETWORK_LABEL[n]}
              </button>
            );
          })}
        </div>
        <button type="button" onClick={onNew} className={cn(btnPrimary, "h-9 px-4 text-xs")}>
          <Plus className="h-3.5 w-3.5" />{" "}
          {tr(["Novo post", "New post", "Nuevo post", "Nouveau post"])}
        </button>
      </div>

      <div className="st-thin -mx-1 flex gap-3 overflow-x-auto px-1 pb-3">
        {STATUSES.map((status, col) => {
          const items = list.filter((p) => p.status === status);
          const st = STATUS_STYLE[status];
          return (
            <section
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(status);
              }}
              onDragLeave={() => setOver((s) => (s === status ? null : s))}
              onDrop={drop(status)}
              className={cn(
                "nc-tile-in flex min-w-[16.5rem] flex-1 basis-0 flex-col rounded-[1.6rem] border p-2.5 transition duration-300",
                over === status && "scale-[1.01] shadow-lg",
              )}
              style={{
                animationDelay: `${col * 50}ms`,
                background: `linear-gradient(180deg, ${tint(st.color, over === status ? 18 : 10)}, color-mix(in srgb, var(--card) 60%, transparent) 70%)`,
                borderColor: `color-mix(in srgb, ${st.color} ${over === status ? 55 : 20}%, transparent)`,
              }}
            >
              <header className="mb-2.5 flex items-center gap-2 px-1 pt-0.5">
                <span
                  className="grid h-8 w-8 place-items-center rounded-xl text-white shadow-sm"
                  style={{ background: badgeBg(st.color) }}
                >
                  <st.icon className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-bold text-foreground">{STATUS_LABEL[status]}</h3>
                <span
                  className="ml-auto grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-[11px] font-bold"
                  style={{ background: tint(st.color, 18), color: st.color }}
                >
                  {items.length}
                </span>
              </header>
              <div className="flex min-h-28 flex-col gap-2">
                {items.map((p) => {
                  const net = NETWORK_STYLE[p.network as Network] ?? NETWORK_STYLE.outro;
                  return (
                    <article
                      key={p.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", p.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDragId(p.id);
                      }}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => onOpen(p)}
                      className={cn(
                        "group flex cursor-grab gap-2.5 rounded-2xl border border-border/60 bg-card p-2 shadow-xs transition duration-300 hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing animate-in fade-in zoom-in-95",
                        dragId === p.id && "opacity-40",
                      )}
                    >
                      <div className="w-16 shrink-0 overflow-hidden rounded-xl">
                        <PostThumb post={p} className="aspect-[4/5] w-full" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col py-0.5">
                        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground">
                          {p.title}
                        </p>
                        <div className="mt-auto flex min-w-0 items-center gap-1.5 pt-1.5 text-[10px] font-semibold">
                          <span
                            className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-1.5"
                            style={{ background: tint(net.color, 12), color: net.color }}
                          >
                            <net.icon className="h-3 w-3 shrink-0" />
                            <span>{FORMAT_LABEL[p.format as PostFormat]}</span>
                          </span>
                          {p.scheduled_for && (
                            <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-secondary px-1.5 text-foreground/80">
                              <CalendarDays className="h-3 w-3" />
                              {new Date(`${p.scheduled_for}T12:00:00`)
                                .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
                                .replace(".", "")}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicate.mutate(
                                { post: p, asTemplate: false },
                                {
                                  onSuccess: () =>
                                    toast.success(
                                      tr([
                                        "Post duplicado.",
                                        "Post duplicated.",
                                        "Post duplicado.",
                                        "Post dupliqué.",
                                      ]),
                                    ),
                                },
                              );
                            }}
                            className="ml-auto grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted-foreground opacity-0 transition hover:bg-secondary hover:text-foreground group-hover:opacity-100"
                            aria-label={tr(["Duplicar", "Duplicate", "Duplicar", "Dupliquer"])}
                            title={tr(["Duplicar", "Duplicate", "Duplicar", "Dupliquer"])}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <GripVertical className="h-4 w-4 shrink-0 self-center text-muted-foreground/40" />
                    </article>
                  );
                })}
                {items.length === 0 && (
                  <p className="grid min-h-24 place-items-center rounded-2xl border border-dashed border-border/70 px-4 text-center text-[11px] text-muted-foreground">
                    {tr([
                      "Arraste um post para cá",
                      "Drag a post here",
                      "Arrastra un post aquí",
                      "Faites glisser un post ici",
                    ])}
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
