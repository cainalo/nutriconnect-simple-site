// Loja de programas do profissional (N10): criar programas em módulos, pôr na loja, acompanhar as
// vendas. Liberada a partir do nível 3 (pro_features "loja_programas"); a cobrança usa a mesma conta
// de recebimento (Stripe Connect) do perfil de membros.
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Lock,
  Pencil,
  Percent,
  Plus,
  ShoppingBag,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  Card,
  Field,
  Loading,
  PageHeader,
  Stat,
  buttonPrimary,
  buttonSecondary,
  inputClass,
} from "@/components/clinical/ui";
import { useTr } from "@/components/appearance-editor";
import { useAuth } from "@/hooks/use-auth";
import { useClinicalI18n } from "@/lib/clinical/i18n";
import { formatMoney } from "@/lib/clinical/format";
import { useConnectStatus } from "@/lib/social/members-queries";
import { useProStatus } from "@/lib/social/pro-score-queries";
import {
  PROGRAM_EMOJIS,
  useDeleteModule,
  useProPrograms,
  useProgramModules,
  useProgramSales,
  useSaveModule,
  useSaveProgram,
  type Program,
  type ProgramModule,
} from "@/lib/programs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/painel/programas")({
  component: ProgramsPanel,
});

const onError = (err: unknown) => toast.error((err as Error).message);

