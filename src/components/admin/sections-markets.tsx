// Mercados parceiros (R1): cadastro dos mercados/lojas (endereço de busca com o código de afiliado) e
// os cliques dos últimos 30 dias, para acompanhar as comissões.
import { useState } from "react";
import { toast } from "sonner";
import { MousePointerClick, Pencil, Plus, Trash2, Users } from "lucide-react";
import { EmojiIcon } from "@/components/emoji-icon";
import {
  Badge,
  ConfirmDialog,
  Empty,
  Panel,
  QueryError,
  StatCard,
  btnCls,
  btnPrimary,
  inputCls,
} from "@/components/admin/admin-ui";
import {
  useDeletePartner,
  useMarketPartners,
  useMarketStats,
  useSavePartner,
  type MarketPartner,
} from "@/lib/markets";

type Draft = Partial<MarketPartner> & { name: string; search_url: string };
const EMPTY: Draft = { name: "", search_url: "https://", emoji: "🛒", active: true, position: 0 };

export function MarketsSection() {
  const partners = useMarketPartners(true);
  const stats = useMarketStats(30);
  const save = useSavePartner();
  const remove = useDeletePartner();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<MarketPartner | null>(null);

  const totalClicks = (stats.data ?? []).reduce((acc, s) => acc + Number(s.clicks), 0);
  const totalPeople = (stats.data ?? []).reduce((acc, s) => acc + Number(s.people), 0);
  const validUrl =
    !!draft && /^https:\/\/\S+$/.test(draft.search_url) && draft.search_url.includes("{q}");

  const submit = () =>
    draft &&
    save.mutate(draft, {
      onSuccess: () => {
        toast.success("Parceiro salvo.");
        setDraft(null);
      },
      onError: (err) => toast.error((err as Error).message),
    });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Cliques nos parceiros (30 dias)"
          value={totalClicks}
          icon={MousePointerClick}
        />
        <StatCard label="Pessoas que clicaram (30 dias)" value={totalPeople} icon={Users} />
      </div>

      <Panel
        title="Mercados parceiros"
        hint="O botão “Comprar” da receita, da lista de compras e do plano alimentar abre a busca do produto no parceiro. Coloque no endereço o seu código de afiliado e {q} no lugar do produto."
        action={
          <button type="button" className={btnPrimary} onClick={() => setDraft({ ...EMPTY })}>
            <Plus className="h-3.5 w-3.5" /> Novo parceiro
          </button>
        }
      >
        {draft && (
          <div className="mb-4 space-y-3 rounded-2xl border border-accent/40 bg-accent-soft/20 p-4">
            <div className="grid gap-3 sm:grid-cols-[80px_1fr_100px]">
              <input
                value={draft.emoji ?? ""}
                maxLength={8}
                onChange={(e) => setDraft({ ...draft, emoji: e.target.value })}
                className={inputCls}
                aria-label="Ícone"
              />
              <input
                value={draft.name}
                maxLength={60}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Nome (ex.: Mercado Livre)"
                className={inputCls}
              />
              <input
                type="number"
                value={draft.position ?? 0}
                onChange={(e) => setDraft({ ...draft, position: Number(e.target.value) || 0 })}
                className={inputCls}
                aria-label="Ordem"
                title="Ordem"
              />
            </div>
            <input
              value={draft.search_url}
              onChange={(e) => setDraft({ ...draft, search_url: e.target.value })}
              placeholder="https://www.loja.com.br/busca?q={q}&tag=SEU-CODIGO"
              className={inputCls}
            />
            {!validUrl && (
              <p className="text-xs text-destructive">
                O endereço precisa começar com https:// e ter {"{q}"} no lugar do produto.
              </p>
            )}
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={draft.active ?? true}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
              />
              Ativo (aparece para as pessoas)
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className={btnPrimary}
                disabled={draft.name.trim().length < 2 || !validUrl || save.isPending}
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

        {partners.error ? (
          <QueryError error={partners.error} />
        ) : (partners.data ?? []).length === 0 ? (
          <Empty>Nenhum parceiro cadastrado.</Empty>
        ) : (
          <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70">
            {(partners.data ?? []).map((p) => {
              const s = (stats.data ?? []).find((x) => x.partner_id === p.id);
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-3 bg-card px-4 py-3">
                  <span
                    className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-primary"
                    aria-hidden
                  >
                    <EmojiIcon emoji={p.emoji || "🛒"} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      {p.name}
                      {!p.active && <Badge tone="warn">Inativo</Badge>}
                      {!/[?&](tag|aff|afiliado|ref|utm_source|matt_tool)=/i.test(p.search_url) && (
                        <Badge tone="info">Sem código de afiliado?</Badge>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{p.search_url}</p>
                    {s?.top_queries?.length ? (
                      <p className="truncate text-xs text-muted-foreground">
                        Mais buscados: {s.top_queries.join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground">
                      {Number(s?.clicks ?? 0)} cliques
                    </p>
                    <p>{Number(s?.people ?? 0)} pessoas</p>
                  </div>
                  <button type="button" className={btnCls} onClick={() => setDraft({ ...p })}>
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" className={btnCls} onClick={() => setDeleting(p)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <ConfirmDialog
        open={!!deleting}
        title={`Apagar ${deleting?.name ?? ""}?`}
        description="O parceiro some do botão “Comprar” e os cliques dele são apagados. Para só esconder, desative."
        confirmLabel="Apagar"
        danger
        busy={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => setDeleting(null),
            onError: (err) => toast.error((err as Error).message),
          })
        }
      />
    </div>
  );
}
