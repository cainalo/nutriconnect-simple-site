// Página de um programa da loja (N10): quem ainda não comprou vê a descrição e paga ali mesmo (Stripe
// embutido); quem comprou (e o profissional) vê os módulos e marca o que já fez.
import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Circle, Loader2, Lock, ShieldCheck } from "lucide-react";
import { useTr } from "@/components/settings-ui";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import {
  createProgramCheckout,
  programKeys,
  useHasProgram,
  useProgram,
  useProgramModules,
  useProgramProgress,
  useToggleModuleDone,
} from "@/lib/programs";
import { cardsByIds } from "@/lib/social/api";
import { cn } from "@/lib/utils";
import { EmojiIcon } from "@/components/emoji-icon";

export const Route = createFileRoute("/programas/$programId")({
  validateSearch: (search: Record<string, unknown>): { compra?: string } => ({
    compra: typeof search.compra === "string" ? search.compra : undefined,
  }),
  component: ProgramPage,
});

const card = "rounded-3xl border border-border/70 bg-card p-5 shadow-xs";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50";

type StripeModules = {
  stripePromise: Promise<import("@stripe/stripe-js").Stripe | null>;
  Provider: typeof import("@stripe/react-stripe-js").EmbeddedCheckoutProvider;
  Checkout: typeof import("@stripe/react-stripe-js").EmbeddedCheckout;
};

