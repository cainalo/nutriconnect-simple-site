// Admin → Qualidade: notas de 0 a 10 (em %) de cada página, função e funcionalidade nos critérios
// de lib/quality/criteria.ts, vindas das rodadas de teste em lib/quality/results.ts. Mostra onde
// melhorar primeiro. O processo das rodadas está em docs/QUALIDADE.md.
import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ClipboardCheck, ListChecks, TrendingUp } from "lucide-react";
import { Badge, Panel } from "@/components/admin/admin-ui";
import { AREAS, CATALOG } from "@/lib/quality/catalog";
import type { AreaId } from "@/lib/quality/catalog-types";
import { CRITERIA } from "@/lib/quality/criteria";
import { ROUNDS } from "@/lib/quality/results";
import { itemHistory, pct, scoreTone, summarizeAll } from "@/lib/quality/score";
import { cn } from "@/lib/utils";

const KIND_NAMES = { pagina: "Página", funcao: "Função", funcionalidade: "Parte" };

function Cell({ score }: { score: number | null }) {
  return (
    <span
      className={cn(
        "inline-grid h-7 min-w-9 place-items-center rounded-lg px-1 text-[11px] font-bold tabular-nums",
        scoreTone(score),
      )}
    >
      {score === null ? "—" : score.toFixed(score % 1 ? 1 : 0)}
    </span>
  );
}

function Bar({ value }: { value: number | null }) {
  return (
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
      <div
        className={cn("h-full rounded-full", value === null ? "" : scoreTone(value).split(" ")[0])}
        style={{ width: `${value === null ? 0 : value * 10}%` }}
      />
    </div>
  );
}

