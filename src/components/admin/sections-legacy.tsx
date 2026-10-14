import { td } from "@/lib/i18n/data";
import { useState } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { PostImage } from "@/components/post-image";
import { ModerationPanel } from "@/components/moderation-panel";
import { useRefreshProfessionals, useVerifications } from "@/lib/social/professionals-queries";
import type { RemoteCommunity } from "@/lib/social/communities";
import {
  useCommunities,
  useCommunityCandidates,
  useDesignateAdminUser,
  useEngagedMembers,
} from "@/lib/social/communities-queries";
import { useI18n } from "@/hooks/use-i18n";
import { formatDate, type VerificationRequest } from "@/lib/community";
import { reviewVerification } from "@/lib/community-admin";
import { useQuery } from "@tanstack/react-query";
import { cardsByIds } from "@/lib/social/api";
import {
  REGISTRY_LABEL,
  useAdminTeleconsultChecks,
  useReviewTeleconsult,
  useSetTeleconsultRequired,
  useTeleconsultRequired,
  type Registry,
} from "@/lib/teleconsult";

/** Pedidos de verificação profissional (aguardando e já analisados). */
export function VerificationsSection({
  user,
}: {
  user: { id: string; name: string; isAdmin?: boolean };
}) {
  const { t } = useI18n();
  // Admins veem todos os pedidos, com links temporários para as imagens privadas.
  const verificationsQuery = useVerifications(true, !!user.isAdmin);
  const verifications = verificationsQuery.data ?? [];

  const pending = verifications.filter((v) => v.status === "em_analise");
  const reviewed = verifications.filter((v) => v.status !== "em_analise");

  return (
    <div className="space-y-6">
      <TeleconsultReview />
      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
          {t("admin.awaiting")}
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
            {t("admin.noPending")}
          </p>
        ) : (
          pending.map((v) => (
            <VerificationCard key={v.id} request={v} reviewer={{ id: user.id, name: user.name }} />
          ))
        )}
      </section>

      {reviewed.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
            {t("admin.reviewed")}
          </h2>
          <ul className="divide-y divide-border/60 rounded-2xl border border-border/70 bg-card">
            {reviewed.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <span className="text-sm text-foreground">
                  {v.fullName}{" "}
                  <span className="text-muted-foreground">
                    · {td(v.profession)} {v.council} {v.registration}/{v.uf}
                  </span>
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    v.status === "aprovado"
                      ? "bg-accent-soft text-accent"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {v.status === "aprovado" ? t("admin.approved") : t("admin.rejectedLabel")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Comunidades que ainda precisam de administrador ou de profissional. */
export function CommunitiesSection() {
  const { t } = useI18n();
  // A plataforma enxerga todas as comunidades; as que precisam de atenção são as não ativas.
  const communitiesQuery = useCommunities(false, true);
  const attention = (communitiesQuery.data ?? []).filter((c) => c.status !== "ativa");
  return (
    <div className="space-y-4">
      {attention.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
          {t("admin.allComplete")}
        </p>
      ) : (
        attention.map((c) => <CommunityCase key={c.id} community={c} />)
      )}
    </div>
  );
}

/** Fila de denúncias (inclui as abertas pela moderação automática por IA). */
export function ModerationSection() {
  return <ModerationPanel />;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}

function VerificationCard({
  request: v,
  reviewer,
}: {
  request: VerificationRequest;
  reviewer: { id: string; name: string };
}) {
  const { t } = useI18n();
  const refresh = useRefreshProfessionals();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <article className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-bold text-foreground">{v.fullName}</h3>
        <span className="text-xs text-muted-foreground">
          {t("admin.sentOn")} {formatDate(v.submittedAt)}
        </span>
      </div>

      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <Row label={t("admin.account")} value={v.userName} />
        <Row label={t("verify.profession")} value={td(v.profession)} />
        <Row label={t("verify.registration")} value={`${v.council} ${v.registration}/${v.uf}`} />
        <Row label={t("verify.fields")} value={v.specialties.map((s) => td(s)).join(", ")} />
      </dl>
      {v.bio && <p className="mt-3 text-sm text-muted-foreground">{v.bio}</p>}
      {v.publicLookupUrl && (
        <a
          href={v.publicLookupUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs font-semibold text-accent hover:underline"
        >
          {t("admin.publicLookup")}
        </a>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <figure>
          <PostImage src={v.documentImage} alt={t("admin.docAlt")} className="rounded-xl" />
          <figcaption className="mt-1 text-[11px] text-muted-foreground">
            {t("admin.docCaption")}
          </figcaption>
        </figure>
        <figure>
          <PostImage src={v.selfieImage} alt={t("admin.selfieAlt")} className="rounded-xl" />
          <figcaption className="mt-1 text-[11px] text-muted-foreground">
            {t("admin.selfieAlt")}
          </figcaption>
        </figure>
      </div>

      {rejecting ? (
        <div className="mt-4 space-y-3">
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("admin.rejectReason")}
            className="w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-destructive"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await reviewVerification({
                    requestId: v.id,
                    reviewer,
                    approve: false,
                    reason,
                  });
                  await refresh();
                  toast.success(t("admin.rejectedToast"));
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : t("reset.error"));
                }
              }}
              className="rounded-full bg-destructive px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {t("admin.confirmReject")}
            </button>
            <button
              type="button"
              onClick={() => setRejecting(false)}
              className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={async () => {
              try {
                await reviewVerification({ requestId: v.id, reviewer, approve: true });
                await refresh();
                toast.success(`${v.fullName} ${t("admin.approvedToast")}`);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : t("reset.error"));
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-accent/90"
          >
            <Check className="h-4 w-4" /> {t("admin.approve")}
          </button>
          <button
            type="button"
            onClick={() => setRejecting(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary"
          >
            <X className="h-4 w-4" /> {t("admin.reject")}
          </button>
        </div>
      )}
    </article>
  );
}

function CommunityCase({ community: c }: { community: RemoteCommunity }) {
  const { t } = useI18n();
  // Faltam um profissional (convidados calculados no banco) e/ou um admin usuário (membros mais
  // engajados). Pendente e suspensa sem profissional precisam de um; suspensa sem admin, do outro.
  const needsPro = !c.professionalId && (c.status === "pendente" || c.status === "suspensa");
  const needsUser = !c.adminUserId && c.status === "suspensa";
  const invitedQuery = useCommunityCandidates(c.id, needsPro);
  const engagedQuery = useEngagedMembers(c.id, needsUser);
  const designate = useDesignateAdminUser();
  const invited = invitedQuery.data ?? [];
  const candidates = engagedQuery.data ?? [];

  return (
    <article className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-lg font-bold text-foreground">{c.name}</h3>
        <span className="rounded-full bg-warning/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground">
          {c.status === "pendente"
            ? t("comunidades.status.pendente")
            : t("comunidades.status.suspensa")}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{td(c.category)}</p>

      {needsPro && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-foreground">
            {t("admin.missingPro")}
          </p>
          {invited.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">{t("admin.noProAvailable")}</p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              {t("admin.invitedTo")} {invited.map((r) => r.name).join(", ")}.{" "}
              {t("admin.firstToAccept")}
            </p>
          )}
        </div>
      )}

      {needsUser && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-foreground">
            {t("admin.missingUser")}
          </p>
          {candidates.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">{t("admin.noEligible")}</p>
          ) : (
            <ul className="mt-2 divide-y divide-border/60 rounded-xl border border-border/70">
              {candidates.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <span className="text-sm text-foreground">
                    {m.name}{" "}
                    <span className="text-xs text-muted-foreground">
                      · {m.posts} {t("admin.stats")}, {m.comments} {t("admin.statsComments")},{" "}
                      {m.supports} {t("admin.statsSupports")}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={designate.isPending}
                    onClick={() =>
                      designate.mutate(
                        { communityId: c.id, userId: m.id },
                        {
                          onSuccess: () =>
                            toast.success(`${m.name} ${t("admin.designated")} ${c.name}.`),
                        },
                      )
                    }
                    className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground transition hover:bg-accent/90"
                  >
                    {t("admin.designate")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

// ── Habilitação para teleconsulta (M4) ───────────────────────────────────────

function TeleconsultReview() {
  const checks = useAdminTeleconsultChecks();
  const required = useTeleconsultRequired();
  const setRequired = useSetTeleconsultRequired();
  const review = useReviewTeleconsult();
  const people = useQuery({
    queryKey: ["teleconsult-people", ...(checks.data ?? []).map((c) => c.professional_id).sort()],
    enabled: !!checks.data?.length,
    queryFn: () => cardsByIds([...new Set((checks.data ?? []).map((c) => c.professional_id))]),
  });
  // Sem a tabela no banco (migration pendente), o painel não aparece.
  if (checks.isError) return null;
  const pending = (checks.data ?? []).filter((c) => c.status === "em_analise");
  const done = (checks.data ?? []).filter((c) => c.status !== "em_analise").slice(0, 10);

  return (
    <section className="space-y-3 rounded-3xl border border-border/80 bg-card p-4 shadow-xs sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Teleconsulta (CFN 760/2023)
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            Confira o número no cadastro público do conselho (e-Nutricionista do CFN; e-Psi do CFP)
            e o comprovante enviado. Com a exigência ligada, só profissionais aprovados recebem
            consultas online.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <input
            type="checkbox"
            checked={!!required.data}
            disabled={setRequired.isPending}
            onChange={(e) =>
              setRequired.mutate(e.target.checked, {
                onSuccess: () =>
                  toast.success(e.target.checked ? "Exigência ligada." : "Exigência desligada."),
                onError: (err) => toast.error((err as Error).message),
              })
            }
          />
          Exigir habilitação para atender online
        </label>
      </div>
      {pending.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          Nenhum pedido de teleconsulta aguardando.
        </p>
      ) : (
        pending.map((c) => (
          <article key={c.id} className="rounded-2xl border border-border/70 p-3">
            <p className="text-sm font-semibold text-foreground">
              {people.data?.get(c.professional_id)?.name ?? "Profissional"} ·{" "}
              {REGISTRY_LABEL[c.registry as Registry]}{" "}
              <span className="font-mono">{c.registry_number}</span>
            </p>
            <p className="text-xs text-muted-foreground">Enviado em {formatDate(c.submitted_at)}</p>
            {c.documentUrl && (
              <a
                href={c.documentUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-xs font-semibold text-accent hover:underline"
              >
                Abrir comprovante
              </a>
            )}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground"
                disabled={review.isPending}
                onClick={() =>
                  review.mutate(
                    { id: c.id, approve: true },
                    { onSuccess: () => toast.success("Habilitação aprovada.") },
                  )
                }
              >
                <Check className="h-3.5 w-3.5" /> Aprovar
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive"
                disabled={review.isPending}
                onClick={() => {
                  const reason = window.prompt("Motivo da recusa (o profissional vê):") ?? "";
                  if (reason.trim()) review.mutate({ id: c.id, approve: false, reason });
                }}
              >
                <X className="h-3.5 w-3.5" /> Recusar
              </button>
            </div>
          </article>
        ))
      )}
      {done.length > 0 && (
        <ul className="divide-y divide-border/60 text-xs text-muted-foreground">
          {done.map((c) => (
            <li key={c.id} className="py-1.5">
              {people.data?.get(c.professional_id)?.name ?? "Profissional"} ·{" "}
              {c.status === "aprovado" ? "aprovado" : "recusado"} em{" "}
              {c.reviewed_at ? formatDate(c.reviewed_at) : "—"}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
