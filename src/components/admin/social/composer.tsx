// Editor de posts do estúdio (tela cheia): à esquerda, as etapas em cards (começar por um modelo ou
// pela IA, texto, visual e publicar); à direita, a prévia ao vivo no formato exato de cada rede.
// Regra do NutriConnect: nada de emojis — as artes usam ícones e o editor avisa e limpa emojis.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlignLeft,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Ban,
  Briefcase,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clapperboard,
  Copy,
  Download,
  Eraser,
  FilePlus2,
  FlaskConical,
  GalleryHorizontal,
  Hash,
  Image as ImageIcon,
  LayoutTemplate,
  Loader2,
  Megaphone,
  MessageCircleQuestion,
  Music2,
  Palette,
  Plus,
  Save,
  Scissors,
  Send,
  Shapes,
  Smile,
  Sparkles,
  Target,
  Trash2,
  Type,
  Users,
  Wand2,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import { ART_ICON_GROUPS, ART_ICONS, type ArtIconGroup } from "@/lib/art-icons";
import {
  ART_LAYOUTS,
  ART_SIZES,
  ART_THEMES,
  downloadCanvas,
  drawArt,
  hasEmoji,
  stripEmoji,
  type ArtLayout,
  type ArtTheme,
} from "@/lib/post-art";
import {
  FORMAT_LABEL,
  NETWORK_LABEL,
  STATUSES,
  STATUS_LABEL,
  useDeletePost,
  useSavePost,
  type SocialProfile,
} from "@/lib/social-studio";
import {
  FORMATS,
  NETWORKS,
  rewriteSocialText,
  suggestSocialPosts,
  type Goal,
  type Network,
  type PostFormat,
} from "@/lib/social-studio.functions";
import {
  CATEGORY_LABEL,
  CATEGORY_STYLE,
  TEMPLATES,
  type SocialTemplate,
  type TemplateCategory,
} from "@/lib/social-templates";
import { cn } from "@/lib/utils";
import { ImageBank } from "@/components/admin/social/image-bank";
import { ArtIcon, Floaters, IconBadge, StudioCard } from "@/components/admin/social/kit";
import {
  FORMAT_STYLE,
  NETWORK_STYLE,
  STATUS_STYLE,
  badgeBg,
  btnIcon,
  btnPrimary,
  btnSoft,
  field,
  tileBg,
  tint,
} from "@/components/admin/social/kit-styles";
import { NetworkPreview } from "@/components/admin/social/previews";
import { DraftThumb, TemplateThumb } from "@/components/admin/social/template-thumb";
import {
  CAPTION_LIMIT,
  EMPTY_DRAFT,
  PREVIEW_LABEL,
  artSizeFor,
  composeCaption,
  coverBody,
  defaultPreview,
  draftFromTemplate,
  draftToRow,
  slideLayout,
  useArtImages,
  type Draft,
  type PreviewMode,
} from "@/components/admin/social/use-art";

type Step = "comecar" | "texto" | "visual" | "publicar";
const STEPS: { id: Step; label: string; hint: string; icon: LucideIcon; color: string }[] = [
  { id: "comecar", label: "Começar", hint: "Modelo ou IA", icon: LayoutTemplate, color: "#c58a12" },
  { id: "texto", label: "Texto", hint: "Gancho e legenda", icon: Type, color: "#3b7bbf" },
  { id: "visual", label: "Visual", hint: "Arte e fotos", icon: Palette, color: "#d6456b" },
  { id: "publicar", label: "Publicar", hint: "Revisar e postar", icon: Send, color: "#2f8a5b" },
];

const MODES: PreviewMode[] = [
  "ig-feed",
  "ig-story",
  "ig-reels",
  "tiktok",
  "facebook",
  "linkedin",
  "x",
  "youtube",
];
const MODE_NETWORK: Record<PreviewMode, Network> = {
  "ig-feed": "instagram",
  "ig-story": "instagram",
  "ig-reels": "instagram",
  tiktok: "tiktok",
  facebook: "facebook",
  linkedin: "linkedin",
  x: "x",
  youtube: "youtube",
};

const QUICK: { label: string; prompt: string; icon: LucideIcon; color: string }[] = [
  { label: "Mais curto", prompt: "Mais curto e direto", icon: Scissors, color: "#3b7bbf" },
  {
    label: "Mais leve",
    prompt: "Mais leve e acolhedor, sem emojis",
    icon: Smile,
    color: "#c58a12",
  },
  {
    label: "Mais científico",
    prompt: "Mais científico e confiável, citando o Guia Alimentar quando fizer sentido",
    icon: FlaskConical,
    color: "#7a5cc4",
  },
  {
    label: "Pergunta no fim",
    prompt: "Termine com uma pergunta que gere comentários",
    icon: MessageCircleQuestion,
    color: "#d6456b",
  },
  {
    label: "Tom profissional",
    prompt: "Tom profissional para o LinkedIn, frases claras e sem gírias",
    icon: Briefcase,
    color: "#0a66c2",
  },
  {
    label: "Fala de vídeo",
    prompt: "Adapte para fala informal de vídeo curto (TikTok/Reels)",
    icon: Music2,
    color: "#1f2937",
  },
];

const GOALS: { id: Goal; label: string; icon: LucideIcon }[] = [
  { id: "engajamento", label: "Engajamento", icon: MessageCircleQuestion },
  { id: "alcance", label: "Alcance", icon: Megaphone },
  { id: "autoridade", label: "Autoridade", icon: FlaskConical },
  { id: "conversao", label: "Novas contas", icon: Target },
  { id: "comunidade", label: "Comunidade", icon: Users },
];

const BEST_TIME: Partial<Record<Network, string>> = {
  instagram: "Dias úteis entre 11h e 13h ou 18h e 21h.",
  tiktok: "Fim da tarde e noite (18h–22h), também nos fins de semana.",
  facebook: "Manhã (9h–11h) e início da noite.",
  linkedin: "Terça a quinta, entre 8h e 10h.",
  x: "Manhã cedo e horário de almoço.",
  youtube: "Sexta a domingo, à tarde.",
};

/** Valor que só muda depois de um tempo parado (evita redesenhar a cada tecla). */
function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Tira emojis de todos os textos do rascunho. */
function cleanDraft(d: Draft): Draft {
  return {
    ...d,
    title: stripEmoji(d.title),
    hook: stripEmoji(d.hook),
    caption: stripEmoji(d.caption),
    script: stripEmoji(d.script),
    cta: stripEmoji(d.cta),
    slides: d.slides.map((s) => ({ title: stripEmoji(s.title), text: stripEmoji(s.text) })),
    design: {
      ...d.design,
      kicker: stripEmoji(d.design.kicker ?? ""),
      body: d.design.body ? stripEmoji(d.design.body) : d.design.body,
    },
  };
}
const draftHasEmoji = (d: Draft) =>
  hasEmoji(
    [d.title, d.hook, d.caption, d.script, d.cta, d.design.kicker ?? "", d.design.body ?? ""]
      .concat(d.slides.flatMap((s) => [s.title, s.text]))
      .join(" "),
  );

