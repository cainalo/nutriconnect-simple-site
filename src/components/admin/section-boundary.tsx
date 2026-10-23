// Barreira de erro por seção do console: se uma seção quebra (ex.: faltou um campo nos dados),
// só ela mostra o aviso; o menu e as outras seções continuam funcionando.
import { Component, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, LayoutDashboard, RotateCcw } from "lucide-react";
import { useTr } from "@/components/settings-ui";
import { btnCls, btnPrimary } from "@/components/admin/admin-ui";

interface BoundaryProps {
  children: ReactNode;
  fallback: (error: Error, reset: () => void) => ReactNode;
}

class Boundary extends Component<BoundaryProps, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[admin] erro numa seção:", error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) return this.props.fallback(this.state.error, this.reset);
    return this.props.children;
  }
}

function SectionCrash({
  error,
  onRetry,
  onHome,
}: {
  error: Error;
  onRetry: () => void;
  onHome?: () => void;
}) {
  const tr = useTr();
  const qc = useQueryClient();
  // Recarrega os dados do painel antes de tentar desenhar a seção de novo.
  const retry = () => void qc.invalidateQueries({ queryKey: ["admin"] }).finally(onRetry);
  return (
    <section
      role="alert"
      className="rounded-3xl border border-destructive/40 bg-destructive/5 p-5 text-sm text-foreground"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold">
            {tr([
              "Esta seção teve um problema",
              "This section ran into a problem",
              "Esta sección tuvo un problema",
              "Cette section a rencontré un problème",
            ])}
          </h2>
          <p className="mt-1 text-muted-foreground">
            {tr([
              "O resto do painel continua funcionando. Tente de novo ou abra outra seção no menu.",
              "The rest of the dashboard still works. Try again or open another section from the menu.",
              "El resto del panel sigue funcionando. Inténtalo de nuevo o abre otra sección del menú.",
              "Le reste du tableau de bord fonctionne. Réessayez ou ouvrez une autre section du menu.",
            ])}
          </p>
          <p className="mt-2 break-words font-mono text-[11px] text-muted-foreground">
            {error.message}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={retry} className={btnPrimary}>
              <RotateCcw className="h-3.5 w-3.5" />
              {tr(["Tentar de novo", "Try again", "Intentar de nuevo", "Réessayer"])}
            </button>
            {onHome && (
              <button type="button" onClick={onHome} className={btnCls}>
                <LayoutDashboard className="h-3.5 w-3.5" />
                {tr([
                  "Ir para a visão geral",
                  "Go to overview",
                  "Ir a la visión general",
                  "Aller à la vue d'ensemble",
                ])}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Envolve uma seção; use `key` com o id da seção para limpar o erro ao trocar de seção. */
export function SectionBoundary({
  children,
  onHome,
}: {
  children: ReactNode;
  onHome?: () => void;
}) {
  return (
    <Boundary
      fallback={(error, reset) => <SectionCrash error={error} onRetry={reset} onHome={onHome} />}
    >
      {children}
    </Boundary>
  );
}
