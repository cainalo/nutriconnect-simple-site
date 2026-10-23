import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarDays, FileText, Filter, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { AppointmentCard } from "@/components/clinical/appointment-card";
import {
  EmptyState,
  Loading,
  PageHeader,
  Tabs,
  buttonGhost,
  buttonPrimary,
  buttonSecondary,
  inputClass,
} from "@/components/clinical/ui";
import { useTr } from "@/components/settings-ui";
import type { Appointment } from "@/lib/clinical/api";
import { useAppointments, usePayments, usePeople } from "@/lib/clinical/queries";
import { startCheckout } from "@/lib/clinical/payments";
import { useClinicalI18n } from "@/lib/clinical/i18n";
import { isReviewable, useMyReviews } from "@/lib/clinical/reviews";
import { ReviewButton } from "@/components/clinical/reviews";
import { useAuth } from "@/hooks/use-auth";

type PaymentReturn = "sucesso" | "pendente" | "falha";
type Period = "todas" | "3m" | "12m";

/** O histórico mostra 10 de cada vez. */
const PAGE = 10;

export const Route = createFileRoute("/acompanhamento/consultas")({
  validateSearch: (search: Record<string, unknown>): { pagamento?: PaymentReturn } => ({
    pagamento: ["sucesso", "pendente", "falha"].includes(search.pagamento as string)
      ? (search.pagamento as PaymentReturn)
      : undefined,
  }),
  component: PatientAppointmentsPage,
});

