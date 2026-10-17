// Botão "voltar ao topo" para as páginas longas (Feira, Trilha, feed…). Montado uma vez na raiz:
// ouve a rolagem de qualquer área (a janela ou a área principal das telas internas) e aparece
// depois de umas duas telas roladas, acima da barra de baixo do celular.
import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useTr } from "@/components/settings-ui";

const SHOW_AFTER = 1400;

export function BackToTop() {
  const tr = useTr();
  const [show, setShow] = useState(false);
  const target = useRef<Element | Window | null>(null);

  useEffect(() => {
    const onScroll = (e: Event) => {
      const el = e.target;
      const isDoc = el === document || el === document.documentElement || el === document.body;
      if (!isDoc && !(el instanceof Element && el.hasAttribute("data-app-main"))) return;
      const top = isDoc ? window.scrollY : (el as Element).scrollTop;
      target.current = isDoc ? window : (el as Element);
      setShow(top > SHOW_AFTER);
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", onScroll, { capture: true });
  }, []);

  if (!show) return null;
  const label = tr(["Voltar ao topo", "Back to top", "Volver arriba", "Revenir en haut"]);
  return (
    <button
      type="button"
      onClick={() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        target.current?.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      }}
      aria-label={label}
      title={label}
      className="nc-pop fixed bottom-24 right-4 z-40 grid h-12 w-12 place-items-center rounded-full border border-border bg-card text-primary shadow-card transition hover:-translate-y-0.5 hover:bg-secondary lg:bottom-8 lg:right-8"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
