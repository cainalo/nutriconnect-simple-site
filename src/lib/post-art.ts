// Arte dos posts do estúdio de redes sociais: desenha no navegador (canvas) a capa e cada slide com as
// cores do NutriConnect, em layouts prontos (clássico, centralizado, citação, lista, mito × verdade,
// receita, dado, comparativo, editorial, enquete e moldura), com ícone (nunca emoji — regra do site),
// foto de fundo opcional (do banco de imagens ou enviada) e download em PNG. Nada vai para servidor.
import { ART_ICONS } from "@/lib/art-icons";

export type ArtSize = "feed" | "quadrado" | "story" | "paisagem";
export type ArtTheme =
  | "oliva"
  | "terracota"
  | "creme"
  | "noite"
  | "menta"
  | "lavanda"
  | "sol"
  | "grafite"
  | "oceano"
  | "rosa"
  | "papel";
export type ArtLayout =
  | "classico"
  | "centro"
  | "citacao"
  | "lista"
  | "mito"
  | "receita"
  | "dado"
  | "comparativo"
  | "editorial"
  | "pergunta"
  | "moldura";

export const ART_SIZES: Record<ArtSize, { w: number; h: number; label: string }> = {
  feed: { w: 1080, h: 1350, label: "Feed 4:5" },
  quadrado: { w: 1080, h: 1080, label: "Quadrado 1:1" },
  story: { w: 1080, h: 1920, label: "Vertical 9:16" },
  paisagem: { w: 1280, h: 720, label: "Paisagem 16:9" },
};

export const ART_THEMES: Record<
  ArtTheme,
  { bg: string; bg2: string; text: string; accent: string; label: string }
> = {
  oliva: { bg: "#555f36", bg2: "#3f4727", text: "#fbf7ee", accent: "#e9b949", label: "Oliva" },
  terracota: {
    bg: "#b4532a",
    bg2: "#8f3f1e",
    text: "#fff7ef",
    accent: "#f6d38b",
    label: "Terracota",
  },
  creme: { bg: "#faf3e3", bg2: "#efe3c8", text: "#2f3a1a", accent: "#b4532a", label: "Creme" },
  noite: { bg: "#1f2414", bg2: "#2c3320", text: "#f3efe2", accent: "#9ba86a", label: "Noite" },
  menta: { bg: "#d9efe4", bg2: "#b9dfcc", text: "#1d3b2e", accent: "#2f8a5b", label: "Menta" },
  lavanda: { bg: "#ece6f7", bg2: "#d9cdef", text: "#2e2445", accent: "#7a5cc4", label: "Lavanda" },
  sol: { bg: "#f8d26a", bg2: "#f2b441", text: "#3a2a07", accent: "#9a3f17", label: "Sol" },
  grafite: { bg: "#2a2c2f", bg2: "#18191b", text: "#f5f2ea", accent: "#e9b949", label: "Grafite" },
  oceano: { bg: "#1f4e6b", bg2: "#143349", text: "#f1f7fb", accent: "#8fd3ef", label: "Oceano" },
  rosa: { bg: "#f8e3e8", bg2: "#efc6d0", text: "#4a1d2b", accent: "#c2416b", label: "Rosa" },
  papel: { bg: "#ffffff", bg2: "#f3efe6", text: "#22261a", accent: "#555f36", label: "Papel" },
};

export const ART_LAYOUTS: Record<ArtLayout, { label: string; hint: string }> = {
  classico: { label: "Clássico", hint: "Título forte e texto" },
  centro: { label: "Centralizado", hint: "Impacto no meio" },
  editorial: { label: "Editorial", hint: "Foto + faixa de texto" },
  moldura: { label: "Moldura", hint: "Elegante e limpo" },
  dado: { label: "Dado", hint: "Número em destaque" },
  lista: { label: "Lista", hint: "Passos ou dicas" },
  comparativo: { label: "Troca", hint: "Em vez de × prefira" },
  pergunta: { label: "Enquete", hint: "Pergunta e opções" },
  citacao: { label: "Citação", hint: "Frase em destaque" },
  mito: { label: "Mito × Verdade", hint: "Duas metades" },
  receita: { label: "Receita", hint: "Cartão de receita" },
};