function ProgramPage() {
  const { programId } = Route.useParams();
  const { compra } = Route.useSearch();
  const tr = useTr();
  const { locale } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const program = useProgram(programId);
  const has = useHasProgram(programId, user?.id);
  const p = program.data;
  const isOwner = !!p && p.professional_id === user?.id;
  const unlocked = isOwner || !!has.data;
  const pro = useQuery({
    queryKey: ["program-pros", p?.professional_id ?? ""],
    enabled: !!p,
    queryFn: () => cardsByIds([p!.professional_id]),
  });
  const proCard = p ? pro.data?.get(p.professional_id) : undefined;

  // Voltou do pagamento: o webhook do Stripe libera o acesso em alguns segundos.
  const waiting = compra === "sucesso" && !unlocked;
  useEffect(() => {
    if (!waiting) return;
    const t = window.setInterval(
      () => void qc.invalidateQueries({ queryKey: programKeys.one(programId) }),
      3000,
    );
    return () => window.clearInterval(t);
  }, [waiting, programId, qc]);

  if (program.isLoading) {
    return <Loader2 className="mx-auto mt-24 h-6 w-6 animate-spin text-muted-foreground" />;
  }
  if (!p) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-muted-foreground">
        {tr([
          "Programa não encontrado.",
          "Program not found.",
          "Programa no encontrado.",
          "Programme introuvable.",
        ])}
        <div>
          <Link to="/programas" className={cn(btnPrimary, "mt-4")}>
            {tr(["Ver a loja", "See the store", "Ver la tienda", "Voir la boutique"])}
          </Link>
        </div>
      </div>
    );
  }

  const price = new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(
    p.price_cents / 100,
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <Link
        to="/programas"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {tr(["Programas", "Programs", "Programas", "Programmes"])}
      </Link>

      <header className={card}>
        <span className="grid h-16 w-16 place-items-center rounded-3xl bg-accent-soft">
          <EmojiIcon emoji={p.emoji} tinted className="h-9 w-9" />
        </span>
        <h1 className="mt-3 text-2xl font-extrabold font-display text-foreground">{p.title}</h1>
        {proCard && (
          <Link
            to="/profissionais/$professionalId"
            params={{ professionalId: p.professional_id }}
            className="mt-1 inline-block text-sm font-semibold text-accent hover:underline"
          >
            {proCard.name}
          </Link>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {p.duration_weeks} {tr(["semanas", "weeks", "semanas", "semaines"])} · {price}
        </p>
        {p.summary && <p className="mt-3 text-sm font-medium text-foreground">{p.summary}</p>}
        {p.description && (
          <p className="mt-2 whitespace-pre-line text-sm text-foreground/85">{p.description}</p>
        )}
      </header>

      {waiting ? (
        <div className={cn(card, "mt-6 text-center")}>
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
          <p className="mt-2 text-sm text-foreground">
            {tr([
              "Pagamento recebido! Liberando o seu acesso…",
              "Payment received! Unlocking your access…",
              "¡Pago recibido! Liberando tu acceso…",
              "Paiement reçu ! Ouverture de votre accès…",
            ])}
          </p>
        </div>
      ) : unlocked ? (
        <Modules programId={p.id} canMark={!!has.data} />
      ) : (
        <Buy programId={p.id} price={price} />
      )}
    </div>
  );
}

function Buy({ programId, price }: { programId: string; price: string }) {
  const tr = useTr();
  const [open, setOpen] = useState(false);
  const [stripe, setStripe] = useState<StripeModules | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        const [{ clientSecret: secret, publishableKey }, js, react] = await Promise.all([
          createProgramCheckout(programId),
          import("@stripe/stripe-js"),
          import("@stripe/react-stripe-js"),
        ]);
        if (cancelled) return;
        setStripe({
          stripePromise: js.loadStripe(publishableKey),
          Provider: react.EmbeddedCheckoutProvider,
          Checkout: react.EmbeddedCheckout,
        });
        setClientSecret(secret);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, programId]);

  if (!open) {
    return (
      <div className={cn(card, "mt-6 flex flex-wrap items-center justify-between gap-4")}>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" />
          {tr([
            "Os módulos abrem depois da compra.",
            "Modules unlock after purchase.",
            "Los módulos se abren tras la compra.",
            "Les modules s'ouvrent après l'achat.",
          ])}
        </p>
        <button type="button" className={btnPrimary} onClick={() => setOpen(true)}>
          {tr(["Comprar por", "Buy for", "Comprar por", "Acheter pour"])} {price}
        </button>
      </div>
    );
  }
  return (
    <div className={cn(card, "mt-6")}>
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-accent" />
        {tr(["Pagamento seguro", "Secure payment", "Pago seguro", "Paiement sécurisé"])}
      </p>
      {error ? (
        <p className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>
      ) : stripe && clientSecret ? (
        <stripe.Provider
          stripe={stripe.stripePromise}
          options={{ fetchClientSecret: () => Promise.resolve(clientSecret) }}
        >
          <stripe.Checkout />
        </stripe.Provider>
      ) : (
        <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}

function Modules({ programId, canMark }: { programId: string; canMark: boolean }) {
  const tr = useTr();
  const { user } = useAuth();
  const modules = useProgramModules(programId);
  const list = modules.data ?? [];
  const progress = useProgramProgress(canMark ? list.map((m) => m.id) : []);
  const toggle = useToggleModuleDone(user?.id);
  const done = progress.data ?? new Set<string>();
  const [openId, setOpenId] = useState<string | null>(null);
  const pct = list.length ? Math.round((done.size / list.length) * 100) : 0;

  return (
    <section className="mt-6">
      {canMark && list.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {tr(["Seu progresso", "Your progress", "Tu progreso", "Votre progression"])}
            </span>
            <span className="font-semibold text-foreground">
              {done.size}/{list.length}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
      {modules.isLoading ? (
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <ol className="space-y-2">
          {list.map((m, i) => {
            const isDone = done.has(m.id);
            const isOpen = openId === m.id;
            return (
              <li key={m.id} className={card}>
                <div className="flex items-center gap-3">
                  {canMark ? (
                    <button
                      type="button"
                      aria-pressed={isDone}
                      onClick={() => toggle.mutate({ moduleId: m.id, done: !isDone })}
                      aria-label={tr([
                        "Marcar como feito",
                        "Mark as done",
                        "Marcar como hecho",
                        "Marquer comme fait",
                      ])}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-6 w-6 text-accent" />
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground/50" />
                      )}
                    </button>
                  ) : (
                    <span className="w-6 text-center text-xs font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : m.id)}
                    aria-expanded={isOpen}
                    className="min-w-0 flex-1 text-left text-sm font-semibold text-foreground"
                  >
                    {m.title}
                  </button>
                </div>
                {isOpen && (
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/85">
                    {m.body}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
