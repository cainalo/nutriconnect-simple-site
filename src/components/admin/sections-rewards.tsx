// Recompensas (X4): cadastro das recompensas trocadas por pontos e os códigos resgatados. O desconto
// de programa sai da taxa da plataforma (no máximo a taxa inteira); brinde de parceiro é entregue
// pela equipe com o parceiro, e aqui se marca como entregue ou se devolvem os pontos.
import { useState } from "react";
import { toast } from "sonner";
import { Gift, Pencil, Plus, Ticket } from "lucide-react";
import {
  Badge,
  Empty,
  Panel,
  QueryError,
  StatCard,
  btnCls,
  btnPrimary,
  dateTime,
  inputCls,
} from "@/components/admin/admin-ui";
import { useMarketPartners } from "@/lib/markets";
import {
  useAdminRedemption,
  useAllRedemptions,
  useRewards,
  useSaveReward,
  type Reward,
} from "@/lib/rewards";
import { useTr } from "@/components/settings-ui";
import type { Names } from "@/lib/appearance-data";

const REDEMPTION_STATUS: Record<string, Names> = {
  ativo: ["ativo", "active", "activo", "actif"],
  usado: ["usado", "used", "usado", "utilisé"],
  expirado: ["expirado", "expired", "caducado", "expiré"],
};

type Draft = Partial<Reward> & { title: string; kind: string; cost: number };
const EMPTY: Draft = {
  kind: "desconto_programa",
  title: "",
  description: "",
  cost: 600,
  discount_percent: 10,
  valid_days: 60,
  active: true,
  position: 0,
  stock: null,
};

