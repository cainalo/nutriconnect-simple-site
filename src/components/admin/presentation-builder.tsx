// Painel de construção de um slide personalizado: fundo, transição, blocos e propriedades do bloco.
// As mudanças caem direto no slide que está na tela (o próprio deck mostra o resultado).
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { btnCls, btnDanger, inputCls } from "@/components/admin/admin-ui";
import { PRESENTERS } from "@/components/presentation/parts";
import {
  ANIMS,
  DIAGRAM_KINDS,
  MOCKUP_KINDS,
  applyTheme,
  THEMES,
  BACKGROUNDS,
  BLOCK_LABEL,
  makeBlock,
  POSES,
  TONES,
  TRANSITIONS,
  type Block,
  type BlockType,
  type CustomSlide,
  type Shape,
  type Size,
} from "@/lib/custom-slides";
import type { Locale } from "@/lib/i18n/locales";
import { useTr } from "@/components/settings-ui";
import type { Names } from "@/lib/appearance-data";

const BLOCK_TYPES: BlockType[] = [
  "text",
  "card",
  "nina",
  "image",
  "shape",
  "emoji",
  "diagram",
  "mockup",
];
const SIZES: Size[] = ["sm", "md", "lg", "xl"];
const SHAPES: { id: Shape; label: Names }[] = [
  { id: "circle", label: ["Círculo", "Circle", "Círculo", "Cercle"] },
  { id: "blob", label: ["Orgânica", "Organic", "Orgánica", "Organique"] },
  { id: "rect", label: ["Retângulo", "Rectangle", "Rectángulo", "Rectangle"] },
];

export interface BuilderProps {
  slide: CustomSlide;
  locale: Locale;
  selected: string | null;
  onSelect: (blockId: string | null) => void;
  onSlide: (fn: (s: CustomSlide) => CustomSlide) => void;
  onDeleteSlide: () => void;
  onDuplicateSlide: () => void;
  onUpload: (file: File) => Promise<string | null>;
}

const num = (v: string, min: number, max: number) => Math.min(max, Math.max(min, Number(v) || 0));

