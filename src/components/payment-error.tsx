// Erro ao abrir o pagamento (Stripe ou função do servidor): mensagem traduzida, o que fazer e
// "Tentar de novo". O texto técnico fica recolhido em "Detalhes", para quem for pedir ajuda.
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useTr } from "@/components/settings-ui";
import { COMPANY } from "@/lib/legal";

export function PaymentError({ detail, onRetry }: { detail: string; onRetry?: () => void }) {
  const tr = useTr();
  return (
    <div
      role="alert"
      className="space-y-3 rounded-xl bg-destructive/10 p-4 text-sm text-foreground"
    >
      <p className="flex items-start gap-2 font-semibold text-destructive">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        {tr([
          "Não conseguimos abrir o pagamento agora.",
          "We couldn't open the payment right now.",
          "No pudimos abrir el pago ahora.",
          "Impossible d'ouvrir le paiement pour le moment.",
        ])}
      </p>
      <p className="text-muted-foreground">
        {tr([
          `Nada foi cobrado. Tente de novo em instantes; se continuar, escreva para ${COMPANY.supportEmail}.`,
          `Nothing was charged. Try again in a moment; if it keeps happening, write to ${COMPANY.supportEmail}.`,
          `No se cobró nada. Inténtalo de nuevo en un momento; si continúa, escribe a ${COMPANY.supportEmail}.`,
          `Rien n'a été débité. Réessayez dans un instant ; si cela continue, écrivez à ${COMPANY.supportEmail}.`,
        ])}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onRetry ?? (() => window.location.reload())}
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          {tr(["Tentar de novo", "Try again", "Intentar de nuevo", "Réessayer"])}
        </button>
        {detail && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">
              {tr(["Detalhes", "Details", "Detalles", "Détails"])}
            </summary>
            <p className="mt-1 break-words">{detail}</p>
          </details>
        )}
      </div>
    </div>
  );
}