export function Composer({
  initial,
  handle,
  profiles,
  onClose,
}: {
  initial: Draft;
  handle: string;
  profiles: SocialProfile[];
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const save = useSavePost();
  const remove = useDeletePost();
  const [d, setD] = useState<Draft>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [step, setStep] = useState<Step>(initial.id || initial.caption ? "texto" : "comecar");
  const [mode, setMode] = useState<PreviewMode>(defaultPreview(initial.network, initial.format));
  const dirty = JSON.stringify(d) !== saved;
  const size = artSizeFor(mode, d.format);
  const art = useArtImages(d, size, handle);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((o) => ({ ...o, [k]: v }));
  const setDesign = (patch: Partial<Draft["design"]>) =>
    setD((o) => ({ ...o, design: { ...o.design, ...patch } }));
  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const scroller = useRef<HTMLDivElement>(null);

  const go = (s: Step) => {
    setStep(s);
    scroller.current?.scrollTo({ top: 0 });
  };

  const doSave = () =>
    save.mutate(
      { id: d.id, row: draftToRow(d) },
      {
        onSuccess: (id) => {
          const next = { ...d, id };
          setD(next);
          setSaved(JSON.stringify(next));
          toast.success("Post salvo.");
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );

  /** Cópia do post em Modelos (o post aberto continua como está). */
  const saveAsTemplate = () =>
    save.mutate(
      {
        row: draftToRow({
          ...d,
          id: undefined,
          is_template: true,
          status: "rascunho",
          scheduled_for: null,
        }),
      },
      {
        onSuccess: () => toast.success("Salvo em Modelos da equipe."),
        onError: (err) => toast.error((err as Error).message),
      },
    );

  // Ctrl+S salva.
  const keys = useRef({ save: doSave });
  keys.current.save = doSave;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        keys.current.save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const close = () => {
    if (dirty && !window.confirm("Há mudanças não salvas. Sair mesmo assim?")) return;
    onClose();
  };

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(composeCaption(d));
      toast.success("Legenda copiada. É só colar na rede.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const downloadAll = async () => {
    const slides = d.format === "carrossel" ? d.slides.filter((s) => s.title || s.text) : [];
    const total = slides.length ? slides.length + 1 : 1;
    const layout = d.design.layout ?? "classico";
    const base = {
      size,
      theme: d.design.theme ?? "oliva",
      handle,
      icon: d.design.icon,
      image: d.design.image,
    } as const;
    try {
      downloadCanvas(
        await drawArt({
          ...base,
          layout,
          kicker: d.design.kicker,
          title: d.title || d.hook || "Post",
          body: coverBody(d, handle),
          page: { index: 1, total },
        }),
        `${d.title || "post"}-1`,
      );
      for (let i = 0; i < slides.length; i++) {
        downloadCanvas(
          await drawArt({
            ...base,
            layout: slideLayout(layout),
            title: slides[i].title || d.title,
            body: slides[i].text,
            page: { index: i + 2, total },
          }),
          `${d.title || "post"}-${i + 2}`,
        );
      }
      toast.success(total > 1 ? `${total} artes baixadas.` : "Arte baixada.");
    } catch {
      toast.error("Não foi possível gerar a arte. Tente outra foto.");
    }
  };

  const status = STATUS_STYLE[d.status];

  return (
    <div className="st-root fixed inset-0 z-[60] flex flex-col bg-background animate-in fade-in duration-300">
      {/* Cabeçalho */}
      <header className="st-glass relative z-20 flex min-h-16 items-center gap-2 border-b border-border/60 px-3 py-2.5 sm:gap-3 sm:px-5">
        <button type="button" onClick={close} className={btnIcon} aria-label="Fechar">
          <X className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <IconBadge
            icon={NETWORK_STYLE[d.network].icon}
            color={NETWORK_STYLE[d.network].color}
            size="sm"
            className="hidden sm:grid"
          />
          <div className="min-w-0 flex-1">
            <input
              value={d.title}
              maxLength={160}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Título do post (só para a equipe)"
              className="block w-full min-w-0 truncate bg-transparent font-display text-base font-bold leading-tight text-foreground outline-none placeholder:text-muted-foreground/60 sm:text-lg"
            />
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span>
                {NETWORK_LABEL[d.network]} · {FORMAT_LABEL[d.format]}
              </span>
              <span aria-hidden="true">·</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-semibold",
                  dirty ? "text-warning" : "text-emerald-600",
                )}
              >
                {dirty ? (
                  <Circle className="h-2 w-2 fill-current" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                {dirty ? "Não salvo" : d.id ? "Salvo" : "Novo"}
              </span>
            </p>
          </div>
        </div>
        <label
          className="relative hidden h-9 items-center gap-1.5 rounded-full border pl-3 pr-2 text-xs font-bold md:inline-flex"
          style={{
            color: status.color,
            background: tint(status.color, 12),
            borderColor: `color-mix(in srgb, ${status.color} 30%, transparent)`,
          }}
        >
          <status.icon className="h-3.5 w-3.5" />
          <select
            value={d.status}
            onChange={(e) => set("status", e.target.value as Draft["status"])}
            className="cursor-pointer appearance-none bg-transparent pr-4 outline-none"
            aria-label="Status"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 opacity-70" />
        </label>
        <button
          type="button"
          className={cn(btnSoft, "hidden h-9 px-3.5 text-xs sm:inline-flex")}
          onClick={() => void copyCaption()}
        >
          <Copy className="h-3.5 w-3.5" /> Copiar legenda
        </button>
        <button
          type="button"
          className={cn(btnPrimary, "h-9 px-4 text-xs")}
          disabled={save.isPending}
          onClick={() => doSave()}
          title="Salvar (Ctrl+S)"
        >
          {save.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Salvar
        </button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,500px)_minmax(0,1fr)] lg:overflow-hidden xl:grid-cols-[minmax(0,540px)_minmax(0,1fr)]">
        {/* Painel de edição */}
        <aside className="flex min-w-0 flex-col border-border/60 bg-background lg:min-h-0 lg:border-r">
          <nav
            className="grid grid-cols-4 gap-1.5 border-b border-border/60 p-2.5"
            aria-label="Etapas"
          >
            {STEPS.map((s, k) => {
              const on = step === s.id;
              const done = k < stepIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => go(s.id)}
                  className={cn(
                    "group relative flex min-w-0 flex-col items-center gap-1 rounded-2xl border px-1 py-2 transition duration-300",
                    on ? "shadow-sm" : "border-transparent hover:bg-secondary/60",
                  )}
                  style={
                    on
                      ? {
                          background: tileBg(s.color, s.color, 14, 22),
                          borderColor: `color-mix(in srgb, ${s.color} 35%, transparent)`,
                        }
                      : undefined
                  }
                >
                  <span
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-xl transition duration-300",
                      on ? "text-white shadow-md group-hover:-rotate-6" : "text-muted-foreground",
                    )}
                    style={
                      on ? { background: badgeBg(s.color) } : { background: tint(s.color, 10) }
                    }
                  >
                    {done ? (
                      <Check className="h-4 w-4" style={{ color: s.color }} />
                    ) : (
                      <s.icon className="h-4 w-4" style={on ? undefined : { color: s.color }} />
                    )}
                  </span>
                  <span
                    className={cn(
                      "max-w-full truncate text-[11px] font-bold",
                      on ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </nav>
          <div className="h-1 bg-secondary/60">
            <div
              className="h-full rounded-r-full transition-all duration-500"
              style={{
                width: `${((stepIndex + 1) / STEPS.length) * 100}%`,
                background: `linear-gradient(90deg, ${STEPS[0].color}, ${STEPS[stepIndex].color})`,
              }}
            />
          </div>

          <div ref={scroller} className="st-thin min-h-0 flex-1 lg:overflow-y-auto">
            <div key={step} className="space-y-4 p-3.5 sm:p-4">
              {step === "comecar" && (
                <StartStep
                  d={d}
                  locale={locale}
                  onApply={(next) => {
                    setD((o) => ({
                      ...next,
                      id: o.id,
                      status: o.status,
                      scheduled_for: o.scheduled_for,
                      profile_id: o.profile_id,
                    }));
                    setMode(defaultPreview(next.network, next.format));
                    go("texto");
                  }}
                />
              )}
              {step === "texto" && (
                <TextStep
                  d={d}
                  set={set}
                  setD={setD}
                  mode={mode}
                  locale={locale}
                  onNetwork={(n) => setMode(defaultPreview(n, d.format))}
                  onFormat={(f) => setMode(defaultPreview(d.network, f))}
                />
              )}
              {step === "visual" && (
                <VisualStep
                  d={d}
                  setDesign={setDesign}
                  handle={handle}
                  onDownload={() => void downloadAll()}
                />
              )}
              {step === "publicar" && (
                <PublishStep
                  d={d}
                  set={set}
                  mode={mode}
                  images={art.images}
                  profiles={profiles}
                  onClean={() => setD((o) => cleanDraft(o))}
                  onCopy={() => void copyCaption()}
                  onDownload={() => void downloadAll()}
                  onTemplate={saveAsTemplate}
                  onDelete={
                    d.id
                      ? () => {
                          if (window.confirm("Apagar este post?"))
                            remove.mutate(d.id!, { onSuccess: onClose });
                        }
                      : undefined
                  }
                />
              )}
            </div>
          </div>

          <footer className="flex items-center gap-2 border-t border-border/60 bg-background/95 px-3.5 py-2.5 sm:px-4">
            <button
              type="button"
              className={cn(btnSoft, "h-9 px-3.5 text-xs")}
              disabled={stepIndex === 0}
              onClick={() => go(STEPS[stepIndex - 1].id)}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar
            </button>
            <span className="flex-1 text-center text-[11px] text-muted-foreground">
              Etapa {stepIndex + 1} de {STEPS.length}
            </span>
            {stepIndex < STEPS.length - 1 ? (
              <button
                type="button"
                className={cn(btnPrimary, "h-9 px-4 text-xs")}
                onClick={() => go(STEPS[stepIndex + 1].id)}
              >
                {STEPS[stepIndex + 1].label} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                className={cn(btnPrimary, "h-9 px-4 text-xs")}
                disabled={save.isPending}
                onClick={() => doSave()}
              >
                <Save className="h-3.5 w-3.5" /> Salvar post
              </button>
            )}
          </footer>
        </aside>

        {/* Prévia */}
        <section
          className="relative min-w-0 border-t border-border/60 lg:min-h-0 lg:overflow-y-auto lg:border-t-0"
          style={{
            background:
              "radial-gradient(900px 520px at 85% -10%, color-mix(in srgb, #f6c27a 22%, transparent), transparent), radial-gradient(800px 480px at -10% 110%, color-mix(in srgb, #9fd18c 20%, transparent), transparent), radial-gradient(700px 420px at 110% 90%, color-mix(in srgb, #9fb0f0 18%, transparent), transparent)",
          }}
        >
          <div className="sticky top-0 z-10 border-b border-border/40 bg-background/70 px-3 py-2.5 backdrop-blur-md sm:px-5">
            <div className="no-scrollbar mx-auto flex max-w-max gap-1 overflow-x-auto rounded-full border border-border/60 bg-card/80 p-1 shadow-sm">
              {MODES.map((m) => {
                const st = NETWORK_STYLE[MODE_NETWORK[m]];
                const on = mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={cn(
                      "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition",
                      on
                        ? "text-white shadow-md"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                    style={on ? { background: badgeBg(st.color) } : undefined}
                  >
                    <st.icon className="h-3.5 w-3.5" />
                    {PREVIEW_LABEL[m].replace("Instagram · ", "")}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col items-center gap-4 px-4 pb-12 pt-6">
            <div className="st-float">
              <NetworkPreview
                mode={mode}
                draft={d}
                images={art.images}
                handle={handle}
                busy={art.busy}
              />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-semibold">
              <span className="rounded-full border border-border/60 bg-card/80 px-2.5 py-1 text-muted-foreground backdrop-blur">
                {ART_SIZES[size].label} · {ART_SIZES[size].w}×{ART_SIZES[size].h}px
              </span>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 backdrop-blur",
                  composeCaption(d).length > CAPTION_LIMIT[mode]
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : "border-border/60 bg-card/80 text-muted-foreground",
                )}
              >
                {composeCaption(d).length}/{CAPTION_LIMIT[mode]} caracteres
              </span>
            </div>
            {art.images.length > 1 && (
              <div className="no-scrollbar flex max-w-full gap-2 overflow-x-auto px-1 pb-1">
                {art.images.map((src, k) => (
                  <img
                    key={k}
                    src={src}
                    alt={`Slide ${k + 1}`}
                    className="h-24 shrink-0 rounded-xl border border-border/60 shadow-sm animate-in fade-in zoom-in-95"
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// ───────────────────────────── Partes comuns ─────────────────────────────

function Counter({ n, max }: { n: number; max: number }) {
  const pct = Math.min(1, n / max);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] tabular-nums",
        n > max ? "font-bold text-destructive" : "text-muted-foreground",
      )}
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4 -rotate-90">
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.18"
          strokeWidth="3"
        />
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke={n > max ? "var(--destructive)" : "var(--accent)"}
          strokeWidth="3"
          strokeDasharray={`${pct * 50.3} 50.3`}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      {n}/{max}
    </span>
  );
}

function Label({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-1.5 flex min-h-5 items-center justify-between gap-2">
      <span className="text-xs font-semibold text-foreground/80">{children}</span>
      {right}
    </div>
  );
}

/** Botão quadrado de escolha (rede, formato, objetivo). */
function Choice({
  icon: Icon,
  color,
  label,
  hint,
  active,
  onClick,
}: {
  icon: LucideIcon;
  color: string;
  label: string;
  hint?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl border px-1.5 py-2.5 text-center transition duration-300 hover:-translate-y-0.5",
        active ? "shadow-md" : "border-border/60 bg-card hover:shadow-sm",
      )}
      style={
        active
          ? {
              background: tileBg(color, color, 16, 26),
              borderColor: `color-mix(in srgb, ${color} 50%, transparent)`,
            }
          : undefined
      }
    >
      <span
        className={cn(
          "grid h-8 w-8 place-items-center rounded-xl transition duration-300 group-hover:scale-110",
          active ? "text-white shadow-sm" : "",
        )}
        style={active ? { background: badgeBg(color) } : { background: tint(color, 12), color }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="block max-w-full truncate text-[11px] font-bold leading-none text-foreground">
        {label}
      </span>
      {hint && (
        <span className="block max-w-full truncate text-[10px] leading-none text-muted-foreground">
          {hint}
        </span>
      )}
    </button>
  );
}

// ───────────────────────────── Etapa 1: começar ─────────────────────────────

function StartStep({
  d,
  locale,
  onApply,
}: {
  d: Draft;
  locale: string;
  onApply: (next: Draft) => void;
}) {
  const [cat, setCat] = useState<TemplateCategory | "todos">("todos");
  const [theme, setTheme] = useState("");
  const [goal, setGoal] = useState<Goal>("engajamento");
  const [busy, setBusy] = useState(false);
  const list = TEMPLATES.filter((t) => cat === "todos" || t.category === cat);
  const hasContent = !!(d.caption || d.title);

  const apply = (t: SocialTemplate) => {
    if (hasContent && !window.confirm(`Usar o modelo "${t.name}"? O texto atual será substituído.`))
      return;
    onApply(draftFromTemplate(t));
    toast.success(`Modelo "${t.name}" aplicado. Agora é só ajustar.`);
  };

  const fromAi = async () => {
    setBusy(true);
    try {
      const res = await suggestSocialPosts({
        data: {
          network: d.network,
          goal,
          formats: [d.format],
          count: 1,
          theme,
          useTrends: true,
          locale: locale as never,
        },
      });
      if ("error" in res) {
        toast.error(
          res.error === "limit"
            ? "A cota de IA de hoje acabou."
            : "A IA não conseguiu criar agora.",
        );
        return;
      }
      const idea = res.ideas[0];
      onApply(
        cleanDraft({
          ...d,
          title: idea.title,
          format: idea.format,
          hook: idea.hook,
          caption: idea.caption,
          slides: idea.slides,
          script: idea.script,
          hashtags: idea.hashtags,
          cta: idea.cta,
          pillar: idea.pillar,
          visual_idea: [idea.visual_idea, idea.best_time && `Melhor horário: ${idea.best_time}`]
            .filter(Boolean)
            .join("\n"),
          design: { ...d.design, kicker: d.design.kicker || idea.pillar.slice(0, 30) },
        }),
      );
      toast.success("Post criado pela IA. Revise antes de publicar.");
    } catch {
      toast.error("A IA não conseguiu criar agora.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section
        className="nc-tile-in nc-gradient-pan relative overflow-hidden rounded-[1.6rem] border border-border/60 p-4 shadow-soft"
        style={{
          background:
            "linear-gradient(120deg, color-mix(in srgb, #f6c27a 34%, var(--card)), color-mix(in srgb, #9fd18c 28%, var(--card)), color-mix(in srgb, #9fb0f0 28%, var(--card)), color-mix(in srgb, #f39bb0 28%, var(--card)))",
        }}
      >
        <Floaters
          items={[
            { icon: Sparkles, color: "#c58a12", className: "right-5 top-4", delay: "-0.6s" },
            { icon: Wand2, color: "#7a5cc4", className: "right-16 top-10", delay: "-2s" },
          ]}
        />
        <div className="relative flex items-center gap-3">
          <IconBadge icon={Sparkles} color="#7a5cc4" />
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground">Criar com IA</h3>
            <p className="text-[11px] leading-snug text-foreground/70">
              Diga o tema: a IA escreve o post completo para {NETWORK_LABEL[d.network]} ·{" "}
              {FORMAT_LABEL[d.format]}.
            </p>
          </div>
        </div>
        <input
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !busy && void fromAi()}
          maxLength={300}
          placeholder="Ex.: lancheira na volta às aulas, mitos do glúten…"
          className={cn(field, "relative mt-3 bg-card/95")}
        />
        <div className="relative mt-2.5 grid grid-cols-5 gap-1.5">
          {GOALS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGoal(g.id)}
              title={g.label}
              className={cn(
                "flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition",
                goal === g.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-foreground/65 hover:bg-card/60",
              )}
            >
              <g.icon className="h-3.5 w-3.5" />
              <span className="max-w-full truncate">{g.label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void fromAi()}
          disabled={busy}
          className={cn(btnPrimary, "relative mt-3 w-full")}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {busy ? "Escrevendo o post…" : "Gerar post com IA"}
        </button>
      </section>

      <StudioCard
        icon={LayoutTemplate}
        color="#c58a12"
        title="Modelos prontos"
        hint={`${list.length} modelos profissionais, prontos para ajustar`}
        delay={60}
      >
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {(["todos", ...Object.keys(CATEGORY_LABEL)] as (TemplateCategory | "todos")[]).map(
            (c) => {
              const on = cat === c;
              const st = c === "todos" ? null : CATEGORY_STYLE[c];
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(c)}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[11px] font-semibold transition",
                    on
                      ? "text-white shadow-sm"
                      : "border-border/70 bg-card text-muted-foreground hover:text-foreground",
                  )}
                  style={
                    on
                      ? { background: badgeBg(st?.color ?? "#3f4727"), borderColor: "transparent" }
                      : undefined
                  }
                >
                  {st ? (
                    <ArtIcon name={st.icon} className="h-3.5 w-3.5" />
                  ) : (
                    <Shapes className="h-3.5 w-3.5" />
                  )}
                  {c === "todos" ? "Todos" : CATEGORY_LABEL[c]}
                </button>
              );
            },
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              if (hasContent && !window.confirm("Começar do zero? O texto atual será apagado."))
                return;
              onApply({ ...EMPTY_DRAFT, network: d.network, format: d.format });
            }}
            className="nc-tile-in group flex h-full min-h-56 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/80 bg-card/60 p-3 text-center transition hover:border-accent hover:bg-accent/5"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary text-foreground transition duration-300 group-hover:rotate-90 group-hover:bg-accent group-hover:text-accent-foreground">
              <Plus className="h-5 w-5" />
            </span>
            <span className="text-xs font-bold text-foreground">Começar do zero</span>
            <span className="text-[10px] leading-snug text-muted-foreground">
              Página em branco, no seu ritmo
            </span>
          </button>
          {list.map((t, k) => (
            <TemplateCard key={t.id} t={t} delay={(k + 1) * 35} onClick={() => apply(t)} />
          ))}
        </div>
      </StudioCard>
    </>
  );
}

function TemplateCard({
  t,
  delay,
  onClick,
}: {
  t: SocialTemplate;
  delay: number;
  onClick: () => void;
}) {
  const net = NETWORK_STYLE[t.network];
  return (
    <button
      type="button"
      onClick={onClick}
      className="nc-tile-in st-card group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card text-left"
      style={{ animationDelay: `${Math.min(delay, 600)}ms` }}
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
          <Sparkles className="h-3 w-3" /> Usar modelo
        </span>
      </div>
      <div className="flex min-h-[4.25rem] flex-col p-2.5">
        <p className="truncate text-xs font-bold text-foreground">{t.name}</p>
        <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-muted-foreground">
          {t.description}
        </p>
      </div>
    </button>
  );
}

// ───────────────────────────── Etapa 2: texto ─────────────────────────────

function TextStep({
  d,
  set,
  setD,
  mode,
  locale,
  onNetwork,
  onFormat,
}: {
  d: Draft;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
  setD: React.Dispatch<React.SetStateAction<Draft>>;
  mode: PreviewMode;
  locale: string;
  onNetwork: (n: Network) => void;
  onFormat: (f: PostFormat) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [tag, setTag] = useState("");
  const limit = CAPTION_LIMIT[mode];
  const total = composeCaption(d).length;
  const emoji = draftHasEmoji(d);

  const rewrite = async (how: string) => {
    if (!d.caption.trim()) return toast.error("Escreva a legenda primeiro.");
    setBusy(how);
    try {
      const res = await rewriteSocialText({
        data: { text: d.caption, instruction: how, network: d.network, locale: locale as never },
      });
      if ("error" in res) toast.error("A IA não conseguiu reescrever agora.");
      else set("caption", stripEmoji(res.text));
    } catch {
      toast.error("A IA não conseguiu reescrever agora.");
    } finally {
      setBusy(null);
    }
  };

  const suggestTags = async () => {
    const base = [d.title, d.hook, d.caption].filter(Boolean).join("\n");
    if (!base.trim()) return toast.error("Escreva o texto primeiro.");
    setBusy("tags");
    try {
      const res = await rewriteSocialText({
        data: {
          text: base.slice(0, 4000),
          instruction:
            "Não reescreva o texto. Responda SOMENTE com 12 hashtags relevantes em português para este post (misture amplas e de nicho), separadas por espaço, cada uma começando com #.",
          network: d.network,
          locale: locale as never,
        },
      });
      if ("error" in res) return toast.error("A IA não conseguiu sugerir agora.");
      const found = [...res.text.matchAll(/#([\p{L}\p{N}_]+)/gu)].map((m) => m[1].toLowerCase());
      setD((o) => ({ ...o, hashtags: [...new Set([...o.hashtags, ...found])].slice(0, 30) }));
    } catch {
      toast.error("A IA não conseguiu sugerir agora.");
    } finally {
      setBusy(null);
    }
  };

  const addTags = (raw: string) => {
    const tags = raw
      .split(/[\s,]+/)
      .map((t) => t.replace(/^#/, "").trim().toLowerCase())
      .filter(Boolean);
    if (tags.length)
      setD((o) => ({ ...o, hashtags: [...new Set([...o.hashtags, ...tags])].slice(0, 30) }));
  };

  const moveSlide = (i: number, dir: -1 | 1) =>
    setD((o) => {
      const s = [...o.slides];
      const j = i + dir;
      if (j < 0 || j >= s.length) return o;
      [s[i], s[j]] = [s[j], s[i]];
      return { ...o, slides: s };
    });

  const editSlide = (i: number, patch: Partial<Draft["slides"][number]>) =>
    setD((o) => ({ ...o, slides: o.slides.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));

  return (
    <>
      {emoji && (
        <div className="nc-tile-in flex items-center gap-3 rounded-2xl border border-warning/40 bg-warning/10 px-3.5 py-3">
          <Ban className="h-4 w-4 shrink-0 text-warning" />
          <p className="min-w-0 flex-1 text-xs leading-snug text-foreground">
            O texto tem emojis. No NutriConnect usamos só ícones.
          </p>
          <button
            type="button"
            className={cn(btnSoft, "h-8 px-3 text-[11px]")}
            onClick={() => {
              setD((o) => cleanDraft(o));
              toast.success("Emojis removidos.");
            }}
          >
            <Eraser className="h-3.5 w-3.5" /> Remover
          </button>
        </div>
      )}

      <StudioCard
        icon={Send}
        color="#3b7bbf"
        title="Rede e formato"
        hint="Onde e como o post vai sair"
      >
        <Label>Rede</Label>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
          {NETWORKS.map((n) => (
            <Choice
              key={n}
              icon={NETWORK_STYLE[n].icon}
              color={NETWORK_STYLE[n].color}
              label={NETWORK_LABEL[n]}
              active={d.network === n}
              onClick={() => {
                set("network", n);
                onNetwork(n);
              }}
            />
          ))}
        </div>
        <div className="mt-3.5">
          <Label>Formato</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {FORMATS.map((f) => (
              <Choice
                key={f}
                icon={FORMAT_STYLE[f].icon}
                color="#3b7bbf"
                label={FORMAT_LABEL[f]}
                hint={FORMAT_STYLE[f].hint}
                active={d.format === f}
                onClick={() => {
                  set("format", f as PostFormat);
                  onFormat(f as PostFormat);
                }}
              />
            ))}
          </div>
        </div>
        <div className="mt-3.5">
          <Label>Pilar de conteúdo</Label>
          <input
            value={d.pillar}
            maxLength={80}
            onChange={(e) => set("pillar", e.target.value)}
            placeholder="Ex.: Educativo, Receitas, Bastidores"
            className={field}
          />
        </div>
      </StudioCard>

      <StudioCard
        icon={Zap}
        color="#c58a12"
        title="Gancho"
        hint="A primeira linha ou os primeiros segundos"
        right={<Counter n={d.hook.length} max={150} />}
        delay={40}
      >
        <input
          value={d.hook}
          maxLength={300}
          onChange={(e) => set("hook", e.target.value)}
          placeholder="A frase que faz a pessoa parar de rolar"
          className={field}
        />
      </StudioCard>

      <StudioCard
        icon={AlignLeft}
        color="#2f8a5b"
        title="Legenda"
        hint={`Limite do ${PREVIEW_LABEL[mode]}`}
        right={<Counter n={total} max={limit} />}
        delay={80}
      >
        <textarea
          value={d.caption}
          maxLength={5000}
          rows={9}
          onChange={(e) => set("caption", e.target.value)}
          placeholder="Escreva a legenda…"
          className={cn(field, "min-h-[12rem] resize-y leading-relaxed")}
        />
        <div className="mt-3">
          <Label>Reescrever com IA</Label>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {QUICK.map((q) => (
              <button
                key={q.label}
                type="button"
                disabled={!!busy}
                onClick={() => void rewrite(q.prompt)}
                className={cn(
                  "group flex h-10 min-w-0 items-center gap-2 rounded-xl border border-border/60 bg-card px-2.5 text-left text-[11px] font-semibold text-foreground transition hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-60",
                  busy === q.prompt && "st-shimmer",
                )}
              >
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-lg transition group-hover:scale-110"
                  style={{ background: tint(q.color, 14), color: q.color }}
                >
                  {busy === q.prompt ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <q.icon className="h-3.5 w-3.5" />
                  )}
                </span>
                <span className="truncate">{q.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={custom}
              maxLength={300}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && custom.trim() && !busy) void rewrite(custom.trim());
              }}
              placeholder="Outro pedido para a IA…"
              className={cn(field, "h-10 py-0")}
            />
            <button
              type="button"
              className={cn(btnPrimary, "w-10 px-0")}
              disabled={!custom.trim() || !!busy}
              onClick={() => void rewrite(custom.trim())}
              aria-label="Pedir à IA"
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </div>
        </div>
      </StudioCard>

      {d.format === "carrossel" && (
        <StudioCard
          icon={GalleryHorizontal}
          color="#7a5cc4"
          title="Slides do carrossel"
          hint="A capa é o slide 1; o ideal são 5 a 8"
          right={
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
              {d.slides.length + 1}/10
            </span>
          }
          delay={120}
        >
          <ol className="space-y-2">
            {d.slides.map((s, i) => (
              <li
                key={i}
                className="rounded-2xl border border-border/60 bg-background/80 p-3 animate-in fade-in slide-in-from-bottom-1"
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[#7a5cc4]/12 text-[11px] font-bold text-[#7a5cc4]">
                    {i + 2}
                  </span>
                  <input
                    value={s.title}
                    maxLength={120}
                    placeholder="Título do slide"
                    onChange={(e) => editSlide(i, { title: e.target.value })}
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
                  />
                  <span className="flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => moveSlide(i, -1)}
                      disabled={i === 0}
                      className={cn(btnIcon, "h-7 w-7 disabled:opacity-30")}
                      aria-label="Subir"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSlide(i, 1)}
                      disabled={i === d.slides.length - 1}
                      className={cn(btnIcon, "h-7 w-7 disabled:opacity-30")}
                      aria-label="Descer"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setD((o) => ({ ...o, slides: o.slides.filter((_, j) => j !== i) }))
                      }
                      className={cn(btnIcon, "h-7 w-7 hover:text-destructive")}
                      aria-label="Remover slide"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
                <textarea
                  value={s.text}
                  maxLength={400}
                  rows={2}
                  placeholder="Texto do slide (uma linha por item para listas)"
                  onChange={(e) => editSlide(i, { text: e.target.value })}
                  className="mt-1.5 block w-full resize-none bg-transparent pl-8 text-xs leading-relaxed text-muted-foreground outline-none placeholder:text-muted-foreground/60"
                />
              </li>
            ))}
          </ol>
          <button
            type="button"
            className={cn(btnSoft, "mt-2 h-10 w-full border-dashed")}
            disabled={d.slides.length >= 9}
            onClick={() => setD((o) => ({ ...o, slides: [...o.slides, { title: "", text: "" }] }))}
          >
            <Plus className="h-4 w-4" /> Adicionar slide
          </button>
        </StudioCard>
      )}

      {["reels", "video", "story"].includes(d.format) && (
        <StudioCard
          icon={Clapperboard}
          color="#e0302a"
          title="Roteiro"
          hint="Cenas, falas e tempo de cada parte"
          delay={120}
        >
          <textarea
            value={d.script}
            maxLength={5000}
            rows={7}
            onChange={(e) => set("script", e.target.value)}
            placeholder={"0–3s (gancho): …\n3–8s: …"}
            className={cn(field, "resize-y font-mono text-xs leading-relaxed")}
          />
        </StudioCard>
      )}

      <StudioCard
        icon={Hash}
        color="#d6456b"
        title="Hashtags"
        hint="Enter, espaço ou vírgula para adicionar"
        right={
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
            {d.hashtags.length}/30
          </span>
        }
        delay={160}
      >
        <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-2xl border border-border/70 bg-background/90 p-2 transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15">
          {d.hashtags.map((h) => (
            <span
              key={h}
              className="inline-flex h-7 items-center gap-1 rounded-full bg-[#d6456b]/10 pl-2.5 pr-1.5 text-xs font-semibold text-[#c2416b] animate-in zoom-in-90"
            >
              #{h}
              <button
                type="button"
                onClick={() => setD((o) => ({ ...o, hashtags: o.hashtags.filter((x) => x !== h) }))}
                className="grid h-4 w-4 place-items-center rounded-full hover:bg-[#d6456b]/20"
                aria-label={`Remover ${h}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " " || e.key === ",") {
                e.preventDefault();
                addTags(tag);
                setTag("");
              } else if (e.key === "Backspace" && !tag && d.hashtags.length) {
                setD((o) => ({ ...o, hashtags: o.hashtags.slice(0, -1) }));
              }
            }}
            onBlur={() => {
              addTags(tag);
              setTag("");
            }}
            placeholder={d.hashtags.length ? "" : "Digite uma hashtag"}
            className="h-7 min-w-[120px] flex-1 bg-transparent px-1 text-xs outline-none"
          />
        </div>
        <button
          type="button"
          className={cn(btnSoft, "mt-2 h-9 w-full text-xs")}
          disabled={!!busy}
          onClick={() => void suggestTags()}
        >
          {busy === "tags" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-accent" />
          )}
          Sugerir hashtags com IA
        </button>
      </StudioCard>

      <StudioCard
        icon={Megaphone}
        color="#555f36"
        title="Chamada e notas"
        hint="O convite final e recados para a equipe"
        delay={200}
      >
        <Label>Chamada para ação</Label>
        <input
          value={d.cta}
          maxLength={300}
          onChange={(e) => set("cta", e.target.value)}
          placeholder="Ex.: Salve para lembrar e mande para alguém."
          className={field}
        />
        <div className="mt-3">
          <Label>Notas para a equipe</Label>
          <textarea
            value={d.visual_idea}
            maxLength={1000}
            rows={3}
            onChange={(e) => set("visual_idea", e.target.value)}
            placeholder="Ideia visual, referências, observações…"
            className={cn(field, "resize-y")}
          />
        </div>
      </StudioCard>
    </>
  );
}

// ───────────────────────────── Etapa 3: visual ─────────────────────────────

function VisualStep({
  d,
  setDesign,
  handle,
  onDownload,
}: {
  d: Draft;
  setDesign: (p: Partial<Draft["design"]>) => void;
  handle: string;
  onDownload: () => void;
}) {
  const [group, setGroup] = useState<ArtIconGroup>("Comida");
  const preview = useDebounced(d, 350);
  const auto = coverBody({ ...d, design: { ...d.design, body: "" } }, handle);

  return (
    <>
      <StudioCard
        icon={LayoutTemplate}
        color="#d6456b"
        title="Layout da arte"
        hint="Cada card já mostra o seu post nesse layout"
      >
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(ART_LAYOUTS) as ArtLayout[]).map((l, k) => {
            const on = (d.design.layout ?? "classico") === l;
            return (
              <button
                key={l}
                type="button"
                onClick={() => setDesign({ layout: l })}
                className={cn(
                  "nc-tile-in group min-w-0 overflow-hidden rounded-2xl border-2 bg-card text-left transition duration-300 hover:-translate-y-0.5",
                  on
                    ? "border-[#d6456b] shadow-md"
                    : "border-transparent shadow-xs hover:shadow-md",
                )}
                style={{ animationDelay: `${k * 25}ms` }}
              >
                <div className="relative overflow-hidden">
                  <DraftThumb
                    draft={{ ...preview, design: { ...preview.design, layout: l } }}
                    scale={0.17}
                    className="aspect-[4/5] w-full transition duration-500 group-hover:scale-[1.04]"
                  />
                  {on && (
                    <span className="nc-pop absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#d6456b] text-white shadow">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <div className="px-2 py-1.5">
                  <p className="truncate text-[11px] font-bold text-foreground">
                    {ART_LAYOUTS[l].label}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {ART_LAYOUTS[l].hint}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </StudioCard>

      <StudioCard icon={Palette} color="#7a5cc4" title="Cores" hint="Paletas da marca" delay={40}>
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(ART_THEMES) as ArtTheme[]).map((t) => {
            const th = ART_THEMES[t];
            const on = (d.design.theme ?? "oliva") === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setDesign({ theme: t })}
                className={cn(
                  "group min-w-0 rounded-2xl border-2 p-1 transition duration-300 hover:-translate-y-0.5",
                  on ? "border-[#7a5cc4] shadow-md" : "border-transparent hover:shadow-sm",
                )}
              >
                <span
                  className="relative flex h-11 items-end justify-between rounded-xl px-2 pb-1.5 shadow-inner"
                  style={{ background: `linear-gradient(135deg, ${th.bg}, ${th.bg2})` }}
                >
                  <span
                    className="h-1.5 w-5 rounded-full"
                    style={{ background: th.text, opacity: 0.85 }}
                  />
                  <span
                    className="h-3 w-3 rounded-full ring-2 ring-white/40"
                    style={{ background: th.accent }}
                  />
                  {on && (
                    <Check
                      className="nc-pop absolute inset-0 m-auto h-4 w-4"
                      style={{ color: th.text }}
                    />
                  )}
                </span>
                <span className="mt-1 block truncate text-center text-[10px] font-semibold text-foreground/80">
                  {th.label}
                </span>
              </button>
            );
          })}
        </div>
      </StudioCard>

      <StudioCard
        icon={Shapes}
        color="#3b7bbf"
        title="Ícone"
        hint="Selo da arte (o NutriConnect não usa emojis)"
        right={
          d.design.icon ? (
            <button
              type="button"
              onClick={() => setDesign({ icon: "" })}
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
            >
              Sem ícone
            </button>
          ) : null
        }
        delay={80}
      >
        <div className="flex items-center gap-1 rounded-full bg-secondary/70 p-1">
          {ART_ICON_GROUPS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGroup(g)}
              className={cn(
                "h-7 flex-1 truncate rounded-full px-2 text-[11px] font-semibold transition",
                group === g
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {g}
            </button>
          ))}
        </div>
        <div key={group} className="mt-2.5 grid grid-cols-7 gap-1.5 sm:grid-cols-8">
          {Object.entries(ART_ICONS)
            .filter(([, v]) => v.group === group)
            .map(([name], k) => {
              const on = d.design.icon === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setDesign({ icon: on ? "" : name })}
                  title={name}
                  className={cn(
                    "grid aspect-square place-items-center rounded-xl border transition duration-200 hover:-translate-y-0.5 hover:scale-105 animate-in fade-in zoom-in-90",
                    on
                      ? "border-transparent text-white shadow-md"
                      : "border-border/60 bg-card text-foreground/80 hover:border-[#3b7bbf]/50 hover:text-[#3b7bbf]",
                  )}
                  style={{
                    animationDelay: `${Math.min(k, 30) * 12}ms`,
                    animationFillMode: "both",
                    ...(on ? { background: badgeBg("#3b7bbf") } : {}),
                  }}
                >
                  <ArtIcon name={name} className="h-[18px] w-[18px]" />
                </button>
              );
            })}
        </div>
      </StudioCard>

      <StudioCard
        icon={ImageIcon}
        color="#2f8a5b"
        title="Banco de imagens"
        hint="Foto de fundo da arte"
        right={
          d.design.image ? (
            <button
              type="button"
              onClick={() => setDesign({ image: undefined })}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" /> Tirar foto
            </button>
          ) : null
        }
        delay={120}
      >
        <ImageBank value={d.design.image} onPick={(src) => setDesign({ image: src })} />
      </StudioCard>

      <StudioCard
        icon={Type}
        color="#c58a12"
        title="Textos da arte"
        hint="O título da arte é o título do post"
        delay={160}
      >
        <Label
          right={
            <span className="text-[11px] text-muted-foreground">
              {(d.design.kicker ?? "").length}/40
            </span>
          }
        >
          Chamada (selo acima do título)
        </Label>
        <input
          value={d.design.kicker ?? ""}
          maxLength={40}
          onChange={(e) => setDesign({ kicker: e.target.value })}
          placeholder="Ex.: Mito ou verdade?"
          className={field}
        />
        <div className="mt-3">
          <Label
            right={
              d.design.body ? (
                <button
                  type="button"
                  onClick={() => setDesign({ body: "" })}
                  className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                >
                  Voltar ao automático
                </button>
              ) : (
                <span className="text-[11px] text-muted-foreground">Automático</span>
              )
            }
          >
            Texto da capa
          </Label>
          <textarea
            value={d.design.body ?? ""}
            maxLength={400}
            rows={3}
            onChange={(e) => setDesign({ body: e.target.value })}
            placeholder={auto || "Deixe vazio para usar o gancho ou a legenda"}
            className={cn(field, "resize-y text-xs leading-relaxed")}
          />
          <p className="mt-1.5 text-[10.5px] leading-snug text-muted-foreground">
            Lista, Receita e Enquete: um item por linha. Troca: “em vez de → prefira”.
          </p>
        </div>
      </StudioCard>

      <button type="button" className={cn(btnPrimary, "h-11 w-full")} onClick={onDownload}>
        <Download className="h-4 w-4" /> Baixar artes em PNG (alta resolução)
      </button>
    </>
  );
}

// ───────────────────────────── Etapa 4: publicar ─────────────────────────────

function PublishStep({
  d,
  set,
  mode,
  images,
  profiles,
  onClean,
  onCopy,
  onDownload,
  onTemplate,
  onDelete,
}: {
  d: Draft;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
  mode: PreviewMode;
  images: string[];
  profiles: SocialProfile[];
  onClean: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onTemplate: () => void;
  onDelete?: () => void;
}) {
  const total = composeCaption(d).length;
  const emoji = draftHasEmoji(d);
  const checks = useMemo(() => {
    const list: { ok: boolean; label: string }[] = [
      { ok: d.hook.trim().length >= 10, label: "Gancho forte na primeira linha" },
      { ok: d.caption.trim().length >= 40, label: "Legenda escrita" },
      {
        ok: total <= CAPTION_LIMIT[mode],
        label: `Dentro do limite da rede (${CAPTION_LIMIT[mode]} caracteres)`,
      },
      { ok: d.cta.trim().length > 0, label: "Chamada para ação" },
      {
        ok:
          d.network === "linkedin" || d.network === "x"
            ? d.hashtags.length <= 5
            : d.hashtags.length >= 3 && d.hashtags.length <= 15,
        label:
          d.network === "linkedin" || d.network === "x"
            ? "Até 5 hashtags"
            : "Entre 3 e 15 hashtags",
      },
      { ok: images.length > 0, label: "Arte pronta" },
      { ok: !emoji, label: "Sem emojis (regra do NutriConnect)" },
    ];
    if (d.format === "carrossel")
      list.push({
        ok: d.slides.filter((s) => s.title || s.text).length >= 2,
        label: "Carrossel com 3 ou mais slides",
      });
    if (["reels", "video", "story"].includes(d.format))
      list.push({ ok: d.script.trim().length > 20, label: "Roteiro do vídeo" });
    list.push({
      ok: !/antes e depois|emagre[çc]a \d|perca \d+ ?kg|garantid/i.test(`${d.caption} ${d.hook}`),
      label: "Sem promessas nem “antes e depois” (ética CFN)",
    });
    return list;
  }, [d, images.length, mode, total, emoji]);
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  const ready = score === 100;

  return (
    <>
      <StudioCard
        icon={CheckCircle2}
        color="#2f8a5b"
        title="Revisão"
        hint="Tudo verde? Está pronto para publicar"
      >
        <div className="flex items-center gap-4">
          <div className="relative grid h-20 w-20 shrink-0 place-items-center">
            <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.1"
                strokeWidth="3.5"
              />
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke={ready ? "#2f8a5b" : "var(--accent)"}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={`${score} 100`}
                className="transition-all duration-700"
              />
            </svg>
            <span className="font-display text-xl font-bold tabular-nums text-foreground">
              {score}%
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">
              {ready ? "Pronto para publicar" : "Quase lá"}
            </p>
            <p className="text-xs leading-snug text-muted-foreground">
              {ready
                ? "Copie a legenda, baixe as artes e poste."
                : `${checks.filter((c) => !c.ok).length} ponto(s) para revisar.`}
            </p>
          </div>
        </div>
        <ul className="mt-3.5 grid gap-1.5">
          {checks.map((c, k) => (
            <li
              key={c.label}
              className={cn(
                "nc-tile-in flex min-h-9 items-center gap-2.5 rounded-xl px-3 py-2 text-xs transition",
                c.ok
                  ? "bg-emerald-500/10 text-foreground"
                  : "bg-secondary/70 text-muted-foreground",
              )}
              style={{ animationDelay: `${k * 30}ms` }}
            >
              {c.ok ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="h-4 w-4 shrink-0" />
              )}
              <span className="min-w-0 flex-1">{c.label}</span>
              {!c.ok && c.label.startsWith("Sem emojis") && (
                <button
                  type="button"
                  onClick={onClean}
                  className="shrink-0 text-[11px] font-bold text-accent hover:underline"
                >
                  Remover
                </button>
              )}
            </li>
          ))}
        </ul>
      </StudioCard>

      <StudioCard
        icon={CalendarDays}
        color="#d6456b"
        title="Agenda"
        hint="Quando e em qual perfil"
        delay={40}
      >
        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0">
            <Label>Data</Label>
            <input
              type="date"
              value={d.scheduled_for ?? ""}
              onChange={(e) => set("scheduled_for", e.target.value || null)}
              className={cn(field, "h-10 py-0")}
            />
          </div>
          <div className="min-w-0">
            <Label>Perfil</Label>
            <select
              value={d.profile_id ?? ""}
              onChange={(e) => set("profile_id", e.target.value || null)}
              className={cn(field, "h-10 py-0")}
            >
              <option value="">Nenhum</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {NETWORK_LABEL[p.network as Network]} · {p.handle}
                </option>
              ))}
            </select>
          </div>
        </div>
        {BEST_TIME[d.network] && (
          <p className="mt-3 flex gap-2 rounded-xl bg-[#d6456b]/8 px-3 py-2.5 text-xs leading-snug text-foreground">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#d6456b]" />
            <span>
              <span className="font-bold">Bons horários no {NETWORK_LABEL[d.network]}:</span>{" "}
              {BEST_TIME[d.network]}
            </span>
          </p>
        )}
      </StudioCard>

      <StudioCard
        icon={Send}
        color="#555f36"
        title="Publicar"
        hint="Leve o post para a rede"
        delay={80}
      >
        <div className="grid grid-cols-2 gap-2">
          <ActionTile icon={Copy} color="#2f8a5b" label="Copiar legenda" onClick={onCopy} />
          <ActionTile icon={Download} color="#3b7bbf" label="Baixar artes" onClick={onDownload} />
          {!d.is_template && (
            <ActionTile
              icon={FilePlus2}
              color="#c58a12"
              label="Salvar como modelo"
              onClick={onTemplate}
            />
          )}
          {onDelete && (
            <ActionTile icon={Trash2} color="#c2416b" label="Apagar post" onClick={onDelete} />
          )}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          A publicação direta nas redes exige um app aprovado pela Meta e pelo TikTok. Por enquanto:
          copie a legenda, baixe as artes e poste pelo aplicativo da rede. Depois, mude o status
          para “Publicado”.
        </p>
      </StudioCard>
    </>
  );
}

function ActionTile({
  icon: Icon,
  color,
  label,
  onClick,
}: {
  icon: LucideIcon;
  color: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-12 min-w-0 items-center gap-2.5 rounded-2xl border px-3 text-left text-xs font-bold text-foreground transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
      style={{
        background: tileBg(color, color, 8, 14),
        borderColor: `color-mix(in srgb, ${color} 22%, transparent)`,
      }}
    >
      <span
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white shadow-sm transition group-hover:-rotate-6 group-hover:scale-110"
        style={{ background: badgeBg(color) }}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}
