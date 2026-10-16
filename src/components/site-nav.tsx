// Peças de navegação compartilhadas pelos cabeçalhos de cada design do site (site-chrome.tsx e
// site-chrome-designs.tsx): rolagem que recolhe as barras, cores por página e estado "ativo".
import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useIsDark } from "@/lib/post-type";
import { appScroller, onPageScroll, scrollTop } from "@/lib/app-scroll";

/** Páginas que rolam por dentro (ex.: Espaço de hoje) avisam por aqui quando as barras devem recolher. */
export const CHROME_HIDE_EVENT = "chrome:hide";

const SCROLL_STEP = 8;

/**
 * true quando o usuário rola para baixo (recolher); false ao rolar para cima ou perto do topo.
 * Reinicia a cada troca de página.
 */
export function useHideOnScroll(pathname: string) {
  const [hidden, setHidden] = useState(false);
  // Pedido de uma página cuja rolagem não é a da janela.
  const [external, setExternal] = useState(false);

  useEffect(() => {
    setExternal(false);
    const onExternal = (e: Event) => setExternal(!!(e as CustomEvent<boolean>).detail);
    window.addEventListener(CHROME_HIDE_EVENT, onExternal);
    return () => window.removeEventListener(CHROME_HIDE_EVENT, onExternal);
  }, [pathname]);

  useEffect(() => {
    setHidden(false);
    let lastY = scrollTop();
    let frame = 0;
    const update = () => {
      frame = 0;
      // Nas telas internas o cabeçalho ocupa espaço próprio (não cobre o conteúdo): esconder só
      // deixaria um vão no topo. Ele some ao rolar só onde a janela rola (feed, páginas públicas).
      if (appScroller()) return setHidden(false);
      const y = scrollTop();
      const delta = y - lastY;
      if (y < 64) setHidden(false);
      else if (delta > SCROLL_STEP) setHidden(true);
      else if (delta < -SCROLL_STEP) setHidden(false);
      if (Math.abs(delta) > SCROLL_STEP) lastY = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    // Janela (feed) ou área de conteúdo (telas internas).
    const stop = onPageScroll(onScroll);
    return () => {
      stop();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return hidden || external;
}

/**
 * Cada página tem a sua cor: o ícone da página em que a pessoa está fica colorido (e ganha um fundo
 * suave), os outros ficam discretos. Vale para a barra de cima, a de baixo (celular) e o desktop.
 */
export const NAV_COLORS = {
  espaco: ["#d9692a", "#f08a4b"],
  comunidades: ["#3b7bbf", "#6aa6e6"],
  desafios: ["#c58a12", "#e8b13b"],
  nina: ["#8a5fb0", "#b48ad6"],
  explorar: ["#0f9aa8", "#4fc3cf"],
  notificacoes: ["#d6456b", "#ef7a98"],
  tema: ["#4f8a4b", "#78b873"],
  funcoes: ["#2f7d6d", "#5fbfa9"],
  perfil: ["#5b6fd6", "#8f9df0"],
} as const;
export type NavKey = keyof typeof NAV_COLORS;

export type NavPath =
  | "/espaco"
  | "/comunidades"
  | "/desafios"
  | "/nina"
  | "/explorar"
  | "/notificacoes"
  | "/tema-da-semana"
  | "/funcoes";

/** Páginas que se abrem pela página Funções: a aba Funções fica acesa nelas também. */
export const FUNCOES_AREA = [
  "/desafios",
  "/tema-da-semana",
  "/geladeira",
  "/cardapio",
  "/feira",
  "/lancheira",
];

export function useNavState(navKey: NavKey, base: string, also: string[] = []) {
  const dark = useIsDark();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const color = NAV_COLORS[navKey][dark ? 1 : 0];
  const active = [base, ...also].some((p) => pathname === p || pathname.startsWith(`${p}/`));
  return { color, active, tint: `color-mix(in srgb, ${color} 15%, transparent)` };
}
