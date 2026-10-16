// Ideias e posts do estúdio (S1): a IA cria ideias prontas (legenda, slides, roteiro, hashtags) pelo
// objetivo escolhido; as escolhidas viram posts, que seguem ideia → rascunho → aprovado → publicado.
import { useState } from "react";
import { toast } from "sonner";
import { Check, Search, Sparkles } from "lucide-react";
import {
  Badge,
  Empty,
  Panel,
  QueryError,
  btnCls,
  btnPrimary,
  inputCls,
} from "@/components/admin/admin-ui";
import { EMPTY_DRAFT, type Draft } from "@/components/admin/social/use-art";
import { useI18n } from "@/hooks/use-i18n";
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

const GOAL_LABEL: Record<Goal, string> = {
  engajamento: "Engajamento",
  alcance: "Alcance",
  autoridade: "Autoridade",
  conversao: "Novas contas",
  comunidade: "Comunidade",
};

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
    <div className="space-y-4">
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
          toast.success(`${picked.size} ideia(s) salvas.`);
          setIdeas([]);
          setPicked(new Set());
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );

  return (
    <Panel
      title="Criar ideias com IA"
      hint="Escolha o objetivo e os formatos. Com “usar tendências”, a IA considera o que está em alta no NutriConnect, as datas de saúde do mês e os alimentos da estação."
    >
      <div className="grid gap-3 md:grid-cols-4">
        <select
          value={profileId}
          onChange={(e) => setProfileId(e.target.value)}
          className={inputCls}
          aria-label="Perfil"
        >
          <option value="">Sem perfil (marca geral)</option>
          {(profiles.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {NETWORK_LABEL[p.network as Network]} · {p.handle}
            </option>
          ))}
        </select>
        <select
          value={network}
          onChange={(e) => setNetwork(e.target.value as Network)}
          className={inputCls}
          aria-label="Rede"
        >
          {NETWORKS.map((n) => (
            <option key={n} value={n}>
              {NETWORK_LABEL[n]}
            </option>
          ))}
        </select>
        <select
          value={goal}
          onChange={(e) => setGoal(e.target.value as Goal)}
          className={inputCls}
          aria-label="Objetivo"
        >
          {GOALS.map((g) => (
            <option key={g} value={g}>
              Objetivo: {GOAL_LABEL[g]}
            </option>
          ))}
        </select>
        <select
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className={inputCls}
          aria-label="Quantidade"
        >
          {[2, 4, 6, 8].map((n) => (
            <option key={n} value={n}>
              {n} ideias
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {FORMATS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={formats.includes(f)}
            onClick={() => toggleFormat(f)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              formats.includes(f)
                ? "border-accent bg-accent-soft text-foreground"
                : "border-border text-muted-foreground"
            }`}
          >
            {FORMAT_LABEL[f]}
          </button>
        ))}
        <label className="ml-2 flex items-center gap-1.5 text-xs text-foreground">
          <input
            type="checkbox"
            checked={useTrends}
            onChange={(e) => setUseTrends(e.target.checked)}
          />{" "}
          usar tendências
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={theme}
          maxLength={300}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="Tema ou pedido (opcional): ex. lancheira saudável na volta às aulas, mitos do glúten, bastidores da Nina…"
          className={inputCls}
        />
        <button
          type="button"
          className={btnPrimary}
          disabled={busy}
          onClick={() => void generate()}
        >
          <Sparkles className="h-3.5 w-3.5" /> {busy ? "Criando…" : "Criar ideias"}
        </button>
      </div>

      {ideas.length > 0 && (
        <div className="mt-4 space-y-3">
          {ideas.map((idea, i) => (
            <label
              key={i}
              className={`block cursor-pointer rounded-2xl border p-3 transition ${
                picked.has(i) ? "border-accent/60 bg-accent-soft/20" : "border-border/70"
              }`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={picked.has(i)}
                  onChange={() =>
                    setPicked((s) => {
                      const n = new Set(s);
                      if (n.has(i)) n.delete(i);
                      else n.add(i);
                      return n;
                    })
                  }
                />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="flex flex-wrap items-center gap-1.5 font-semibold text-foreground">
                    <Badge tone="info">{FORMAT_LABEL[idea.format]}</Badge> {idea.title}
                  </p>
                  {idea.hook && <p className="mt-1 font-medium text-accent">“{idea.hook}”</p>}
                  <p className="mt-1 line-clamp-4 whitespace-pre-line text-foreground/85">
                    {idea.caption}
                  </p>
                  {idea.slides.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {idea.slides.length} slides: {idea.slides.map((s) => s.title).join(" · ")}
                    </p>
                  )}
                  {idea.hashtags.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {idea.hashtags.map((h) => `#${h}`).join(" ")}
                    </p>
                  )}
                  {onEditIdea && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        onEditIdea({
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
                      }}
                      className="mt-2 inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-[11px] font-bold text-accent-foreground transition hover:-translate-y-0.5"
                    >
                      Editar e ver prévia →
                    </button>
                  )}
                </div>
              </div>
            </label>
          ))}
          <div className="flex gap-2">
            <button
              type="button"
              className={btnPrimary}
              disabled={!picked.size || insert.isPending}
              onClick={saveChosen}
            >
              <Check className="h-3.5 w-3.5" /> Salvar {picked.size} ideia(s)
            </button>
            <button type="button" className={btnCls} onClick={() => setIdeas([])}>
              Descartar
            </button>
          </div>
        </div>
      )}
    </Panel>
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
    <Panel
      title="Posts"
      hint="Clique num post para editar, criar a arte, agendar ou copiar a legenda."
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar"
            className="bg-transparent text-sm outline-none"
          />
        </div>
        {(["todos", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => setStatus(s)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              status === s
                ? "border-accent bg-accent-soft text-foreground"
                : "border-border text-muted-foreground"
            }`}
          >
            {s === "todos" ? "Todos" : STATUS_LABEL[s]} (
            {s === "todos" ? all.length : all.filter((p) => p.status === s).length})
          </button>
        ))}
      </div>
      <div className="mt-3">
        {posts.error ? (
          <QueryError error={posts.error} />
        ) : list.length === 0 ? (
          <Empty>Nenhum post aqui ainda. Crie ideias com a IA acima.</Empty>
        ) : (
          <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70">
            {list.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onOpen(p)}
                  className="flex w-full flex-wrap items-center gap-2 bg-card px-4 py-3 text-left hover:bg-secondary/50"
                >
                  <Badge tone="info">{FORMAT_LABEL[p.format as PostFormat] ?? p.format}</Badge>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                    {p.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {NETWORK_LABEL[p.network as Network]}
                  </span>
                  {p.scheduled_for && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(`${p.scheduled_for}T12:00:00`).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                  <Badge
                    tone={
                      p.status === "publicado"
                        ? "good"
                        : p.status === "aprovado" || p.status === "agendado"
                          ? "info"
                          : "default"
                    }
                  >
                    {STATUS_LABEL[p.status as PostStatus]}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
