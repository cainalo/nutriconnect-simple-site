// Ideias com IA no estúdio, no estilo da página de Funções: o objetivo, a rede e os formatos viram
// tiles e pílulas; a IA devolve ideias prontas (gancho, legenda, slides, roteiro, hashtags) em cards
// que se escolhem com um toque. As escolhidas viram posts (ideia → rascunho → aprovado → publicado);
// embaixo ficam os posts salvos, com a miniatura da arte.
import { useState } from "react";
import { toast } from "sonner";
import {
  BadgeCheck,
  Check,
  Clock,
  Eye,
  Hash,
  Heart,
  Layers,
  Megaphone,
  PenLine,
  Search,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  Wand2,
  X,
  type LucideIcon,
} from "lucide-react";
import { EMPTY_DRAFT, type Draft } from "@/components/admin/social/use-art";
import { EmptyState, SectionTitle, StudioCard, Tile } from "@/components/admin/social/kit";
import {
  FORMAT_STYLE,
  NETWORK_STYLE,
  STATUS_STYLE,
  btnPrimary,
  btnSoft,
  field,
  tint,
} from "@/components/admin/social/kit-styles";
import { Pill, PostCard } from "@/components/admin/social/post-card";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";
import {
  FORMAT_LABEL,
  NETWORK_LABEL,
  STATUSES,
  STATUS_LABEL,
  ideaToPost,
  useInsertPosts,
  useSocialPosts,
  useSocialProfiles,
  type PostStatus,
  type SocialPost,
} from "@/lib/social-studio";
import {
  FORMATS,
  GOALS,
  NETWORKS,
  suggestSocialPosts,
  type Goal,
  type Network,
  type PostFormat,
  type PostIdea,
} from "@/lib/social-studio.functions";

const GOAL_STYLE: Record<Goal, { label: string; text: string; icon: LucideIcon; color: string }> = {
  engajamento: {
    label: "Engajamento",
    text: "Comentários e salvamentos",
    icon: Heart,
    color: "#d6456b",
  },
  alcance: { label: "Alcance", text: "Chegar a gente nova", icon: Megaphone, color: "#d9692a" },
  autoridade: {
    label: "Autoridade",
    text: "Mostrar quem sabe",
    icon: BadgeCheck,
    color: "#5b6fd6",
  },
  conversao: {
    label: "Novas contas",
    text: "Convidar para o app",
    icon: UserPlus,
    color: "#2f8a5b",
  },
  comunidade: { label: "Comunidade", text: "Conversa e vínculo", icon: Users, color: "#0f9aa8" },
};

const PURPLE = "#7a5cc4";

export function IdeasTab({
  onOpen,
  prefill,
  onEditIdea,
}: {
  onOpen: (p: SocialPost) => void;
  prefill?: string;
  /** Abre a ideia no editor (com a prévia de cada rede). */
  onEditIdea?: (draft: Draft) => void;
}) {
  return (
    <div className="@container min-w-0 space-y-7">
      <Generator prefill={prefill} onEditIdea={onEditIdea} />
      <PostsList onOpen={onOpen} />
    </div>
  );
}

