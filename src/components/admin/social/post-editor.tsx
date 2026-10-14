// Editor de um post do estúdio (S1): texto, slides, roteiro, status e data; "Melhorar com IA";
// salvar como modelo; arte em PNG da capa e dos slides.
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, Download, Image as ImageIcon, Plus, Sparkles, Trash2, Wand2, X } from "lucide-react";
import { btnCls, btnDanger, btnPrimary, inputCls } from "@/components/admin/admin-ui";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/hooks/use-i18n";
import {
  ART_SIZES,
  ART_THEMES,
  downloadCanvas,
  drawArt,
  type ArtSize,
  type ArtTheme,
} from "@/lib/post-art";
import {
  FORMAT_LABEL,
  NETWORK_LABEL,
  STATUSES,
  STATUS_LABEL,
  fullCaption,
  slidesOf,
  useDeletePost,
  useDuplicatePost,
  useUpdatePost,
  type SocialPost,
  type Slide,
} from "@/lib/social-studio";
import { FORMATS, NETWORKS, rewriteSocialText, type Network } from "@/lib/social-studio.functions";

const QUICK = [
  "Mais curto e direto",
  "Mais divertido e leve",
  "Mais científico, com fonte confiável",
  "Com mais perguntas para gerar comentários",
  "Adaptar para LinkedIn (profissional)",
  "Adaptar para TikTok (fala informal)",
];