export function QualitySection() {
  const s = useMemo(() => summarizeAll(), []);
  const [area, setArea] = useState<AreaId | "todas">("todas");
  const [worstFirst, setWorstFirst] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [showCriteria, setShowCriteria] = useState<string | null>(null);
  const last = ROUNDS[ROUNDS.length - 1];

  const rows = CATALOG.filter((i) => area === "todas" || i.area === area)
    .map((i) => ({ item: i, sum: s.byId[i.id] }))
    .sort((a, b) =>
      worstFirst
        ? (a.sum.average ?? 99) - (b.sum.average ?? 99)
        : CATALOG.indexOf(a.item) - CATALOG.indexOf(b.item),
    );

  const worstCriterion = CRITERIA.filter((c) => s.criterion[c.id] !== null).sort(
    (a, b) => s.criterion[a.id]! - s.criterion[b.id]!,
  )[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Nota geral", value: pct(s.overall), sub: "média dos itens avaliados" },
          {
            label: "Itens avaliados",
            value: `${s.rated}/${s.total}`,
            sub: "páginas, funções e funcionalidades",
          },
          {
            label: "Última rodada",
            value: last ? `${last.round}ª` : "—",
            sub: last ? last.date.split("-").reverse().join("/") : "nenhuma ainda",
          },
          {
            label: "Critério mais fraco",
            value: worstCriterion ? pct(s.criterion[worstCriterion.id]) : "—",
            sub: worstCriterion?.name ?? "sem notas",
          },
        ].map((k) => (
          <div key={k.label} className="rounded-3xl border border-border/80 bg-card p-4 shadow-xs">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {k.label}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-foreground">{k.value}</p>
            <p className="text-[11px] text-muted-foreground">{k.sub}</p>
          </div>
        ))}
      </div>

      <Panel
        title="Notas por critério"
        hint="Média dos itens avaliados em cada critério. Toque num critério para ver o que ele mede e a régua de notas."
      >
        <ul className="grid gap-x-6 gap-y-2 md:grid-cols-2">
          {CRITERIA.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setShowCriteria(showCriteria === c.id ? null : c.id)}
                aria-expanded={showCriteria === c.id}
                className="flex w-full cursor-pointer items-center gap-3 text-left"
              >
                <span className="w-40 shrink-0 text-xs font-semibold text-foreground">
                  {c.name}
                </span>
                <Bar value={s.criterion[c.id]} />
                <span className="w-10 text-right text-xs font-bold tabular-nums text-foreground">
                  {pct(s.criterion[c.id])}
                </span>
              </button>
              {showCriteria === c.id && (
                <div className="mt-2 rounded-2xl bg-secondary/50 p-3 text-xs text-foreground">
                  <p className="font-semibold">{c.question}</p>
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-muted-foreground">
                    {c.checks.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                  <dl className="mt-2 grid gap-1 sm:grid-cols-2">
                    {([10, 7, 4, 0] as const).map((n) => (
                      <div key={n} className="flex gap-2">
                        <dt>
                          <Cell score={n} />
                        </dt>
                        <dd className="text-muted-foreground">{c.scale[n]}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title="Notas por página e função"
        hint="Nota mais recente de cada item em cada critério (0 a 10; 10 = 100%). Toque numa linha para ver o que melhorar."
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            value={area}
            onChange={(e) => setArea(e.target.value as AreaId | "todas")}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs"
            aria-label="Área"
          >
            <option value="todas">Todas as áreas ({CATALOG.length})</option>
            {AREAS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({CATALOG.filter((i) => i.area === a.id).length}) ·{" "}
                {pct(s.areaAverage(a.id))}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setWorstFirst((v) => !v)}
            aria-pressed={worstFirst}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold",
              worstFirst ? "border-accent bg-accent text-accent-foreground" : "border-border",
            )}
          >
            <TrendingUp className="mr-1 inline h-3.5 w-3.5" />
            Piores primeiro
          </button>
        </div>
        {ROUNDS.length === 0 && (
          <p className="mb-3 rounded-2xl bg-secondary/50 p-3 text-xs text-muted-foreground">
            <ClipboardCheck className="mr-1 inline h-4 w-4" />
            Nenhuma rodada de testes ainda. As notas aparecem aqui assim que a primeira rodada for
            gravada (docs/QUALIDADE.md).
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] border-separate border-spacing-y-1 text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-2">Item</th>
                <th className="px-1 text-center">Média</th>
                {CRITERIA.map((c) => (
                  <th key={c.id} className="px-1 text-center" title={c.question}>
                    {c.name.split(" ")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ item, sum }) => (
                <Fragment key={item.id}>
                  <tr
                    onClick={() => setOpen(open === item.id ? null : item.id)}
                    className="cursor-pointer rounded-xl bg-background/60 hover:bg-secondary/60"
                  >
                    <td className="rounded-l-xl px-2 py-1.5">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 transition",
                            open === item.id && "rotate-180",
                          )}
                        />
                        {item.title}
                      </p>
                      <p className="pl-5 text-[10px] text-muted-foreground">
                        {KIND_NAMES[item.kind]}
                        {item.route && ` · ${item.route}`}
                      </p>
                    </td>
                    <td className="px-1 text-center">
                      <span
                        className={cn(
                          "inline-grid h-7 min-w-12 place-items-center rounded-lg px-1 text-[11px] font-black tabular-nums",
                          scoreTone(sum.average),
                        )}
                      >
                        {pct(sum.average)}
                      </span>
                    </td>
                    {CRITERIA.map((c) => (
                      <td key={c.id} className="px-1 text-center last:rounded-r-xl">
                        <Cell score={sum.latest[c.id]?.score ?? null} />
                      </td>
                    ))}
                  </tr>
                  {open === item.id && (
                    <tr>
                      <td colSpan={CRITERIA.length + 2} className="px-2 pb-3">
                        <div className="grid gap-3 rounded-2xl border border-border/60 p-3 text-xs md:grid-cols-3">
                          <div>
                            <p className="mb-1 flex items-center gap-1 font-bold text-foreground">
                              <ListChecks className="h-3.5 w-3.5" /> O que melhorar
                            </p>
                            {sum.improve.length ? (
                              <ul className="list-disc space-y-0.5 pl-4 text-foreground">
                                {sum.improve.map((x) => (
                                  <li key={x}>{x}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-muted-foreground">Nada anotado.</p>
                            )}
                          </div>
                          <div>
                            <p className="mb-1 font-bold text-foreground">O que está bom</p>
                            {sum.good.length ? (
                              <ul className="list-disc space-y-0.5 pl-4 text-foreground">
                                {sum.good.map((x) => (
                                  <li key={x}>{x}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-muted-foreground">Nada anotado.</p>
                            )}
                          </div>
                          <div>
                            <p className="mb-1 font-bold text-foreground">Evolução</p>
                            {itemHistory(item.id).length ? (
                              <ul className="space-y-1">
                                {itemHistory(item.id).map((h) => (
                                  <li key={h.round} className="flex items-center gap-2">
                                    <Badge>{h.round}ª</Badge>
                                    <Bar value={h.average} />
                                    <span className="tabular-nums">{pct(h.average)}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-muted-foreground">Ainda não avaliado.</p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
