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
          toast.success("Recompensa salva.");
          setDraft(null);
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Códigos ativos (últimos 100)" value={active} icon={Ticket} />
        <StatCard label="Códigos usados (últimos 100)" value={used} icon={Gift} />
      </div>

      <Panel
        title="Recompensas"
        hint="As pessoas ganham 10 pontos por dia da liga (até 420 por semana) e 50 por desafio com amigos cumprido, toda segunda-feira. O desconto de programa sai da taxa da plataforma: o profissional sempre recebe a parte dele."
        action={
          <button type="button" className={btnPrimary} onClick={() => setDraft({ ...EMPTY })}>
            <Plus className="h-3.5 w-3.5" /> Nova recompensa
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
                aria-label="Tipo"
              >
                <option value="desconto_programa">Desconto num programa da Loja</option>
                <option value="brinde_parceiro">Brinde de parceiro</option>
              </select>
              <input
                value={draft.title}
                maxLength={80}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Título (ex.: 10% de desconto num programa)"
                className={inputCls}
              />
            </div>
            <textarea
              value={draft.description ?? ""}
              maxLength={400}
              rows={2}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Como usar (o que a pessoa vê)"
              className={inputCls}
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="text-xs text-muted-foreground">
                Custo (pontos)
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
                  Desconto (%)
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
                  Parceiro
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
                Estoque (vazio = sem limite)
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
                Validade do código (dias)
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
              Ativa (aparece em Pontos e recompensas)
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className={btnPrimary}
                disabled={draft.title.trim().length < 3 || draft.cost < 50 || save.isPending}
                onClick={submit}
              >
                Salvar
              </button>
              <button type="button" className={btnCls} onClick={() => setDraft(null)}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {rewards.error ? (
          <QueryError error={rewards.error} />
        ) : (rewards.data ?? []).length === 0 ? (
          <Empty>Nenhuma recompensa cadastrada.</Empty>
        ) : (
          <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70">
            {(rewards.data ?? []).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 bg-card px-4 py-3">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    {r.title}
                    {!r.active && <Badge tone="warn">Inativa</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.cost} pontos ·{" "}
                    {r.kind === "desconto_programa"
                      ? `${r.discount_percent}% num programa`
                      : "brinde de parceiro"}
                    {r.stock !== null && ` · estoque ${r.stock}`} · vale {r.valid_days} dias
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
        title="Códigos resgatados"
        hint="Desconto de programa é usado sozinho na compra. Brinde de parceiro: combine a entrega com o parceiro e marque como entregue. Devolver cancela o código e devolve os pontos."
      >
        {redemptions.error ? (
          <QueryError error={redemptions.error} />
        ) : list.length === 0 ? (
          <Empty>Ninguém resgatou ainda.</Empty>
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
                      {r.status}
                    </Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.rewards?.title} · {r.cost} pontos · {dateTime(r.created_at)}
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
                        Entregue
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
                            onSuccess: () => toast.success("Pontos devolvidos."),
                            onError: (e) => toast.error((e as Error).message),
                          },
                        )
                      }
                    >
                      Devolver pontos
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
