// Rolagem infinita: um marcador invisível no fim da lista pede a próxima leva quando a pessoa chega
// perto (antes de alcançar o fim). O observador é refeito a cada leva: se o fim continuar à vista,
// pede outra. Funciona com páginas que rolam por dentro (FeedShell, AppScreen).

import { useEffect, useRef } from "react";

/** Contêiner que rola a lista (cada página do FeedShell rola por dentro). */
export function scrollParent(el: HTMLElement | null): HTMLElement | null {
  for (let node = el?.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
  }
  return null;
}

export function LoadMoreTrigger({
  onReach,
  pageCount,
}: {
  onReach: () => void;
  /** Muda a cada leva carregada (refaz o observador). */
  pageCount: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onReachRef = useRef(onReach);
  useEffect(() => {
    onReachRef.current = onReach;
  }, [onReach]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onReachRef.current();
      },
      { root: scrollParent(el), rootMargin: "0px 0px 1200px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [pageCount]);
  return <div ref={ref} className="h-px" aria-hidden="true" />;
}
