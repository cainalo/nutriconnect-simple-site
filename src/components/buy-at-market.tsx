// Botão "Comprar" (R1): abre os mercados parceiros e cada item vira uma busca no parceiro escolhido.
// Some quando não há parceiros (ou o banco ainda não tem a tabela).
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, ShoppingCart } from "lucide-react";
import { useTr } from "@/components/settings-ui";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { openMarket, useMarketPartners, type MarketSource } from "@/lib/markets";
import { cn } from "@/lib/utils";

export function BuyAtMarket({
  items,
  source,
  className,
}: {
  items: string[];
  source: MarketSource;
  className?: string;
}) {
  const tr = useTr();
  const partners = useMarketPartners();
  const [open, setOpen] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const list = partners.data ?? [];
  const clean = [...new Set(items.map((i) => i.trim()).filter(Boolean))];
  if (!list.length || !clean.length) return null;
  const chosen = list.find((p) => p.id === partnerId) ?? list[0];

  const go = (item: string) =>
    openMarket(chosen.id, source, item).catch((err) => toast.error((err as Error).message));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary",
          className,
        )}
      >
        <ShoppingCart className="h-3.5 w-3.5 text-accent" />
        {tr(["Comprar", "Buy", "Comprar", "Acheter"])}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
          <DialogTitle>
            {tr([
              "Comprar nos parceiros",
              "Buy from partners",
              "Comprar en socios",
              "Acheter chez nos partenaires",
            ])}
          </DialogTitle>
          <DialogDescription>
            {tr([
              "Escolha onde comprar e toque em cada item para ver os produtos. São links de parceiros: o NutriConnect pode receber uma comissão, sem custo extra para você.",
              "Pick where to buy and tap each item to see products. These are partner links: NutriConnect may earn a commission at no extra cost to you.",
              "Elige dónde comprar y toca cada ítem para ver productos. Son enlaces de socios: NutriConnect puede recibir una comisión, sin costo extra para ti.",
              "Choisissez où acheter et touchez chaque article. Ce sont des liens partenaires : NutriConnect peut recevoir une commission, sans surcoût pour vous.",
            ])}
          </DialogDescription>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup">
            {list.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={p.id === chosen.id}
                onClick={() => setPartnerId(p.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                  p.id === chosen.id
                    ? "border-accent bg-accent-soft text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <span aria-hidden>{p.emoji}</span>
                {p.name}
              </button>
            ))}
          </div>
          <ul className="mt-3 divide-y divide-border/60">
            {clean.slice(0, 60).map((item) => (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => void go(item)}
                  className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm text-foreground hover:text-accent"
                >
                  <span className="min-w-0 truncate">{item}</span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
