// Casca das telas internas: a página tem a altura da tela (não rola) e o conteúdo rola por dentro,
// abaixo do cabeçalho. O feed e o Explorar não usam esta casca (continuam rolando a janela).
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { DesignPageHead } from "@/components/design-page-head";
import { SiteHeader } from "@/components/site-chrome";
import { useAuth } from "@/hooks/use-auth";
import { useHouseholdRealtime, useMyHousehold } from "@/lib/household";
import { cn } from "@/lib/utils";

/**
 * Tela interna com a altura da tela.
 * - `scroll` (padrão): a área de conteúdo inteira rola por dentro.
 * - `scroll={false}`: a página divide a altura entre as próprias colunas (cada uma rola sozinha),
 *   como no painel da administração.
 */
export function AppScreen({
  children,
  className,
  mainClassName,
  scroll = true,
  header,
}: {
  children: ReactNode;
  className?: string;
  mainClassName?: string;
  scroll?: boolean;
  /** Cabeçalho próprio (padrão: o do site). */
  header?: ReactNode;
}) {
  return (
    <div
      className={cn("flex h-dvh flex-col overflow-hidden bg-background text-foreground", className)}
    >
      {header ?? <SiteHeader />}
      <HouseholdLive />
      <main
        data-app-main={scroll ? "" : undefined}
        data-no-bottom-pad
        className={cn(
          "min-h-0 w-full flex-1",
          scroll
            ? "overflow-y-auto overscroll-contain pb-28 lg:pb-10"
            : "flex flex-col overflow-hidden pb-24 lg:pb-0",
          mainClassName,
        )}
      >
        {scroll && <DesignPageHead />}
        {children}
      </main>
    </div>
  );
}

/**
 * Coluna de cards que não rola: mostra, na ordem, só os cards que cabem inteiros na altura
 * disponível (os demais ficam escondidos até sobrar espaço, por exemplo numa tela mais alta).
 */
export function FitColumn({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Esconde com visibility (sem mudar o layout): assim medir não dispara outra medição.
    const fit = () => {
      let full = false;
      for (const c of Array.from(el.children) as HTMLElement[]) {
        if (!full && c.offsetTop + c.offsetHeight > el.clientHeight) full = true;
        c.style.visibility = full ? "hidden" : "";
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    return () => ro.disconnect();
  }, [children]);
  return (
    <div ref={ref} className={cn("relative h-full overflow-hidden", className)}>
      {children}
    </div>
  );
}

/** Tempo real da casa (lista de compras, geladeira, cardápio e moradores) nas telas internas. */
function HouseholdLive() {
  const { user } = useAuth();
  const house = useMyHousehold(user?.id);
  useHouseholdRealtime(house.data?.house.id);
  return null;
}