/** Design salvo junto do post. */
export interface PostDesign {
  layout?: ArtLayout;
  theme?: ArtTheme;
  /** Nome do ícone (ver lib/art-icons). */
  icon?: string;
  /** Legado (posts antigos): emojis não são mais desenhados. */
  emoji?: string;
  kicker?: string;
  /** Texto da capa (vazio: automático, a partir do gancho, da legenda ou dos slides). */
  body?: string;
  /** Foto de fundo: caminho do banco de imagens, URL pública ou data URL JPEG comprimida. */
  image?: string;
}

export interface ArtInput {
  size: ArtSize;
  theme: ArtTheme;
  layout?: ArtLayout;
  kicker?: string;
  title: string;
  body?: string;
  handle?: string;
  page?: { index: number; total: number };
  icon?: string;
  image?: string;
  /** Escala do desenho (0.25 para miniaturas rápidas). */
  scale?: number;
}

const DISPLAY = '"Libre Baskerville", Georgia, serif';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Tira emojis (e seus modificadores) do texto: o NutriConnect só usa ícones. */
export function stripEmoji(s: string) {
  return s
    .replace(
      /\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|[\u{1F3FB}-\u{1F3FF}]|\u{FE0F}|\u{200D}|\u{20E3}/gu,
      "",
    )
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +\n/g, "\n")
    .trim();
}

/** Há emoji no texto? */
export const hasEmoji = (s: string) => /\p{Extended_Pictographic}/u.test(s);

const imageCache = new Map<string, Promise<HTMLImageElement>>();
function loadImage(src: string) {
  let p = imageCache.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      // Fotos de outro domínio (Storage) precisam de CORS para o canvas continuar exportável.
      if (/^https?:/.test(src)) img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
    p.catch(() => imageCache.delete(src));
    imageCache.set(src, p);
  }
  return p;
}

