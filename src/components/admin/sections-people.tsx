import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Download,
  ExternalLink,
  Mail,
  MoreHorizontal,
  Trophy,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  Badge,
  ConfirmDialog,
  Empty,
  Pagination,
  Panel,
  QueryError,
  SearchBox,
  btnCls,
  dateTime,
  inputCls,
  shortDate,
  useDebounced,
} from "@/components/admin/admin-ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  adminActions,
  adminRpc,
  downloadCsv,
  useAdminAction,
  useAdminUsers,
  useContactMessages,
  type AdminUser,
} from "@/lib/admin-api";
import { initials } from "@/lib/community";
import { supabase } from "@/integrations/supabase/client";
import { useTr } from "@/components/settings-ui";
import type { Names } from "@/lib/appearance-data";

const PAGE = 25;
const FILTERS: readonly (readonly [string, Names])[] = [
  ["todos", ["Todas", "All", "Todas", "Toutes"]],
  ["pacientes", ["Pacientes", "Patients", "Pacientes", "Patients"]],
  ["profissionais", ["Profissionais", "Professionals", "Profesionales", "Professionnels"]],
  ["admins", ["Administradores", "Admins", "Administradores", "Administrateurs"]],
  ["suspensos", ["Suspensas", "Suspended", "Suspendidas", "Suspendues"]],
];

// ── Pessoas ──────────────────────────────────────────────────────────────────

