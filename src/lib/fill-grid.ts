// Grade sem buracos (página Funções): simula o encaixe automático da grade CSS (grid-auto-flow:
// dense) para o número de colunas atual e alarga tiles até não sobrar célula vazia no fim de
// nenhuma linha. Assim cada seção fecha simétrica em qualquer largura de tela.
import { useEffect, useState, type RefObject } from "react";

export interface Span {
  w: number;
  h: number;
}

interface Placed extends Span {
  r: number;
  c: number;
}

/** Posições que o navegador daria aos itens, em ordem, com encaixe denso. */
function place(spans: Span[], cols: number): Placed[] {
  const taken: boolean[][] = [];
  const free = (r: number, c: number) => !taken[r]?.[c];
  const out: Placed[] = [];
  for (const s of spans) {
    const w = Math.min(s.w, cols);
    const h = s.h;
    let done = false;
    for (let r = 0; !done; r++) {
      for (let c = 0; c + w <= cols && !done; c++) {
        let fits = true;
        for (let y = r; y < r + h && fits; y++)
          for (let x = c; x < c + w && fits; x++) fits = free(y, x);
        if (!fits) continue;
        for (let y = r; y < r + h; y++) {
          taken[y] ??= [];
          for (let x = c; x < c + w; x++) taken[y][x] = true;
        }
        out.push({ r, c, w, h });
        done = true;
      }
    }
  }
  return out;
}

/** Tamanhos finais: alarga para a direita (ou para baixo) o vizinho de cada célula vazia. */
export function fillSpans(spans: Span[], cols: number): Span[] {
  if (cols < 2 || spans.length === 0) return spans.map((s) => ({ w: Math.min(s.w, cols), h: s.h }));
  const items = place(spans, cols);
  const rows = Math.max(...items.map((i) => i.r + i.h));
  const at = (r: number, c: number) =>
    items.find((i) => r >= i.r && r < i.r + i.h && c >= i.c && c < i.c + i.w);
  for (let guard = 0; guard < cols * rows; guard++) {
    let changed = false;
    for (let r = 0; r < rows && !changed; r++) {
      for (let c = 0; c < cols && !changed; c++) {
        if (at(r, c)) continue;
        // Vizinho da esquerda que ocupa exatamente as mesmas linhas vazias à direita dele.
        const left = c > 0 ? at(r, c - 1) : undefined;
        if (left && left.c + left.w === c) {
          let clear = true;
          for (let y = left.r; y < left.r + left.h && clear; y++) clear = !at(y, c);
          if (clear) {
            left.w += 1;
            changed = true;
            continue;
          }
        }
        // Senão, o vizinho de cima desce uma linha (se cobre só esta coluna livre).
        const up = r > 0 ? at(r - 1, c) : undefined;
        if (up && up.r + up.h === r) {
          let clear = true;
          for (let x = up.c; x < up.c + up.w && clear; x++) clear = !at(r, x);
          if (clear) {
            up.h += 1;
            changed = true;
          }
        }
      }
    }
    if (!changed) break;
  }
  return items.map(({ w, h }) => ({ w, h }));
}

/** Número de colunas que a grade tem agora (acompanha mudanças de largura). */
export function useGridColumns(ref: RefObject<HTMLElement | null>): number {
  const [cols, setCols] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () =>
      setCols(getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return cols;
}