function Generator({
  prefill,
  onEditIdea,
}: {
  prefill?: string;
  onEditIdea?: (draft: Draft) => void;
}) {
  const { locale } = useI18n();
  const profiles = useSocialProfiles();
  const insert = useInsertPosts();
  const [profileId, setProfileId] = useState<string>("");
  const [network, setNetwork] = useState<Network>("instagram");
  const [goal, setGoal] = useState<Goal>("engajamento");
  const [formats, setFormats] = useState<PostFormat[]>(["post", "carrossel", "reels"]);
  const [count, setCount] = useState(4);
  const [theme, setTheme] = useState(prefill ?? "");
  const [useTrends, setUseTrends] = useState(true);
  const [busy, setBusy] = useState(false);
  const [ideas, setIdeas] = useState<PostIdea[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());

  const toggleFormat = (f: PostFormat) =>
    setFormats((l) => (l.includes(f) ? (l.length > 1 ? l.filter((x) => x !== f) : l) : [...l, f]));
  const togglePick = (i: number) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  const generate = async () => {
    setBusy(true);
    try {
      const res = await suggestSocialPosts({
        data: {
          profileId: profileId || undefined,
          network,
          goal,
          formats,
          count,
          theme,
          useTrends,
          locale: locale as never,
        },
      });
      if ("error" in res) {
        toast.error(
          res.error === "limit"
            ? "A cota de IA de hoje acabou."
            : "A IA não conseguiu criar agora.",
        );
      } else if (res.ideas.length === 0) {
        toast.error("A IA não trouxe ideias desta vez. Tente outro tema.");
      } else {
        setIdeas(res.ideas);
        setPicked(new Set(res.ideas.map((_, i) => i)));
      }
    } catch {
      toast.error("A IA não conseguiu criar agora.");
    } finally {
      setBusy(false);
    }
  };

  const saveChosen = () =>
    insert.mutate(
      ideas
        .filter((_, i) => picked.has(i))
        .map((idea) => ideaToPost(idea, network, profileId || null)),
      {
        onSuccess: () => {
          toast.success(
            picked.size === 1
              ? "1 ideia salva no quadro."
              : `${picked.size} ideias salvas no quadro.`,
          );
          setIdeas([]);
          setPicked(new Set());
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );

  const toDraft = (idea: PostIdea): Draft => ({
    ...EMPTY_DRAFT,
    title: idea.title,
    network,
    format: idea.format,
    hook: idea.hook,
    caption: idea.caption,
    slides: idea.slides,
    script: idea.script,
    hashtags: idea.hashtags,
    cta: idea.cta,
    pillar: idea.pillar,
    visual_idea: String(ideaToPost(idea, network, null).visual_idea ?? ""),
    status: "ideia",
    profile_id: profileId || null,
    design: { ...EMPTY_DRAFT.design, kicker: idea.pillar.slice(0, 30) },
  });

  return (
    <div className="min-w-0 space-y-4">
      {/* Objetivo */}
      <section className="min-w-0">
        <SectionTitle icon={Wand2} color={PURPLE}>
          O que o post precisa fazer?
        </SectionTitle>
        <ul className="grid grid-cols-2 gap-3 @2xl:grid-cols-3 @4xl:grid-cols-5">
          {GOALS.map((g, k) => {
            const s = GOAL_STYLE[g];
            return (
              <li key={g} className="min-w-0">
                <Tile
                  icon={s.icon}
                  color={s.color}
                  title={s.label}
                  text={s.text}
                  active={goal === g}
                  onClick={() => setGoal(g)}
                  delay={k * 45}
                  compact
                  className="min-h-[6.5rem]"
                >
                  {goal === g && (
                    <span
                      aria-hidden="true"
                      className="nc-pop absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full text-white"
                      style={{ background: s.color }}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </Tile>
              </li>
            );
          })}
        </ul>
      </section>

      <StudioCard
        icon={Sparkles}
        color={PURPLE}
        title="Criar ideias com IA"
        hint="Com tendências, a IA considera o que está em alta no NutriConnect, as datas de saúde e a estação."
        delay={120}
      >
        <div className="space-y-4">
          <div className="min-w-0">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Rede
            </p>
            <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5">
              {NETWORKS.map((n) => (
                <Pill
                  key={n}
                  icon={NETWORK_STYLE[n].icon}
                  color={NETWORK_STYLE[n].color}
                  active={network === n}
                  onClick={() => setNetwork(n)}
                >
                  {NETWORK_LABEL[n]}
                </Pill>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Formatos <span className="font-medium normal-case tracking-normal">(um ou mais)</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {FORMATS.map((f) => (
                <Pill
                  key={f}
                  icon={FORMAT_STYLE[f].icon}
                  color={PURPLE}
                  active={formats.includes(f)}
                  onClick={() => toggleFormat(f)}
                >
                  {FORMAT_LABEL[f]}
                </Pill>
              ))}
            </div>
          </div>

          <div className="grid min-w-0 gap-3 @2xl:grid-cols-[minmax(0,1fr)_auto_auto]">
            <label className="min-w-0">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Perfil
              </span>
              <select
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
                className={field}
              >
                <option value="">Sem perfil (marca geral)</option>
                {(profiles.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {NETWORK_LABEL[p.network as Network]} · {p.handle}
                  </option>
                ))}
              </select>
            </label>
            <div className="min-w-0">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Quantas
              </span>
              <div
                role="radiogroup"
                aria-label="Quantidade de ideias"
                className="inline-flex h-[2.625rem] items-center gap-1 rounded-full border border-border/70 bg-background/80 p-1"
              >
                {[2, 4, 6, 8].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={count === n}
                    onClick={() => setCount(n)}
                    className={cn(
                      "grid h-8 w-9 place-items-center rounded-full text-xs font-bold transition",
                      count === n
                        ? "text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    style={count === n ? { background: PURPLE } : undefined}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="min-w-0">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Tendências
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={useTrends}
                onClick={() => setUseTrends((v) => !v)}
                className="inline-flex h-[2.625rem] items-center gap-2 rounded-full border border-border/70 bg-background/80 pl-1.5 pr-3.5 text-xs font-semibold text-foreground transition hover:border-border"
              >
                <span
                  className={cn(
                    "relative h-6 w-10 rounded-full transition",
                    useTrends ? "" : "bg-muted",
                  )}
                  style={useTrends ? { background: "#2f8a5b" } : undefined}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                      useTrends ? "left-[1.125rem]" : "left-0.5",
                    )}
                  />
                </span>
                <TrendingUp className="h-3.5 w-3.5 text-[#2f8a5b]" />
                {useTrends ? "Usar" : "Não usar"}
              </button>
            </div>
          </div>

          <form
            className="flex min-w-0 flex-col gap-2 @2xl:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy) void generate();
            }}
          >
            <input
              value={theme}
              maxLength={300}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Tema ou pedido (opcional): lancheira na volta às aulas, mitos do glúten…"
              aria-label="Tema ou pedido"
              className={field}
            />
            <button type="submit" className={btnPrimary} disabled={busy}>
              <Sparkles className={cn("h-4 w-4", busy && "animate-spin")} />
              {busy ? "Criando…" : `Criar ${count} ideias`}
            </button>
          </form>
        </div>
      </StudioCard>

      {busy && (
        <ul className="grid grid-cols-1 gap-3 @2xl:grid-cols-2 @5xl:grid-cols-3" aria-busy="true">
          {Array.from({ length: Math.min(count, 6) }, (_, i) => (
            <li key={i} className="st-shimmer h-56 rounded-[1.4rem] bg-secondary" />
          ))}
        </ul>
      )}

      {!busy && ideas.length > 0 && (
        <section className="min-w-0">
          <SectionTitle
            icon={Sparkles}
            color={PURPLE}
            right={
              <button
                type="button"
                onClick={() =>
                  setPicked(
                    picked.size === ideas.length ? new Set() : new Set(ideas.map((_, i) => i)),
                  )
                }
                className="text-accent hover:underline"
              >
                {picked.size === ideas.length ? "Desmarcar todas" : "Marcar todas"}
              </button>
            }
          >
            Ideias da IA
          </SectionTitle>
          <ul className="grid grid-cols-1 gap-3 @2xl:grid-cols-2 @5xl:grid-cols-3">
            {ideas.map((idea, i) => (
              <li key={i} className="min-w-0">
                <IdeaCard
                  idea={idea}
                  picked={picked.has(i)}
                  delay={i * 60}
                  onToggle={() => togglePick(i)}
                  onEdit={onEditIdea ? () => onEditIdea(toDraft(idea)) : undefined}
                />
              </li>
            ))}
          </ul>
          <div className="st-glass sticky bottom-3 z-10 mt-4 flex flex-wrap items-center gap-2 rounded-full border border-border/60 p-1.5 pl-4 shadow-lg">
            <p className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
              {picked.size === 0
                ? "Marque as ideias"
                : picked.size === 1
                  ? "1 ideia marcada"
                  : `${picked.size} ideias marcadas`}
            </p>
            <button
              type="button"
              className={cn(btnSoft, "h-9 px-3 text-xs")}
              aria-label="Descartar ideias"
              onClick={() => {
                setIdeas([]);
                setPicked(new Set());
              }}
            >
              <X className="h-3.5 w-3.5" /> <span className="hidden @md:inline">Descartar</span>
            </button>
            <button
              type="button"
              className={cn(btnPrimary, "h-9 px-4 text-xs")}
              disabled={!picked.size || insert.isPending}
              onClick={saveChosen}
            >
              <Check className="h-3.5 w-3.5" /> Salvar no quadro
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function IdeaCard({
  idea,
  picked,
  delay,
  onToggle,
  onEdit,
}: {
  idea: PostIdea;
  picked: boolean;
  delay: number;
  onToggle: () => void;
  onEdit?: () => void;
}) {
  const Fmt = FORMAT_STYLE[idea.format]?.icon ?? Layers;
  return (
    <article
      className="nc-tile-in flex h-full min-w-0 flex-col rounded-[1.4rem] border p-3.5 transition duration-300"
      style={{
        animationDelay: `${delay}ms`,
        background: picked
          ? `linear-gradient(150deg, ${tint(PURPLE, 14)}, var(--card) 65%)`
          : "var(--card)",
        borderColor: picked
          ? `color-mix(in srgb, ${PURPLE} 50%, transparent)`
          : "color-mix(in srgb, var(--border) 70%, transparent)",
      }}
    >
      <header className="flex min-w-0 items-start gap-2.5">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-sm"
          style={{ background: PURPLE }}
        >
          <Fmt className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: PURPLE }}>
            {FORMAT_LABEL[idea.format] ?? idea.format}
            {idea.pillar && <span className="text-muted-foreground"> · {idea.pillar}</span>}
          </p>
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-foreground">
            {idea.title}
          </h3>
        </div>
        <button
          type="button"
          role="checkbox"
          aria-checked={picked}
          aria-label={picked ? "Desmarcar ideia" : "Marcar ideia"}
          onClick={onToggle}
          className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition",
            picked ? "border-transparent text-white" : "border-border text-transparent",
          )}
          style={picked ? { background: PURPLE } : undefined}
        >
          <Check className="h-4 w-4" />
        </button>
      </header>

      {idea.hook && (
        <p
          className="mt-3 rounded-xl px-3 py-2 text-[13px] font-semibold leading-snug"
          style={{
            background: tint(PURPLE, 10),
            color: `color-mix(in srgb, ${PURPLE} 70%, var(--foreground))`,
          }}
        >
          “{idea.hook}”
        </p>
      )}
      <p className="mt-2.5 line-clamp-4 whitespace-pre-line text-xs leading-relaxed text-foreground/85">
        {idea.caption}
      </p>

      {idea.slides.length > 0 && (
        <ol className="mt-2.5 flex flex-wrap gap-1">
          {idea.slides.slice(0, 6).map((s, k) => (
            <li
              key={k}
              className="max-w-full truncate rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-foreground/80"
            >
              {k + 1}. {s.title}
            </li>
          ))}
        </ol>
      )}
      {idea.hashtags.length > 0 && (
        <p className="mt-2 flex min-w-0 items-start gap-1 text-[11px] text-muted-foreground">
          <Hash className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="line-clamp-2">{idea.hashtags.map((h) => `#${h}`).join(" ")}</span>
        </p>
      )}
      {idea.best_time && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3 shrink-0" /> {idea.best_time}
        </p>
      )}

      {onEdit && (
        <div className="mt-auto pt-3">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5"
            style={{ background: PURPLE }}
          >
            <Eye className="h-3.5 w-3.5" /> Editar e ver prévia
          </button>
        </div>
      )}
    </article>
  );
}

function PostsList({ onOpen }: { onOpen: (p: SocialPost) => void }) {
  const posts = useSocialPosts();
  const [status, setStatus] = useState<PostStatus | "todos">("todos");
  const [q, setQ] = useState("");
  const all = (posts.data ?? []).filter((p) => !p.is_template);
  const term = q.trim().toLowerCase();
  const list = all.filter(
    (p) =>
      (status === "todos" || p.status === status) &&
      (!term || `${p.title} ${p.caption} ${p.pillar}`.toLowerCase().includes(term)),
  );

  return (
    <section className="min-w-0">
      <SectionTitle icon={PenLine} color="#3b7bbf">
        Posts salvos
      </SectionTitle>
      <div className="mb-3 flex min-w-0 flex-wrap items-center gap-2">
        <label className="relative w-full @2xl:w-64">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar posts"
            aria-label="Buscar posts"
            className={cn(field, "h-10 rounded-full py-0 pl-10")}
          />
        </label>
        <div className="no-scrollbar -mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 py-0.5">
          <Pill
            color="#3f4727"
            active={status === "todos"}
            onClick={() => setStatus("todos")}
            count={all.length}
          >
            Todos
          </Pill>
          {STATUSES.map((s) => (
            <Pill
              key={s}
              icon={STATUS_STYLE[s].icon}
              color={STATUS_STYLE[s].color}
              active={status === s}
              onClick={() => setStatus(s)}
              count={all.filter((p) => p.status === s).length}
            >
              {STATUS_LABEL[s]}
            </Pill>
          ))}
        </div>
      </div>
      {posts.error ? (
        <EmptyState
          icon={X}
          color="#d6456b"
          title="Não deu para carregar os posts"
          text={(posts.error as Error).message}
        />
      ) : posts.isLoading ? (
        <ul className="grid grid-cols-2 gap-3 @2xl:grid-cols-3 @4xl:grid-cols-4 @6xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="st-shimmer aspect-[4/5] rounded-[1.25rem] bg-secondary" />
          ))}
        </ul>
      ) : list.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          color={PURPLE}
          title={all.length === 0 ? "Nenhum post ainda" : "Nada com esse filtro"}
          text={
            all.length === 0
              ? "Escolha o objetivo e peça ideias para a IA: as que você salvar aparecem aqui."
              : "Troque o status ou a busca para ver outros posts."
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 @2xl:grid-cols-3 @4xl:grid-cols-4 @6xl:grid-cols-6">
          {list.map((p, k) => (
            <li key={p.id} className="min-w-0">
              <PostCard post={p} onOpen={() => onOpen(p)} delay={k * 40} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
