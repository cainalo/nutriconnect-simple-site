// Editor de posts do estúdio (tela cheia): à esquerda, as etapas em cards (começar por um modelo ou
// pela IA, texto, visual e publicar); à direita, a prévia ao vivo no formato exato de cada rede.
// Regra do NutriConnect: nada de emojis — as artes usam ícones e o editor avisa e limpa emojis.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { siteConfirm } from "@/components/confirm-action";
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
import { useTr } from "@/components/settings-ui";
import type { Names } from "@/lib/appearance-data";
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
const STEPS: { id: Step; label: Names; hint: Names; icon: LucideIcon; color: string }[] = [
  {
    id: "comecar",
    label: ["Começar", "Start", "Empezar", "Commencer"],
    hint: ["Modelo ou IA", "Template or AI", "Plantilla o IA", "Modèle ou IA"],
    icon: LayoutTemplate,
    color: "#c58a12",
  },
  {
    id: "texto",
    label: ["Texto", "Text", "Texto", "Texte"],
    hint: ["Gancho e legenda", "Hook and caption", "Gancho y descripción", "Accroche et légende"],
    icon: Type,
    color: "#3b7bbf",
  },
  {
    id: "visual",
    label: ["Visual", "Visual", "Visual", "Visuel"],
    hint: ["Arte e fotos", "Artwork and photos", "Diseño y fotos", "Visuel et photos"],
    icon: Palette,
    color: "#d6456b",
  },
  {
    id: "publicar",
    label: ["Publicar", "Publish", "Publicar", "Publier"],
    hint: ["Revisar e postar", "Review and post", "Revisar y publicar", "Relire et publier"],
    icon: Send,
    color: "#2f8a5b",
  },
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

const QUICK: { label: Names; prompt: string; icon: LucideIcon; color: string }[] = [
  {
    label: ["Mais curto", "Shorter", "Más corto", "Plus court"],
    prompt: "Mais curto e direto",
    icon: Scissors,
    color: "#3b7bbf",
  },
  {
    label: ["Mais leve", "Lighter", "Más ligero", "Plus léger"],
    prompt: "Mais leve e acolhedor, sem emojis",
    icon: Smile,
    color: "#c58a12",
  },
  {
    label: ["Mais científico", "More scientific", "Más científico", "Plus scientifique"],
    prompt: "Mais científico e confiável, citando o Guia Alimentar quando fizer sentido",
    icon: FlaskConical,
    color: "#7a5cc4",
  },
  {
    label: ["Pergunta no fim", "Question at the end", "Pregunta al final", "Question à la fin"],
    prompt: "Termine com uma pergunta que gere comentários",
    icon: MessageCircleQuestion,
    color: "#d6456b",
  },
  {
    label: ["Tom profissional", "Professional tone", "Tono profesional", "Ton professionnel"],
    prompt: "Tom profissional para o LinkedIn, frases claras e sem gírias",
    icon: Briefcase,
    color: "#0a66c2",
  },
  {
    label: ["Fala de vídeo", "Video speech", "Habla de video", "Discours vidéo"],
    prompt: "Adapte para fala informal de vídeo curto (TikTok/Reels)",
    icon: Music2,
    color: "#1f2937",
  },
];

const GOALS: { id: Goal; label: Names; icon: LucideIcon }[] = [
  {
    id: "engajamento",
    label: ["Engajamento", "Engagement", "Interacción", "Engagement"],
    icon: MessageCircleQuestion,
  },
  { id: "alcance", label: ["Alcance", "Reach", "Alcance", "Portée"], icon: Megaphone },
  {
    id: "autoridade",
    label: ["Autoridade", "Authority", "Autoridad", "Autorité"],
    icon: FlaskConical,
  },
  {
    id: "conversao",
    label: ["Novas contas", "New accounts", "Nuevas cuentas", "Nouveaux comptes"],
    icon: Target,
  },
  { id: "comunidade", label: ["Comunidade", "Community", "Comunidad", "Communauté"], icon: Users },
];

const BEST_TIME: Partial<Record<Network, Names>> = {
  instagram: [
    "Dias úteis entre 11h e 13h ou 18h e 21h.",
    "Weekdays between 11 a.m. and 1 p.m. or 6 and 9 p.m.",
    "Días hábiles entre las 11 y las 13 h o entre las 18 y las 21 h.",
    "En semaine entre 11 h et 13 h ou entre 18 h et 21 h.",
  ],
  tiktok: [
    "Fim da tarde e noite (18h–22h), também nos fins de semana.",
    "Late afternoon and evening (6–10 p.m.), weekends too.",
    "Final de la tarde y noche (18–22 h), también los fines de semana.",
    "Fin d’après-midi et soirée (18 h–22 h), aussi le week-end.",
  ],
  facebook: [
    "Manhã (9h–11h) e início da noite.",
    "Morning (9–11 a.m.) and early evening.",
    "Mañana (9–11 h) y comienzo de la noche.",
    "Matin (9 h–11 h) et début de soirée.",
  ],
  linkedin: [
    "Terça a quinta, entre 8h e 10h.",
    "Tuesday to Thursday, between 8 and 10 a.m.",
    "De martes a jueves, entre las 8 y las 10 h.",
    "Du mardi au jeudi, entre 8 h et 10 h.",
  ],
  x: [
    "Manhã cedo e horário de almoço.",
    "Early morning and lunchtime.",
    "Temprano en la mañana y a la hora del almuerzo.",
    "Tôt le matin et à l’heure du déjeuner.",
  ],
  youtube: [
    "Sexta a domingo, à tarde.",
    "Friday to Sunday, in the afternoon.",
    "De viernes a domingo, por la tarde.",
    "Du vendredi au dimanche, l’après-midi.",
  ],
};

const GROUP_NAMES: Record<ArtIconGroup, Names> = {
  Comida: ["Comida", "Food", "Comida", "Nourriture"],
  Bebidas: ["Bebidas", "Drinks", "Bebidas", "Boissons"],
  Saúde: ["Saúde", "Health", "Salud", "Santé"],
  Conteúdo: ["Conteúdo", "Content", "Contenido", "Contenu"],
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
  const tr = useTr();
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
          toast.success(tr(["Post salvo.", "Post saved.", "Post guardado.", "Post enregistré."]));
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
        onSuccess: () =>
          toast.success(
            tr([
              "Salvo em Modelos da equipe.",
              "Saved to Team templates.",
              "Guardado en Plantillas del equipo.",
              "Enregistré dans les modèles de l’équipe.",
            ]),
          ),
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

  const close = async () => {
    if (
      dirty &&
      !(await siteConfirm(
        tr([
          "Há mudanças não salvas. Sair mesmo assim?",
          "There are unsaved changes. Leave anyway?",
          "Hay cambios sin guardar. ¿Salir de todos modos?",
          "Des modifications ne sont pas enregistrées. Quitter quand même ?",
        ]),
      ))
    )
      return;
    onClose();
  };

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(composeCaption(d));
      toast.success(
        tr([
          "Legenda copiada. É só colar na rede.",
          "Caption copied. Just paste it on the network.",
          "Descripción copiada. Solo pégala en la red.",
          "Légende copiée. Il suffit de la coller sur le réseau.",
        ]),
      );
    } catch {
      toast.error(
        tr([
          "Não foi possível copiar.",
          "Couldn’t copy.",
          "No se pudo copiar.",
          "Impossible de copier.",
        ]),
      );
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
      toast.success(
        total > 1
          ? `${total} ${tr(["artes baixadas.", "images downloaded.", "diseños descargados.", "visuels téléchargés."])}`
          : tr(["Arte baixada.", "Image downloaded.", "Diseño descargado.", "Visuel téléchargé."]),
      );
    } catch {
      toast.error(
        tr([
          "Não foi possível gerar a arte. Tente outra foto.",
          "Couldn’t generate the artwork. Try another photo.",
          "No se pudo generar el diseño. Prueba otra foto.",
          "Impossible de générer le visuel. Essayez une autre photo.",
        ]),
      );
    }
  };

  const status = STATUS_STYLE[d.status];

  return (
    <div className="st-root fixed inset-0 z-[60] flex flex-col bg-background animate-in fade-in duration-300">
      {/* Cabeçalho */}
      <header className="st-glass relative z-20 flex min-h-16 items-center gap-2 border-b border-border/60 px-3 py-2.5 sm:gap-3 sm:px-5">
        <button
          type="button"
          onClick={close}
          className={btnIcon}
          aria-label={tr(["Fechar", "Close", "Cerrar", "Fermer"])}
        >
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
              placeholder={tr([
                "Título do post (só para a equipe)",
                "Post title (team only)",
                "Título del post (solo para el equipo)",
                "Titre du post (pour l’équipe uniquement)",
              ])}
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
                {dirty
                  ? tr(["Não salvo", "Not saved", "Sin guardar", "Non enregistré"])
                  : d.id
                    ? tr(["Salvo", "Saved", "Guardado", "Enregistré"])
                    : tr(["Novo", "New", "Nuevo", "Nouveau"])}
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
            aria-label={tr(["Status", "Status", "Estado", "Statut"])}
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
          <Copy className="h-3.5 w-3.5" />{" "}
          {tr(["Copiar legenda", "Copy caption", "Copiar descripción", "Copier la légende"])}
        </button>
        <button
          type="button"
          className={cn(btnPrimary, "h-9 px-4 text-xs")}
          disabled={save.isPending}
          onClick={() => doSave()}
          title={tr([
            "Salvar (Ctrl+S)",
            "Save (Ctrl+S)",
            "Guardar (Ctrl+S)",
            "Enregistrer (Ctrl+S)",
          ])}
        >
          {save.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {tr(["Salvar", "Save", "Guardar", "Enregistrer"])}
        </button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,500px)_minmax(0,1fr)] lg:overflow-hidden xl:grid-cols-[minmax(0,540px)_minmax(0,1fr)]">
        {/* Painel de edição */}
        <aside className="flex min-w-0 flex-col border-border/60 bg-background lg:min-h-0 lg:border-r">
          <nav
            className="grid grid-cols-4 gap-1.5 border-b border-border/60 p-2.5"
            aria-label={tr(["Etapas", "Steps", "Etapas", "Étapes"])}
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
                    {tr(s.label)}
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
                      ? async () => {
                          if (
                            await siteConfirm(
                              tr([
                                "Apagar este post?",
                                "Delete this post?",
                                "¿Borrar este post?",
                                "Supprimer ce post ?",
                              ]),
                            )
                          )
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
              <ArrowLeft className="h-3.5 w-3.5" /> {tr(["Voltar", "Back", "Volver", "Retour"])}
            </button>
            <span className="flex-1 text-center text-[11px] text-muted-foreground">
              {tr(["Etapa", "Step", "Etapa", "Étape"])} {stepIndex + 1}{" "}
              {tr(["de", "of", "de", "sur"])} {STEPS.length}
            </span>
            {stepIndex < STEPS.length - 1 ? (
              <button
                type="button"
                className={cn(btnPrimary, "h-9 px-4 text-xs")}
                onClick={() => go(STEPS[stepIndex + 1].id)}
              >
                {tr(STEPS[stepIndex + 1].label)} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                className={cn(btnPrimary, "h-9 px-4 text-xs")}
                disabled={save.isPending}
                onClick={() => doSave()}
              >
                <Save className="h-3.5 w-3.5" />{" "}
                {tr(["Salvar post", "Save post", "Guardar post", "Enregistrer le post"])}
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
                {composeCaption(d).length}/{CAPTION_LIMIT[mode]}{" "}
                {tr(["caracteres", "characters", "caracteres", "caractères"])}
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
  const tr = useTr();
  const [cat, setCat] = useState<TemplateCategory | "todos">("todos");
  const [theme, setTheme] = useState("");
  const [goal, setGoal] = useState<Goal>("engajamento");
  const [busy, setBusy] = useState(false);
  const list = TEMPLATES.filter((t) => cat === "todos" || t.category === cat);
  const hasContent = !!(d.caption || d.title);

  const apply = async (t: SocialTemplate) => {
    if (
      hasContent &&
      !(await siteConfirm(
        `${tr(["Usar o modelo", "Use the template", "¿Usar la plantilla", "Utiliser le modèle"])} “${t.name}”? ${tr(["O texto atual será substituído.", "The current text will be replaced.", "El texto actual será reemplazado.", "Le texte actuel sera remplacé."])}`,
      ))
    )
      return;
    onApply(draftFromTemplate(t));
    toast.success(
      `${tr(["Modelo", "Template", "Plantilla", "Modèle"])} “${t.name}” ${tr(["aplicado. Agora é só ajustar.", "applied. Now just adjust it.", "aplicada. Ahora solo ajústala.", "appliqué. Il ne reste plus qu’à l’ajuster."])}`,
    );
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
            ? tr([
                "A cota de IA de hoje acabou.",
                "Today’s AI quota is used up.",
                "La cuota de IA de hoy se agotó.",
                "Le quota d’IA du jour est épuisé.",
              ])
            : tr([
                "A IA não conseguiu criar agora.",
                "The AI couldn’t create anything right now.",
                "La IA no pudo crear ahora.",
                "L’IA n’a pas pu créer pour le moment.",
              ]),
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
      toast.success(
        tr([
          "Post criado pela IA. Revise antes de publicar.",
          "Post created by the AI. Review it before publishing.",
          "Post creado por la IA. Revísalo antes de publicar.",
          "Post créé par l’IA. Relisez-le avant de publier.",
        ]),
      );
    } catch {
      toast.error(
        tr([
          "A IA não conseguiu criar agora.",
          "The AI couldn’t create anything right now.",
          "La IA no pudo crear ahora.",
          "L’IA n’a pas pu créer pour le moment.",
        ]),
      );
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
            <h3 className="text-sm font-bold text-foreground">
              {tr(["Criar com IA", "Create with AI", "Crear con IA", "Créer avec l’IA"])}
            </h3>
            <p className="text-[11px] leading-snug text-foreground/70">
              {tr([
                "Diga o tema: a IA escreve o post completo para",
                "Give the theme: the AI writes the full post for",
                "Di el tema: la IA escribe el post completo para",
                "Donnez le thème : l’IA rédige le post complet pour",
              ])}{" "}
              {NETWORK_LABEL[d.network]} · {FORMAT_LABEL[d.format]}.
            </p>
          </div>
        </div>
        <input
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !busy && void fromAi()}
          maxLength={300}
          placeholder={tr([
            "Ex.: lancheira na volta às aulas, mitos do glúten…",
            "E.g.: back-to-school lunchbox, gluten myths…",
            "Ej.: lonchera para la vuelta a clases, mitos del gluten…",
            "Ex. : boîte à goûter de la rentrée, mythes sur le gluten…",
          ])}
          className={cn(field, "relative mt-3 bg-card/95")}
        />
        <div className="relative mt-2.5 grid grid-cols-5 gap-1.5">
          {GOALS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGoal(g.id)}
              title={tr(g.label)}
              className={cn(
                "flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition",
                goal === g.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-foreground/65 hover:bg-card/60",
              )}
            >
              <g.icon className="h-3.5 w-3.5" />
              <span className="max-w-full truncate">{tr(g.label)}</span>
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
          {busy
            ? tr([
                "Escrevendo o post…",
                "Writing the post…",
                "Escribiendo el post…",
                "Rédaction du post…",
              ])
            : tr([
                "Gerar post com IA",
                "Generate post with AI",
                "Generar post con IA",
                "Générer un post avec l’IA",
              ])}
        </button>
      </section>

      <StudioCard
        icon={LayoutTemplate}
        color="#c58a12"
        title={tr([
          "Modelos prontos",
          "Ready-made templates",
          "Plantillas listas",
          "Modèles prêts",
        ])}
        hint={`${list.length} ${tr(["modelos profissionais, prontos para ajustar", "professional templates, ready to adjust", "plantillas profesionales, listas para ajustar", "modèles professionnels, prêts à ajuster"])}`}
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
                  {c === "todos" ? tr(["Todos", "All", "Todos", "Tous"]) : CATEGORY_LABEL[c]}
                </button>
              );
            },
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={async () => {
              if (
                hasContent &&
                !(await siteConfirm(
                  tr([
                    "Começar do zero? O texto atual será apagado.",
                    "Start from scratch? The current text will be erased.",
                    "¿Empezar desde cero? El texto actual se borrará.",
                    "Repartir de zéro ? Le texte actuel sera effacé.",
                  ]),
                ))
              )
                return;
              onApply({ ...EMPTY_DRAFT, network: d.network, format: d.format });
            }}
            className="nc-tile-in group flex h-full min-h-56 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/80 bg-card/60 p-3 text-center transition hover:border-accent hover:bg-accent/5"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary text-foreground transition duration-300 group-hover:rotate-90 group-hover:bg-accent group-hover:text-accent-foreground">
              <Plus className="h-5 w-5" />
            </span>
            <span className="text-xs font-bold text-foreground">
              {tr([
                "Começar do zero",
                "Start from scratch",
                "Empezar desde cero",
                "Partir de zéro",
              ])}
            </span>
            <span className="text-[10px] leading-snug text-muted-foreground">
              {tr([
                "Página em branco, no seu ritmo",
                "Blank page, at your own pace",
                "Página en blanco, a tu ritmo",
                "Page blanche, à votre rythme",
              ])}
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
  const tr = useTr();
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
          <Sparkles className="h-3 w-3" />{" "}
          {tr(["Usar modelo", "Use template", "Usar plantilla", "Utiliser le modèle"])}
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
  const tr = useTr();
  const [busy, setBusy] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [tag, setTag] = useState("");
  const limit = CAPTION_LIMIT[mode];
  const total = composeCaption(d).length;
  const emoji = draftHasEmoji(d);

  const rewrite = async (how: string) => {
    if (!d.caption.trim())
      return toast.error(
        tr([
          "Escreva a legenda primeiro.",
          "Write the caption first.",
          "Escribe la descripción primero.",
          "Rédigez d’abord la légende.",
        ]),
      );
    setBusy(how);
    try {
      const res = await rewriteSocialText({
        data: { text: d.caption, instruction: how, network: d.network, locale: locale as never },
      });
      if ("error" in res)
        toast.error(
          tr([
            "A IA não conseguiu reescrever agora.",
            "The AI couldn’t rewrite right now.",
            "La IA no pudo reescribir ahora.",
            "L’IA n’a pas pu réécrire pour le moment.",
          ]),
        );
      else set("caption", stripEmoji(res.text));
    } catch {
      toast.error(
        tr([
          "A IA não conseguiu reescrever agora.",
          "The AI couldn’t rewrite right now.",
          "La IA no pudo reescribir ahora.",
          "L’IA n’a pas pu réécrire pour le moment.",
        ]),
      );
    } finally {
      setBusy(null);
    }
  };

  const suggestTags = async () => {
    const base = [d.title, d.hook, d.caption].filter(Boolean).join("\n");
    if (!base.trim())
      return toast.error(
        tr([
          "Escreva o texto primeiro.",
          "Write the text first.",
          "Escribe el texto primero.",
          "Rédigez d’abord le texte.",
        ]),
      );
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
      if ("error" in res)
        return toast.error(
          tr([
            "A IA não conseguiu sugerir agora.",
            "The AI couldn’t suggest anything right now.",
            "La IA no pudo sugerir ahora.",
            "L’IA n’a rien pu suggérer pour le moment.",
          ]),
        );
      const found = [...res.text.matchAll(/#([\p{L}\p{N}_]+)/gu)].map((m) => m[1].toLowerCase());
      setD((o) => ({ ...o, hashtags: [...new Set([...o.hashtags, ...found])].slice(0, 30) }));
    } catch {
      toast.error(
        tr([
          "A IA não conseguiu sugerir agora.",
          "The AI couldn’t suggest anything right now.",
          "La IA no pudo sugerir ahora.",
          "L’IA n’a rien pu suggérer pour le moment.",
        ]),
      );
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
            {tr([
              "O texto tem emojis. No NutriConnect usamos só ícones.",
              "The text has emojis. At NutriConnect we only use icons.",
              "El texto tiene emojis. En NutriConnect solo usamos íconos.",
              "Le texte contient des emojis. Chez NutriConnect, nous n’utilisons que des icônes.",
            ])}
          </p>
          <button
            type="button"
            className={cn(btnSoft, "h-8 px-3 text-[11px]")}
            onClick={() => {
              setD((o) => cleanDraft(o));
              toast.success(
                tr(["Emojis removidos.", "Emojis removed.", "Emojis quitados.", "Emojis retirés."]),
              );
            }}
          >
            <Eraser className="h-3.5 w-3.5" /> {tr(["Remover", "Remove", "Quitar", "Retirer"])}
          </button>
        </div>
      )}

      <StudioCard
        icon={Send}
        color="#3b7bbf"
        title={tr(["Rede e formato", "Network and format", "Red y formato", "Réseau et format"])}
        hint={tr([
          "Onde e como o post vai sair",
          "Where and how the post will go out",
          "Dónde y cómo saldrá el post",
          "Où et comment le post sera publié",
        ])}
      >
        <Label>{tr(["Rede", "Network", "Red", "Réseau"])}</Label>
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
          <Label>{tr(["Formato", "Format", "Formato", "Format"])}</Label>
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
          <Label>
            {tr(["Pilar de conteúdo", "Content pillar", "Pilar de contenido", "Pilier de contenu"])}
          </Label>
          <input
            value={d.pillar}
            maxLength={80}
            onChange={(e) => set("pillar", e.target.value)}
            placeholder={tr([
              "Ex.: Educativo, Receitas, Bastidores",
              "E.g.: Educational, Recipes, Behind the scenes",
              "Ej.: Educativo, Recetas, Detrás de escena",
              "Ex. : Éducatif, Recettes, Coulisses",
            ])}
            className={field}
          />
        </div>
      </StudioCard>

      <StudioCard
        icon={Zap}
        color="#c58a12"
        title={tr(["Gancho", "Hook", "Gancho", "Accroche"])}
        hint={tr([
          "A primeira linha ou os primeiros segundos",
          "The first line or the first seconds",
          "La primera línea o los primeros segundos",
          "La première ligne ou les premières secondes",
        ])}
        right={<Counter n={d.hook.length} max={150} />}
        delay={40}
      >
        <input
          value={d.hook}
          maxLength={300}
          onChange={(e) => set("hook", e.target.value)}
          placeholder={tr([
            "A frase que faz a pessoa parar de rolar",
            "The line that makes people stop scrolling",
            "La frase que hace que la persona deje de deslizar",
            "La phrase qui fait arrêter de défiler",
          ])}
          className={field}
        />
      </StudioCard>

      <StudioCard
        icon={AlignLeft}
        color="#2f8a5b"
        title={tr(["Legenda", "Caption", "Descripción", "Légende"])}
        hint={`${tr(["Limite do", "Limit for", "Límite de", "Limite pour"])} ${PREVIEW_LABEL[mode]}`}
        right={<Counter n={total} max={limit} />}
        delay={80}
      >
        <textarea
          value={d.caption}
          maxLength={5000}
          rows={9}
          onChange={(e) => set("caption", e.target.value)}
          placeholder={tr([
            "Escreva a legenda…",
            "Write the caption…",
            "Escribe la descripción…",
            "Rédigez la légende…",
          ])}
          className={cn(field, "min-h-[12rem] resize-y leading-relaxed")}
        />
        <div className="mt-3">
          <Label>
            {tr([
              "Reescrever com IA",
              "Rewrite with AI",
              "Reescribir con IA",
              "Réécrire avec l’IA",
            ])}
          </Label>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {QUICK.map((q) => (
              <button
                key={q.prompt}
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
                <span className="truncate">{tr(q.label)}</span>
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
              placeholder={tr([
                "Outro pedido para a IA…",
                "Another request for the AI…",
                "Otro pedido para la IA…",
                "Une autre demande pour l’IA…",
              ])}
              className={cn(field, "h-10 py-0")}
            />
            <button
              type="button"
              className={cn(btnPrimary, "w-10 px-0")}
              disabled={!custom.trim() || !!busy}
              onClick={() => void rewrite(custom.trim())}
              aria-label={tr(["Pedir à IA", "Ask the AI", "Pedir a la IA", "Demander à l’IA"])}
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
          title={tr([
            "Slides do carrossel",
            "Carousel slides",
            "Diapositivas del carrusel",
            "Diapositives du carrousel",
          ])}
          hint={tr([
            "A capa é o slide 1; o ideal são 5 a 8",
            "The cover is slide 1; 5 to 8 is ideal",
            "La portada es la diapositiva 1; lo ideal son de 5 a 8",
            "La couverture est la diapositive 1 ; l’idéal est de 5 à 8",
          ])}
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
                    placeholder={tr([
                      "Título do slide",
                      "Slide title",
                      "Título de la diapositiva",
                      "Titre de la diapositive",
                    ])}
                    onChange={(e) => editSlide(i, { title: e.target.value })}
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
                  />
                  <span className="flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => moveSlide(i, -1)}
                      disabled={i === 0}
                      className={cn(btnIcon, "h-7 w-7 disabled:opacity-30")}
                      aria-label={tr(["Subir", "Move up", "Subir", "Monter"])}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSlide(i, 1)}
                      disabled={i === d.slides.length - 1}
                      className={cn(btnIcon, "h-7 w-7 disabled:opacity-30")}
                      aria-label={tr(["Descer", "Move down", "Bajar", "Descendre"])}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setD((o) => ({ ...o, slides: o.slides.filter((_, j) => j !== i) }))
                      }
                      className={cn(btnIcon, "h-7 w-7 hover:text-destructive")}
                      aria-label={tr([
                        "Remover slide",
                        "Remove slide",
                        "Quitar diapositiva",
                        "Retirer la diapositive",
                      ])}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
                <textarea
                  value={s.text}
                  maxLength={400}
                  rows={2}
                  placeholder={tr([
                    "Texto do slide (uma linha por item para listas)",
                    "Slide text (one line per item for lists)",
                    "Texto de la diapositiva (una línea por ítem para listas)",
                    "Texte de la diapositive (une ligne par élément pour les listes)",
                  ])}
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
            <Plus className="h-4 w-4" />{" "}
            {tr(["Adicionar slide", "Add slide", "Agregar diapositiva", "Ajouter une diapositive"])}
          </button>
        </StudioCard>
      )}

      {["reels", "video", "story"].includes(d.format) && (
        <StudioCard
          icon={Clapperboard}
          color="#e0302a"
          title={tr(["Roteiro", "Script", "Guion", "Script"])}
          hint={tr([
            "Cenas, falas e tempo de cada parte",
            "Scenes, lines and timing for each part",
            "Escenas, diálogos y tiempo de cada parte",
            "Scènes, répliques et durée de chaque partie",
          ])}
          delay={120}
        >
          <textarea
            value={d.script}
            maxLength={5000}
            rows={7}
            onChange={(e) => set("script", e.target.value)}
            placeholder={tr([
              "0–3s (gancho): …\n3–8s: …",
              "0–3s (hook): …\n3–8s: …",
              "0–3s (gancho): …\n3–8s: …",
              "0–3s (accroche) : …\n3–8s : …",
            ])}
            className={cn(field, "resize-y font-mono text-xs leading-relaxed")}
          />
        </StudioCard>
      )}

      <StudioCard
        icon={Hash}
        color="#d6456b"
        title="Hashtags"
        hint={tr([
          "Enter, espaço ou vírgula para adicionar",
          "Enter, space or comma to add",
          "Enter, espacio o coma para agregar",
          "Entrée, espace ou virgule pour ajouter",
        ])}
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
                aria-label={`${tr(["Remover", "Remove", "Quitar", "Retirer"])} ${h}`}
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
            placeholder={
              d.hashtags.length
                ? ""
                : tr([
                    "Digite uma hashtag",
                    "Type a hashtag",
                    "Escribe un hashtag",
                    "Saisissez un hashtag",
                  ])
            }
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
          {tr([
            "Sugerir hashtags com IA",
            "Suggest hashtags with AI",
            "Sugerir hashtags con IA",
            "Suggérer des hashtags avec l’IA",
          ])}
        </button>
      </StudioCard>

      <StudioCard
        icon={Megaphone}
        color="#555f36"
        title={tr([
          "Chamada e notas",
          "Call to action and notes",
          "Llamada y notas",
          "Appel à l’action et notes",
        ])}
        hint={tr([
          "O convite final e recados para a equipe",
          "The final invitation and notes for the team",
          "La invitación final y mensajes para el equipo",
          "L’invitation finale et des messages pour l’équipe",
        ])}
        delay={200}
      >
        <Label>
          {tr(["Chamada para ação", "Call to action", "Llamada a la acción", "Appel à l’action"])}
        </Label>
        <input
          value={d.cta}
          maxLength={300}
          onChange={(e) => set("cta", e.target.value)}
          placeholder={tr([
            "Ex.: Salve para lembrar e mande para alguém.",
            "E.g.: Save it to remember and send it to someone.",
            "Ej.: Guárdalo para recordar y envíalo a alguien.",
            "Ex. : Enregistrez pour vous en souvenir et envoyez-le à quelqu’un.",
          ])}
          className={field}
        />
        <div className="mt-3">
          <Label>
            {tr([
              "Notas para a equipe",
              "Notes for the team",
              "Notas para el equipo",
              "Notes pour l’équipe",
            ])}
          </Label>
          <textarea
            value={d.visual_idea}
            maxLength={1000}
            rows={3}
            onChange={(e) => set("visual_idea", e.target.value)}
            placeholder={tr([
              "Ideia visual, referências, observações…",
              "Visual idea, references, remarks…",
              "Idea visual, referencias, observaciones…",
              "Idée visuelle, références, remarques…",
            ])}
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
  const tr = useTr();
  const [group, setGroup] = useState<ArtIconGroup>("Comida");
  const preview = useDebounced(d, 350);
  const auto = coverBody({ ...d, design: { ...d.design, body: "" } }, handle);

  return (
    <>
      <StudioCard
        icon={LayoutTemplate}
        color="#d6456b"
        title={tr([
          "Layout da arte",
          "Artwork layout",
          "Diseño de la imagen",
          "Mise en page du visuel",
        ])}
        hint={tr([
          "Cada card já mostra o seu post nesse layout",
          "Each card already shows your post in that layout",
          "Cada tarjeta ya muestra tu post en ese diseño",
          "Chaque carte montre déjà votre post dans cette mise en page",
        ])}
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

      <StudioCard
        icon={Palette}
        color="#7a5cc4"
        title={tr(["Cores", "Colors", "Colores", "Couleurs"])}
        hint={tr([
          "Paletas da marca",
          "Brand palettes",
          "Paletas de la marca",
          "Palettes de la marque",
        ])}
        delay={40}
      >
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
        title={tr(["Ícone", "Icon", "Ícono", "Icône"])}
        hint={tr([
          "Selo da arte (o NutriConnect não usa emojis)",
          "Artwork badge (NutriConnect doesn’t use emojis)",
          "Sello de la imagen (NutriConnect no usa emojis)",
          "Badge du visuel (NutriConnect n’utilise pas d’emojis)",
        ])}
        right={
          d.design.icon ? (
            <button
              type="button"
              onClick={() => setDesign({ icon: "" })}
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
            >
              {tr(["Sem ícone", "No icon", "Sin ícono", "Sans icône"])}
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
              {tr(GROUP_NAMES[g])}
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
        title={tr(["Banco de imagens", "Image bank", "Banco de imágenes", "Banque d’images"])}
        hint={tr([
          "Foto de fundo da arte",
          "Artwork background photo",
          "Foto de fondo de la imagen",
          "Photo de fond du visuel",
        ])}
        right={
          d.design.image ? (
            <button
              type="button"
              onClick={() => setDesign({ image: undefined })}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />{" "}
              {tr(["Tirar foto", "Remove photo", "Quitar foto", "Retirer la photo"])}
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
        title={tr(["Textos da arte", "Artwork text", "Textos de la imagen", "Textes du visuel"])}
        hint={tr([
          "O título da arte é o título do post",
          "The artwork title is the post title",
          "El título de la imagen es el título del post",
          "Le titre du visuel est le titre du post",
        ])}
        delay={160}
      >
        <Label
          right={
            <span className="text-[11px] text-muted-foreground">
              {(d.design.kicker ?? "").length}/40
            </span>
          }
        >
          {tr([
            "Chamada (selo acima do título)",
            "Kicker (badge above the title)",
            "Llamada (sello sobre el título)",
            "Surtitre (badge au-dessus du titre)",
          ])}
        </Label>
        <input
          value={d.design.kicker ?? ""}
          maxLength={40}
          onChange={(e) => setDesign({ kicker: e.target.value })}
          placeholder={tr([
            "Ex.: Mito ou verdade?",
            "E.g.: Myth or fact?",
            "Ej.: ¿Mito o verdad?",
            "Ex. : Mythe ou réalité ?",
          ])}
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
                  {tr([
                    "Voltar ao automático",
                    "Back to automatic",
                    "Volver a automático",
                    "Revenir à l’automatique",
                  ])}
                </button>
              ) : (
                <span className="text-[11px] text-muted-foreground">
                  {tr(["Automático", "Automatic", "Automático", "Automatique"])}
                </span>
              )
            }
          >
            {tr(["Texto da capa", "Cover text", "Texto de la portada", "Texte de couverture"])}
          </Label>
          <textarea
            value={d.design.body ?? ""}
            maxLength={400}
            rows={3}
            onChange={(e) => setDesign({ body: e.target.value })}
            placeholder={
              auto ||
              tr([
                "Deixe vazio para usar o gancho ou a legenda",
                "Leave empty to use the hook or the caption",
                "Déjalo vacío para usar el gancho o la descripción",
                "Laissez vide pour utiliser l’accroche ou la légende",
              ])
            }
            className={cn(field, "resize-y text-xs leading-relaxed")}
          />
          <p className="mt-1.5 text-[10.5px] leading-snug text-muted-foreground">
            {tr([
              "Lista, Receita e Enquete: um item por linha. Troca: “em vez de → prefira”.",
              "List, Recipe and Poll: one item per line. Swap: “instead of → prefer”.",
              "Lista, Receta y Encuesta: un ítem por línea. Cambio: “en vez de → prefiere”.",
              "Liste, Recette et Sondage : un élément par ligne. Échange : « au lieu de → préférez ».",
            ])}
          </p>
        </div>
      </StudioCard>

      <button type="button" className={cn(btnPrimary, "h-11 w-full")} onClick={onDownload}>
        <Download className="h-4 w-4" />{" "}
        {tr([
          "Baixar artes em PNG (alta resolução)",
          "Download artwork as PNG (high resolution)",
          "Descargar diseños en PNG (alta resolución)",
          "Télécharger les visuels en PNG (haute résolution)",
        ])}
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
  const tr = useTr();
  const total = composeCaption(d).length;
  const emoji = draftHasEmoji(d);
  const checks = useMemo(() => {
    const list: { ok: boolean; label: Names; emoji?: boolean }[] = [
      {
        ok: d.hook.trim().length >= 10,
        label: [
          "Gancho forte na primeira linha",
          "Strong hook in the first line",
          "Gancho fuerte en la primera línea",
          "Accroche forte dès la première ligne",
        ],
      },
      {
        ok: d.caption.trim().length >= 40,
        label: ["Legenda escrita", "Caption written", "Descripción escrita", "Légende rédigée"],
      },
      {
        ok: total <= CAPTION_LIMIT[mode],
        label: [
          `Dentro do limite da rede (${CAPTION_LIMIT[mode]} caracteres)`,
          `Within the network’s limit (${CAPTION_LIMIT[mode]} characters)`,
          `Dentro del límite de la red (${CAPTION_LIMIT[mode]} caracteres)`,
          `Dans la limite du réseau (${CAPTION_LIMIT[mode]} caractères)`,
        ],
      },
      {
        ok: d.cta.trim().length > 0,
        label: ["Chamada para ação", "Call to action", "Llamada a la acción", "Appel à l’action"],
      },
      {
        ok:
          d.network === "linkedin" || d.network === "x"
            ? d.hashtags.length <= 5
            : d.hashtags.length >= 3 && d.hashtags.length <= 15,
        label:
          d.network === "linkedin" || d.network === "x"
            ? ["Até 5 hashtags", "Up to 5 hashtags", "Hasta 5 hashtags", "Jusqu’à 5 hashtags"]
            : [
                "Entre 3 e 15 hashtags",
                "Between 3 and 15 hashtags",
                "Entre 3 y 15 hashtags",
                "Entre 3 et 15 hashtags",
              ],
      },
      {
        ok: images.length > 0,
        label: ["Arte pronta", "Artwork ready", "Diseño listo", "Visuel prêt"],
      },
      {
        ok: !emoji,
        label: [
          "Sem emojis (regra do NutriConnect)",
          "No emojis (NutriConnect rule)",
          "Sin emojis (regla de NutriConnect)",
          "Pas d’emojis (règle NutriConnect)",
        ],
        emoji: true,
      },
    ];
    if (d.format === "carrossel")
      list.push({
        ok: d.slides.filter((s) => s.title || s.text).length >= 2,
        label: [
          "Carrossel com 3 ou mais slides",
          "Carousel with 3 or more slides",
          "Carrusel con 3 o más diapositivas",
          "Carrousel de 3 diapositives ou plus",
        ],
      });
    if (["reels", "video", "story"].includes(d.format))
      list.push({
        ok: d.script.trim().length > 20,
        label: ["Roteiro do vídeo", "Video script", "Guion del video", "Script de la vidéo"],
      });
    list.push({
      ok: !/antes e depois|emagre[çc]a \d|perca \d+ ?kg|garantid/i.test(`${d.caption} ${d.hook}`),
      label: [
        "Sem promessas nem “antes e depois” (ética CFN)",
        "No promises or “before and after” (CFN ethics)",
        "Sin promesas ni “antes y después” (ética CFN)",
        "Ni promesses ni « avant/après » (éthique CFN)",
      ],
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
        title={tr(["Revisão", "Review", "Revisión", "Relecture"])}
        hint={tr([
          "Tudo verde? Está pronto para publicar",
          "All green? It’s ready to publish",
          "¿Todo en verde? Está listo para publicar",
          "Tout est vert ? C’est prêt à publier",
        ])}
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
              {ready
                ? tr([
                    "Pronto para publicar",
                    "Ready to publish",
                    "Listo para publicar",
                    "Prêt à publier",
                  ])
                : tr(["Quase lá", "Almost there", "Casi listo", "Presque fini"])}
            </p>
            <p className="text-xs leading-snug text-muted-foreground">
              {ready
                ? tr([
                    "Copie a legenda, baixe as artes e poste.",
                    "Copy the caption, download the artwork and post.",
                    "Copia la descripción, descarga los diseños y publica.",
                    "Copiez la légende, téléchargez les visuels et publiez.",
                  ])
                : `${checks.filter((c) => !c.ok).length} ${tr(["ponto(s) para revisar.", "item(s) to review.", "punto(s) por revisar.", "point(s) à revoir."])}`}
            </p>
          </div>
        </div>
        <ul className="mt-3.5 grid gap-1.5">
          {checks.map((c, k) => (
            <li
              key={c.label[0]}
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
              <span className="min-w-0 flex-1">{tr(c.label)}</span>
              {!c.ok && c.emoji && (
                <button
                  type="button"
                  onClick={onClean}
                  className="shrink-0 text-[11px] font-bold text-accent hover:underline"
                >
                  {tr(["Remover", "Remove", "Quitar", "Retirer"])}
                </button>
              )}
            </li>
          ))}
        </ul>
      </StudioCard>

      <StudioCard
        icon={CalendarDays}
        color="#d6456b"
        title={tr(["Agenda", "Schedule", "Agenda", "Planning"])}
        hint={tr([
          "Quando e em qual perfil",
          "When and on which profile",
          "Cuándo y en qué perfil",
          "Quand et sur quel profil",
        ])}
        delay={40}
      >
        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0">
            <Label>{tr(["Data", "Date", "Fecha", "Date"])}</Label>
            <input
              type="date"
              value={d.scheduled_for ?? ""}
              onChange={(e) => set("scheduled_for", e.target.value || null)}
              className={cn(field, "h-10 py-0")}
            />
          </div>
          <div className="min-w-0">
            <Label>{tr(["Perfil", "Profile", "Perfil", "Profil"])}</Label>
            <select
              value={d.profile_id ?? ""}
              onChange={(e) => set("profile_id", e.target.value || null)}
              className={cn(field, "h-10 py-0")}
            >
              <option value="">{tr(["Nenhum", "None", "Ninguno", "Aucun"])}</option>
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
              <span className="font-bold">
                {tr([
                  "Bons horários no",
                  "Good times on",
                  "Buenos horarios en",
                  "Bons horaires sur",
                ])}{" "}
                {NETWORK_LABEL[d.network]}:
              </span>{" "}
              {tr(BEST_TIME[d.network]!)}
            </span>
          </p>
        )}
      </StudioCard>

      <StudioCard
        icon={Send}
        color="#555f36"
        title={tr(["Publicar", "Publish", "Publicar", "Publier"])}
        hint={tr([
          "Leve o post para a rede",
          "Take the post to the network",
          "Lleva el post a la red",
          "Emmenez le post sur le réseau",
        ])}
        delay={80}
      >
        <div className="grid grid-cols-2 gap-2">
          <ActionTile
            icon={Copy}
            color="#2f8a5b"
            label={tr([
              "Copiar legenda",
              "Copy caption",
              "Copiar descripción",
              "Copier la légende",
            ])}
            onClick={onCopy}
          />
          <ActionTile
            icon={Download}
            color="#3b7bbf"
            label={tr([
              "Baixar artes",
              "Download artwork",
              "Descargar diseños",
              "Télécharger les visuels",
            ])}
            onClick={onDownload}
          />
          {!d.is_template && (
            <ActionTile
              icon={FilePlus2}
              color="#c58a12"
              label={tr([
                "Salvar como modelo",
                "Save as template",
                "Guardar como plantilla",
                "Enregistrer comme modèle",
              ])}
              onClick={onTemplate}
            />
          )}
          {onDelete && (
            <ActionTile
              icon={Trash2}
              color="#c2416b"
              label={tr(["Apagar post", "Delete post", "Borrar post", "Supprimer le post"])}
              onClick={onDelete}
            />
          )}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          {tr([
            "A publicação direta nas redes exige um app aprovado pela Meta e pelo TikTok. Por enquanto: copie a legenda, baixe as artes e poste pelo aplicativo da rede. Depois, mude o status para “Publicado”.",
            "Publishing directly to the networks requires an app approved by Meta and TikTok. For now: copy the caption, download the artwork and post from the network’s app. Then change the status to “Published”.",
            "La publicación directa en las redes exige una app aprobada por Meta y TikTok. Por ahora: copia la descripción, descarga los diseños y publica desde la app de la red. Después, cambia el estado a “Publicado”.",
            "La publication directe sur les réseaux exige une app approuvée par Meta et TikTok. Pour l’instant : copiez la légende, téléchargez les visuels et publiez depuis l’app du réseau. Ensuite, passez le statut à « Publié ».",
          ])}
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
