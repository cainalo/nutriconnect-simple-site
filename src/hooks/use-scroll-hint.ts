// Faixas que rolam de lado (abas, sugestões): marca data-more="left|right|both" enquanto há itens
// escondidos, e o CSS (styles.css, [data-more]) esmaece a borda desse lado. Sem rolagem, nada muda.
import { useEffect, useRef } from "react";

export function useScrollHint<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const left = el.scrollLeft > 2;
      const right = max - el.scrollLeft > 2;
      const v = left && right ? "both" : left ? "left" : right ? "right" : "";
      if (v) el.dataset.more = v;
      else delete el.dataset.more;
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);
  return ref;
}
