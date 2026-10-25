import { useState } from "react";
import { Download, Save } from "lucide-react";
import {
  Badge,
  Empty,
  Pagination,
  Panel,
  QueryError,
  SearchBox,
  StackedBars,
  StatCard,
  btnCls,
  btnPrimary,
  dateTime,
  inputCls,
  useDebounced,
} from "@/components/admin/admin-ui";
import {
  adminActions,
  adminRpc,
  downloadCsv,
  money,
  useAdminAction,
  useAdminPayments,
  useAiStats,
  useAuditLog,
  useOverview,
  useSettings,
  type AdminPayment,
} from "@/lib/admin-api";
import { Banknote, BrainCircuit, Flag, Percent, RotateCcw, Users } from "lucide-react";
import { LEGAL_VERSION } from "@/lib/legal";
import { useTr } from "@/components/settings-ui";
import type { Names } from "@/lib/appearance-data";

// ── Financeiro ───────────────────────────────────────────────────────────────

const PAY_LABEL: Record<AdminPayment["status"], Names> = {
  pendente: ["Pendente", "Pending", "Pendiente", "En attente"],
  em_processamento: ["Em processamento", "Processing", "En proceso", "En cours de traitement"],
  aprovado: ["Aprovado", "Approved", "Aprobado", "Approuvé"],
  recusado: ["Recusado", "Declined", "Rechazado", "Refusé"],
  reembolsado: ["Reembolsado", "Refunded", "Reembolsado", "Remboursé"],
  cancelado: ["Cancelado", "Canceled", "Cancelado", "Annulé"],
};
const PAY_TONE: Record<AdminPayment["status"], "default" | "good" | "warn" | "bad" | "info"> = {
  pendente: "warn",
  em_processamento: "info",
  aprovado: "good",
  recusado: "bad",
  reembolsado: "default",
  cancelado: "default",
};
const PAGE = 25;

