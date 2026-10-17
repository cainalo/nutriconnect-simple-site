// Admin → Documentação: o site inteiro explicado, página por página e função por função, para o
// dono aprender a usar a plataforma: para que serve, o que dá para fazer, passo a passo, print da
// tela e, nas ferramentas de Funções, o próprio card para testar ali mesmo. Lê o catálogo
// (lib/quality/catalog.ts), o mesmo das rodadas de qualidade.
import { lazy, Suspense, useMemo, useState, type ComponentType } from "react";
import { BookOpen, ExternalLink, Loader2, MousePointerClick, Search } from "lucide-react";
import { Badge, Panel } from "@/components/admin/admin-ui";
import { AREAS, CATALOG, CATALOG_BY_ID } from "@/lib/quality/catalog";
import type { CatalogItem, DemoId } from "@/lib/quality/catalog-types";
import { pct, scoreTone, summarizeItem } from "@/lib/quality/score";
import { cn } from "@/lib/utils";

const KIND_NAMES = { pagina: "Página", funcao: "Função", funcionalidade: "Funcionalidade" };

// Os cards de Funções só são baixados quando alguém abre a demonstração.
const DEMOS = Object.fromEntries(
  (
    [
      "HydrationCard",
      "HabitCheckinCard",
      "MoodCard",
      "MindfulMealCard",
      "WeeklyPledgeCard",
      "QuizCard",
      "IcebreakerCard",
      "DailyTipCard",
      "ShoppingListCard",
      "RecipeRouletteCard",
      "PlateBuilderCard",
      "CookingTimerCard",
      "UnitConverterCard",
      "CommunityRouletteCard",
      "ExploreTopicsCard",
      "ProMatchCard",
    ] as DemoId[]
  ).map((id) => [
    id,
    lazy(() =>
      import("@/components/fun-cards").then((m) => ({
        default: (m as unknown as Record<DemoId, ComponentType>)[id],
      })),
    ),
  ]),
) as unknown as Record<DemoId, ComponentType>;

const plain = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Endereço que dá para abrir direto (sem parâmetros como $id). */
const openable = (route?: string) => !!route && !route.includes("$");