export function PostEditor({
  post,
  handle,
  onClose,
}: {
  post: SocialPost | null;
  handle?: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!post} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        {post && <EditorBody key={post.id} post={post} handle={handle} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function EditorBody({
  post,
  handle,
  onClose,
}: {
  post: SocialPost;
  handle?: string;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const update = useUpdatePost();
  const remove = useDeletePost();
  const duplicate = useDuplicatePost();
  const [p, setP] = useState<SocialPost>(post);
  const [slides, setSlides] = useState<Slide[]>(slidesOf(post));
  const [tags, setTags] = useState(post.hashtags.join(" "));
  const [instruction, setInstruction] = useState("");
  const [rewriting, setRewriting] = useState(false);
  const set = <K extends keyof SocialPost>(k: K, v: SocialPost[K]) =>
    setP((old) => ({ ...old, [k]: v }));

  const save = (extra: Partial<SocialPost> = {}, close = true) =>
    update.mutate(
      {
        id: p.id,
        title: p.title.trim() || "Sem título",
        network: p.network,
        format: p.format,
        status: p.status,
        scheduled_for: p.scheduled_for || null,
        hook: p.hook,
        caption: p.caption,
        slides: slides.filter((s) => s.title || s.text) as never,
        script: p.script,
        hashtags: tags
          .split(/[\s,]+/)
          .map((t) => t.replace(/^#/, "").trim())
          .filter(Boolean)
          .slice(0, 30),
        cta: p.cta,
        visual_idea: p.visual_idea,
        pillar: p.pillar,
        ...extra,
      },
      {
        onSuccess: () => {
          toast.success("Post salvo.");
          if (close) onClose();
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );

  const rewrite = async (how: string) => {
    if (!p.caption.trim()) return toast.error("Escreva a legenda primeiro.");
    setRewriting(true);
    try {
      const res = await rewriteSocialText({
        data: {
          text: p.caption,
          instruction: how,
          network: p.network as Network,
          locale: locale as never,
        },
      });
      if ("error" in res) toast.error("A IA não conseguiu reescrever agora.");
      else set("caption", res.text);
    } catch {
      toast.error("A IA não conseguiu reescrever agora.");
    } finally {
      setRewriting(false);
    }
  };

  const copy = async () => {
    const text = fullCaption({
      caption: p.caption,
      cta: p.cta,
      hashtags: tags
        .split(/[\s,]+/)
        .map((t) => t.replace(/^#/, ""))
        .filter(Boolean),
    });
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Legenda copiada.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const isVideo = ["reels", "video", "story"].includes(p.format);

  return (
    <>
      <DialogTitle className="sr-only">Editar post</DialogTitle>
      <div className="space-y-3">
        <input
          value={p.title}
          maxLength={160}
          onChange={(e) => set("title", e.target.value)}
          className={`${inputCls} text-base font-semibold`}
          aria-label="Título interno"
        />
        <div className="grid gap-2 sm:grid-cols-4">
          <select
            value={p.network}
            onChange={(e) => set("network", e.target.value)}
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
            value={p.format}
            onChange={(e) => set("format", e.target.value)}
            className={inputCls}
            aria-label="Formato"
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {FORMAT_LABEL[f]}
              </option>
            ))}
          </select>
          <select
            value={p.status}
            onChange={(e) => set("status", e.target.value)}
            className={inputCls}
            aria-label="Status"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={p.scheduled_for ?? ""}
            onChange={(e) => set("scheduled_for", e.target.value || null)}
            className={inputCls}
            aria-label="Data de publicação"
          />
        </div>

        <Field label="Gancho (primeira linha / primeiros 2 segundos)">
          <input
            value={p.hook}
            maxLength={300}
            onChange={(e) => set("hook", e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Legenda">
          <textarea
            value={p.caption}
            maxLength={5000}
            rows={7}
            onChange={(e) => set("caption", e.target.value)}
            className={inputCls}
          />
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Wand2 className="h-3.5 w-3.5 text-accent" />
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                className={btnCls}
                disabled={rewriting}
                onClick={() => void rewrite(q)}
              >
                {q}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={instruction}
              maxLength={300}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Outro pedido para a IA (ex.: incluir a Nina, citar o Dia Mundial da Alimentação)"
              className={inputCls}
            />
            <button
              type="button"
              className={btnPrimary}
              disabled={!instruction.trim() || rewriting}
              onClick={() => void rewrite(instruction.trim())}
            >
              <Sparkles className="h-3.5 w-3.5" /> {rewriting ? "Escrevendo…" : "Reescrever"}
            </button>
          </div>
        </Field>

        {p.format === "carrossel" && (
          <Field label={`Slides (${slides.length})`}>
            <ol className="space-y-2">
              {slides.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 w-5 text-xs font-bold text-muted-foreground">{i + 1}</span>
                  <div className="flex-1 space-y-1">
                    <input
                      value={s.title}
                      maxLength={120}
                      placeholder="Título do slide"
                      onChange={(e) =>
                        setSlides((l) =>
                          l.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)),
                        )
                      }
                      className={inputCls}
                    />
                    <textarea
                      value={s.text}
                      maxLength={400}
                      rows={2}
                      placeholder="Texto do slide"
                      onChange={(e) =>
                        setSlides((l) =>
                          l.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)),
                        )
                      }
                      className={inputCls}
                    />
                  </div>
                  <button
                    type="button"
                    className={btnCls}
                    onClick={() => setSlides((l) => l.filter((_, j) => j !== i))}
                    aria-label="Remover slide"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ol>
            <button
              type="button"
              className={`${btnCls} mt-2`}
              disabled={slides.length >= 10}
              onClick={() => setSlides((l) => [...l, { title: "", text: "" }])}
            >
              <Plus className="h-3.5 w-3.5" /> Slide
            </button>
          </Field>
        )}

        {isVideo && (
          <Field label="Roteiro (cenas e falas)">
            <textarea
              value={p.script}
              maxLength={5000}
              rows={6}
              onChange={(e) => set("script", e.target.value)}
              className={inputCls}
            />
          </Field>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Hashtags (separadas por espaço)">
            <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Chamada para ação">
            <input
              value={p.cta}
              maxLength={300}
              onChange={(e) => set("cta", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Pilar de conteúdo">
            <input
              value={p.pillar}
              maxLength={80}
              onChange={(e) => set("pillar", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Ideia visual / observações">
            <input
              value={p.visual_idea}
              maxLength={1000}
              onChange={(e) => set("visual_idea", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <ArtPanel
          title={p.hook || p.title}
          slides={p.format === "carrossel" ? slides : []}
          handle={handle}
          name={p.title}
        />

        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          <button
            type="button"
            className={btnPrimary}
            disabled={update.isPending}
            onClick={() => save()}
          >
            Salvar
          </button>
          <button type="button" className={btnCls} onClick={() => void copy()}>
            <Copy className="h-3.5 w-3.5" /> Copiar legenda
          </button>
          {!p.is_template && (
            <button
              type="button"
              className={btnCls}
              onClick={() =>
                duplicate.mutate(
                  { post: { ...p, slides: slides as never }, asTemplate: true },
                  { onSuccess: () => toast.success("Modelo salvo em Modelos.") },
                )
              }
            >
              Salvar como modelo
            </button>
          )}
          <button
            type="button"
            className={btnCls}
            onClick={() =>
              duplicate.mutate(
                { post: p, asTemplate: false },
                { onSuccess: () => toast.success("Post duplicado.") },
              )
            }
          >
            Duplicar
          </button>
          <span className="flex-1" />
          <button
            type="button"
            className={btnDanger}
            onClick={() => {
              if (window.confirm("Apagar este post?")) remove.mutate(p.id, { onSuccess: onClose });
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Apagar
          </button>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

/** Pré-visualização e download da arte (capa e, no carrossel, cada slide). */
function ArtPanel({
  title,
  slides,
  handle,
  name,
}: {
  title: string;
  slides: Slide[];
  handle?: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<ArtSize>("feed");
  const [theme, setTheme] = useState<ArtTheme>("oliva");
  const [kicker, setKicker] = useState("");
  const [page, setPage] = useState(0); // 0 = capa
  const preview = useRef<HTMLDivElement>(null);
  const total = slides.length ? slides.length + 1 : 1;

  const inputFor = (i: number) =>
    i === 0
      ? { size, theme, kicker, title, handle, page: { index: 1, total } }
      : {
          size,
          theme,
          title: slides[i - 1].title || title,
          body: slides[i - 1].text,
          handle,
          page: { index: i + 1, total },
        };

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void drawArt(inputFor(page)).then((c) => {
      if (!alive || !preview.current) return;
      c.style.width = "100%";
      c.style.height = "auto";
      c.style.borderRadius = "16px";
      preview.current.replaceChildren(c);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, size, theme, kicker, page, title, slides, handle]);

  const downloadAll = async () => {
    for (let i = 0; i < total; i++) {
      downloadCanvas(await drawArt(inputFor(i)), `${name}-${i + 1}`);
    }
  };

  if (!open) {
    return (
      <button type="button" className={btnCls} onClick={() => setOpen(true)}>
        <ImageIcon className="h-3.5 w-3.5" /> Criar arte do post
      </button>
    );
  }
  return (
    <div className="grid gap-3 rounded-2xl border border-border/70 p-3 sm:grid-cols-[1fr_220px]">
      <div ref={preview} className="mx-auto w-full max-w-xs" />
      <div className="space-y-2">
        <select
          value={size}
          onChange={(e) => setSize(e.target.value as ArtSize)}
          className={inputCls}
          aria-label="Tamanho"
        >
          {Object.entries(ART_SIZES).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(ART_THEMES).map(([k, v]) => (
            <button
              key={k}
              type="button"
              aria-pressed={theme === k}
              onClick={() => setTheme(k as ArtTheme)}
              className={`h-8 w-8 rounded-full border-2 ${theme === k ? "border-accent" : "border-transparent"}`}
              style={{ background: v.bg }}
              title={v.label}
            />
          ))}
        </div>
        <input
          value={kicker}
          maxLength={40}
          onChange={(e) => setKicker(e.target.value)}
          placeholder="Chamada pequena (ex.: MITO OU VERDADE?)"
          className={inputCls}
        />
        {total > 1 && (
          <select
            value={page}
            onChange={(e) => setPage(Number(e.target.value))}
            className={inputCls}
            aria-label="Página"
          >
            {Array.from({ length: total }, (_, i) => (
              <option key={i} value={i}>
                {i === 0 ? "Capa" : `Slide ${i}`}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          className={btnPrimary}
          onClick={() =>
            void drawArt(inputFor(page)).then((c) => downloadCanvas(c, `${name}-${page + 1}`))
          }
        >
          <Download className="h-3.5 w-3.5" /> Baixar PNG
        </button>
        {total > 1 && (
          <button type="button" className={btnCls} onClick={() => void downloadAll()}>
            Baixar todos ({total})
          </button>
        )}
      </div>
    </div>
  );
}