export function FinanceSection() {
  const tr = useTr();
  const overview = useOverview();
  const [status, setStatus] = useState("todos");
  const [offset, setOffset] = useState(0);
  const pays = useAdminPayments({ status, offset, limit: PAGE });
  const list = pays.data ?? [];
  const o = overview.data;

  const exportAll = async () => {
    const rows: AdminPayment[] = [];
    for (let off = 0; off < 2000; off += 100) {
      const page = await adminRpc<AdminPayment[]>("admin_payments", {
        p_status: status,
        p_limit: 100,
        p_offset: off,
      });
      rows.push(...page);
      if (page.length < 100) break;
    }
    downloadCsv(
      `pagamentos-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((p) => ({
        id: p.id,
        paciente: p.patient_name,
        profissional: p.professional_name,
        valor_reais: (p.amount_cents / 100).toFixed(2).replace(".", ","),
        taxa_plataforma_reais: (p.platform_fee_cents / 100).toFixed(2).replace(".", ","),
        situacao: p.status,
        forma: p.method ?? "",
        origem: p.provider,
        criado_em: p.created_at,
        pago_em: p.paid_at ?? "",
        reembolsado_em: p.refunded_at ?? "",
      })),
    );
    void adminActions.log("exportou_pagamentos", "export", "pagamentos", { total: rows.length });
  };

  return (
    <div className="space-y-4">
      {o && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={tr(["Total aprovado", "Total approved", "Total aprobado", "Total approuvé"])}
            value={money(o.paid_cents)}
            icon={Banknote}
            tone="good"
          />
          <StatCard
            label={tr([
              "Taxa da plataforma",
              "Platform fee",
              "Comisión de la plataforma",
              "Commission de la plateforme",
            ])}
            value={money(o.fees_cents)}
            icon={Percent}
          />
          <StatCard
            label={tr(["Reembolsado", "Refunded", "Reembolsado", "Remboursé"])}
            value={money(o.refunded_cents)}
            icon={RotateCcw}
          />
          <StatCard
            label={tr([
              "Consultas próximas",
              "Upcoming appointments",
              "Próximas consultas",
              "Consultations à venir",
            ])}
            value={o.appointments_upcoming}
            sub={`${o.appointments_7d ?? 0} ${tr(["marcadas em 7 dias", "booked in 7 days", "reservadas en 7 días", "réservées en 7 jours"])}`}
            icon={Users}
          />
        </div>
      )}
      <Panel
        title={tr(["Pagamentos", "Payments", "Pagos", "Paiements"])}
        hint={tr([
          "Os pagamentos são processados pelo Stripe; aqui você acompanha o resultado.",
          "Payments are processed by Stripe; here you can follow the outcome.",
          "Los pagos los procesa Stripe; aquí puedes seguir el resultado.",
          "Les paiements sont traités par Stripe ; ici, vous suivez le résultat.",
        ])}
        action={
          <button type="button" onClick={exportAll} className={btnCls}>
            <Download className="h-3.5 w-3.5" />{" "}
            {tr(["Exportar CSV", "Export CSV", "Exportar CSV", "Exporter en CSV"])}
          </button>
        }
      >
        <div className="no-scrollbar mb-4 flex max-w-full gap-1.5 overflow-x-auto">
          {[
            "todos",
            "aprovado",
            "pendente",
            "em_processamento",
            "reembolsado",
            "recusado",
            "cancelado",
          ].map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={status === s}
              onClick={() => {
                setStatus(s);
                setOffset(0);
              }}
              className={`shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                status === s
                  ? "border-accent bg-accent-soft text-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "todos"
                ? tr(["Todos", "All", "Todos", "Tous"])
                : tr(PAY_LABEL[s as AdminPayment["status"]])}
            </button>
          ))}
        </div>
        {pays.error ? (
          <QueryError error={pays.error} />
        ) : pays.isLoading ? (
          <p className="text-sm text-muted-foreground">
            {tr(["Carregando…", "Loading…", "Cargando…", "Chargement…"])}
          </p>
        ) : list.length === 0 ? (
          <Empty>
            {tr([
              "Nenhum pagamento por aqui.",
              "No payments here.",
              "No hay pagos aquí.",
              "Aucun paiement ici.",
            ])}
          </Empty>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border/70">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="bg-secondary/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">
                    {tr(["Quando", "When", "Cuándo", "Quand"])}
                  </th>
                  <th className="px-4 py-2.5 font-semibold">
                    {tr([
                      "Paciente → Profissional",
                      "Patient → Professional",
                      "Paciente → Profesional",
                      "Patient → Professionnel",
                    ])}
                  </th>
                  <th className="px-4 py-2.5 text-right font-semibold">
                    {tr(["Valor", "Amount", "Importe", "Montant"])}
                  </th>
                  <th className="px-4 py-2.5 text-right font-semibold">
                    {tr(["Taxa", "Fee", "Comisión", "Commission"])}
                  </th>
                  <th className="px-4 py-2.5 font-semibold">
                    {tr(["Situação", "Status", "Estado", "Statut"])}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-card">
                {list.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {dateTime(p.created_at)}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {p.patient_name} <span className="text-muted-foreground">→</span>{" "}
                      {p.professional_name}
                      <span className="block text-[11px] text-muted-foreground">
                        {p.provider === "manual"
                          ? tr([
                              "Registro manual",
                              "Manual entry",
                              "Registro manual",
                              "Saisie manuelle",
                            ])
                          : "Online"}
                        {p.method ? ` · ${p.method}` : ""}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                      {money(p.amount_cents)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-muted-foreground">
                      {money(p.platform_fee_cents)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={PAY_TONE[p.status]}>{tr(PAY_LABEL[p.status])}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination offset={offset} limit={PAGE} total={list[0]?.total ?? 0} onChange={setOffset} />
      </Panel>
    </div>
  );
}

// ── Inteligência artificial ──────────────────────────────────────────────────

export function AiSection() {
  const tr = useTr();
  const [days, setDays] = useState(14);
  const stats = useAiStats(days);
  const s = stats.data;
  const dm = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

  return (
    <div className="space-y-4">
      <Panel
        title={tr(["Uso da IA", "AI usage", "Uso de la IA", "Utilisation de l'IA"])}
        hint={tr([
          "Nina, resumos clínicos e a análise automática de publicações e fotos.",
          "Nina, clinical summaries and the automatic review of posts and photos.",
          "Nina, resúmenes clínicos y el análisis automático de publicaciones y fotos.",
          "Nina, résumés cliniques et l'analyse automatique des publications et des photos.",
        ])}
        action={
          <select
            aria-label={tr(["Período", "Period", "Período", "Période"])}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className={`${inputCls} !w-auto`}
          >
            {[7, 14, 30, 60].map((d) => (
              <option key={d} value={d}>
                {tr([
                  `Últimos ${d} dias`,
                  `Last ${d} days`,
                  `Últimos ${d} días`,
                  `${d} derniers jours`,
                ])}
              </option>
            ))}
          </select>
        }
      >
        {stats.error ? (
          <QueryError error={stats.error} />
        ) : !s ? (
          <p className="text-sm text-muted-foreground">
            {tr(["Carregando…", "Loading…", "Cargando…", "Chargement…"])}
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label={tr([
                  "Pessoas usando hoje",
                  "People using it today",
                  "Personas usándola hoy",
                  "Personnes l'utilisant aujourd'hui",
                ])}
                value={s.users_today}
                icon={Users}
              />
              <StatCard
                label={tr([
                  `Conversas com a Nina (${days} dias)`,
                  `Conversations with Nina (${days} days)`,
                  `Conversaciones con Nina (${days} días)`,
                  `Conversations avec Nina (${days} jours)`,
                ])}
                value={s.nina_messages}
                icon={BrainCircuit}
              />
              <StatCard
                label={tr([
                  "Conteúdos barrados pela IA",
                  "Content blocked by the AI",
                  "Contenidos bloqueados por la IA",
                  "Contenus bloqués par l'IA",
                ])}
                value={s.flagged_total}
                sub={`${s.flagged_pending} ${tr(["aguardando revisão", "awaiting review", "pendientes de revisión", "en attente de vérification"])}`}
                icon={Flag}
                tone={s.flagged_pending > 0 ? "alert" : "default"}
              />
              <StatCard
                label={tr([
                  "Acertos da IA na revisão",
                  "AI accuracy on review",
                  "Aciertos de la IA en la revisión",
                  "Taux de justesse de l'IA à la vérification",
                ])}
                value={
                  s.upheld + s.overturned > 0
                    ? `${Math.round((s.upheld / (s.upheld + s.overturned)) * 100)}%`
                    : "—"
                }
                sub={`${s.upheld} ${tr(["confirmadas", "upheld", "confirmadas", "confirmées"])} · ${s.overturned} ${tr(["revertidas", "overturned", "revertidas", "annulées"])}`}
                icon={BrainCircuit}
                tone="good"
              />
            </div>
            <div className="mt-5">
              <StackedBars
                labels={s.by_day.map((d) => dm(d.day))}
                series={[
                  { name: "Nina", color: "#8a5fb0", values: s.by_day.map((d) => d.nina) },
                  {
                    name: tr([
                      "Resumos clínicos",
                      "Clinical summaries",
                      "Resúmenes clínicos",
                      "Résumés cliniques",
                    ]),
                    color: "#0f9aa8",
                    values: s.by_day.map((d) => d.summary),
                  },
                  {
                    name: tr(["Moderação", "Moderation", "Moderación", "Modération"]),
                    color: "#d9692a",
                    values: s.by_day.map((d) => d.moderation),
                  },
                ]}
              />
              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                <span>{dm(s.by_day[0]?.day ?? "0000-00-00")}</span>
                <span>{tr(["hoje", "today", "hoy", "aujourd'hui"])}</span>
              </div>
            </div>
            {s.top_today.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {tr([
                    "Quem mais usou hoje",
                    "Top users today",
                    "Quién más la usó hoy",
                    "Plus gros utilisateurs aujourd'hui",
                  ])}
                </h3>
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {s.top_today.map((t, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2 text-sm"
                    >
                      <span className="truncate">{t.name}</span>
                      <b>{t.count}</b>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </Panel>
      <LimitsPanel />
    </div>
  );
}

const AI_LIMITS = [
  [
    "ai_limit_nina",
    [
      "Perguntas à Nina por pessoa/dia",
      "Questions to Nina per person/day",
      "Preguntas a Nina por persona/día",
      "Questions à Nina par personne/jour",
    ],
    500,
  ],
  [
    "ai_limit_summary",
    [
      "Resumos clínicos por pessoa/dia",
      "Clinical summaries per person/day",
      "Resúmenes clínicos por persona/día",
      "Résumés cliniques par personne/jour",
    ],
    500,
  ],
  [
    "ai_limit_moderation",
    [
      "Análises de publicação e foto por pessoa/dia",
      "Post and photo reviews per person/day",
      "Análisis de publicaciones y fotos por persona/día",
      "Analyses de publications et de photos par personne/jour",
    ],
    2000,
  ],
] as const satisfies readonly (readonly [string, Names, number])[];

function NumberSetting({
  settingKey,
  label,
  max,
  unit,
}: {
  settingKey: string;
  label: string;
  max: number;
  unit?: string;
}) {
  const tr = useTr();
  const settings = useSettings();
  const current = settings.data?.[settingKey];
  const [value, setValue] = useState<string | null>(null);
  const shown = value ?? (current !== undefined ? String(current) : "");
  const save = useAdminAction(
    adminActions.setSetting,
    tr([
      "Configuração salva.",
      "Setting saved.",
      "Configuración guardada.",
      "Paramètre enregistré.",
    ]),
  );
  const changed = value !== null && value !== String(current);
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="block min-w-[14rem] flex-1 space-y-1.5">
        <span className="text-xs font-semibold text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={max}
            step={settingKey === "platform_fee_percent" ? 0.5 : 1}
            value={shown}
            onChange={(e) => setValue(e.target.value)}
            className={`${inputCls} max-w-[10rem]`}
          />
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        </div>
      </label>
      <button
        type="button"
        disabled={!changed || shown === "" || save.isPending}
        onClick={() =>
          save.mutate(
            { key: settingKey, value: Number(shown) },
            { onSuccess: () => setValue(null) },
          )
        }
        className={btnPrimary}
      >
        <Save className="h-3.5 w-3.5" /> {tr(["Salvar", "Save", "Guardar", "Enregistrer"])}
      </button>
    </div>
  );
}

function LimitsPanel() {
  const tr = useTr();
  return (
    <Panel
      title={tr(["Limites diários", "Daily limits", "Límites diarios", "Limites quotidiennes"])}
      hint={tr([
        "Valem para cada pessoa e começam a valer na hora. Use 0 para desligar o recurso.",
        "They apply to each person and take effect immediately. Use 0 to turn the feature off.",
        "Se aplican a cada persona y entran en vigor al instante. Usa 0 para desactivar la función.",
        "Elles s'appliquent à chaque personne et prennent effet immédiatement. Mettez 0 pour désactiver la fonction.",
      ])}
    >
      <div className="space-y-4">
        {AI_LIMITS.map(([key, label, max]) => (
          <NumberSetting key={key} settingKey={key} label={tr(label)} max={max} />
        ))}
      </div>
    </Panel>
  );
}

// ── Configurações ────────────────────────────────────────────────────────────

export function SettingsSection() {
  const tr = useTr();
  return (
    <div className="space-y-4">
      <Panel
        title={tr([
          "Pagamentos e consultas",
          "Payments and appointments",
          "Pagos y consultas",
          "Paiements et consultations",
        ])}
        hint={tr([
          "Mudam só as consultas novas; as já marcadas mantêm o que foi combinado.",
          "Only new appointments change; those already booked keep what was agreed.",
          "Solo cambian las consultas nuevas; las ya reservadas mantienen lo acordado.",
          "Seules les nouvelles consultations changent ; celles déjà réservées gardent ce qui a été convenu.",
        ])}
      >
        <div className="space-y-4">
          <NumberSetting
            settingKey="platform_fee_percent"
            label={tr([
              "Taxa da plataforma sobre cada consulta",
              "Platform fee on each appointment",
              "Comisión de la plataforma por cada consulta",
              "Commission de la plateforme sur chaque consultation",
            ])}
            max={50}
            unit="%"
          />
          <NumberSetting
            settingKey="payment_hold_minutes"
            label={tr([
              "Tempo para pagar e segurar o horário",
              "Time to pay and hold the slot",
              "Tiempo para pagar y reservar el horario",
              "Délai pour payer et garder le créneau",
            ])}
            max={240}
            unit={tr(["minutos", "minutes", "minutos", "minutes"])}
          />
          <NumberSetting
            settingKey="min_booking_notice_hours"
            label={tr([
              "Antecedência mínima para marcar",
              "Minimum booking notice",
              "Antelación mínima para reservar",
              "Délai minimum de réservation",
            ])}
            max={168}
            unit={tr(["horas", "hours", "horas", "heures"])}
          />
        </div>
      </Panel>
      <LimitsPanel />
      <Panel
        title={tr([
          "Sobre esta versão",
          "About this version",
          "Sobre esta versión",
          "À propos de cette version",
        ])}
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {tr([
                "Versão dos documentos legais",
                "Legal documents version",
                "Versión de los documentos legales",
                "Version des documents juridiques",
              ])}
            </dt>
            <dd className="mt-0.5 text-foreground">{LEGAL_VERSION}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {tr(["Pagamentos", "Payments", "Pagos", "Paiements"])}
            </dt>
            <dd className="mt-0.5 text-foreground">
              {tr([
                "Stripe (chaves e webhook ficam nos segredos do Supabase)",
                "Stripe (keys and webhook are kept in Supabase secrets)",
                "Stripe (las claves y el webhook están en los secretos de Supabase)",
                "Stripe (les clés et le webhook sont dans les secrets de Supabase)",
              ])}
            </dd>
          </div>
        </dl>
      </Panel>
    </div>
  );
}

// ── Auditoria ────────────────────────────────────────────────────────────────

const ACTION_LABEL: Record<string, Names> = {
  conta_suspensa: [
    "Suspendeu uma conta",
    "Suspended an account",
    "Suspendió una cuenta",
    "A suspendu un compte",
  ],
  conta_reativada: [
    "Reativou uma conta",
    "Reactivated an account",
    "Reactivó una cuenta",
    "A réactivé un compte",
  ],
  admin_concedido: [
    "Concedeu permissão de administrador",
    "Granted admin permission",
    "Concedió permiso de administrador",
    "A accordé les droits d'administrateur",
  ],
  admin_removido: [
    "Removeu permissão de administrador",
    "Removed admin permission",
    "Quitó el permiso de administrador",
    "A retiré les droits d'administrateur",
  ],
  post_ocultado: [
    "Ocultou uma publicação",
    "Hid a post",
    "Ocultó una publicación",
    "A masqué une publication",
  ],
  post_restaurado: [
    "Restaurou uma publicação",
    "Restored a post",
    "Restauró una publicación",
    "A restauré une publication",
  ],
  post_fixado: [
    "Fixou uma publicação",
    "Pinned a post",
    "Fijó una publicación",
    "A épinglé une publication",
  ],
  post_desafixado: [
    "Desafixou uma publicação",
    "Unpinned a post",
    "Desfijó una publicación",
    "A désépinglé une publication",
  ],
  post_apagado: [
    "Apagou uma publicação",
    "Deleted a post",
    "Eliminó una publicación",
    "A supprimé une publication",
  ],
  configuracao_alterada: [
    "Alterou uma configuração",
    "Changed a setting",
    "Cambió una configuración",
    "A modifié un paramètre",
  ],
  anuncio_criado: [
    "Criou um anúncio",
    "Created an announcement",
    "Creó un anuncio",
    "A créé une annonce",
  ],
  anuncio_editado: [
    "Editou um anúncio",
    "Edited an announcement",
    "Editó un anuncio",
    "A modifié une annonce",
  ],
  anuncio_apagado: [
    "Apagou um anúncio",
    "Deleted an announcement",
    "Eliminó un anuncio",
    "A supprimé une annonce",
  ],
  tema_criado: [
    "Criou um tema da semana",
    "Created a theme of the week",
    "Creó un tema de la semana",
    "A créé un thème de la semaine",
  ],
  tema_editado: [
    "Editou um tema da semana",
    "Edited a theme of the week",
    "Editó un tema de la semana",
    "A modifié un thème de la semaine",
  ],
  fale_conosco_status: [
    "Mudou o status de uma mensagem",
    "Changed a message's status",
    "Cambió el estado de un mensaje",
    "A changé le statut d'un message",
  ],
  exportou_pessoas: [
    "Exportou a lista de pessoas",
    "Exported the people list",
    "Exportó la lista de personas",
    "A exporté la liste des personnes",
  ],
  exportou_pagamentos: [
    "Exportou os pagamentos",
    "Exported the payments",
    "Exportó los pagos",
    "A exporté les paiements",
  ],
  site_config_alterado: [
    "Alterou a configuração do site",
    "Changed the site settings",
    "Cambió la configuración del sitio",
    "A modifié les paramètres du site",
  ],
  ia_barrado_mantido: [
    "Manteve um conteúdo barrado pela IA",
    "Kept content blocked by the AI",
    "Mantuvo un contenido bloqueado por la IA",
    "A maintenu un contenu bloqué par l'IA",
  ],
  ia_barrado_liberado: [
    "Liberou um conteúdo barrado pela IA",
    "Released content blocked by the AI",
    "Liberó un contenido bloqueado por la IA",
    "A débloqué un contenu bloqué par l'IA",
  ],
  apresentacao_rascunho: [
    "Salvou um rascunho da apresentação",
    "Saved a presentation draft",
    "Guardó un borrador de la presentación",
    "A enregistré un brouillon de la présentation",
  ],
  apresentacao_publicada: [
    "Publicou a apresentação",
    "Published the presentation",
    "Publicó la presentación",
    "A publié la présentation",
  ],
  apresentacao_rascunho_descartado: [
    "Descartou o rascunho da apresentação",
    "Discarded the presentation draft",
    "Descartó el borrador de la presentación",
    "A abandonné le brouillon de la présentation",
  ],
};

export function AuditSection() {
  const tr = useTr();
  const actionLabel = (a: string) => (ACTION_LABEL[a] ? tr(ACTION_LABEL[a]) : a);
  const log = useAuditLog();
  const [query, setQuery] = useState("");
  const q = useDebounced(query).toLowerCase();
  const rows = (log.data ?? []).filter(
    (r) =>
      !q ||
      r.admin_name.toLowerCase().includes(q) ||
      actionLabel(r.action).toLowerCase().includes(q) ||
      JSON.stringify(r.details).toLowerCase().includes(q) ||
      (r.target_id ?? "").toLowerCase().includes(q),
  );
  return (
    <Panel
      title={tr(["Auditoria", "Audit log", "Auditoría", "Journal d'audit"])}
      hint={tr([
        "Registro de tudo que os administradores fizeram neste painel (as 300 ações mais recentes).",
        "A record of everything admins did in this panel (the 300 most recent actions).",
        "Registro de todo lo que los administradores hicieron en este panel (las 300 acciones más recientes).",
        "Historique de tout ce que les administrateurs ont fait dans ce panneau (les 300 actions les plus récentes).",
      ])}
      action={
        <button
          type="button"
          onClick={() =>
            downloadCsv(
              `auditoria-${new Date().toISOString().slice(0, 10)}.csv`,
              rows.map((r) => ({
                quando: r.created_at,
                quem: r.admin_name,
                acao: actionLabel(r.action),
                alvo: `${r.target_type ?? ""} ${r.target_id ?? ""}`.trim(),
                detalhes: r.details,
              })),
            )
          }
          className={btnCls}
        >
          <Download className="h-3.5 w-3.5" />{" "}
          {tr(["Exportar CSV", "Export CSV", "Exportar CSV", "Exporter en CSV"])}
        </button>
      }
    >
      <div className="mb-4">
        <SearchBox
          value={query}
          onChange={setQuery}
          placeholder={tr([
            "Filtrar por pessoa, ação ou detalhe…",
            "Filter by person, action or detail…",
            "Filtrar por persona, acción o detalle…",
            "Filtrer par personne, action ou détail…",
          ])}
        />
      </div>
      {log.error ? (
        <QueryError error={log.error} />
      ) : log.isLoading ? (
        <p className="text-sm text-muted-foreground">
          {tr(["Carregando…", "Loading…", "Cargando…", "Chargement…"])}
        </p>
      ) : rows.length === 0 ? (
        <Empty>
          {tr(["Nenhum registro.", "No entries.", "Ningún registro.", "Aucune entrée."])}
        </Empty>
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-start gap-3 bg-card px-4 py-3">
              <span className="w-32 shrink-0 text-xs text-muted-foreground">
                {dateTime(r.created_at)}
              </span>
              <div className="min-w-0 flex-1 basis-60">
                <p className="text-sm text-foreground">
                  <b>{r.admin_name || "—"}</b> · {actionLabel(r.action)}
                </p>
                {(r.target_id || Object.keys(r.details ?? {}).length > 0) && (
                  <p className="mt-0.5 break-all text-[11px] text-muted-foreground">
                    {r.target_type ? `${r.target_type}: ` : ""}
                    {r.target_id}
                    {Object.keys(r.details ?? {}).length > 0
                      ? ` · ${JSON.stringify(r.details)}`
                      : ""}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