export function RewardsSection() {
  const tr = useTr();
  const rewards = useRewards();
  const redemptions = useAllRedemptions(true);
  const partners = useMarketPartners(true);
  const save = useSaveReward();
  const act = useAdminRedemption();
  const [draft, setDraft] = useState<Draft | null>(null);

  const list = redemptions.data ?? [];
  const active = list.filter((r) => r.status === "ativo").length;
  const used = list.filter((r) => r.status === "usado").length;

  const submit = () => {
    if (!draft) return;
    const isDiscount = draft.kind === "desconto_programa";
    save.mutate(
      {
        id: draft.id,
        kind: draft.kind,
        title: draft.title.trim(),
        description: draft.description ?? "",
        cost: draft.cost,
        discount_percent: isDiscount ? (draft.discount_percent ?? 10) : null,
        partner_id: isDiscount ? null : (draft.partner_id ?? null),
        stock: draft.stock ?? null,
        valid_days: draft.valid_days ?? 60,
        active: draft.active ?? true,
        position: draft.position ?? 0,
      },
      {
        onSuccess: () => {
          toast.success(
            tr([
              "Recompensa salva.",
              "Reward saved.",
              "Recompensa guardada.",
              "Récompense enregistrée.",
            ]),
          );
          setDraft(null);
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label={tr([
            "Códigos ativos (últimos 100)",
            "Active codes (last 100)",
            "Códigos activos (últimos 100)",
            "Codes actifs (100 derniers)",
          ])}
          value={active}
          icon={Ticket}
        />
        <StatCard
          label={tr([
            "Códigos usados (últimos 100)",
            "Used codes (last 100)",
            "Códigos usados (últimos 100)",
            "Codes utilisés (100 derniers)",
          ])}
          value={used}
          icon={Gift}
        />
      </div>

      <Panel
        title={tr(["Recompensas", "Rewards", "Recompensas", "Récompenses"])}
        hint={tr([
          "As pessoas ganham 10 pontos por dia da liga (até 420 por semana) e 50 por desafio com amigos cumprido, toda segunda-feira. O desconto de programa sai da taxa da plataforma: o profissional sempre recebe a parte dele.",
          "People earn 10 points per league day (up to 420 a week) and 50 per completed challenge with friends, every Monday. The program discount comes out of the platform fee: the professional always gets their share.",
          "Las personas ganan 10 puntos por día de liga (hasta 420 por semana) y 50 por cada desafío con amigos cumplido, cada lunes. El descuento de programa sale de la comisión de la plataforma: el profesional siempre recibe su parte.",
          "Les personnes gagnent 10 points par jour de ligue (jusqu'à 420 par semaine) et 50 par défi entre amis réussi, chaque lundi. La remise sur programme est prise sur la commission de la plateforme : le professionnel reçoit toujours sa part.",
        ])}
        action={
          <button type="button" className={btnPrimary} onClick={() => setDraft({ ...EMPTY })}>
            <Plus className="h-3.5 w-3.5" />{" "}
            {tr(["Nova recompensa", "New reward", "Nueva recompensa", "Nouvelle récompense"])}
          </button>
        }
      >
        {draft && (
          <div className="mb-4 space-y-3 rounded-2xl border border-accent/40 bg-accent-soft/20 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={draft.kind}
                onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
                className={inputCls}
                aria-label={tr(["Tipo", "Type", "Tipo", "Type"])}
              >
                <option value="desconto_programa">
                  {tr([
                    "Desconto num programa da Loja",
                    "Discount on a Store program",
                    "Descuento en un programa de la Tienda",
                    "Remise sur un programme de la Boutique",
                  ])}
                </option>
                <option value="brinde_parceiro">
                  {tr([
                    "Brinde de parceiro",
                    "Partner gift",
                    "Regalo de un socio",
                    "Cadeau partenaire",
                  ])}
                </option>
              </select>
              <input
                value={draft.title}
                maxLength={80}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder={tr([
                  "Título (ex.: 10% de desconto num programa)",
                  "Title (e.g.: 10% off a program)",
                  "Título (ej.: 10 % de descuento en un programa)",
                  "Titre (ex. : 10 % de remise sur un programme)",
                ])}
                className={inputCls}
              />
            </div>
            <textarea
              value={draft.description ?? ""}
              maxLength={400}
              rows={2}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder={tr([
                "Como usar (o que a pessoa vê)",
                "How to use it (what the person sees)",
                "Cómo usarla (lo que ve la persona)",
                "Mode d'emploi (ce que la personne voit)",
              ])}
              className={inputCls}
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="text-xs text-muted-foreground">
                {tr(["Custo (pontos)", "Cost (points)", "Coste (puntos)", "Coût (points)"])}
                <input
                  type="number"
                  min={50}
                  value={draft.cost}
                  onChange={(e) => setDraft({ ...draft, cost: Number(e.target.value) || 0 })}
                  className={inputCls}
                />
              </label>
              {draft.kind === "desconto_programa" ? (
                <label className="text-xs text-muted-foreground">
                  {tr(["Desconto (%)", "Discount (%)", "Descuento (%)", "Remise (%)"])}
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={draft.discount_percent ?? 10}
                    onChange={(e) =>
                      setDraft({ ...draft, discount_percent: Number(e.target.value) || 1 })
                    }
                    className={inputCls}
                  />
                </label>
              ) : (
                <label className="text-xs text-muted-foreground">
                  {tr(["Parceiro", "Partner", "Socio", "Partenaire"])}
                  <select
                    value={draft.partner_id ?? ""}
                    onChange={(e) => setDraft({ ...draft, partner_id: e.target.value || null })}
                    className={inputCls}
                  >
                    <option value="">—</option>
                    {(partners.data ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="text-xs text-muted-foreground">
                {tr([
                  "Estoque (vazio = sem limite)",
                  "Stock (empty = no limit)",
                  "Stock (vacío = sin límite)",
                  "Stock (vide = illimité)",
                ])}
                <input
                  type="number"
                  min={0}
                  value={draft.stock ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      stock: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className={inputCls}
                />
              </label>
              <label className="text-xs text-muted-foreground">
                {tr([
                  "Validade do código (dias)",
                  "Code validity (days)",
                  "Validez del código (días)",
                  "Validité du code (jours)",
                ])}
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={draft.valid_days ?? 60}
                  onChange={(e) => setDraft({ ...draft, valid_days: Number(e.target.value) || 60 })}
                  className={inputCls}
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={draft.active ?? true}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
              />
              {tr([
                "Ativa (aparece em Pontos e recompensas)",
                "Active (shown in Points and rewards)",
                "Activa (aparece en Puntos y recompensas)",
                "Active (visible dans Points et récompenses)",
              ])}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className={btnPrimary}
                disabled={draft.title.trim().length < 3 || draft.cost < 50 || save.isPending}
                onClick={submit}
              >
                {tr(["Salvar", "Save", "Guardar", "Enregistrer"])}
              </button>
              <button type="button" className={btnCls} onClick={() => setDraft(null)}>
                {tr(["Cancelar", "Cancel", "Cancelar", "Annuler"])}
              </button>
            </div>
          </div>
        )}

        {rewards.error ? (
          <QueryError error={rewards.error} />
        ) : (rewards.data ?? []).length === 0 ? (
          <Empty>
            {tr([
              "Nenhuma recompensa cadastrada.",
              "No rewards added.",
              "No hay recompensas registradas.",
              "Aucune récompense enregistrée.",
            ])}
          </Empty>
        ) : (
          <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70">
            {(rewards.data ?? []).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 bg-card px-4 py-3">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    {r.title}
                    {!r.active && (
                      <Badge tone="warn">
                        {tr(["Inativa", "Inactive", "Inactiva", "Inactive"])}
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.cost} {tr(["pontos", "points", "puntos", "points"])} ·{" "}
                    {r.kind === "desconto_programa"
                      ? `${r.discount_percent}% ${tr(["num programa", "on a program", "en un programa", "sur un programme"])}`
                      : tr([
                          "brinde de parceiro",
                          "partner gift",
                          "regalo de un socio",
                          "cadeau partenaire",
                        ])}
                    {r.stock !== null &&
                      ` · ${tr(["estoque", "stock", "stock", "stock"])} ${r.stock}`}{" "}
                    ·{" "}
                    {tr([
                      `vale ${r.valid_days} dias`,
                      `valid for ${r.valid_days} days`,
                      `válido ${r.valid_days} días`,
                      `valable ${r.valid_days} jours`,
                    ])}
                  </p>
                </div>
                <button type="button" className={btnCls} onClick={() => setDraft({ ...r })}>
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title={tr(["Códigos resgatados", "Redeemed codes", "Códigos canjeados", "Codes échangés"])}
        hint={tr([
          "Desconto de programa é usado sozinho na compra. Brinde de parceiro: combine a entrega com o parceiro e marque como entregue. Devolver cancela o código e devolve os pontos.",
          "A program discount is applied automatically at checkout. Partner gift: arrange delivery with the partner and mark it as delivered. Refunding cancels the code and gives the points back.",
          "El descuento de programa se aplica solo en la compra. Regalo de un socio: coordina la entrega con el socio y márcalo como entregado. Devolver cancela el código y devuelve los puntos.",
          "La remise sur programme s'applique d'elle-même à l'achat. Cadeau partenaire : organisez la remise avec le partenaire et marquez-le comme remis. Rembourser annule le code et rend les points.",
        ])}
      >
        {redemptions.error ? (
          <QueryError error={redemptions.error} />
        ) : list.length === 0 ? (
          <Empty>
            {tr([
              "Ninguém resgatou ainda.",
              "No one has redeemed yet.",
              "Nadie ha canjeado todavía.",
              "Personne n'a encore échangé.",
            ])}
          </Empty>
        ) : (
          <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70">
            {list.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 bg-card px-4 py-3">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <span className="font-mono">{r.code}</span>
                    <Badge
                      tone={r.status === "ativo" ? "info" : r.status === "usado" ? "good" : "warn"}
                    >
                      {REDEMPTION_STATUS[r.status] ? tr(REDEMPTION_STATUS[r.status]) : r.status}
                    </Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.rewards?.title} · {r.cost} {tr(["pontos", "points", "puntos", "points"])} ·{" "}
                    {dateTime(r.created_at)}
                    {r.used_ref && ` · ${r.used_ref}`}
                  </p>
                </div>
                {r.status === "ativo" && (
                  <div className="flex gap-2">
                    {r.rewards?.kind === "brinde_parceiro" && (
                      <button
                        type="button"
                        className={btnCls}
                        disabled={act.isPending}
                        onClick={() =>
                          act.mutate(
                            { id: r.id, action: "entregue" },
                            { onError: (e) => toast.error((e as Error).message) },
                          )
                        }
                      >
                        {tr(["Entregue", "Delivered", "Entregado", "Remis"])}
                      </button>
                    )}
                    <button
                      type="button"
                      className={btnCls}
                      disabled={act.isPending}
                      onClick={() =>
                        act.mutate(
                          { id: r.id, action: "devolver" },
                          {
                            onSuccess: () =>
                              toast.success(
                                tr([
                                  "Pontos devolvidos.",
                                  "Points refunded.",
                                  "Puntos devueltos.",
                                  "Points rendus.",
                                ]),
                              ),
                            onError: (e) => toast.error((e as Error).message),
                          },
                        )
                      }
                    >
                      {tr([
                        "Devolver pontos",
                        "Refund points",
                        "Devolver puntos",
                        "Rendre les points",
                      ])}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