export function SlideBuilder({
  slide,
  locale,
  selected,
  onSelect,
  onSlide,
  onDeleteSlide,
  onDuplicateSlide,
  onUpload,
}: BuilderProps) {
  const tr = useTr();
  const block = slide.blocks.find((b) => b.id === selected) ?? null;

  const setBlock = (id: string, fn: (b: Block) => Block) =>
    onSlide((s) => ({ ...s, blocks: s.blocks.map((b) => (b.id === id ? fn(b) : b)) }));

  const moveBlock = (id: string, dir: -1 | 1) =>
    onSlide((s) => {
      const i = s.blocks.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= s.blocks.length) return s;
      const next = [...s.blocks];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...s, blocks: next };
    });

  const removeBlock = (id: string) => {
    onSlide((s) => ({ ...s, blocks: s.blocks.filter((b) => b.id !== id) }));
    onSelect(null);
  };

  const duplicateBlock = (id: string) => {
    const src = slide.blocks.find((b) => b.id === id);
    if (!src) return;
    const copy: Block = {
      ...src,
      id: makeBlock(src.type).id,
      x: Math.min(src.x + 3, 100 - src.w),
      y: Math.min(src.y + 3, 100 - src.h),
    };
    onSlide((s) => ({ ...s, blocks: [...s.blocks, copy] }));
    onSelect(copy.id);
  };

  const addBlock = (type: BlockType) => {
    const fresh = makeBlock(type, {
      title:
        type === "text" || type === "card" || type === "image" ? { [locale]: "Novo texto" } : {},
      body: type === "nina" ? { [locale]: "Fala da Nina" } : {},
    });
    onSlide((s) => ({ ...s, blocks: [...s.blocks, fresh] }));
    onSelect(fresh.id);
  };

  const title = (b: Block) => b.title[locale] ?? b.title["pt-BR"] ?? "";
  const body = (b: Block) => b.body[locale] ?? b.body["pt-BR"] ?? "";

  return (
    <div className="space-y-4 text-sm">
      <section className="space-y-2 rounded-2xl border border-border bg-card p-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {tr(["Slide", "Slide", "Diapositiva", "Diapositive"])}
        </p>
        <input
          className={inputCls}
          value={slide.name}
          onChange={(e) => onSlide((s) => ({ ...s, name: e.target.value }))}
          aria-label={tr([
            "Nome do slide",
            "Slide name",
            "Nombre de la diapositiva",
            "Nom de la diapositive",
          ])}
        />
        <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          {tr(["Parte", "Part", "Parte", "Partie"])}
          <select
            className={inputCls}
            value={slide.part}
            onChange={(e) => onSlide((s) => ({ ...s, part: Number(e.target.value) }))}
          >
            {PRESENTERS.map((p, i) => (
              <option key={p.name} value={i}>
                {i + 1} · {p.name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs font-semibold text-muted-foreground">
          {tr(["Tema", "Theme", "Tema", "Thème"])}
        </p>
        <div className="flex flex-wrap gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={btnCls}
              onClick={() => onSlide((s) => applyTheme(s, t))}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs font-semibold text-muted-foreground">
          {tr(["Papel de parede", "Wallpaper", "Fondo", "Fond d'écran"])}
        </p>
        <div className="grid grid-cols-4 gap-2">
          {BACKGROUNDS.map((bg) => (
            <button
              key={bg.id}
              type="button"
              aria-pressed={slide.background === bg.id}
              aria-label={bg.label}
              title={bg.label}
              onClick={() => onSlide((s) => ({ ...s, background: bg.id }))}
              className={`h-10 rounded-lg border-2 ${slide.background === bg.id ? "border-accent" : "border-transparent"}`}
              style={bg.style}
            />
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          {tr(["Transição", "Transition", "Transición", "Transition"])}
          <select
            className={inputCls}
            value={slide.transition}
            onChange={(e) =>
              onSlide((s) => ({ ...s, transition: e.target.value as CustomSlide["transition"] }))
            }
          >
            {TRANSITIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnCls} onClick={onDuplicateSlide}>
            <Copy className="h-3.5 w-3.5" />{" "}
            {tr([
              "Duplicar slide",
              "Duplicate slide",
              "Duplicar diapositiva",
              "Dupliquer la diapositive",
            ])}
          </button>
          <button type="button" className={btnDanger} onClick={onDeleteSlide}>
            <Trash2 className="h-3.5 w-3.5" />{" "}
            {tr([
              "Excluir slide",
              "Delete slide",
              "Eliminar diapositiva",
              "Supprimer la diapositive",
            ])}
          </button>
        </div>
      </section>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {tr(["Adicionar elemento", "Add element", "Añadir elemento", "Ajouter un élément"])}
        </p>
        <div className="flex flex-wrap gap-2">
          {BLOCK_TYPES.map((t) => (
            <button key={t} type="button" className={btnCls} onClick={() => addBlock(t)}>
              <Plus className="h-3.5 w-3.5" /> {BLOCK_LABEL[t]}
            </button>
          ))}
        </div>
        <p className="pt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {tr(["Elementos", "Elements", "Elementos", "Éléments"])}
        </p>
        {slide.blocks.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {tr([
              "Nenhum elemento ainda. Adicione acima.",
              "No elements yet. Add one above.",
              "Todavía no hay elementos. Añade uno arriba.",
              "Aucun élément pour l'instant. Ajoutez-en un ci-dessus.",
            ])}
          </p>
        ) : (
          <ol className="space-y-1">
            {slide.blocks.map((b, i) => (
              <li
                key={b.id}
                className={`flex items-center gap-1 rounded-lg border px-2 py-1 ${selected === b.id ? "border-accent bg-accent-soft" : "border-border"}`}
              >
                <button
                  type="button"
                  className="flex-1 truncate text-left text-xs"
                  onClick={() => onSelect(b.id)}
                >
                  {BLOCK_LABEL[b.type]}
                  {title(b) || body(b) || b.emoji
                    ? ` · ${(title(b) || body(b) || b.emoji).slice(0, 26)}`
                    : ""}
                </button>
                <button
                  type="button"
                  className={btnCls}
                  disabled={i === 0}
                  onClick={() => moveBlock(b.id, -1)}
                  aria-label={tr(["Trazer para trás", "Send backward", "Enviar atrás", "Reculer"])}
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  className={btnCls}
                  disabled={i === slide.blocks.length - 1}
                  onClick={() => moveBlock(b.id, 1)}
                  aria-label={tr([
                    "Levar para frente",
                    "Bring forward",
                    "Traer adelante",
                    "Avancer",
                  ])}
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      {block && (
        <section className="space-y-3 rounded-2xl border border-border bg-card p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {BLOCK_LABEL[block.type]} ·{" "}
            {tr(["selecionado", "selected", "seleccionado", "sélectionné"])}
          </p>

          {(block.type === "text" || block.type === "card" || block.type === "image") && (
            <label className="block text-xs font-semibold text-muted-foreground">
              {tr(["Título", "Title", "Título", "Titre"])} ({locale})
              <input
                className={inputCls}
                value={title(block)}
                onChange={(e) =>
                  setBlock(block.id, (b) => ({
                    ...b,
                    title: { ...b.title, [locale]: e.target.value },
                  }))
                }
              />
            </label>
          )}
          {(block.type === "text" || block.type === "card" || block.type === "nina") && (
            <label className="block text-xs font-semibold text-muted-foreground">
              {block.type === "nina"
                ? tr(["Fala da Nina", "Nina's line", "Lo que dice Nina", "Réplique de Nina"])
                : tr(["Texto", "Text", "Texto", "Texte"])}{" "}
              ({locale})
              <textarea
                className={`${inputCls} min-h-[4rem]`}
                value={body(block)}
                onChange={(e) =>
                  setBlock(block.id, (b) => ({
                    ...b,
                    body: { ...b.body, [locale]: e.target.value },
                  }))
                }
              />
            </label>
          )}
          {(block.type === "card" || block.type === "emoji") && (
            <label className="block text-xs font-semibold text-muted-foreground">
              Emoji
              <input
                className={inputCls}
                value={block.emoji}
                onChange={(e) =>
                  setBlock(block.id, (b) => ({ ...b, emoji: e.target.value.slice(0, 4) }))
                }
              />
            </label>
          )}
          {block.type === "nina" && (
            <label className="block text-xs font-semibold text-muted-foreground">
              {tr(["Situação", "Pose", "Situación", "Pose"])}
              <select
                className={inputCls}
                value={block.pose}
                onChange={(e) =>
                  setBlock(block.id, (b) => ({ ...b, pose: e.target.value as Block["pose"] }))
                }
              >
                {POSES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {block.type === "image" && (
            <div className="space-y-2">
              <label className={`${btnCls} cursor-pointer`}>
                {tr(["Enviar imagem", "Upload image", "Subir imagen", "Envoyer une image"])}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    const url = await onUpload(file);
                    if (url) setBlock(block.id, (b) => ({ ...b, src: url }));
                  }}
                />
              </label>
              {block.src && (
                <button
                  type="button"
                  className={btnCls}
                  onClick={() => setBlock(block.id, (b) => ({ ...b, src: "" }))}
                >
                  {tr(["Tirar imagem", "Remove image", "Quitar imagen", "Retirer l'image"])}
                </button>
              )}
            </div>
          )}
          {block.type === "diagram" && (
            <label className="block text-xs font-semibold text-muted-foreground">
              {tr(["Tipo de diagrama", "Diagram type", "Tipo de diagrama", "Type de diagramme"])}
              <select
                className={inputCls}
                value={block.kind}
                onChange={(e) => setBlock(block.id, (b) => ({ ...b, kind: e.target.value }))}
              >
                {DIAGRAM_KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {block.type === "mockup" && (
            <label className="block text-xs font-semibold text-muted-foreground">
              {tr(["Tela do app", "App screen", "Pantalla de la app", "Écran de l'appli"])}
              <select
                className={inputCls}
                value={block.kind}
                onChange={(e) => setBlock(block.id, (b) => ({ ...b, kind: e.target.value }))}
              >
                {MOCKUP_KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {(block.type === "diagram" || block.type === "mockup") && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">
                {block.type === "diagram"
                  ? block.kind === "bars"
                    ? tr([
                        `Barras (${locale}): escreva "rótulo:valor", ex.: Abril:30`,
                        `Bars (${locale}): write "label:value", e.g.: April:30`,
                        `Barras (${locale}): escribe "etiqueta:valor", ej.: Abril:30`,
                        `Barres (${locale}) : écrivez « libellé:valeur », ex. : Avril:30`,
                      ])
                    : tr([
                        `Itens do diagrama (${locale})`,
                        `Diagram items (${locale})`,
                        `Elementos del diagrama (${locale})`,
                        `Éléments du diagramme (${locale})`,
                      ])
                  : tr([
                      `Linhas da tela (${locale})`,
                      `Screen lines (${locale})`,
                      `Líneas de la pantalla (${locale})`,
                      `Lignes de l'écran (${locale})`,
                    ])}
              </p>
              {block.items.map((item, i) => (
                <div key={i} className="flex gap-1">
                  <input
                    className={inputCls}
                    value={item[locale] ?? item["pt-BR"] ?? ""}
                    onChange={(e) =>
                      setBlock(block.id, (b) => ({
                        ...b,
                        items: b.items.map((it, j) =>
                          j === i ? { ...it, [locale]: e.target.value } : it,
                        ),
                      }))
                    }
                  />
                  <button
                    type="button"
                    className={btnDanger}
                    aria-label={tr([
                      "Remover item",
                      "Remove item",
                      "Quitar elemento",
                      "Retirer l'élément",
                    ])}
                    onClick={() =>
                      setBlock(block.id, (b) => ({
                        ...b,
                        items: b.items.filter((_, j) => j !== i),
                      }))
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={btnCls}
                onClick={() =>
                  setBlock(block.id, (b) => ({
                    ...b,
                    items: [...b.items, { [locale]: "Novo item" }],
                  }))
                }
              >
                <Plus className="h-3.5 w-3.5" />{" "}
                {tr(["Adicionar item", "Add item", "Añadir elemento", "Ajouter un élément"])}
              </button>
            </div>
          )}
          {block.type === "shape" && (
            <label className="block text-xs font-semibold text-muted-foreground">
              {tr(["Formato", "Shape", "Forma", "Forme"])}
              <select
                className={inputCls}
                value={block.shape}
                onChange={(e) =>
                  setBlock(block.id, (b) => ({ ...b, shape: e.target.value as Shape }))
                }
              >
                {SHAPES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {tr(s.label)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold text-muted-foreground">
              {tr(["Cor", "Color", "Color", "Couleur"])}
              <select
                className={inputCls}
                value={block.tone}
                onChange={(e) =>
                  setBlock(block.id, (b) => ({ ...b, tone: e.target.value as Block["tone"] }))
                }
              >
                {Object.entries(TONES).map(([id, t]) => (
                  <option key={id} value={id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              {tr(["Tamanho", "Size", "Tamaño", "Taille"])}
              <select
                className={inputCls}
                value={block.size}
                onChange={(e) =>
                  setBlock(block.id, (b) => ({ ...b, size: e.target.value as Size }))
                }
              >
                {SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              {tr(["Alinhamento", "Alignment", "Alineación", "Alignement"])}
              <select
                className={inputCls}
                value={block.align}
                onChange={(e) =>
                  setBlock(block.id, (b) => ({ ...b, align: e.target.value as Block["align"] }))
                }
              >
                <option value="left">{tr(["Esquerda", "Left", "Izquierda", "Gauche"])}</option>
                <option value="center">{tr(["Centro", "Center", "Centro", "Centre"])}</option>
                <option value="right">{tr(["Direita", "Right", "Derecha", "Droite"])}</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              {tr(["Animação", "Animation", "Animación", "Animation"])}
              <select
                className={inputCls}
                value={block.anim}
                onChange={(e) =>
                  setBlock(block.id, (b) => ({ ...b, anim: e.target.value as Block["anim"] }))
                }
              >
                {ANIMS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              {tr(["Atraso (ms)", "Delay (ms)", "Retraso (ms)", "Délai (ms)"])}
              <input
                type="number"
                min={0}
                max={3000}
                step={50}
                className={inputCls}
                value={block.delay}
                onChange={(e) =>
                  setBlock(block.id, (b) => ({ ...b, delay: num(e.target.value, 0, 3000) }))
                }
              />
            </label>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {(["x", "y", "w", "h"] as const).map((k) => (
              <label key={k} className="text-xs font-semibold uppercase text-muted-foreground">
                {k}
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={inputCls}
                  value={Math.round(block[k])}
                  onChange={(e) =>
                    setBlock(block.id, (b) => ({ ...b, [k]: num(e.target.value, 0, 100) }))
                  }
                />
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnCls} onClick={() => duplicateBlock(block.id)}>
              <Copy className="h-3.5 w-3.5" />{" "}
              {tr(["Duplicar", "Duplicate", "Duplicar", "Dupliquer"])}
            </button>
            <button type="button" className={btnDanger} onClick={() => removeBlock(block.id)}>
              <Trash2 className="h-3.5 w-3.5" />{" "}
              {tr([
                "Excluir elemento",
                "Delete element",
                "Eliminar elemento",
                "Supprimer l'élément",
              ])}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
