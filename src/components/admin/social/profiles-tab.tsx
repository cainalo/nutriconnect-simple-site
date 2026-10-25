// Perfis do estúdio, no estilo da página de Funções: cada rede do NutriConnect num card com a cor da
// rede, os números do painel em mini-tiles e o diagnóstico da IA em blocos com ícone. O cadastro
// guarda o que a IA precisa para analisar (bio, legendas recentes, números e, na hora, um print).
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarClock,
  Camera,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  Heart,
  Info,
  Layers,
  LayoutGrid,
  MessageCircle,
  Pencil,
  Plus,
  Sparkles,
  Target,
  ThumbsUp,
  Trash2,
  UserRound,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { dateTime } from "@/components/admin/admin-ui";
import { EmptyState, IconBadge, StudioCard } from "@/components/admin/social/kit";
import {
  NETWORK_STYLE,
  badgeBg,
  btnIcon,
  btnPrimary,
  btnSoft,
  field,
  tint,
} from "@/components/admin/social/kit-styles";
import { Pill } from "@/components/admin/social/post-card";
import { useI18n } from "@/hooks/use-i18n";
import { fileToDataUrl } from "@/lib/image";
import {
  NETWORK_LABEL,
  studioKeys,
  useDeleteProfile,
  useSaveProfile,
  useSocialProfiles,
  type SocialProfile,
} from "@/lib/social-studio";
import {
  NETWORKS,
  analyzeSocialProfile,
  type Network,
  type SocialAnalysis,
} from "@/lib/social-studio.functions";
import { cn } from "@/lib/utils";
import { useTr } from "@/components/settings-ui";
import type { Names } from "@/lib/appearance-data";

const METRICS: { key: string; label: Names; icon: LucideIcon }[] = [
  { key: "followers", label: ["Seguidores", "Followers", "Seguidores", "Abonnés"], icon: Users },
  {
    key: "posts_per_week",
    label: ["Posts por semana", "Posts per week", "Posts por semana", "Posts par semaine"],
    icon: CalendarClock,
  },
  {
    key: "avg_likes",
    label: ["Curtidas (média)", "Likes (average)", "Me gusta (promedio)", "J’aime (moyenne)"],
    icon: Heart,
  },
  {
    key: "avg_comments",
    label: [
      "Comentários (média)",
      "Comments (average)",
      "Comentarios (promedio)",
      "Commentaires (moyenne)",
    ],
    icon: MessageCircle,
  },
  {
    key: "avg_reach",
    label: ["Alcance médio", "Average reach", "Alcance promedio", "Portée moyenne"],
    icon: Eye,
  },
];

type Draft = {
  id?: string;
  network: string;
  handle: string;
  url?: string | null;
  notes?: string;
  sample_posts?: string;
  metrics: Record<string, string>;
};

const OLIVE = "#555f36";
const styleOf = (n: string) => NETWORK_STYLE[n as Network] ?? NETWORK_STYLE.outro;
const fmt = (v: unknown) =>
  typeof v === "number" ? v.toLocaleString("pt-BR") : String(v ?? "").trim();

