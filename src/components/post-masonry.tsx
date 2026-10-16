// Posts em colunas independentes (até três): cada coluna é uma pilha sem espaços entre os posts, e
// cada post novo vai para a coluna mais curta no momento (as colunas são medidas separadamente).
// A ordem dentro de cada coluna segue a ordem do feed (relevância). No celular há uma coluna só.
import { useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

export interface MasonryItem {
  id: string;
  node: ReactNode;
}

function columnsFor(width: number) {
  if (width >= 1100) return 3;
  if (width >= 768) return 2;
  return 1;
}

function useColumnCount(): number {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("resize", cb);
      return () => window.removeEventListener("resize", cb);
    },
    () => columnsFor(window.innerWidth),
    () => 1,
  );
}

/** Altura estimada de um post ainda não medido, para repartir vários de uma vez. */
const ESTIMATE = 520;

export function PostMasonry({ items, gap = 24 }: { items: MasonryItem[]; gap?: number }) {
  const cols = useColumnCount();
  const [assign, setAssign] = useState<Record<string, number>>({});
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastCols = useRef(cols);

  useLayoutEffect(() => {
    // Mudou o número de colunas: reparte tudo de novo.
    const reset = lastCols.current !== cols;
    lastCols.current = cols;
    setAssign((prev) => {
      const base = reset ? {} : prev;
      const virtual = Array.from({ length: cols }, (_, c) => {
        const el = colRefs.current[c];
        return reset ? 0 : (el?.offsetHeight ?? 0);
      });
      let next: Record<string, number> | null = null;
      for (const it of items) {
        const cur = base[it.id];
        if (cur !== undefined && cur < cols) continue;
        let best = 0;
        for (let c = 1; c < cols; c++) if (virtual[c] < virtual[best]) best = c;
        virtual[best] += ESTIMATE;
        next ??= { ...base };
        next[it.id] = best;
      }
      return next ?? (reset ? {} : prev);
    });
  }, [items, cols]);

  return (
    <div
      className="grid items-start"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, columnGap: gap }}
    >
      {Array.from({ length: cols }, (_, c) => (
        <div
          key={c}
          ref={(el) => {
            colRefs.current[c] = el;
          }}
          className="flex min-w-0 flex-col"
          style={{ gap }}
        >
          {items
            .filter((it) => assign[it.id] === c)
            .map((it) => (
              <div key={it.id} className="min-w-0">
                {it.node}
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