export function UsersSection({ me }: { me: string }) {
  const tr = useTr();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("todos");
  const [offset, setOffset] = useState(0);
  const q = useDebounced(query);
  const users = useAdminUsers({ query: q, filter, offset, limit: PAGE });
  const list = users.data ?? [];
  const total = list[0]?.total ?? 0;
  const [suspend, setSuspend] = useState<AdminUser | null>(null);
  const [toggleAdmin, setToggleAdmin] = useState<AdminUser | null>(null);
  const [maxScore, setMaxScore] = useState<AdminUser | null>(null);
  const [maxBusy, setMaxBusy] = useState(false);

  // Leva o profissional a 2.000 pontos (nível 5) com ajustes registrados no histórico (até 1.000 por vez).
  const giveMaxScore = async (u: AdminUser) => {
    setMaxBusy(true);
    try {
      const { data, error } = await supabase.rpc("get_pro_status", { p_pro: u.id });
      if (error) throw error;
      let missing = 2000 - (data?.[0]?.score ?? 0);
      while (missing > 0) {
        const step = Math.min(1000, missing);
        const { error: err } = await supabase.rpc("admin_adjust_pro_score", {
          p_pro: u.id,
          p_points: step,
          p_note: "Pontuação máxima liberada pela administração",
        });
        if (err) throw err;
        missing -= step;
      }
      void adminActions.log("pontuacao_maxima", "profile", u.id, { pontos: 2000 });
      toast.success(
        tr([
          `${u.name} agora está no nível máximo (2.000 pontos).`,
          `${u.name} is now at the top level (2,000 points).`,
          `${u.name} ya está en el nivel máximo (2.000 puntos).`,
          `${u.name} est maintenant au niveau maximum (2 000 points).`,
        ]),
      );
      setMaxScore(null);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : tr([
              "Não foi possível ajustar a pontuação.",
              "Couldn't adjust the score.",
              "No se pudo ajustar la puntuación.",
              "Impossible d'ajuster le score.",
            ]),
      );
    } finally {
      setMaxBusy(false);
    }
  };

  const suspendAction = useAdminAction(
    adminActions.setSuspended,
    tr(["Conta atualizada.", "Account updated.", "Cuenta actualizada.", "Compte mis à jour."]),
  );
  const adminAction = useAdminAction(
    adminActions.setAdmin,
    tr([
      "Permissão atualizada.",
      "Permission updated.",
      "Permiso actualizado.",
      "Droits mis à jour.",
    ]),
  );

  const exportAll = async () => {
    try {
      const rows: AdminUser[] = [];
      for (let o = 0; o < 2000; o += 100) {
        const page = await adminRpc<AdminUser[]>("admin_search_users", {
          p_query: q,
          p_filter: filter,
          p_limit: 100,
          p_offset: o,
        });
        rows.push(...page);
        if (page.length < 100) break;
      }
      downloadCsv(
        `pessoas-${new Date().toISOString().slice(0, 10)}.csv`,
        rows.map((u) => ({
          id: u.id,
          nome: u.name,
          usuario: u.username,
          email: u.email ?? "",
          tipo: u.verified ? "profissional" : "paciente",
          administrador: u.is_admin ? "sim" : "não",
          suspensa: u.suspended_at ? "sim" : "não",
          publicacoes: u.posts_count,
          denuncias_pendentes: u.reports_pending,
          criada_em: u.created_at,
        })),
      );
      void adminActions.log("exportou_pessoas", "export", "pessoas", {
        filtro: filter,
        total: rows.length,
      });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : tr([
              "Não foi possível exportar.",
              "Couldn't export.",
              "No se pudo exportar.",
              "Impossible d'exporter.",
            ]),
      );
    }
  };

  return (
    <div className="space-y-4">
      <Panel
        title={tr(["Pessoas", "People", "Personas", "Personnes"])}
        hint={tr([
          "Busque por nome, @usuário ou e-mail. Suspenda contas, conceda permissões e exporte a lista.",
          "Search by name, @username or email. Suspend accounts, grant permissions and export the list.",
          "Busca por nombre, @usuario o correo. Suspende cuentas, concede permisos y exporta la lista.",
          "Recherchez par nom, @utilisateur ou e-mail. Suspendez des comptes, accordez des droits et exportez la liste.",
        ])}
        action={
          <button type="button" onClick={exportAll} className={btnCls}>
            <Download className="h-3.5 w-3.5" />{" "}
            {tr(["Exportar CSV", "Export CSV", "Exportar CSV", "Exporter en CSV"])}
          </button>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <SearchBox
            value={query}
            onChange={(v) => {
              setQuery(v);
              setOffset(0);
            }}
            placeholder={tr([
              "Nome, @usuário ou e-mail…",
              "Name, @username or email…",
              "Nombre, @usuario o correo…",
              "Nom, @utilisateur ou e-mail…",
            ])}
          />
          <div className="no-scrollbar flex max-w-full gap-1.5 overflow-x-auto">
            {FILTERS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={filter === id}
                onClick={() => {
                  setFilter(id);
                  setOffset(0);
                }}
                className={`shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  filter === id
                    ? "border-accent bg-accent-soft text-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {tr(label)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          {users.error ? (
            <QueryError error={users.error} />
          ) : users.isLoading ? (
            <p className="text-sm text-muted-foreground">
              {tr(["Carregando…", "Loading…", "Cargando…", "Chargement…"])}
            </p>
          ) : list.length === 0 ? (
            <Empty>
              {tr([
                "Nenhuma pessoa encontrada.",
                "No one found.",
                "No se encontró a nadie.",
                "Personne trouvée.",
              ])}
            </Empty>
          ) : (
            <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70">
              {list.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center gap-3 bg-card px-4 py-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-xs font-extrabold text-primary">
                    {initials(u.name)}
                  </span>
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-foreground">
                      <span className="truncate">
                        {u.name || tr(["(sem nome)", "(no name)", "(sin nombre)", "(sans nom)"])}
                      </span>
                      {u.verified && (
                        <Badge tone="info">
                          {tr(["Profissional", "Professional", "Profesional", "Professionnel"])}
                        </Badge>
                      )}
                      {u.is_admin && <Badge tone="good">Admin</Badge>}
                      {u.suspended_at && (
                        <Badge tone="bad">
                          {tr(["Suspensa", "Suspended", "Suspendida", "Suspendue"])}
                        </Badge>
                      )}
                      {u.reports_pending > 0 && (
                        <Badge tone="warn">
                          {u.reports_pending}{" "}
                          {u.reports_pending > 1
                            ? tr(["denúncias", "reports", "denuncias", "signalements"])
                            : tr(["denúncia", "report", "denuncia", "signalement"])}
                        </Badge>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{u.username} ·{" "}
                      {u.email ?? tr(["sem e-mail", "no email", "sin correo", "sans e-mail"])}
                    </p>
                  </div>
                  <div className="hidden text-right text-xs text-muted-foreground sm:block">
                    <p>
                      {u.posts_count}{" "}
                      {tr(["publicações", "posts", "publicaciones", "publications"])}
                    </p>
                    <p>
                      {tr(["desde", "since", "desde", "depuis"])} {shortDate(u.created_at)}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={btnCls}
                        aria-label={`${tr(["Ações para", "Actions for", "Acciones para", "Actions pour"])} ${u.name}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-60">
                      <DropdownMenuItem asChild>
                        <Link
                          to="/perfil/$userId"
                          params={{ userId: u.id }}
                          className="flex cursor-pointer items-center gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />{" "}
                          {tr(["Abrir perfil", "Open profile", "Abrir perfil", "Ouvrir le profil"])}
                        </Link>
                      </DropdownMenuItem>
                      {u.email && (
                        <DropdownMenuItem asChild>
                          <a
                            href={`mailto:${u.email}`}
                            className="flex cursor-pointer items-center gap-2"
                          >
                            <Mail className="h-4 w-4" />{" "}
                            {tr([
                              "Enviar e-mail",
                              "Send email",
                              "Enviar correo",
                              "Envoyer un e-mail",
                            ])}
                          </a>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {u.id !== me && !u.is_admin && (
                        <DropdownMenuItem
                          onClick={() =>
                            u.suspended_at
                              ? suspendAction.mutate({ user: u.id, suspend: false, reason: "" })
                              : setSuspend(u)
                          }
                          className="flex cursor-pointer items-center gap-2"
                        >
                          {u.suspended_at ? (
                            <UserCheck className="h-4 w-4" />
                          ) : (
                            <UserX className="h-4 w-4 text-destructive" />
                          )}
                          {u.suspended_at
                            ? tr([
                                "Reativar conta",
                                "Reactivate account",
                                "Reactivar cuenta",
                                "Réactiver le compte",
                              ])
                            : tr([
                                "Suspender conta",
                                "Suspend account",
                                "Suspender cuenta",
                                "Suspendre le compte",
                              ])}
                        </DropdownMenuItem>
                      )}
                      {u.verified && (
                        <DropdownMenuItem
                          onClick={() => setMaxScore(u)}
                          className="flex cursor-pointer items-center gap-2"
                        >
                          <Trophy className="h-4 w-4 text-accent" />{" "}
                          {tr([
                            "Pontuação máxima (nível 5)",
                            "Top score (level 5)",
                            "Puntuación máxima (nivel 5)",
                            "Score maximum (niveau 5)",
                          ])}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => setToggleAdmin(u)}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        {u.is_admin ? (
                          <ShieldOff className="h-4 w-4" />
                        ) : (
                          <ShieldCheck className="h-4 w-4" />
                        )}
                        {u.is_admin
                          ? tr([
                              "Remover administrador",
                              "Remove admin",
                              "Quitar administrador",
                              "Retirer l'administrateur",
                            ])
                          : tr([
                              "Tornar administrador",
                              "Make admin",
                              "Hacer administrador",
                              "Nommer administrateur",
                            ])}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          )}
          <Pagination offset={offset} limit={PAGE} total={total} onChange={setOffset} />
        </div>
      </Panel>

      <ConfirmDialog
        open={!!suspend}
        title={tr([
          `Suspender ${suspend?.name ?? ""}?`,
          `Suspend ${suspend?.name ?? ""}?`,
          `¿Suspender a ${suspend?.name ?? ""}?`,
          `Suspendre ${suspend?.name ?? ""} ?`,
        ])}
        description={tr([
          "A pessoa continua podendo entrar e ler, mas não consegue publicar nem comentar. Ela recebe um aviso com o motivo.",
          "The person can still sign in and read, but can't post or comment. They get a notice with the reason.",
          "La persona puede seguir entrando y leyendo, pero no puede publicar ni comentar. Recibe un aviso con el motivo.",
          "La personne peut toujours se connecter et lire, mais ne peut ni publier ni commenter. Elle reçoit un avis avec le motif.",
        ])}
        confirmLabel={tr(["Suspender", "Suspend", "Suspender", "Suspendre"])}
        danger
        askReason
        busy={suspendAction.isPending}
        onClose={() => setSuspend(null)}
        onConfirm={(reason) =>
          suspend &&
          suspendAction.mutate(
            { user: suspend.id, suspend: true, reason },
            { onSuccess: () => setSuspend(null) },
          )
        }
      />
      <ConfirmDialog
        open={!!maxScore}
        title={tr([
          `Dar a pontuação máxima a ${maxScore?.name ?? ""}?`,
          `Give ${maxScore?.name ?? ""} the top score?`,
          `¿Dar la puntuación máxima a ${maxScore?.name ?? ""}?`,
          `Donner le score maximum à ${maxScore?.name ?? ""} ?`,
        ])}
        description={tr([
          "O profissional vai para 2.000 pontos: nível 5 (excelência), taxa de 10% e todas as funções liberadas. O ajuste fica registrado no histórico de pontos.",
          "The professional goes to 2,000 points: level 5 (excellence), a 10% fee and every feature unlocked. The adjustment is recorded in the points history.",
          "El profesional pasa a 2.000 puntos: nivel 5 (excelencia), comisión del 10 % y todas las funciones desbloqueadas. El ajuste queda registrado en el historial de puntos.",
          "Le professionnel passe à 2 000 points : niveau 5 (excellence), commission de 10 % et toutes les fonctions débloquées. L'ajustement est enregistré dans l'historique des points.",
        ])}
        confirmLabel={tr([
          "Dar pontuação máxima",
          "Give top score",
          "Dar puntuación máxima",
          "Donner le score maximum",
        ])}
        busy={maxBusy}
        onClose={() => setMaxScore(null)}
        onConfirm={() => maxScore && void giveMaxScore(maxScore)}
      />
      <ConfirmDialog
        open={!!toggleAdmin}
        title={
          toggleAdmin?.is_admin
            ? tr([
                `Remover ${toggleAdmin?.name} dos administradores?`,
                `Remove ${toggleAdmin?.name} from the admins?`,
                `¿Quitar a ${toggleAdmin?.name} de los administradores?`,
                `Retirer ${toggleAdmin?.name} des administrateurs ?`,
              ])
            : tr([
                `Tornar ${toggleAdmin?.name} administrador?`,
                `Make ${toggleAdmin?.name} an admin?`,
                `¿Hacer administrador a ${toggleAdmin?.name}?`,
                `Nommer ${toggleAdmin?.name} administrateur ?`,
              ])
        }
        description={
          toggleAdmin?.is_admin
            ? tr([
                "A pessoa perde o acesso a este painel.",
                "The person loses access to this panel.",
                "La persona pierde el acceso a este panel.",
                "La personne perd l'accès à ce panneau.",
              ])
            : tr([
                "A pessoa passa a ter acesso total a este painel, inclusive para suspender contas.",
                "The person gets full access to this panel, including suspending accounts.",
                "La persona pasa a tener acceso total a este panel, incluso para suspender cuentas.",
                "La personne obtient un accès complet à ce panneau, y compris pour suspendre des comptes.",
              ])
        }
        confirmLabel={
          toggleAdmin?.is_admin
            ? tr(["Remover", "Remove", "Quitar", "Retirer"])
            : tr(["Conceder", "Grant", "Conceder", "Accorder"])
        }
        danger={!!toggleAdmin?.is_admin}
        busy={adminAction.isPending}
        onClose={() => setToggleAdmin(null)}
        onConfirm={() =>
          toggleAdmin &&
          adminAction.mutate(
            { user: toggleAdmin.id, make: !toggleAdmin.is_admin },
            { onSuccess: () => setToggleAdmin(null) },
          )
        }
      />
    </div>
  );
}

// ── Fale conosco ─────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<"novo" | "em_atendimento" | "resolvido", Names> = {
  novo: ["Nova", "New", "Nueva", "Nouveau"],
  em_atendimento: ["Em atendimento", "In progress", "En atención", "En cours"],
  resolvido: ["Resolvida", "Resolved", "Resuelta", "Résolu"],
};
const STATUS_TONE = { novo: "warn", em_atendimento: "info", resolvido: "good" } as const;

export function ContactSection() {
  const tr = useTr();
  const messages = useContactMessages();
  const [filter, setFilter] = useState<"todas" | "novo" | "em_atendimento" | "resolvido">("novo");
  const [openId, setOpenId] = useState<string | null>(null);
  const setStatus = useAdminAction(
    async (p: { id: string; status: keyof typeof STATUS_LABEL }) => {
      const { error } = await supabase
        .from("contact_messages")
        .update({ status: p.status })
        .eq("id", p.id);
      if (error) throw new Error(error.message);
      void adminActions.log("fale_conosco_status", "contact_message", p.id, { status: p.status });
    },
    tr(["Status atualizado.", "Status updated.", "Estado actualizado.", "Statut mis à jour."]),
  );

  const all = messages.data ?? [];
  const list = filter === "todas" ? all : all.filter((m) => m.status === filter);

  return (
    <Panel
      title={tr(["Fale conosco", "Contact us", "Contáctanos", "Nous contacter"])}
      hint={tr([
        "Mensagens enviadas pelo formulário de contato do site.",
        "Messages sent through the site's contact form.",
        "Mensajes enviados por el formulario de contacto del sitio.",
        "Messages envoyés via le formulaire de contact du site.",
      ])}
    >
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["novo", "em_atendimento", "resolvido", "todas"] as const).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
            className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              filter === id
                ? "border-accent bg-accent-soft text-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {id === "todas" ? tr(["Todas", "All", "Todas", "Tous"]) : tr(STATUS_LABEL[id])}{" "}
            <span className="opacity-60">
              {id === "todas" ? all.length : all.filter((m) => m.status === id).length}
            </span>
          </button>
        ))}
      </div>
      {messages.error ? (
        <QueryError error={messages.error} />
      ) : messages.isLoading ? (
        <p className="text-sm text-muted-foreground">
          {tr(["Carregando…", "Loading…", "Cargando…", "Chargement…"])}
        </p>
      ) : list.length === 0 ? (
        <Empty>
          {tr([
            "Nenhuma mensagem aqui.",
            "No messages here.",
            "No hay mensajes aquí.",
            "Aucun message ici.",
          ])}
        </Empty>
      ) : (
        <ul className="space-y-2">
          {list.map((m) => {
            const open = openId === m.id;
            return (
              <li key={m.id} className="rounded-2xl border border-border/70 bg-card">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : m.id)}
                  className="flex w-full cursor-pointer flex-wrap items-center gap-3 px-4 py-3 text-left"
                >
                  <div className="min-w-0 flex-1 basis-60">
                    <p className="truncate text-sm font-semibold text-foreground">{m.subject}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.name} · {m.email}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[m.status]}>{tr(STATUS_LABEL[m.status])}</Badge>
                  <span className="text-xs text-muted-foreground">{dateTime(m.created_at)}</span>
                </button>
                {open && (
                  <div className="border-t border-border/60 px-4 py-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {m.message}
                    </p>
                    {m.phone && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {tr(["Telefone:", "Phone:", "Teléfono:", "Téléphone :"])} {m.phone}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <a
                        href={`mailto:${m.email}?subject=${encodeURIComponent("Re: " + m.subject)}`}
                        className={btnCls}
                      >
                        <Mail className="h-3.5 w-3.5" />{" "}
                        {tr([
                          "Responder por e-mail",
                          "Reply by email",
                          "Responder por correo",
                          "Répondre par e-mail",
                        ])}
                      </a>
                      <select
                        aria-label={tr([
                          "Mudar status",
                          "Change status",
                          "Cambiar estado",
                          "Changer le statut",
                        ])}
                        value={m.status}
                        onChange={(e) =>
                          setStatus.mutate({
                            id: m.id,
                            status: e.target.value as keyof typeof STATUS_LABEL,
                          })
                        }
                        className={`${inputCls} !w-auto`}
                      >
                        {(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((s) => (
                          <option key={s} value={s}>
                            {tr(STATUS_LABEL[s])}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
