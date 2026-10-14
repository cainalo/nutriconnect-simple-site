// Arte dos posts do estúdio (S1): desenha no navegador (canvas) a capa ou cada slide de um
// carrossel com as cores do NutriConnect e baixa em PNG. Nada é enviado a servidor.
export type ArtSize = "feed" | "quadrado" | "story";
export type ArtTheme = "oliva" | "terracota" | "creme" | "noite";

export const ART_SIZES: Record<ArtSize, { w: number; h: number; label: string }> = {
  feed: { w: 1080, h: 1350, label: "Feed 4:5 (1080×1350)" },
  quadrado: { w: 1080, h: 1080, label: "Quadrado (1080×1080)" },
  story: { w: 1080, h: 1920, label: "Story/Reels (1080×1920)" },
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
};

export interface ArtInput {
  size: ArtSize;
  theme: ArtTheme;
  kicker?: string; // linha pequena acima do título (ex.: "MITO OU VERDADE?")
  title: string;
  body?: string;
  handle?: string;
  page?: { index: number; total: number };
  emoji?: string;
}

const DISPLAY = '"Libre Baskerville", Georgia, serif';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Quebra o texto em linhas que cabem na largura (corta com reticências após `maxLines`). */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= width) line = test;
    else {
      if (line) lines.push(line);
      line = w;
    }
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > width && last.length) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

/** Desenha a arte e devolve o canvas. */
export async function drawArt(input: ArtInput): Promise<HTMLCanvasElement> {
  // Garante que a fonte da marca esteja carregada antes de desenhar.
  try {
    await document.fonts.load(`700 64px ${DISPLAY}`);
  } catch {
    /* usa a fonte reserva */
  }
  const { w, h } = ART_SIZES[input.size];
  const t = ART_THEMES[input.theme];
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Fundo com degradê e formas orgânicas.
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, t.bg);
  g.addColorStop(1, t.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = t.accent;
  ctx.beginPath();
  ctx.arc(w * 0.92, h * 0.08, w * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w * 0.05, h * 0.95, w * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const pad = 96;
  const inner = w - pad * 2;
  let y = input.size === "story" ? 360 : 200;

  if (input.emoji) {
    ctx.font = `120px ${SANS}`;
    ctx.textBaseline = "top";
    ctx.fillText(input.emoji, pad, y - 40);
    y += 150;
  }
  if (input.kicker) {
    ctx.fillStyle = t.accent;
    ctx.font = `700 34px ${SANS}`;
    ctx.textBaseline = "top";
    ctx.fillText(input.kicker.toUpperCase().slice(0, 40), pad, y);
    y += 70;
  }

  // Título: diminui a fonte até caber em 5 linhas.
  ctx.fillStyle = t.text;
  ctx.textBaseline = "top";
  let size = input.size === "quadrado" ? 84 : 96;
  let lines: string[] = [];
  for (; size >= 52; size -= 6) {
    ctx.font = `700 ${size}px ${DISPLAY}`;
    lines = wrap(ctx, input.title, inner, 5);
    if (lines.length < 5 || size <= 52) break;
  }
  for (const l of lines) {
    ctx.fillText(l, pad, y);
    y += size * 1.22;
  }

  if (input.body) {
    y += 30;
    ctx.globalAlpha = 0.9;
    ctx.font = `400 ${input.size === "quadrado" ? 38 : 42}px ${SANS}`;
    const maxLines = input.size === "story" ? 12 : input.size === "feed" ? 8 : 5;
    for (const l of wrap(ctx, input.body, inner, maxLines)) {
      ctx.fillText(l, pad, y);
      y += 58;
    }
    ctx.globalAlpha = 1;
  }

  // Rodapé: marca, @ e página do carrossel.
  const footY = h - (input.size === "story" ? 260 : 130);
  ctx.fillStyle = t.accent;
  ctx.fillRect(pad, footY - 28, 80, 6);
  ctx.fillStyle = t.text;
  ctx.font = `700 34px ${DISPLAY}`;
  ctx.fillText("NutriConnect", pad, footY);
  if (input.handle) {
    ctx.globalAlpha = 0.75;
    ctx.font = `400 30px ${SANS}`;
    ctx.fillText(input.handle.startsWith("@") ? input.handle : `@${input.handle}`, pad, footY + 48);
    ctx.globalAlpha = 1;
  }
  if (input.page && input.page.total > 1) {
    const label = `${input.page.index}/${input.page.total}`;
    ctx.font = `700 32px ${SANS}`;
    const lw = ctx.measureText(label).width;
    ctx.fillText(label, w - pad - lw, footY);
    if (input.page.index < input.page.total) {
      ctx.font = `400 30px ${SANS}`;
      const more = "arraste →";
      ctx.globalAlpha = 0.75;
      ctx.fillText(more, w - pad - ctx.measureText(more).width, footY + 48);
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
