import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarCheck,
  ClipboardList,
  EyeOff,
  HeartHandshake,
  LineChart,
  MessageCircle,
  NotebookPen,
  Target,
  TicketX,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  Avatar,
  Card,
  EmptyState,
  Loading,
  buttonPrimary,
  buttonSecondary,
  plainText,
} from "@/components/clinical/ui";
import { useAuth } from "@/hooks/use-auth";
import * as api from "@/lib/clinical/api";
import { useClinicalMutation } from "@/lib/clinical/queries";
import { useClinicalI18n } from "@/lib/clinical/i18n";
import { cn } from "@/lib/utils";
import { AppScreen } from "@/components/app-screen";
import { VerifiedBadge } from "@/components/person-chip";
import { useTr } from "@/components/settings-ui";
import { useI18n } from "@/hooks/use-i18n";
import { td } from "@/lib/i18n/data";

export const Route = createFileRoute("/convite/$code")({
  head: () => ({ meta: [{ title: "Convite de acompanhamento — NutriConnect" }] }),
  component: InvitePage,
});

function InvitePage() {
  const { code } = Route.useParams();
  const { t } = useClinicalI18n();
  const tr = useTr();
  const { locale } = useI18n();
  const { user, hydrated } = useAuth();
  const navigate = useNavigate();
  const [consent, setConsent] = useState(false);
  const invite = useQuery({
    queryKey: ["clinical", "invite", code],
    queryFn: () => api.getInvite(code),
  });
  const proId = invite.data?.valid ? invite.data.professional_id : undefined;
  // Profissão, registro e selo de verificado de quem convidou (diretório público).
  const entry = useQuery({
    queryKey: ["clinical", "directory", proId],
    queryFn: () => api.getDirectoryEntry(proId!),
    enabled: !!proId,
  });
  const pro = entry.data;

  const pageTitle = tr([
    "Convite de acompanhamento",
    "Follow-up invitation",
    "Invitación de acompañamiento",
    "Invitation au suivi",
  ]);
  useEffect(() => {
    document.title = `${pageTitle} — NutriConnect`;
  }, [pageTitle]);

  // O que o profissional passa a ver depois do aceite (e o que continua só seu).
  const sees = [
    {
      icon: NotebookPen,
      text: tr([
        "Seu diário alimentar",
        "Your food diary",
        "Tu diario de comidas",
        "Votre journal alimentaire",
      ]),
    },
    {
      icon: Target,
      text: tr([
        "Suas metas do dia",
        "Your daily goals",
        "Tus metas del día",
        "Vos objectifs du jour",
      ]),
    },
    {
      icon: LineChart,
      text: tr([
        "Medidas e evolução",
        "Measurements and progress",
        "Medidas y evolución",
        "Mesures et évolution",
      ]),
    },
    {
      icon: ClipboardList,
      text: tr([
        "Plano e exames enviados",
        "Plan and tests you send",
        "Plan y exámenes enviados",
        "Plan et examens envoyés",
      ]),
    },
    {
      icon: CalendarCheck,
      text: tr([
        "Consultas marcadas",
        "Booked appointments",
        "Consultas agendadas",
        "Rendez-vous pris",
      ]),
    },
    {
      icon: MessageCircle,
      text: tr([
        "Mensagens entre vocês",
        "Messages between you",
        "Mensajes entre ustedes",
        "Messages entre vous",
      ]),
    },
  ];
  const accept = useClinicalMutation(() => api.acceptInvite(code), {
    success: t("invite.accepted"),
    onSuccess: () => navigate({ to: "/acompanhamento" }),
  });

  return (
    <AppScreen className={plainText}>
      <div className="mx-auto w-full max-w-lg px-4 py-12">
        {invite.isLoading || !hydrated ? (
          <Loading />
        ) : !invite.data || !invite.data.valid ? (
          <EmptyState
            icon={TicketX}
            title={t("invite.invalidTitle")}
            text={t("invite.invalidText")}
            action={
              <Link to="/profissionais" className={buttonSecondary}>
                {t("invite.findProfessional")}
              </Link>
            }
          />
        ) : (
          <Card>
            <div className="flex flex-col items-center text-center">
              <Avatar name={invite.data.professional_name} url={pro?.avatar_url} size="lg" />
              <HeartHandshake className="mt-4 h-6 w-6 text-accent" aria-hidden />
              <h1 className="mt-2 font-display text-2xl font-extrabold">
                {t("invite.title", { name: invite.data.professional_name })}
              </h1>
              {pro && (
                <p className="mt-1 flex flex-wrap items-center justify-center gap-1 text-sm text-muted-foreground">
                  {pro.verified_at && <VerifiedBadge className="h-4 w-4" />}
                  <span>
                    {td(pro.profession, locale)}
                    {pro.registration &&
                      ` · ${pro.council ?? ""} ${pro.registration}/${pro.uf ?? ""}`}
                  </span>
                </p>
              )}
              {pro && (
                <Link
                  to="/profissionais/$professionalId"
                  params={{ professionalId: invite.data.professional_id }}
                  className="inline-flex min-h-10 items-center text-xs font-semibold text-accent hover:underline"
                >
                  {tr([
                    "Ver perfil completo",
                    "See full profile",
                    "Ver perfil completo",
                    "Voir le profil complet",
                  ])}
                </Link>
              )}
              <p className="mt-2 text-sm text-muted-foreground">{t("invite.text")}</p>

              <div className="mt-5 w-full rounded-2xl border border-border/70 bg-secondary/30 p-4 text-left">
                <p className="text-sm font-semibold text-foreground">
                  {tr([
                    "Ao aceitar, quem convidou passa a ver:",
                    "Once you accept, they will see:",
                    "Al aceptar, quien te invitó verá:",
                    "En acceptant, cette personne verra :",
                  ])}
                </p>
                <ul className="mt-3 grid grid-cols-1 gap-2 text-sm text-foreground sm:grid-cols-2">
                  {sees.map((s) => (
                    <li key={s.text} className="flex items-center gap-2">
                      <s.icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      {s.text}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 flex items-start gap-2 text-left text-xs text-muted-foreground">
                  <EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>
                    {tr([
                      "Como me sinto, posts e conversas com amigos continuam só seus. Dá para encerrar o acompanhamento quando quiser.",
                      "How I feel, posts and chats with friends stay yours. You can end the follow-up any time.",
                      "Cómo me siento, posts y chats con amigos siguen siendo solo tuyos. Puedes terminar el acompañamiento cuando quieras.",
                      "Mon humeur, les posts et les échanges avec vos amis restent privés. Vous pouvez arrêter le suivi à tout moment.",
                    ])}
                  </span>
                </p>
              </div>

              {user ? (
                user.id === invite.data.professional_id ? (
                  <p className="mt-6 text-sm text-muted-foreground">{t("invite.ownInvite")}</p>
                ) : (
                  <>
                    <label className="mt-5 flex cursor-pointer items-start gap-2.5 text-left text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-primary)]"
                      />
                      <span>
                        {tr([
                          "Autorizo o compartilhamento dos meus dados de saúde com este profissional para o acompanhamento, conforme a",
                          "I authorize sharing my health data with this professional for the follow-up, as described in the",
                          "Autorizo compartir mis datos de salud con este profesional para el acompañamiento, según la",
                          "J'autorise le partage de mes données de santé avec ce professionnel pour le suivi, selon la",
                        ])}{" "}
                        <Link to="/privacidade" target="_blank" className="text-accent underline">
                          {tr([
                            "Política de Privacidade",
                            "Privacy Policy",
                            "Política de Privacidad",
                            "Politique de confidentialité",
                          ])}
                        </Link>
                        .
                      </span>
                    </label>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        className={buttonPrimary}
                        disabled={accept.isPending || !consent}
                        onClick={() => accept.mutate(undefined)}
                      >
                        {t("invite.accept")}
                      </button>
                      <Link to="/espaco" className={buttonSecondary}>
                        {tr(["Agora não", "Not now", "Ahora no", "Pas maintenant"])}
                      </Link>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {tr([
                        "Se escolher Agora não, o convite continua valendo até vencer.",
                        "If you choose Not now, the invite stays valid until it expires.",
                        "Si eliges Ahora no, la invitación sigue válida hasta vencer.",
                        "Avec Pas maintenant, l'invitation reste valable jusqu'à expiration.",
                      ])}
                    </p>
                  </>
                )
              ) : (
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Link
                    to="/cadastro"
                    search={{ redirect: `/convite/${code}` }}
                    className={buttonPrimary}
                  >
                    {t("invite.signup")}
                  </Link>
                  <Link
                    to="/login"
                    search={{ redirect: `/convite/${code}` }}
                    className={buttonSecondary}
                  >
                    {t("invite.login")}
                  </Link>
                </div>
              )}
              {!user && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {tr([
                    "Depois de entrar ou criar a conta, você volta para cá sozinho para aceitar.",
                    "After you log in or sign up, you come back here automatically to accept.",
                    "Después de entrar o crear la cuenta, vuelves aquí solo para aceptar.",
                    "Après connexion ou inscription, vous revenez ici automatiquement pour accepter.",
                  ])}
                </p>
              )}
            </div>
          </Card>
        )}
      </div>
    </AppScreen>
  );
}