/** SVG de um ícone (traço do Lucide) na cor pedida. */
export function iconSvg(name: string, color: string, strokeWidth = 2) {
  const icon = ART_ICONS[name];
  if (!icon) return "";
  const esc = (v: string | number) => String(v).replace(/"/g, "&quot;");
  const kids = icon.node
    .map(
      ([tag, attrs]) =>
        `<${tag} ${Object.entries(attrs)
          .map(([k, v]) => `${k}="${esc(v)}"`)
          .join(" ")}/>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="${esc(color)}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${kids}</svg>`;
}

function loadIcon(name: string, color: string) {
  const svg = iconSvg(name, color);
  if (!svg) return Promise.resolve(null);
  return loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`).catch(() => null);
}

/** Luminância aproximada (0 escuro … 1 claro) de uma cor #rrggbb. */
function lum(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

/** Quebra o texto em linhas que cabem na largura (reticências depois de `maxLines`). */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  let used = 0;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= width) {
      line = test;
      used++;
      continue;
    }
    if (line) lines.push(line);
    if (lines.length === maxLines) break;
    line = w;
    used++;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (used < words.length && lines.length) {
    let last = lines[lines.length - 1];
    while (ctx.measureText(`${last}…`).width > width && last.length) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last}…`;
  }
  return lines;
}

/** Fonte do título: diminui até caber em `maxLines`. */
function fitTitle(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  maxLines: number,
  start: number,
  min: number,
  unit: number,
  family = DISPLAY,
  weight = 700,
) {
  let size = start;
  let lines: string[] = [];
  for (; size >= min; size -= 4) {
    ctx.font = `${weight} ${size * unit}px ${family}`;
    lines = wrap(ctx, text, width, maxLines);
    // Estoura se cortou texto ou se uma palavra sozinha não cabe na largura.
    const overflow = lines.some((l) => l.endsWith("…") || ctx.measureText(l).width > width);
    if (!overflow) break;
  }
  return { size: Math.max(size, min), lines };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const listItems = (body?: string) =>
  (body ?? "")
    .split(/\n|•|;/)
    // Tira só marcadores ("- ", "→ ", "1. ", "2) "), sem comer quantidades como "3 ovos" ou "1/2".
    .map((s) => s.replace(/^\s*(?:[-–→*]|\d+[.)](?!\d))\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 7);

/** Pares "em vez de → prefira" (aceita →, ->, =>, | ou " por "). */
const swapPairs = (body?: string) =>
  listItems(body)
    .map((l) => l.split(/\s*(?:→|->|=>|\|)\s*|\s+por\s+/i))
    .filter((p) => p.length >= 2 && p[0] && p[1])
    .map((p) => [p[0], p.slice(1).join(" ")] as [string, string])
    .slice(0, 5);

/** Desenha a arte e devolve o canvas. */
export async function drawArt(input: ArtInput): Promise<HTMLCanvasElement> {
  try {
    await document.fonts.load(`700 64px ${DISPLAY}`);
  } catch {
    /* usa a fonte reserva */
  }
  const title = stripEmoji(input.title) || " ";
  const body = input.body ? stripEmoji(input.body) : "";
  const kicker = input.kicker ? stripEmoji(input.kicker) : "";
  const scale = input.scale ?? 1;
  const { w, h } = ART_SIZES[input.size];
  const t = ART_THEMES[input.theme] ?? ART_THEMES.oliva;
  const layout = input.layout ?? "classico";
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  // Quadrado usa as medidas do retrato; só o 16:9 é paisagem.
  const portrait = h >= w;
  const unit = Math.min(w, h) / 1080; // escala tipográfica (paisagem fica proporcional)
  // No vertical (Reels, Stories, TikTok) as laterais são cortadas em celulares mais compridos e a
  // interface da rede cobre a faixa de baixo: margens maiores ("zona segura").
  const story = input.size === "story";
  const pad = Math.round((story ? 132 : 96) * unit * (portrait ? 1 : 1.1));
  // No vertical, a coluna de botões do Reels/TikTok cobre a direita: margem extra desse lado.
  const inner = w - pad * 2 - (story ? 44 * unit : 0);
  const lightTheme = lum(t.bg) > 0.6;

  // ── Fundo ────────────────────────────────────────────────────────────────
  let text = t.text;
  let accent = t.accent;
  const photo = input.image ? await loadImage(input.image).catch(() => null) : null;
  const fullPhoto = photo && layout !== "editorial";
  const cover = (img: HTMLImageElement, x: number, y: number, bw: number, bh: number) => {
    const r = Math.max(bw / img.width, bh / img.height);
    const iw = img.width * r;
    const ih = img.height * r;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, bw, bh);
    ctx.clip();
    ctx.drawImage(img, x + (bw - iw) / 2, y + (bh - ih) / 2, iw, ih);
    ctx.restore();
  };
  if (fullPhoto) {
    cover(photo, 0, 0, w, h);
    const shade = ctx.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, "rgba(0,0,0,0.30)");
    shade.addColorStop(0.5, "rgba(0,0,0,0.55)");
    shade.addColorStop(1, "rgba(0,0,0,0.82)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, w, h);
    text = "#ffffff";
    accent = lightTheme ? "#f6d38b" : t.accent;
  } else {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, t.bg);
    g.addColorStop(1, t.bg2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    if (layout !== "moldura" && layout !== "editorial") {
      // Formas suaves nos cantos, discretas.
      ctx.globalAlpha = 0.11;
      ctx.fillStyle = t.accent;
      ctx.beginPath();
      ctx.arc(w * 0.94, h * 0.06, Math.min(w, h) * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.07;
      ctx.beginPath();
      ctx.arc(w * 0.04, h * 0.97, Math.min(w, h) * 0.26, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  ctx.textBaseline = "top";
  // Cor do ícone sobre o selo (contrasta com o destaque).
  const onAccent = lum(accent) > 0.55 ? "#1f2414" : "#ffffff";

  const footH = portrait ? (story ? 440 : 150) * unit : 110 * unit;
  const top = (story ? 300 : portrait ? 170 : 90) * unit;
  const bottomLimit = h - footH - 30 * unit;

  /** Selo arredondado com o ícone. Devolve o y logo abaixo. */
  const drawIcon = async (
    y: number,
    x: number,
    size: number,
    align: "left" | "center" = "left",
    name = input.icon,
    fill = accent,
    color = onAccent,
  ) => {
    if (!name || !ART_ICONS[name]) return y;
    const s = size * unit;
    const bx = align === "center" ? x - s / 2 : x;
    ctx.fillStyle = fill;
    roundRect(ctx, bx, y, s, s, s * 0.3);
    ctx.fill();
    const img = await loadIcon(name, color);
    if (img) ctx.drawImage(img, bx + s * 0.22, y + s * 0.22, s * 0.56, s * 0.56);
    return y + s + 36 * unit;
  };

  const drawKicker = (y: number, align: CanvasTextAlign = "left", x = pad) => {
    if (!kicker) return y;
    ctx.font = `800 ${Math.round(32 * unit)}px ${SANS}`;
    const label = kicker.toUpperCase().slice(0, 40);
    if (align === "left") {
      // Selo arredondado atrás da chamada.
      const lw = ctx.measureText(label).width;
      ctx.globalAlpha = fullPhoto ? 1 : 0.16;
      ctx.fillStyle = fullPhoto ? "rgba(255,255,255,0.18)" : accent;
      roundRect(ctx, x - 18 * unit, y - 12 * unit, lw + 36 * unit, 56 * unit, 28 * unit);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = accent;
      ctx.textAlign = "left";
      ctx.fillText(label, x, y);
    } else {
      ctx.fillStyle = accent;
      ctx.textAlign = "center";
      ctx.fillText(label, w / 2, y);
      ctx.textAlign = "left";
    }
    return y + 78 * unit;
  };

  const drawBody = (
    txt: string,
    y: number,
    align: CanvasTextAlign = "left",
    size = 42,
    width = inner,
    x = pad,
    color = text,
  ) => {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;
    ctx.font = `400 ${Math.round(size * unit)}px ${SANS}`;
    ctx.textAlign = align;
    const lh = size * 1.4 * unit;
    const max = Math.max(1, Math.floor((bottomLimit - y) / lh));
    for (const l of wrap(ctx, txt, width, max)) {
      ctx.fillText(l, align === "center" ? w / 2 : x, y);
      y += lh;
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
    return y;
  };

  const drawLines = (
    lines: string[],
    size: number,
    y: number,
    opts: {
      x?: number;
      align?: CanvasTextAlign;
      lh?: number;
      color?: string;
      font?: string;
      width?: number;
    } = {},
  ) => {
    ctx.font = opts.font ?? `700 ${size * unit}px ${DISPLAY}`;
    ctx.fillStyle = opts.color ?? text;
    ctx.textAlign = opts.align ?? "left";
    for (const l of lines) {
      // maxWidth: nunca passa da área do texto, mesmo com uma palavra muito longa.
      ctx.fillText(l, opts.align === "center" ? w / 2 : (opts.x ?? pad), y, opts.width ?? inner);
      y += size * (opts.lh ?? 1.22) * unit;
    }
    ctx.textAlign = "left";
    return y;
  };

  let footAlign: "left" | "center" = "left";
  let footColor = text;

  // ── Layouts ──────────────────────────────────────────────────────────────
  if (layout === "centro") {
    const fit = fitTitle(ctx, title, inner, 5, portrait ? 104 : 96, 52, unit);
    ctx.font = `400 ${40 * unit}px ${SANS}`;
    const bodyLines = body ? wrap(ctx, body, inner, 4).length : 0;
    const blockH =
      (input.icon ? 176 * unit : 0) +
      (kicker ? 78 * unit : 0) +
      fit.lines.length * fit.size * 1.2 * unit +
      (bodyLines ? 70 * unit + bodyLines * 56 * unit : 28 * unit);
    let y = Math.max(top * 0.7, (h - footH - blockH) / 2);
    y = await drawIcon(y, w / 2, 140, "center");
    y = drawKicker(y, "center");
    y = drawLines(fit.lines, fit.size, y, { align: "center", lh: 1.2 });
    ctx.fillStyle = accent;
    ctx.fillRect(w / 2 - 50 * unit, y + 20 * unit, 100 * unit, 8 * unit);
    if (body) drawBody(body, y + 70 * unit, "center", 40);
    footAlign = "center";
  } else if (layout === "citacao") {
    let y = top;
    ctx.fillStyle = accent;
    ctx.font = `700 ${Math.round(260 * unit)}px ${DISPLAY}`;
    ctx.fillText("“", pad - 10 * unit, y - 70 * unit);
    y += 150 * unit;
    const fit = fitTitle(ctx, title, inner, 7, portrait ? 76 : 70, 44, unit, DISPLAY, 400);
    y = drawLines(fit.lines, fit.size, y, {
      lh: 1.35,
      font: `italic 400 ${fit.size * unit}px ${DISPLAY}`,
    });
    if (body) {
      ctx.fillStyle = accent;
      ctx.fillRect(pad, y + 52 * unit, 48 * unit, 4 * unit);
      ctx.font = `700 ${Math.round(34 * unit)}px ${SANS}`;
      ctx.fillText(body.slice(0, 80), pad + 68 * unit, y + 38 * unit, inner - 68 * unit);
    }
  } else if (layout === "lista") {
    let y = top;
    y = await drawIcon(y - 20 * unit, pad, 104);
    y = drawKicker(y);
    const fit = fitTitle(ctx, title, inner, 3, portrait ? 84 : 76, 48, unit);
    y = drawLines(fit.lines, fit.size, y, { lh: 1.2 }) + 40 * unit;
    const items = listItems(body);
    const rowH = Math.min(118 * unit, (bottomLimit - y) / Math.max(items.length, 1));
    items.forEach((item, i) => {
      const cy = y + i * rowH;
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(pad + 30 * unit, cy + 30 * unit, 30 * unit, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = onAccent;
      ctx.font = `800 ${Math.round(30 * unit)}px ${SANS}`;
      ctx.textAlign = "center";
      ctx.fillText(String(i + 1), pad + 30 * unit, cy + 14 * unit);
      ctx.textAlign = "left";
      ctx.fillStyle = text;
      ctx.font = `500 ${Math.round(38 * unit)}px ${SANS}`;
      const [first] = wrap(ctx, item, inner - 90 * unit, 1);
      ctx.fillText(first ?? "", pad + 86 * unit, cy + 10 * unit);
      if (i < items.length - 1) {
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = text;
        ctx.fillRect(pad + 86 * unit, cy + rowH - 12 * unit, inner - 86 * unit, 2 * unit);
        ctx.globalAlpha = 1;
      }
    });
  } else if (layout === "mito") {
    const mid = h * 0.5;
    ctx.fillStyle = fullPhoto ? "rgba(214,69,107,0.5)" : "rgba(214,69,107,0.14)";
    ctx.fillRect(0, 0, w, mid);
    ctx.fillStyle = fullPhoto ? "rgba(47,138,91,0.5)" : "rgba(47,138,91,0.14)";
    ctx.fillRect(0, mid, w, h - mid);
    const label = async (txt: string, y: number, color: string, icon: string) => {
      ctx.font = `800 ${Math.round(36 * unit)}px ${SANS}`;
      const lw = ctx.measureText(txt).width;
      ctx.fillStyle = color;
      roundRect(ctx, pad, y, lw + 108 * unit, 66 * unit, 33 * unit);
      ctx.fill();
      const img = await loadIcon(icon, "#ffffff");
      if (img) ctx.drawImage(img, pad + 20 * unit, y + 15 * unit, 36 * unit, 36 * unit);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(txt, pad + 70 * unit, y + 15 * unit);
    };
    let y = (portrait ? 120 : 50) * unit;
    await label("MITO", y, "#d6456b", "circle-x");
    y += 100 * unit;
    let fit = fitTitle(ctx, title, inner, 4, portrait ? 72 : 64, 40, unit);
    drawLines(fit.lines, fit.size, y, { lh: 1.2 });
    y = mid + (portrait ? 60 : 30) * unit;
    await label("VERDADE", y, "#2f8a5b", "circle-check");
    y += 100 * unit;
    fit = fitTitle(
      ctx,
      body || "…",
      inner,
      portrait ? 6 : 3,
      portrait ? 46 : 42,
      32,
      unit,
      SANS,
      500,
    );
    drawLines(fit.lines, fit.size, y, { lh: 1.35, font: `500 ${fit.size * unit}px ${SANS}` });
  } else if (layout === "receita") {
    const cardX = pad * 0.6;
    const cardY = top - 40 * unit;
    const cardW = w - cardX * 2;
    const cardH = bottomLimit - cardY;
    ctx.fillStyle = "rgba(255,255,255,0.93)";
    roundRect(ctx, cardX, cardY, cardW, cardH, 48 * unit);
    ctx.fill();
    const ink = "#2f3a1a";
    const recipeAccent = lum(t.accent) > 0.55 ? "#b4532a" : t.accent;
    let y = cardY + 60 * unit;
    const x = cardX + 60 * unit;
    const cw = cardW - 120 * unit;
    y = await drawIcon(y, x, 92, "left", input.icon, recipeAccent, "#ffffff");
    ctx.fillStyle = recipeAccent;
    ctx.font = `800 ${Math.round(30 * unit)}px ${SANS}`;
    ctx.fillText((kicker || "RECEITA").toUpperCase().slice(0, 40), x, y);
    y += 56 * unit;
    const fit = fitTitle(ctx, title, cw, 3, portrait ? 72 : 64, 40, unit);
    y = drawLines(fit.lines, fit.size, y, { x, lh: 1.2, color: ink, width: cw }) + 26 * unit;
    ctx.fillStyle = "#e7dcc3";
    ctx.fillRect(x, y, cw, 3 * unit);
    y += 34 * unit;
    ctx.font = `500 ${Math.round(36 * unit)}px ${SANS}`;
    for (const item of listItems(body)) {
      if (y > cardY + cardH - 70 * unit) break;
      ctx.fillStyle = recipeAccent;
      ctx.beginPath();
      ctx.arc(x + 8 * unit, y + 20 * unit, 7 * unit, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ink;
      const [first] = wrap(ctx, item, cw - 40 * unit, 1);
      ctx.fillText(first ?? "", x + 36 * unit, y);
      y += 58 * unit;
    }
  } else if (layout === "dado") {
    let y = top + (portrait ? 30 : 0) * unit;
    y = await drawIcon(y - 20 * unit, pad, 104);
    y = drawKicker(y);
    const fit = fitTitle(ctx, title, inner, 2, portrait ? 210 : 150, 56, unit);
    y = drawLines(fit.lines, fit.size, y, { lh: 1.08, color: accent });
    ctx.fillStyle = text;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(pad, y + 24 * unit, inner, 3 * unit);
    ctx.globalAlpha = 1;
    if (body) drawBody(body, y + 64 * unit, "left", portrait ? 46 : 40);
  } else if (layout === "comparativo") {
    let y = top - (portrait ? 20 : 30) * unit;
    y = drawKicker(y);
    const fit = fitTitle(ctx, title, inner, portrait ? 3 : 2, portrait ? 76 : 60, 44, unit);
    y = drawLines(fit.lines, fit.size, y, { lh: 1.2 }) + 36 * unit;
    const gap = 70 * unit;
    const colW = (inner - gap) / 2;
    const head = async (txt: string, x: number, color: string, icon: string) => {
      ctx.font = `800 ${Math.round(28 * unit)}px ${SANS}`;
      const lw = ctx.measureText(txt).width;
      ctx.fillStyle = color;
      roundRect(ctx, x, y, lw + 92 * unit, 56 * unit, 28 * unit);
      ctx.fill();
      const img = await loadIcon(icon, "#ffffff");
      if (img) ctx.drawImage(img, x + 18 * unit, y + 13 * unit, 30 * unit, 30 * unit);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(txt, x + 60 * unit, y + 14 * unit);
    };
    await head("EM VEZ DE", pad, "#c2416b", "circle-x");
    await head("PREFIRA", pad + colW + gap, "#2f8a5b", "circle-check");
    y += 84 * unit;
    const pairs = swapPairs(body);
    const rowH = Math.min(
      portrait ? 170 * unit : 104 * unit,
      (bottomLimit - y) / Math.max(pairs.length, 1),
    );
    const cardFill = fullPhoto
      ? "rgba(255,255,255,0.14)"
      : lightTheme
        ? "rgba(255,255,255,0.7)"
        : "rgba(255,255,255,0.09)";
    const arrow = await loadIcon("arrow-right", accent);
    pairs.forEach(([a, b], i) => {
      const cy = y + i * rowH;
      const ch = rowH - 18 * unit;
      ctx.font = `500 ${Math.round((portrait ? 36 : 30) * unit)}px ${SANS}`;
      for (const [k, txt] of [a, b].entries()) {
        const x = pad + k * (colW + gap);
        ctx.fillStyle = cardFill;
        roundRect(ctx, x, cy, colW, ch, 26 * unit);
        ctx.fill();
        ctx.fillStyle = text;
        const lines = wrap(ctx, txt, colW - 48 * unit, portrait ? 2 : 1);
        const lh = (portrait ? 44 : 36) * unit;
        let ty = cy + (ch - lines.length * lh) / 2 + 4 * unit;
        for (const l of lines) {
          ctx.fillText(l, x + 24 * unit, ty);
          ty += lh;
        }
      }
      if (arrow)
        ctx.drawImage(arrow, pad + colW + 12 * unit, cy + ch / 2 - 23 * unit, 46 * unit, 46 * unit);
    });
  } else if (layout === "editorial") {
    // Foto no alto (ou à esquerda no paisagem) e uma faixa de texto lisa.
    const split = portrait
      ? h * (input.size === "story" ? 0.46 : input.size === "quadrado" ? 0.46 : 0.5)
      : w * 0.48;
    const px = portrait ? 0 : 0;
    if (photo) {
      if (portrait) cover(photo, px, 0, w, split);
      else cover(photo, 0, 0, split, h);
    } else {
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.16;
      if (portrait) ctx.fillRect(0, 0, w, split);
      else ctx.fillRect(0, 0, split, h);
      ctx.globalAlpha = 0.18;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(
          (portrait ? w : split) * (0.2 + i * 0.3),
          (portrait ? split : h) * (i % 2 ? 0.3 : 0.7),
          Math.min(w, h) * (0.12 + i * 0.04),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (input.icon) {
        const cx = portrait ? w / 2 : split / 2;
        const cy = (portrait ? split : h) / 2 - 110 * unit;
        await drawIcon(cy, cx, 220, "center");
      }
    }
    const x = portrait ? pad : split + pad * 0.8;
    const width = portrait ? inner : w - x - pad;
    let y = portrait ? split + 64 * unit : top;
    if (input.icon && photo) {
      // Selo do ícone "pendurado" na divisa.
      const s = 112 * unit;
      await drawIcon(portrait ? split - s / 2 : top - 10 * unit, portrait ? w - pad - s : x, 112);
      if (!portrait) y += s + 30 * unit;
    }
    y = drawKicker(y, "left", x);
    const fit = fitTitle(ctx, title, width, 3, portrait ? 70 : 56, 40, unit);
    y = drawLines(fit.lines, fit.size, y, { x, lh: 1.2, width });
    if (body) drawBody(body, y + 22 * unit, "left", portrait ? 36 : 30, width, x);
    footColor = t.text;
    if (!portrait) footAlign = "left";
  } else if (layout === "pergunta") {
    let y = top - (portrait ? 0 : 20) * unit;
    y = await drawIcon(y - 20 * unit, pad, 104);
    y = drawKicker(y);
    const fit = fitTitle(ctx, title, inner, 4, portrait ? 90 : 64, 48, unit);
    y = drawLines(fit.lines, fit.size, y, { lh: 1.18 }) + 44 * unit;
    const options = listItems(body).slice(0, 4);
    const optH = (portrait ? 100 : 72) * unit;
    const step = Math.min(optH + 26 * unit, (bottomLimit - y) / Math.max(options.length, 1));
    options.forEach((opt, i) => {
      const oy = y + i * step;
      ctx.fillStyle = fullPhoto
        ? "rgba(255,255,255,0.16)"
        : lightTheme
          ? "rgba(255,255,255,0.75)"
          : "rgba(255,255,255,0.1)";
      roundRect(ctx, pad, oy, inner, step - 26 * unit, (step - 26 * unit) / 2);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3 * unit;
      ctx.stroke();
      const r = (step - 26 * unit) / 2 - 14 * unit;
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(pad + 14 * unit + r, oy + (step - 26 * unit) / 2, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = onAccent;
      ctx.font = `800 ${Math.round(r * 0.95)}px ${SANS}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        String.fromCharCode(65 + i),
        pad + 14 * unit + r,
        oy + (step - 26 * unit) / 2 + 1,
      );
      ctx.textAlign = "left";
      ctx.fillStyle = text;
      ctx.font = `600 ${Math.round((portrait ? 38 : 30) * unit)}px ${SANS}`;
      const [first] = wrap(ctx, opt, inner - r * 2 - 70 * unit, 1);
      ctx.fillText(first ?? "", pad + r * 2 + 44 * unit, oy + (step - 26 * unit) / 2 + 2);
      ctx.textBaseline = "top";
    });
  } else if (layout === "moldura") {
    const inset = pad * 0.45;
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 3 * unit;
    ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1.5 * unit;
    ctx.strokeRect(
      inset + 14 * unit,
      inset + 14 * unit,
      w - (inset + 14 * unit) * 2,
      h - (inset + 14 * unit) * 2,
    );
    ctx.globalAlpha = 1;
    const width = inner - 40 * unit;
    const fit = fitTitle(ctx, title, width, 5, portrait ? 88 : 72, 48, unit);
    ctx.font = `400 ${38 * unit}px ${SANS}`;
    const bodyLines = body ? wrap(ctx, body, width, 4).length : 0;
    const blockH =
      (input.icon ? 150 * unit : 0) +
      (kicker ? 78 * unit : 0) +
      fit.lines.length * fit.size * 1.22 * unit +
      70 * unit +
      bodyLines * 53 * unit;
    let y = Math.max(inset + 60 * unit, (h - footH - blockH) / 2 + 10 * unit);
    y = await drawIcon(y, w / 2, 110, "center");
    y = drawKicker(y, "center");
    y = drawLines(fit.lines, fit.size, y, { align: "center", width });
    // Ornamento: losango entre dois traços.
    const oy = y + 28 * unit;
    ctx.fillStyle = accent;
    ctx.fillRect(w / 2 - 90 * unit, oy, 64 * unit, 2 * unit);
    ctx.fillRect(w / 2 + 26 * unit, oy, 64 * unit, 2 * unit);
    ctx.save();
    ctx.translate(w / 2, oy + 1 * unit);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-9 * unit, -9 * unit, 18 * unit, 18 * unit);
    ctx.restore();
    if (body) drawBody(body, y + 70 * unit, "center", 38, width);
    footAlign = "center";
  } else {
    // Clássico.
    const fit = fitTitle(
      ctx,
      title,
      inner,
      portrait ? 5 : 3,
      portrait ? (input.size === "quadrado" ? 84 : 96) : 104,
      52,
      unit,
    );
    const bodySize = portrait ? 42 : 46;
    let y = top;
    if (!portrait) {
      // No paisagem o bloco fica centralizado na altura, sem sobrar um vazio embaixo.
      ctx.font = `400 ${Math.round(bodySize * unit)}px ${SANS}`;
      const bodyLines = body ? wrap(ctx, body, inner, 3).length : 0;
      const blockH =
        (input.icon ? 120 * unit : 0) +
        (kicker ? 78 * unit : 0) +
        fit.lines.length * fit.size * 1.22 * unit +
        (bodyLines ? 30 * unit + bodyLines * bodySize * 1.4 * unit : 0);
      y = Math.max(top * 0.7, (h - footH - blockH) / 2 + 10 * unit);
    }
    y = await drawIcon(y - 20 * unit, pad, portrait ? 112 : 84);
    y = drawKicker(y);
    y = drawLines(fit.lines, fit.size, y);
    if (body) drawBody(body, y + 30 * unit, "left", bodySize);
  }

  // ── Rodapé: marca, @ e página do carrossel ───────────────────────────────
  // Na moldura, o rodapé fica por dentro do quadro.
  const footY =
    h -
    footH +
    (portrait ? 20 : 10) * unit -
    (layout === "moldura" ? (portrait ? 30 : 46) * unit : 0);
  const fx =
    footAlign === "center"
      ? w / 2
      : layout === "editorial" && !portrait
        ? w * 0.48 + pad * 0.8
        : pad;
  ctx.textAlign = footAlign;
  if (layout !== "receita") {
    ctx.fillStyle = accent;
    ctx.fillRect(
      footAlign === "center" ? fx - 40 * unit : fx,
      footY - 28 * unit,
      80 * unit,
      6 * unit,
    );
  }
  ctx.fillStyle = layout === "receita" && !fullPhoto ? t.text : footColor;
  ctx.font = `700 ${Math.round(34 * unit)}px ${DISPLAY}`;
  ctx.fillText("NutriConnect", fx, footY);
  if (input.handle) {
    ctx.globalAlpha = 0.75;
    ctx.font = `400 ${Math.round(30 * unit)}px ${SANS}`;
    ctx.fillText(
      input.handle.startsWith("@") ? input.handle : `@${input.handle}`,
      fx,
      footY + 48 * unit,
    );
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = "left";
  if (input.page && input.page.total > 1) {
    const label = `${input.page.index}/${input.page.total}`;
    ctx.font = `700 ${Math.round(32 * unit)}px ${SANS}`;
    ctx.fillText(label, w - pad - ctx.measureText(label).width, footY);
    if (input.page.index < input.page.total) {
      ctx.font = `400 ${Math.round(30 * unit)}px ${SANS}`;
      const more = "arraste →";
      ctx.globalAlpha = 0.75;
      ctx.fillText(more, w - pad - ctx.measureText(more).width, footY + 48 * unit);
      ctx.globalAlpha = 1;
    }
  }
  return canvas;
}

export function downloadCanvas(canvas: HTMLCanvasElement, name: string) {
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `${name.replace(/[^\w-]+/g, "-").slice(0, 60) || "post"}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Comprime uma foto (JPEG, lado maior até `max`) e devolve a data URL. */
export function compressImage(file: File, max = 1400, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const r = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * r);
      c.height = Math.round(img.height * r);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem."));
    };
    img.src = url;
  });
}