function ItemPage({ item }: { item: CatalogItem }) {
  const [demo, setDemo] = useState(false);
  const q = summarizeItem(item.id);
  const Demo = item.demo ? DEMOS[item.demo] : null;
  return (
    <article className="space-y-4 [&_li]:!text-left [&_p]:!text-left">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {KIND_NAMES[item.kind]} · {AREAS.find((a) => a.id === item.area)?.name}
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold text-foreground">{item.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Quem usa: <span className="font-semibold text-foreground">{item.audience}</span>
            {item.route && (
              <>
                {" "}
                · Endereço: <code className="text-foreground">{item.route}</code>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            title="Nota média nas rodadas de qualidade"
            className={cn("rounded-full px-3 py-1 text-xs font-bold", scoreTone(q.average))}
          >
            Qualidade {pct(q.average)}
          </span>
          {openable(item.route) && (
            <a
              href={item.route}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-secondary"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Abrir
            </a>
          )}
        </div>
      </header>

      <p className="text-sm text-foreground">{item.summary}</p>

      {item.shot && (
        <figure className="overflow-hidden rounded-2xl border border-border/70 bg-secondary/30">
          <img
            src={`/images/docs/${item.id}.jpg`}
            alt={`Tela: ${item.title}`}
            loading="lazy"
            className="w-full"
          />
          <figcaption className="px-3 py-1.5 text-[11px] text-muted-foreground">
            Print da tela no computador (design Natural, dados de exemplo).
          </figcaption>
        </figure>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-border/70 p-4">
          <h3 className="text-sm font-bold text-foreground">O que dá para fazer</h3>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-foreground">
            {item.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-border/70 p-4">
          <h3 className="text-sm font-bold text-foreground">Como usar</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-foreground">
            {item.howTo.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ol>
        </section>
      </div>

      {Demo && (
        <section className="rounded-2xl border border-dashed border-accent/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <MousePointerClick className="h-4 w-4 text-accent" /> Testar aqui
            </h3>
            <button
              type="button"
              onClick={() => setDemo((d) => !d)}
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-secondary"
            >
              {demo ? "Fechar" : "Abrir a função"}
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            É a função de verdade, com a sua conta: o que você fizer aqui fica salvo como se usasse
            pela página Funções.
          </p>
          {demo && (
            <div className="mx-auto mt-3 max-w-md">
              <Suspense fallback={<Loader2 className="h-5 w-5 animate-spin" />}>
                <Demo />
              </Suspense>
            </div>
          )}
        </section>
      )}

      {q.improve.length > 0 && (
        <section className="rounded-2xl bg-secondary/50 p-4">
          <h3 className="text-sm font-bold text-foreground">
            O que ainda vamos melhorar (rodada {q.lastRound})
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-foreground">
            {q.improve.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

function Overview({ onPick }: { onPick: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          Como o NutriConnect funciona
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {CATALOG.length} páginas, funções e funcionalidades, organizadas por área. Escolha uma no
          menu ou comece por uma área abaixo.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {AREAS.map((a) => {
          const items = CATALOG.filter((i) => i.area === a.id);
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => items[0] && onPick(items[0].id)}
              className="flex cursor-pointer flex-col rounded-2xl border border-border/70 p-4 text-left transition hover:border-accent/60 hover:bg-secondary/40"
            >
              <span className="text-sm font-bold text-foreground">{a.name}</span>
              <span className="mt-1 flex-1 text-xs text-muted-foreground">{a.text}</span>
              <span className="mt-2 text-[11px] font-semibold text-accent">
                {items.length} {items.length === 1 ? "item" : "itens"} →
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DocsSection() {
  const [current, setCurrent] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const q = plain(query.trim());
  const groups = useMemo(
    () =>
      AREAS.map((a) => ({
        area: a,
        items: CATALOG.filter(
          (i) =>
            i.area === a.id &&
            (!q ||
              plain(`${i.title} ${i.summary} ${i.features.join(" ")} ${i.route ?? ""}`).includes(
                q,
              )),
        ),
      })).filter((g) => g.items.length > 0),
    [q],
  );
  const item = current ? CATALOG_BY_ID[current] : null;
  const pick = (id: string) => {
    setCurrent(id);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <Panel className="h-fit lg:sticky lg:top-4">
        <label className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar função ou página"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => setCurrent(null)}
          className={cn(
            "mt-3 flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm font-semibold",
            !current ? "bg-accent text-accent-foreground" : "hover:bg-secondary",
          )}
        >
          <BookOpen className="h-4 w-4" /> Visão geral
        </button>
        <nav className="mt-2 max-h-[70vh] space-y-3 overflow-y-auto pr-1 lg:max-h-[calc(100vh-12rem)]">
          {groups.map(({ area, items }) => (
            <div key={area.id}>
              <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {area.name}
              </p>
              <ul className="mt-1 space-y-0.5">
                {items.map((i) => (
                  <li key={i.id}>
                    <button
                      type="button"
                      onClick={() => pick(i.id)}
                      aria-current={current === i.id ? "page" : undefined}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-xl px-2 py-1 text-left text-xs",
                        current === i.id
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground hover:bg-secondary",
                      )}
                    >
                      <span className="truncate">{i.title}</span>
                      {i.kind !== "pagina" && (
                        <Badge>{i.kind === "funcao" ? "função" : "recurso"}</Badge>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {groups.length === 0 && (
            <p className="px-2 text-xs text-muted-foreground">Nada encontrado.</p>
          )}
        </nav>
      </Panel>
      <Panel>{item ? <ItemPage item={item} /> : <Overview onPick={pick} />}</Panel>
    </div>
  );
}