export function ProfilesTab() {
  const tr = useTr();
  const profiles = useSocialProfiles();
  const [draft, setDraft] = useState<Draft | null>(null);
  const list = profiles.data ?? [];

  return (
    <div className="@container min-w-0 space-y-4">
      <div className="flex min-w-0 flex-wrap items-start gap-3">
        <p className="flex min-w-0 flex-1 items-start gap-2 rounded-2xl border border-border/60 bg-card px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#3b7bbf]" />
          {tr([
            "As redes não deixam ler um perfil só pelo link. Cole a bio, algumas legendas recentes e os números do painel da rede (ou envie um print na hora de analisar): a IA usa isso para o diagnóstico.",
            "Networks don’t let us read a profile from its link alone. Paste the bio, a few recent captions and the numbers from the network’s dashboard (or upload a screenshot when analyzing): the AI uses this for the diagnosis.",
            "Las redes no permiten leer un perfil solo con el enlace. Pega la bio, algunas descripciones recientes y los números del panel de la red (o sube una captura al analizar): la IA lo usa para el diagnóstico.",
            "Les réseaux ne permettent pas de lire un profil à partir du seul lien. Collez la bio, quelques légendes récentes et les chiffres du tableau de bord du réseau (ou envoyez une capture au moment de l’analyse) : l’IA s’en sert pour le diagnostic.",
          ])}
        </p>
        {!draft && (
          <button
            type="button"
            className={btnPrimary}
            onClick={() => setDraft({ network: "instagram", handle: "", metrics: {} })}
          >
            <Plus className="h-4 w-4" />{" "}
            {tr(["Novo perfil", "New profile", "Nuevo perfil", "Nouveau profil"])}
          </button>
        )}
      </div>

      {draft && (
        <ProfileForm key={draft.id ?? "novo"} draft={draft} onDone={() => setDraft(null)} />
      )}

      {profiles.error ? (
        <EmptyState
          icon={UserRound}
          color="#d6456b"
          title={tr([
            "Não deu para carregar os perfis",
            "Couldn’t load the profiles",
            "No se pudieron cargar los perfiles",
            "Impossible de charger les profils",
          ])}
          text={(profiles.error as Error).message}
        />
      ) : profiles.isLoading ? (
        <div className="st-shimmer h-48 rounded-[1.6rem] bg-secondary" />
      ) : list.length === 0 && !draft ? (
        <EmptyState
          icon={UserRound}
          color={OLIVE}
          title={tr([
            "Nenhum perfil cadastrado",
            "No profiles added",
            "Ningún perfil registrado",
            "Aucun profil enregistré",
          ])}
          text={tr([
            "Comece pelo Instagram do NutriConnect: com a bio, as legendas e os números, a IA monta o diagnóstico.",
            "Start with NutriConnect’s Instagram: with the bio, captions and numbers, the AI builds the diagnosis.",
            "Empieza por el Instagram de NutriConnect: con la bio, las descripciones y los números, la IA arma el diagnóstico.",
            "Commencez par l’Instagram de NutriConnect : avec la bio, les légendes et les chiffres, l’IA établit le diagnostic.",
          ])}
          action={
            <button
              type="button"
              className={btnPrimary}
              onClick={() => setDraft({ network: "instagram", handle: "", metrics: {} })}
            >
              <Plus className="h-4 w-4" />{" "}
              {tr(["Cadastrar perfil", "Add profile", "Registrar perfil", "Ajouter un profil"])}
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {list.map((p, k) => (
            <ProfileCard
              key={p.id}
              profile={p}
              delay={k * 70}
              onEdit={() =>
                setDraft({
                  id: p.id,
                  network: p.network,
                  handle: p.handle,
                  url: p.url,
                  notes: p.notes,
                  sample_posts: p.sample_posts,
                  metrics: Object.fromEntries(
                    Object.entries((p.metrics ?? {}) as Record<string, unknown>).map(([k2, v]) => [
                      k2,
                      String(v ?? ""),
                    ]),
                  ),
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileForm({ draft, onDone }: { draft: Draft; onDone: () => void }) {
  const tr = useTr();
  const save = useSaveProfile();
  const [d, setD] = useState<Draft>(draft);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((o) => ({ ...o, [k]: v }));
  const st = styleOf(d.network);
  const label = "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground";

  return (
    <StudioCard
      icon={draft.id ? Pencil : Plus}
      color={st.color}
      title={
        draft.id
          ? `${tr(["Editar", "Edit", "Editar", "Modifier"])} ${draft.handle}`
          : tr(["Novo perfil", "New profile", "Nuevo perfil", "Nouveau profil"])
      }
      hint={tr([
        "Quanto mais legendas e números, melhor a análise",
        "The more captions and numbers, the better the analysis",
        "Cuantas más descripciones y números, mejor el análisis",
        "Plus il y a de légendes et de chiffres, meilleure est l’analyse",
      ])}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!d.handle.trim()) return;
          save.mutate(
            {
              ...d,
              handle: d.handle.trim(),
              metrics: Object.fromEntries(
                Object.entries(d.metrics)
                  .filter(([, v]) => v.trim())
                  .map(([k, v]) => [k, Number(v.replace(/\D/g, "")) || v]),
              ) as never,
            },
            {
              onSuccess: () => {
                toast.success(
                  tr(["Perfil salvo.", "Profile saved.", "Perfil guardado.", "Profil enregistré."]),
                );
                onDone();
              },
              onError: (err) => toast.error((err as Error).message),
            },
          );
        }}
      >
        <div className="min-w-0">
          <span className={label}>{tr(["Rede", "Network", "Red", "Réseau"])}</span>
          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5">
            {NETWORKS.map((n) => (
              <Pill
                key={n}
                icon={NETWORK_STYLE[n].icon}
                color={NETWORK_STYLE[n].color}
                active={d.network === n}
                onClick={() => set("network", n)}
              >
                {NETWORK_LABEL[n]}
              </Pill>
            ))}
          </div>
        </div>
        <div className="grid min-w-0 gap-3 @2xl:grid-cols-2">
          <label className="min-w-0">
            <span className={label}>{tr(["Perfil", "Profile", "Perfil", "Profil"])}</span>
            <input
              value={d.handle}
              maxLength={80}
              required
              onChange={(e) => set("handle", e.target.value)}
              placeholder="@nutriconnect"
              className={field}
            />
          </label>
          <label className="min-w-0">
            <span className={label}>
              {tr(["Link (opcional)", "Link (optional)", "Enlace (opcional)", "Lien (facultatif)"])}
            </span>
            <input
              value={d.url ?? ""}
              type="url"
              onChange={(e) => set("url", e.target.value)}
              placeholder="https://instagram.com/…"
              className={field}
            />
          </label>
        </div>
        <label className="block min-w-0">
          <span className={label}>
            {tr(["Bio e objetivo", "Bio and goal", "Bio y objetivo", "Bio et objectif"])}
          </span>
          <textarea
            value={d.notes ?? ""}
            maxLength={3000}
            rows={3}
            onChange={(e) => set("notes", e.target.value)}
            placeholder={tr([
              "Bio atual, público que queremos atingir, objetivo da conta…",
              "Current bio, audience we want to reach, account goal…",
              "Bio actual, público al que queremos llegar, objetivo de la cuenta…",
              "Bio actuelle, public visé, objectif du compte…",
            ])}
            className={cn(field, "resize-y")}
          />
        </label>
        <div className="min-w-0">
          <span className={label}>
            {tr([
              "Números do painel da rede",
              "Numbers from the network’s dashboard",
              "Números del panel de la red",
              "Chiffres du tableau de bord du réseau",
            ])}
          </span>
          <div className="grid grid-cols-2 gap-2 @2xl:grid-cols-5">
            {METRICS.map((m) => (
              <label
                key={m.key}
                className="min-w-0 rounded-2xl border border-border/60 bg-background/60 p-2"
              >
                <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                  <m.icon className="h-3 w-3 shrink-0" style={{ color: st.color }} />
                  <span className="truncate">{tr(m.label)}</span>
                </span>
                <input
                  value={d.metrics[m.key] ?? ""}
                  inputMode="numeric"
                  onChange={(e) => set("metrics", { ...d.metrics, [m.key]: e.target.value })}
                  placeholder="0"
                  className="w-full min-w-0 bg-transparent text-sm font-bold text-foreground outline-none placeholder:text-muted-foreground/50"
                />
              </label>
            ))}
          </div>
        </div>
        <label className="block min-w-0">
          <span className={label}>
            {tr([
              "Legendas recentes",
              "Recent captions",
              "Descripciones recientes",
              "Légendes récentes",
            ])}
          </span>
          <textarea
            value={d.sample_posts ?? ""}
            maxLength={8000}
            rows={6}
            onChange={(e) => set("sample_posts", e.target.value)}
            placeholder={tr([
              "Cole aqui 5 a 10 legendas recentes (separe com uma linha em branco). Se souber, anote ao lado as curtidas e os comentários de cada uma.",
              "Paste 5 to 10 recent captions here (separate them with a blank line). If you know them, note each one’s likes and comments next to it.",
              "Pega aquí de 5 a 10 descripciones recientes (sepáralas con una línea en blanco). Si los sabes, anota al lado los me gusta y comentarios de cada una.",
              "Collez ici 5 à 10 légendes récentes (séparées par une ligne vide). Si vous les connaissez, notez à côté les j’aime et les commentaires de chacune.",
            ])}
            className={cn(field, "resize-y")}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className={btnPrimary}
            disabled={!d.handle.trim() || save.isPending}
          >
            <Check className="h-4 w-4" />{" "}
            {save.isPending
              ? tr(["Salvando…", "Saving…", "Guardando…", "Enregistrement…"])
              : tr(["Salvar perfil", "Save profile", "Guardar perfil", "Enregistrer le profil"])}
          </button>
          <button type="button" className={btnSoft} onClick={onDone}>
            {tr(["Cancelar", "Cancel", "Cancelar", "Annuler"])}
          </button>
        </div>
      </form>
    </StudioCard>
  );
}

function ProfileCard({
  profile,
  delay,
  onEdit,
}: {
  profile: SocialProfile;
  delay: number;
  onEdit: () => void;
}) {
  const { locale } = useI18n();
  const tr = useTr();
  const qc = useQueryClient();
  const remove = useDeleteProfile();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const analysis = profile.analysis as SocialAnalysis | null;
  const st = styleOf(profile.network);
  const metrics = (profile.metrics ?? {}) as Record<string, unknown>;
  const shown = METRICS.filter((m) => fmt(metrics[m.key]));

  const analyze = async (image?: File) => {
    setBusy(true);
    try {
      const dataUrl = image ? await fileToDataUrl(image, 1400, 0.8) : undefined;
      const res = await analyzeSocialProfile({
        data: { profileId: profile.id, image: dataUrl, locale: locale as never },
      });
      if ("error" in res)
        toast.error(
          res.error === "limit"
            ? tr([
                "A cota de IA de hoje acabou.",
                "Today’s AI quota is used up.",
                "La cuota de IA de hoy se agotó.",
                "Le quota d’IA du jour est épuisé.",
              ])
            : tr([
                "A IA não conseguiu analisar agora.",
                "The AI couldn’t analyze right now.",
                "La IA no pudo analizar ahora.",
                "L’IA n’a pas pu analyser pour le moment.",
              ]),
        );
      else {
        toast.success(
          tr(["Diagnóstico pronto.", "Diagnosis ready.", "Diagnóstico listo.", "Diagnostic prêt."]),
        );
        await qc.invalidateQueries({ queryKey: studioKeys.profiles() });
      }
    } catch (err) {
      toast.error(
        (err as Error).message ||
          tr([
            "A IA não conseguiu analisar agora.",
            "The AI couldn’t analyze right now.",
            "La IA no pudo analizar ahora.",
            "L’IA n’a pas pu analyser pour le moment.",
          ]),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      className="nc-tile-in min-w-0 overflow-hidden rounded-[1.6rem] border shadow-xs"
      style={{
        animationDelay: `${delay}ms`,
        borderColor: `color-mix(in srgb, ${st.color} 22%, var(--border))`,
        background: "var(--card)",
      }}
    >
      <header
        className="relative flex min-w-0 flex-wrap items-center gap-3 p-4"
        style={{
          background: `linear-gradient(130deg, ${tint(st.color, 18)} 0%, ${tint(st.color2, 22)} 100%)`,
        }}
      >
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-md"
          style={{ background: badgeBg(st.color) }}
        >
          <st.icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/60">
            {NETWORK_LABEL[profile.network as Network] ?? profile.network}
          </p>
          <p className="truncate font-display text-lg font-bold leading-tight text-foreground">
            {profile.handle}
          </p>
          {profile.url && (
            <a
              href={profile.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground/70 hover:text-foreground hover:underline"
            >
              <ExternalLink className="h-3 w-3" />{" "}
              {tr(["Abrir perfil", "Open profile", "Abrir perfil", "Ouvrir le profil"])}
            </a>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className={cn(btnIcon, "bg-card/70")}
            onClick={onEdit}
            aria-label={tr([
              "Editar perfil",
              "Edit profile",
              "Editar perfil",
              "Modifier le profil",
            ])}
            title={tr(["Editar", "Edit", "Editar", "Modifier"])}
          >
            <Pencil className="h-4 w-4" />
          </button>
          {confirmDelete ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-card/90 p-0.5 pl-2.5 text-[11px] font-semibold text-foreground shadow-sm">
              {tr(["Apagar?", "Delete?", "¿Borrar?", "Supprimer ?"])}
              <button
                type="button"
                className="h-8 rounded-full bg-destructive px-3 text-[11px] font-bold text-destructive-foreground"
                onClick={() => remove.mutate(profile.id)}
              >
                {tr(["Sim", "Yes", "Sí", "Oui"])}
              </button>
              <button
                type="button"
                className="h-8 rounded-full px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                onClick={() => setConfirmDelete(false)}
              >
                {tr(["Não", "No", "No", "Non"])}
              </button>
            </span>
          ) : (
            <button
              type="button"
              className={cn(btnIcon, "bg-card/70 hover:text-destructive")}
              onClick={() => setConfirmDelete(true)}
              aria-label={tr([
                "Apagar perfil",
                "Delete profile",
                "Borrar perfil",
                "Supprimer le profil",
              ])}
              title={tr(["Apagar", "Delete", "Borrar", "Supprimer"])}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      <div className="space-y-4 p-4">
        {shown.length > 0 && (
          <ul className="grid grid-cols-2 gap-2 @2xl:grid-cols-5">
            {shown.map((m) => (
              <li
                key={m.key}
                className="min-w-0 rounded-2xl p-2.5"
                style={{ background: tint(st.color, 8) }}
              >
                <m.icon className="h-4 w-4" style={{ color: st.color }} />
                <p className="mt-1 truncate font-display text-lg font-bold leading-none text-foreground">
                  {fmt(metrics[m.key])}
                </p>
                <p className="mt-0.5 truncate text-[10px] font-semibold text-muted-foreground">
                  {tr(m.label)}
                </p>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={btnPrimary}
            disabled={busy}
            onClick={() => void analyze()}
          >
            <Sparkles className={cn("h-4 w-4", busy && "animate-spin")} />
            {busy
              ? tr(["Analisando…", "Analyzing…", "Analizando…", "Analyse…"])
              : analysis
                ? tr([
                    "Analisar de novo",
                    "Analyze again",
                    "Analizar de nuevo",
                    "Analyser à nouveau",
                  ])
                : tr([
                    "Analisar com IA",
                    "Analyze with AI",
                    "Analizar con IA",
                    "Analyser avec l’IA",
                  ])}
          </button>
          <button
            type="button"
            className={btnSoft}
            disabled={busy}
            onClick={() => file.current?.click()}
            title={tr([
              "Analisar com um print do perfil",
              "Analyze with a screenshot of the profile",
              "Analizar con una captura del perfil",
              "Analyser avec une capture du profil",
            ])}
          >
            <Camera className="h-4 w-4" />{" "}
            {tr(["Com print", "With screenshot", "Con captura", "Avec capture"])}
          </button>
          <input
            ref={file}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void analyze(f);
            }}
          />
          {profile.analyzed_at && (
            <span className="text-[11px] text-muted-foreground">
              {tr(["Analisado em", "Analyzed on", "Analizado el", "Analysé le"])}{" "}
              {dateTime(profile.analyzed_at)}
            </span>
          )}
        </div>

        {busy ? (
          <div className="grid gap-3 @2xl:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="st-shimmer h-24 rounded-2xl bg-secondary" />
            ))}
          </div>
        ) : analysis ? (
          <Analysis analysis={analysis} color={st.color} />
        ) : (
          <EmptyState
            icon={BarChart3}
            color={st.color}
            title={tr([
              "Ainda sem diagnóstico",
              "No diagnosis yet",
              "Aún sin diagnóstico",
              "Pas encore de diagnostic",
            ])}
            text={tr([
              "Toque em Analisar com IA. Quanto mais legendas e números você colar no cadastro, melhor.",
              "Tap Analyze with AI. The more captions and numbers you paste into the profile, the better.",
              "Toca Analizar con IA. Cuantas más descripciones y números pegues en el registro, mejor.",
              "Touchez Analyser avec l’IA. Plus vous collez de légendes et de chiffres dans la fiche, mieux c’est.",
            ])}
          />
        )}
      </div>
    </article>
  );
}

function Analysis({ analysis, color }: { analysis: SocialAnalysis; color: string }) {
  const tr = useTr();
  const [copied, setCopied] = useState(false);
  const lists: { title: string; items: string[]; icon: LucideIcon; color: string }[] = [
    {
      title: tr([
        "Pilares de conteúdo",
        "Content pillars",
        "Pilares de contenido",
        "Piliers de contenu",
      ]),
      items: analysis.pilares,
      icon: Layers,
      color: "#7a5cc4",
    },
    {
      title: tr(["Pontos fortes", "Strengths", "Puntos fuertes", "Points forts"]),
      items: analysis.pontos_fortes,
      icon: ThumbsUp,
      color: "#2f8a5b",
    },
    {
      title: tr(["O que melhorar", "What to improve", "Qué mejorar", "À améliorer"]),
      items: analysis.melhorar,
      icon: Wrench,
      color: "#d9692a",
    },
    {
      title: tr([
        "Ações de engajamento",
        "Engagement actions",
        "Acciones de interacción",
        "Actions d’engagement",
      ]),
      items: analysis.acoes_engajamento,
      icon: Heart,
      color: "#d6456b",
    },
    {
      title: tr([
        "Formatos recomendados",
        "Recommended formats",
        "Formatos recomendados",
        "Formats recommandés",
      ]),
      items: analysis.formatos_recomendados,
      icon: LayoutGrid,
      color: "#3b7bbf",
    },
    {
      title: tr([
        "Metas para 30 dias",
        "30-day goals",
        "Metas para 30 días",
        "Objectifs à 30 jours",
      ]),
      items: analysis.metas_30_dias,
      icon: Target,
      color: "#c58a12",
    },
  ];
  const blocks: { title: string; text: string; icon: LucideIcon }[] = [
    {
      title: tr(["Tom atual", "Current tone", "Tono actual", "Ton actuel"]),
      text: analysis.tom_atual,
      icon: MessageCircle,
    },
    {
      title: tr(["Público", "Audience", "Público", "Public"]),
      text: analysis.publico,
      icon: Users,
    },
    {
      title: tr(["Frequência", "Frequency", "Frecuencia", "Fréquence"]),
      text: analysis.frequencia,
      icon: CalendarClock,
    },
    {
      title: tr(["Melhores horários", "Best times", "Mejores horarios", "Meilleurs horaires"]),
      text: analysis.melhores_horarios,
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-3">
      {analysis.resumo && (
        <p
          className="rounded-2xl px-4 py-3 text-sm leading-relaxed text-foreground"
          style={{ background: tint(color, 10) }}
        >
          {analysis.resumo}
        </p>
      )}
      <ul className="grid gap-2 @2xl:grid-cols-2 @5xl:grid-cols-4">
        {blocks
          .filter((b) => b.text)
          .map((b) => (
            <li key={b.title} className="min-w-0 rounded-2xl border border-border/60 p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <b.icon className="h-3.5 w-3.5" style={{ color }} /> {b.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-foreground">{b.text}</p>
            </li>
          ))}
      </ul>
      <ul className="grid gap-3 @2xl:grid-cols-2 @5xl:grid-cols-3">
        {lists
          .filter((l) => l.items?.length)
          .map((l, k) => (
            <li
              key={l.title}
              className="nc-tile-in min-w-0 rounded-2xl border p-3"
              style={{
                animationDelay: `${k * 50}ms`,
                background: `linear-gradient(160deg, ${tint(l.color, 9)}, var(--card) 70%)`,
                borderColor: `color-mix(in srgb, ${l.color} 20%, transparent)`,
              }}
            >
              <p className="mb-2 flex items-center gap-2 text-xs font-bold text-foreground">
                <IconBadge icon={l.icon} color={l.color} size="sm" />
                {l.title}
              </p>
              <ul className="space-y-1.5">
                {l.items.map((i) => (
                  <li key={i} className="flex gap-2 text-xs leading-snug text-foreground/90">
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: l.color }}
                    />
                    {i}
                  </li>
                ))}
              </ul>
            </li>
          ))}
      </ul>
      {analysis.bio_sugerida && (
        <div
          className="rounded-2xl border p-3"
          style={{
            borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
            background: tint(color, 6),
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color }}>
              {tr(["Bio sugerida", "Suggested bio", "Bio sugerida", "Bio suggérée"])}
            </p>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(analysis.bio_sugerida).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1800);
                });
              }}
              className="inline-flex h-7 items-center gap-1 rounded-full bg-card px-2.5 text-[11px] font-semibold text-foreground shadow-xs"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied
                ? tr(["Copiada", "Copied", "Copiada", "Copiée"])
                : tr(["Copiar", "Copy", "Copiar", "Copier"])}
            </button>
          </div>
          <p className="mt-1.5 whitespace-pre-line text-sm text-foreground">
            {analysis.bio_sugerida}
          </p>
        </div>
      )}
    </div>
  );
}