function PatientAppointmentsPage() {
  const { t } = useClinicalI18n();
  const tr = useTr();
  const [tab, setTab] = useState<"proximas" | "anteriores">("proximas");
  const [period, setPeriod] = useState<Period>("todas");
  const [shown, setShown] = useState(PAGE);
  const { data, isLoading } = useAppointments({ role: "patient", ascending: true });
  const { pagamento } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();

  // Volta do checkout do Stripe (a confirmação definitiva chega pelo webhook).
  useEffect(() => {
    if (!pagamento) return;
    const id = "payment-return";
    if (pagamento === "sucesso") toast.success(t("payment.returnSuccess"), { id });
    else if (pagamento === "pendente") toast.message(t("payment.returnPending"), { id });
    else toast.error(t("payment.returnFailure"), { id });
    void qc.invalidateQueries({ queryKey: ["clinical"] });
    navigate({ search: {}, replace: true });
  }, [pagamento]); // eslint-disable-line react-hooks/exhaustive-deps

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const all = data ?? [];
    return {
      upcoming: all.filter(
        (a) =>
          new Date(a.ends_at).getTime() >= now &&
          ["aguardando_pagamento", "agendada", "confirmada"].includes(a.status),
      ),
      past: all
        .filter(
          (a) =>
            new Date(a.ends_at).getTime() < now ||
            !["aguardando_pagamento", "agendada", "confirmada"].includes(a.status),
        )
        .reverse(),
    };
  }, [data]);

  const people = usePeople((data ?? []).map((a) => a.professional_id));
  const payments = usePayments((data ?? []).filter((a) => a.price_cents > 0).map((a) => a.id));
  const paymentFor = (id: string) => payments.data?.find((p) => p.appointment_id === id);
  const { user } = useAuth();
  const myReviews = useMyReviews(user?.id);

  const pay = async (appt: Appointment) => {
    try {
      window.location.href = await startCheckout(appt.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  // Histórico: filtro por período e carga aos poucos.
  const pastFiltered = useMemo(() => {
    if (period === "todas") return past;
    const months = period === "3m" ? 3 : 12;
    const from = new Date();
    from.setMonth(from.getMonth() - months);
    return past.filter((a) => new Date(a.starts_at) >= from);
  }, [past, period]);
  const list = tab === "proximas" ? upcoming : pastFiltered.slice(0, shown);
  const more = tab === "anteriores" ? pastFiltered.length - shown : 0;
  const bookLabel = t("patientAppts.book");

  return (
    <>
      <PageHeader
        title={t("patientAppts.title")}
        subtitle={t("patientAppts.subtitle")}
        action={
          // Sem consultas, o botão fica só dentro do vazio (sem repetir no topo).
          isLoading || list.length > 0 ? (
            <Link to="/profissionais" className={buttonPrimary}>
              {bookLabel}
            </Link>
          ) : undefined
        }
      />
      <Tabs
        value={tab}
        onChange={(v) => {
          setTab(v);
          setShown(PAGE);
        }}
        label={t("patientAppts.title")}
        items={[
          { value: "proximas", label: t("patientAppts.upcoming"), count: upcoming.length },
          { value: "anteriores", label: t("patientAppts.past"), count: past.length },
        ]}
      />
      {tab === "anteriores" && past.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" aria-hidden />
            {tr(["Período", "Period", "Período", "Période"])}
            <select
              className={inputClass + " w-auto py-2"}
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value as Period);
                setShown(PAGE);
              }}
            >
              <option value="todas">{tr(["Todas", "All", "Todas", "Toutes"])}</option>
              <option value="3m">
                {tr(["Últimos 3 meses", "Last 3 months", "Últimos 3 meses", "3 derniers mois"])}
              </option>
              <option value="12m">
                {tr(["Últimos 12 meses", "Last 12 months", "Últimos 12 meses", "12 derniers mois"])}
              </option>
            </select>
          </label>
        </div>
      )}
      {isLoading ? (
        <Loading />
      ) : list.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={tab === "proximas" ? t("patientAppts.emptyUpcoming") : t("patientAppts.emptyPast")}
          text={
            tab === "proximas"
              ? t("patientAppts.emptyUpcomingText")
              : past.length > 0
                ? tr([
                    "Nenhuma consulta neste período. Escolha outro período acima.",
                    "No appointments in this period. Pick another period above.",
                    "Ninguna consulta en este período. Elige otro período arriba.",
                    "Aucun rendez-vous sur cette période. Choisissez-en une autre ci-dessus.",
                  ])
                : tr([
                    "As consultas que já aconteceram ou foram canceladas aparecem aqui, com o resumo que o profissional deixar para você.",
                    "Appointments that already happened or were cancelled show up here, with the summary your professional leaves for you.",
                    "Las consultas que ya ocurrieron o se cancelaron aparecen aquí, con el resumen que el profesional deje para ti.",
                    "Les rendez-vous passés ou annulés apparaissent ici, avec le résumé laissé par votre professionnel.",
                  ])
          }
          action={
            tab === "proximas" || past.length === 0 ? (
              <Link to="/profissionais" className={buttonPrimary}>
                <CalendarDays className="h-4 w-4" />
                {bookLabel}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <AppointmentCard
              key={a.id}
              appt={a}
              role="patient"
              person={people.data?.get(a.professional_id)}
              payment={paymentFor(a.id)}
              onPay={pay}
              extra={
                isReviewable(a) && (
                  <ReviewButton
                    appointmentId={a.id}
                    proName={people.data?.get(a.professional_id)?.name}
                    existing={myReviews.data?.get(a.id)}
                  />
                )
              }
            />
          ))}
          {more > 0 && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                className={buttonSecondary}
                onClick={() => setShown((n) => n + PAGE)}
              >
                {tr([
                  `Ver mais (${more})`,
                  `Show more (${more})`,
                  `Ver más (${more})`,
                  `Voir plus (${more})`,
                ])}
              </button>
            </div>
          )}
        </div>
      )}
      {/* Atalhos para o que costuma vir junto da consulta. */}
      <nav
        aria-label={tr(["Atalhos", "Shortcuts", "Accesos directos", "Raccourcis"])}
        className="mt-6 flex flex-wrap justify-center gap-2"
      >
        <Link to="/acompanhamento/exames" className={buttonGhost}>
          <FileText className="h-4 w-4" />
          {tr([
            "Exames e documentos",
            "Tests and documents",
            "Exámenes y documentos",
            "Examens et documents",
          ])}
        </Link>
        <Link to="/acompanhamento/mensagens" className={buttonGhost}>
          <MessageCircle className="h-4 w-4" />
          {tr(["Mensagens", "Messages", "Mensajes", "Messages"])}
        </Link>
      </nav>
    </>
  );
}