function ProgramsPanel() {
  const { user } = useAuth();
  const tr = useTr();
  const { locale } = useClinicalI18n();
  const status = useProStatus(user?.id);
  const unlocked = !!status.data?.features.includes("loja_programas");
  // Nível suficiente, mas a loja ainda não existe no banco (migration pendente).
  const pendingSetup = !unlocked && (status.data?.level ?? 1) >= 3;
  const connect = useConnectStatus(unlocked);
  const programs = useProPrograms(user?.id, false);
  const sales = useProgramSales(unlocked);
  const [editing, setEditing] = useState<Program | "novo" | null>(null);

  if (!user) return null;
  if (status.isLoading) return <Loading />;
  const title = tr([
    "Loja de programas",
    "Program store",
    "Tienda de programas",
    "Boutique de programmes",
  ]);

  if (!unlocked) {
    return (
      <>
        <PageHeader title={title} />
        <Card>
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {pendingSetup
                ? tr([
                    "A loja de programas ainda está sendo ativada no sistema. Volte em instantes.",
                    "The program store is still being enabled. Please come back shortly.",
                    "La tienda de programas aún se está activando. Vuelve en un momento.",
                    "La boutique de programmes est en cours d'activation. Revenez bientôt.",
                  ])
                : tr([
                    "A loja de programas é liberada a partir do nível 3. Continue atendendo, respondendo dúvidas e publicando conteúdo para subir de nível.",
                    "The program store unlocks at level 3. Keep seeing patients, answering questions and posting to level up.",
                    "La tienda de programas se libera desde el nivel 3. Sigue atendiendo, respondiendo dudas y publicando para subir de nivel.",
                    "La boutique de programmes s'ouvre au niveau 3. Continuez à consulter, répondre et publier pour progresser.",
                  ])}
            </p>
          </div>
        </Card>
      </>
    );
  }

  const fee = status.data?.feePercent ?? 20;
  const connected = !!connect.data?.chargesEnabled;
  const s = sales.data;

  return (
    <>
      <PageHeader
        title={title}
        action={
          <button type="button" className={buttonPrimary} onClick={() => setEditing("novo")}>
            <Plus className="h-4 w-4" />
            {tr(["Novo programa", "New program", "Nuevo programa", "Nouveau programme"])}
          </button>
        }
      />

      {!connect.isLoading && !connected && (
        <Card className="mb-5 border-warning/40 bg-warning/10">
          <p className="text-sm text-foreground">
            {tr([
              "Para vender, conecte a sua conta de recebimento (a mesma do perfil de membros).",
              "To sell, connect your payout account (the same one used for members).",
              "Para vender, conecta tu cuenta de cobro (la misma del perfil de miembros).",
              "Pour vendre, connectez votre compte de paiement (le même que pour les membres).",
            ])}{" "}
            <Link to="/painel/membros" className="font-semibold text-accent hover:underline">
              {tr(["Conectar", "Connect", "Conectar", "Connecter"])}
            </Link>
          </p>
        </Card>
      )}

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Stat
          label={tr([
            "Vendas (30 dias)",
            "Sales (30 days)",
            "Ventas (30 días)",
            "Ventes (30 jours)",
          ])}
          value={s?.sales ?? 0}
          icon={ShoppingBag}
        />
        <Stat
          label={tr([
            "Você recebe (30 dias)",
            "You receive (30 days)",
            "Recibes (30 días)",
            "Vous recevez (30 jours)",
          ])}
          value={formatMoney(Number(s?.net_cents ?? 0), locale)}
          icon={Wallet}
        />
        <Stat
          label={tr([
            "Taxa do seu nível",
            "Your level fee",
            "Tasa de tu nivel",
            "Frais de votre niveau",
          ])}
          value={`${fee}%`}
          hint={tr([
            "A mesma das assinaturas de membros; cai quando você sobe de nível.",
            "Same as member subscriptions; drops as you level up.",
            "La misma de las suscripciones; baja al subir de nivel.",
            "La même que les abonnements ; elle baisse avec le niveau.",
          ])}
          icon={Percent}
        />
      </div>

      {editing && (
        <ProgramForm
          program={editing === "novo" ? null : editing}
          onDone={(p) => setEditing(p ?? null)}
          onClose={() => setEditing(null)}
        />
      )}

      {programs.isLoading ? (
        <Loading />
      ) : (programs.data ?? []).length === 0 && !editing ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            {tr([
              "Monte um programa em módulos (por exemplo, uma semana por módulo) e coloque na loja. Quem compra acompanha o progresso módulo a módulo.",
              "Build a program in modules (e.g. one week per module) and put it in the store. Buyers track their progress module by module.",
              "Arma un programa en módulos (por ejemplo, una semana por módulo) y ponlo en la tienda. Quien compra sigue su progreso módulo a módulo.",
              "Créez un programme en modules (par exemple une semaine par module) et mettez-le en boutique. Les acheteurs suivent leur progression.",
            ])}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {(programs.data ?? []).map((p) => (
            <Card key={p.id}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-3xl" aria-hidden>
                  {p.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatMoney(p.price_cents, locale)} · {p.duration_weeks}{" "}
                    {tr(["semanas", "weeks", "semanas", "semaines"])} ·{" "}
                    <span className={p.active ? "font-semibold text-accent" : ""}>
                      {p.active
                        ? tr(["Na loja", "In the store", "En la tienda", "En boutique"])
                        : tr(["Rascunho", "Draft", "Borrador", "Brouillon"])}
                    </span>
                  </p>
                </div>
                {p.active && (
                  <Link
                    to="/programas/$programId"
                    params={{ programId: p.id }}
                    className={buttonSecondary}
                  >
                    <ExternalLink className="h-4 w-4" />
                    {tr(["Ver na loja", "View in store", "Ver en la tienda", "Voir"])}
                  </Link>
                )}
                <button type="button" className={buttonSecondary} onClick={() => setEditing(p)}>
                  <Pencil className="h-4 w-4" />
                  {tr(["Editar", "Edit", "Editar", "Modifier"])}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function ProgramForm({
  program,
  onDone,
  onClose,
}: {
  program: Program | null;
  onDone: (p: Program | null) => void;
  onClose: () => void;
}) {
  const tr = useTr();
  const save = useSaveProgram();
  const [title, setTitle] = useState(program?.title ?? "");
  const [summary, setSummary] = useState(program?.summary ?? "");
  const [description, setDescription] = useState(program?.description ?? "");
  const [price, setPrice] = useState(program ? String(program.price_cents / 100) : "49");
  const [weeks, setWeeks] = useState(program?.duration_weeks ?? 4);
  const [emoji, setEmoji] = useState(program?.emoji ?? PROGRAM_EMOJIS[0]);
  const [active, setActive] = useState(program?.active ?? false);
  const cents = Math.round(Number(price.replace(",", ".")) * 100);
  const validPrice = Number.isFinite(cents) && cents >= 1000 && cents <= 100000;

  const submit = () =>
    save.mutate(
      {
        id: program?.id ?? null,
        title: title.trim(),
        summary: summary.trim(),
        description: description.trim(),
        priceCents: cents,
        weeks,
        emoji,
        active,
      },
      {
        onSuccess: (p) => {
          toast.success(
            tr([
              "Programa salvo.",
              "Program saved.",
              "Programa guardado.",
              "Programme enregistré.",
            ]),
          );
          onDone(p);
        },
        onError,
      },
    );

  return (
    <Card
      className="mb-5"
      title={
        program
          ? tr(["Editar programa", "Edit program", "Editar programa", "Modifier le programme"])
          : tr(["Novo programa", "New program", "Nuevo programa", "Nouveau programme"])
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={tr(["Nome", "Name", "Nombre", "Nom"])} className="sm:col-span-2">
          <input
            value={title}
            maxLength={100}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field
          label={tr([
            "Resumo (aparece na vitrine)",
            "Summary (shown in the store)",
            "Resumen (en la tienda)",
            "Résumé (en vitrine)",
          ])}
          className="sm:col-span-2"
        >
          <input
            value={summary}
            maxLength={300}
            onChange={(e) => setSummary(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field
          label={tr(["Descrição", "Description", "Descripción", "Description"])}
          className="sm:col-span-2"
        >
          <textarea
            value={description}
            maxLength={4000}
            rows={4}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field
          label={tr([
            "Preço (R$ 10 a R$ 1.000)",
            "Price (R$10–R$1,000)",
            "Precio (R$10 a R$1.000)",
            "Prix (10 à 1 000 R$)",
          ])}
        >
          <input
            value={price}
            inputMode="decimal"
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field
          label={tr([
            "Duração (semanas)",
            "Length (weeks)",
            "Duración (semanas)",
            "Durée (semaines)",
          ])}
        >
          <input
            type="number"
            min={1}
            max={52}
            value={weeks}
            onChange={(e) => setWeeks(Math.min(52, Math.max(1, Number(e.target.value) || 1)))}
            className={inputClass}
          />
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {PROGRAM_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            aria-pressed={emoji === e}
            onClick={() => setEmoji(e)}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-xl border text-lg transition",
              emoji === e ? "border-accent bg-accent-soft" : "border-border hover:bg-secondary",
            )}
          >
            {e}
          </button>
        ))}
      </div>
      {program && (
        <label className="mt-4 flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          {tr(["Colocar na loja", "Put in the store", "Poner en la tienda", "Mettre en boutique"])}
        </label>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonPrimary}
          disabled={title.trim().length < 3 || !validPrice || save.isPending}
          onClick={submit}
        >
          {tr(["Salvar", "Save", "Guardar", "Enregistrer"])}
        </button>
        <button type="button" className={buttonSecondary} onClick={onClose}>
          {tr(["Fechar", "Close", "Cerrar", "Fermer"])}
        </button>
      </div>
      {!program && (
        <p className="mt-3 text-xs text-muted-foreground">
          {tr([
            "Depois de salvar, adicione os módulos e coloque o programa na loja.",
            "After saving, add modules and put the program in the store.",
            "Después de guardar, agrega los módulos y pon el programa en la tienda.",
            "Après l'enregistrement, ajoutez les modules puis mettez-le en boutique.",
          ])}
        </p>
      )}
      {program && <ModulesEditor programId={program.id} />}
    </Card>
  );
}

function ModulesEditor({ programId }: { programId: string }) {
  const tr = useTr();
  const modules = useProgramModules(programId);
  const save = useSaveModule(programId);
  const remove = useDeleteModule();
  const [editing, setEditing] = useState<ProgramModule | "novo" | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const list = modules.data ?? [];

  const open = (m: ProgramModule | "novo") => {
    setEditing(m);
    setTitle(m === "novo" ? "" : m.title);
    setBody(m === "novo" ? "" : m.body);
  };
  const move = (m: ProgramModule, dir: -1 | 1) => {
    const i = list.findIndex((x) => x.id === m.id);
    const other = list[i + dir];
    if (!other) return;
    save.mutate({ id: m.id, title: m.title, body: m.body, position: other.position }, { onError });
    save.mutate(
      { id: other.id, title: other.title, body: other.body, position: m.position },
      { onError },
    );
  };

  return (
    <div className="mt-6 border-t border-border/60 pt-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-foreground">
          {tr(["Módulos", "Modules", "Módulos", "Modules"])} ({list.length})
        </h3>
        <button type="button" className={buttonSecondary} onClick={() => open("novo")}>
          <Plus className="h-4 w-4" />
          {tr(["Módulo", "Module", "Módulo", "Module"])}
        </button>
      </div>
      <ol className="mt-3 space-y-2">
        {list.map((m, i) => (
          <li
            key={m.id}
            className="flex items-center gap-2 rounded-2xl border border-border/70 p-2.5"
          >
            <span className="w-6 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">{m.title}</span>
            <button
              type="button"
              className="p-1 text-muted-foreground hover:text-foreground"
              onClick={() => move(m, -1)}
              disabled={i === 0}
              aria-label="↑"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="p-1 text-muted-foreground hover:text-foreground"
              onClick={() => move(m, 1)}
              disabled={i === list.length - 1}
              aria-label="↓"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="p-1 text-muted-foreground hover:text-foreground"
              onClick={() => open(m)}
              aria-label={tr(["Editar", "Edit", "Editar", "Modifier"])}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="p-1 text-muted-foreground hover:text-destructive"
              aria-label={tr(["Apagar", "Delete", "Borrar", "Supprimer"])}
              onClick={() => {
                if (
                  window.confirm(
                    tr([
                      "Apagar este módulo?",
                      "Delete this module?",
                      "¿Borrar este módulo?",
                      "Supprimer ce module ?",
                    ]),
                  )
                )
                  remove.mutate(m.id, { onError });
              }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ol>
      {editing && (
        <div className="mt-3 space-y-2 rounded-2xl border border-accent/40 bg-accent-soft/20 p-3">
          <input
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={tr([
              "Título (ex.: Semana 1 — Lanches com fruta)",
              "Title (e.g. Week 1 — Fruit snacks)",
              "Título (ej.: Semana 1 — Meriendas con fruta)",
              "Titre (ex. : Semaine 1 — Goûters fruités)",
            ])}
            className={inputClass}
          />
          <textarea
            value={body}
            maxLength={8000}
            rows={8}
            onChange={(e) => setBody(e.target.value)}
            placeholder={tr([
              "Conteúdo do módulo: orientações, receitas, tarefas da semana…",
              "Module content: guidance, recipes, weekly tasks…",
              "Contenido: orientaciones, recetas, tareas de la semana…",
              "Contenu : conseils, recettes, tâches de la semaine…",
            ])}
            className={inputClass}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className={buttonPrimary}
              disabled={!title.trim() || !body.trim() || save.isPending}
              onClick={() =>
                save.mutate(
                  {
                    id: editing === "novo" ? null : editing.id,
                    title,
                    body,
                    position: editing === "novo" ? null : editing.position,
                  },
                  { onSuccess: () => setEditing(null), onError },
                )
              }
            >
              {tr(["Salvar módulo", "Save module", "Guardar módulo", "Enregistrer"])}
            </button>
            <button type="button" className={buttonSecondary} onClick={() => setEditing(null)}>
              {tr(["Cancelar", "Cancel", "Cancelar", "Annuler"])}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
