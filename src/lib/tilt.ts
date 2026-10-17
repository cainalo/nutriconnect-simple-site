// Inclinação dos cards clicáveis na direção do mouse, como os cards de Funções, no site inteiro.
// Um único ouvinte no documento: vale para links e botões com fundo de card (e para [data-tilt])
// grandes o bastante para parecerem um card. Só com mouse; respeita "reduzir movimento".
const TARGET = 'a[class*="bg-card"], button[class*="bg-card"], [data-tilt]';

function reduced() {
  return (
    document.documentElement.dataset.motion === "reduce" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function installTilt(): () => void {
  let current: HTMLElement | null = null;
  const release = () => {
    if (!current) return;
    current.removeAttribute("data-tilting");
    current.style.removeProperty("--rx");
    current.style.removeProperty("--ry");
    current = null;
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const el = (e.target as Element | null)?.closest<HTMLElement>(TARGET) ?? null;
    if (el !== current) release();
    if (!el || reduced() || el.closest(".nc-tile, .post-card")) return;
    const r = el.getBoundingClientRect();
    if (r.width < 140 || r.height < 64) return;
    current = el;
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.setAttribute("data-tilting", "");
    el.style.setProperty("--rx", `${(-y * 6).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * 8).toFixed(2)}deg`);
  };
  document.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerleave", release);
  window.addEventListener("blur", release);
  return () => {
    release();
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerleave", release);
    window.removeEventListener("blur", release);
  };
}
