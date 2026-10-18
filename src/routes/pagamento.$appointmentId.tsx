import { useEffect, useRef, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, CheckCircle2, Clock, Lock, MapPin, Video } from "lucide-react";
import { AuthGateLoading, SiteHeader } from "@/components/site-chrome";
import { SiteFooter } from "@/components/site-footer";
import { Avatar, Loading } from "@/components/clinical/ui";
import { useRequireAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { usePeople } from "@/lib/clinical/queries";
import { createCheckoutSession } from "@/lib/clinical/payments";
import { useClinicalI18n } from "@/lib/clinical/i18n";
import { formatDate, formatMoney, formatTime } from "@/lib/clinical/format";
import { useTr } from "@/components/settings-ui";

export const Route = createFileRoute("/pagamento/$appointmentId")({
  head: () => ({ meta: [{ title: "Pagamento da consulta — NutriConnect" }] }),
  component: PagamentoPage,
});

type StripeModules = {
  stripePromise: Promise<import("@stripe/stripe-js").Stripe | null>;
  Provider: typeof import("@stripe/react-stripe-js").EmbeddedCheckoutProvider;
  Checkout: typeof import("@stripe/react-stripe-js").EmbeddedCheckout;
};

/** Minutos e segundos que faltam até a reserva do horário vencer. */
function useCountdown(until: string | null | undefined) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!until) return;
    const tick = () =>
      setLeft(Math.max(0, Math.floor((new Date(until).getTime() - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [until]);
  return left;
}

const MIN_SCALE = 0.88;

/**
 * No desktop a página não rola: se o formulário do Stripe for mais alto que o espaço disponível
 * (telas baixas), ele é reduzido na proporção, até MIN_SCALE (88%, para a letra continuar legível); abaixo disso passa a rolar dentro
 * do card. No celular nada é reduzido e a página rola normalmente.
 */
function FitToHeight({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const update = () => {
      const natural = i.offsetHeight; // altura de layout: não muda com o transform
      const available = o.clientHeight;
      if (!desktop.matches || !natural || natural <= available) return setScale(1);
      setScale(Math.max(MIN_SCALE, available / natural));
    };
    const observer = new ResizeObserver(update);
    observer.observe(o);
    observer.observe(i);
    desktop.addEventListener("change", update);
    update();
    return () => {
      observer.disconnect();
      desktop.removeEventListener("change", update);
    };
  }, []);

  return (
    <div ref={outer} className="relative min-h-0 flex-1 lg:overflow-y-auto">
      <div
        ref={inner}
        style={
          scale < 1
            ? {
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                width: `${100 / scale}%`,
              }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}

function PagamentoPage() {
  const { appointmentId } = Route.useParams();
  const { user, hydrated } = useRequireAuth();
  const { locale } = useClinicalI18n();
  const tr = useTr();

  const appt = useQuery({
    queryKey: ["payment-page", "appointment", appointmentId],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", appointmentId)
        .maybeSingle();
      return data;
    },
  });
  const people = usePeople(appt.data ? [appt.data.professional_id] : []);
  const pro = appt.data ? people.data?.get(appt.data.professional_id) : undefined;

  const left = useCountdown(appt.data?.hold_expires_at);
  const expired = left === 0;
  const payable =
    !!appt.data &&
    appt.data.patient_id === user?.id &&
    appt.data.status === "aguardando_pagamento" &&
    !expired;

  // Carrega o Stripe só no navegador e só quando há algo a pagar.
  const [stripe, setStripe] = useState<StripeModules | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!payable) return;
    let cancelled = false;
    void (async () => {
      try {
        const [{ clientSecret: secret, publishableKey }, js, react] = await Promise.all([
          createCheckoutSession(appointmentId),
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
  }, [payable, appointmentId]);

  if (!hydrated || !user) return <AuthGateLoading />;

  const a = appt.data;
  const mm = left === null ? "--" : String(Math.floor(left / 60)).padStart(2, "0");
  const ss = left === null ? "--" : String(left % 60).padStart(2, "0");

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground lg:h-dvh lg:overflow-hidden">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col px-4 py-4 sm:px-6 lg:py-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            {tr([
              "Pagamento da consulta",
              "Appointment payment",
              "Pago de la consulta",
              "Paiement de la consultation",
            ])}
          </h1>
          <Link
            to="/acompanhamento/consultas"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />{" "}
            {tr(["Minhas consultas", "My appointments", "Mis consultas", "Mes consultations"])}
          </Link>
        </div>

        {appt.isLoading ? (
          <div className="mt-8">
            <Loading />
          </div>
        ) : !a || a.patient_id !== user.id ? (
          <Notice
            title={tr([
              "Consulta não encontrada",
              "Appointment not found",
              "Consulta no encontrada",
              "Consultation introuvable",
            ])}
          >
            {tr([
              "Não encontramos essa consulta na sua conta.",
              "We couldn't find this appointment in your account.",
              "No encontramos esta consulta en tu cuenta.",
              "Nous n'avons pas trouvé cette consultation dans votre compte.",
            ])}
          </Notice>
        ) : a.status !== "aguardando_pagamento" &&
          !["agendada", "confirmada"].includes(a.status) ? (
          <Notice
            title={tr([
              "Esta consulta não está aguardando pagamento",
              "This appointment is not awaiting payment",
              "Esta consulta no está esperando pago",
              "Cette consultation n'attend pas de paiement",
            ])}
          >
            {tr([
              "O horário pode ter sido cancelado ou já ter passado.",
              "The slot may have been cancelled or already passed.",
              "El horario puede haberse cancelado o ya haber pasado.",
              "Le créneau a peut-être été annulé ou est déjà passé.",
            ])}
          </Notice>
        ) : ["agendada", "confirmada"].includes(a.status) ? (
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary-soft/50 p-5">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">
                {tr([
                  "Pagamento confirmado!",
                  "Payment confirmed!",
                  "¡Pago confirmado!",
                  "Paiement confirmé !",
                ])}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {tr([
                  "Sua consulta está agendada.",
                  "Your appointment is booked.",
                  "Tu consulta está agendada.",
                  "Votre consultation est réservée.",
                ])}
              </p>
              <Link
                to="/acompanhamento/consultas"
                className="mt-3 inline-block rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground"
              >
                {tr([
                  "Ver minhas consultas",
                  "See my appointments",
                  "Ver mis consultas",
                  "Voir mes consultations",
                ])}
              </Link>
            </div>
          </div>
        ) : expired ? (
          <Notice
            title={tr([
              "O tempo para pagar acabou",
              "Time to pay has run out",
              "Se acabó el tiempo para pagar",
              "Le délai de paiement est écoulé",
            ])}
          >
            {tr([
              "O horário foi liberado. Escolha um novo horário para agendar.",
              "The slot was released. Pick a new time to book.",
              "El horario se liberó. Elige un nuevo horario para agendar.",
              "Le créneau a été libéré. Choisissez un nouvel horaire.",
            ])}
            <Link
              to="/profissionais"
              className="mt-3 block w-fit rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground"
            >
              {tr([
                "Buscar profissionais",
                "Find professionals",
                "Buscar profesionales",
                "Trouver des professionnels",
              ])}
            </Link>
          </Notice>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
            {/* Resumo da consulta */}
            <aside className="min-h-0 space-y-3 lg:overflow-y-auto">
              <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {tr(["Resumo", "Summary", "Resumen", "Résumé"])}
                </h2>
                <div className="mt-3 flex items-center gap-3">
                  <Avatar name={pro?.name ?? "…"} url={pro?.avatarUrl} size="md" />
                  <div className="min-w-0">
                    <p className="truncate font-display font-bold">{pro?.name ?? "…"}</p>
                    <p className="text-xs text-muted-foreground">
                      {tr(["Consulta", "Appointment", "Consulta", "Consultation"])}
                    </p>
                  </div>
                </div>
                <dl className="mt-4 space-y-2.5 text-sm">
                  <div className="flex items-start gap-2.5">
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <div>
                      <dt className="sr-only">
                        {tr(["Data e hora", "Date and time", "Fecha y hora", "Date et heure"])}
                      </dt>
                      <dd className="font-medium capitalize">
                        {formatDate(a.starts_at, locale, {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </dd>
                      <dd className="text-muted-foreground">
                        {formatTime(a.starts_at, locale)} – {formatTime(a.ends_at, locale)}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    {a.modality === "online" ? (
                      <Video className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    ) : (
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    )}
                    <div>
                      <dt className="sr-only">
                        {tr(["Modalidade", "Format", "Modalidad", "Modalité"])}
                      </dt>
                      <dd className="font-medium">
                        {a.modality === "online"
                          ? tr(["On-line", "Online", "En línea", "En ligne"])
                          : tr(["Presencial", "In person", "Presencial", "En présentiel"])}
                      </dd>
                      {a.modality !== "online" && a.location && (
                        <dd className="text-muted-foreground">{a.location}</dd>
                      )}
                    </div>
                  </div>
                </dl>
                <div className="mt-4 flex items-end justify-between border-t border-border/60 pt-3">
                  <span className="text-sm text-muted-foreground">
                    {tr(["Total", "Total", "Total", "Total"])}
                  </span>
                  <span className="font-display text-2xl font-extrabold text-foreground">
                    {formatMoney(a.price_cents, locale)}
                  </span>
                </div>
              </section>

              <section className="rounded-2xl border border-accent/30 bg-accent-soft/60 p-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-accent">
                  <Clock className="h-4 w-4" />{" "}
                  {tr([
                    `Horário reservado por ${mm}:${ss}`,
                    `Slot held for ${mm}:${ss}`,
                    `Horario reservado por ${mm}:${ss}`,
                    `Créneau réservé pendant ${mm}:${ss}`,
                  ])}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tr([
                    "Depois disso o horário é liberado para outras pessoas.",
                    "After that the slot is released to other people.",
                    "Después el horario se libera para otras personas.",
                    "Ensuite, le créneau est libéré pour d'autres personnes.",
                  ])}
                </p>
              </section>

              <p className="px-1 text-[11px] leading-snug text-muted-foreground">
                {tr([
                  "Pagamento seguro pelo Stripe: não guardamos os dados do seu cartão.",
                  "Secure payment by Stripe: we don't store your card details.",
                  "Pago seguro con Stripe: no guardamos los datos de tu tarjeta.",
                  "Paiement sécurisé par Stripe : nous ne conservons pas vos données de carte.",
                ])}
                <br />
                {tr([
                  "Cancelamento com pelo menos 24 horas de antecedência dá direito ao estorno. Veja os",
                  "Cancelling at least 24 hours ahead gives you a refund. See the",
                  "Cancelar con al menos 24 horas de antelación da derecho al reembolso. Mira los",
                  "Une annulation au moins 24 heures avant donne droit au remboursement. Voir les",
                ])}{" "}
                <Link to="/termos" className="underline">
                  {tr([
                    "Termos de Uso",
                    "Terms of Use",
                    "Términos de Uso",
                    "Conditions d'utilisation",
                  ])}
                </Link>{" "}
                {tr(["e a", "and the", "y la", "et la"])}{" "}
                <Link to="/privacidade" className="underline">
                  {tr([
                    "Política de Privacidade",
                    "Privacy Policy",
                    "Política de Privacidad",
                    "Politique de confidentialité",
                  ])}
                </Link>
                .
              </p>
            </aside>

            {/* Formulário do Stripe */}
            <section className="flex min-h-0 flex-col rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Lock className="h-4 w-4 text-primary" />{" "}
                {tr(["Pagamento seguro", "Secure payment", "Pago seguro", "Paiement sécurisé"])}
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  {tr([
                    "Processado pelo Stripe",
                    "Processed by Stripe",
                    "Procesado por Stripe",
                    "Traité par Stripe",
                  ])}
                </span>
              </div>
              {error ? (
                <p className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>
              ) : stripe && clientSecret ? (
                <FitToHeight>
                  <stripe.Provider
                    stripe={stripe.stripePromise}
                    options={{ fetchClientSecret: () => Promise.resolve(clientSecret) }}
                  >
                    <stripe.Checkout />
                  </stripe.Provider>
                </FitToHeight>
              ) : (
                <div className="py-10">
                  <Loading />
                </div>
              )}
            </section>
          </div>
        )}
      </main>
      <div className="lg:hidden">
        <SiteFooter />
      </div>
    </div>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8 rounded-2xl border border-border/70 bg-card p-6">
      <p className="font-display text-lg font-bold">{title}</p>
      <div className="mt-1 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}
