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
import { useTr } from "@/components/settings-ui";
import type { Names } from "@/lib/appearance-data";

const KIND_NAMES: Record<CatalogItem["kind"], Names> = {
  pagina: ["Página", "Page", "Página", "Page"],
  funcao: ["Função do site", "Site feature", "Función del sitio", "Fonction du site"],
  funcionalidade: [
    "Parte de uma função",
    "Part of a feature",
    "Parte de una función",
    "Partie d'une fonction",
  ],
};

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
  const tr = useTr();
  const [demo, setDemo] = useState(false);
  const q = summarizeItem(item.id);
  const Demo = item.demo ? DEMOS[item.demo] : null;
  return (
    <article className="space-y-4 [&_li]:!text-left [&_p]:!text-left">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {tr(KIND_NAMES[item.kind])} · {AREAS.find((a) => a.id === item.area)?.name}
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold text-foreground">{item.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {tr(["Quem usa:", "Who uses it:", "Quién la usa:", "Qui l'utilise :"])}{" "}
            <span className="font-semibold text-foreground">{item.audience}</span>
            {item.route && (
              <>
                {" "}
                · {tr(["Endereço:", "Address:", "Dirección:", "Adresse :"])}{" "}
                <code className="text-foreground">{item.route}</code>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            title={tr([
              "Nota média nas rodadas de qualidade",
              "Average score in the quality rounds",
              "Nota media en las rondas de calidad",
              "Note moyenne lors des séries de qualité",
            ])}
            className={cn("rounded-full px-3 py-1 text-xs font-bold", scoreTone(q.average))}
          >
            {tr(["Qualidade", "Quality", "Calidad", "Qualité"])} {pct(q.average)}
          </span>
          {openable(item.route) && (
            <a
              href={item.route}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-secondary"
            >
              <ExternalLink className="h-3.5 w-3.5" /> {tr(["Abrir", "Open", "Abrir", "Ouvrir"])}
            </a>
          )}
        </div>
      </header>

      <p className="text-sm text-foreground">{item.summary}</p>

      {item.shot && (
        <figure className="overflow-hidden rounded-2xl border border-border/70 bg-secondary/30">
          <img
            src={`/images/docs/${item.id}.jpg`}
            alt={`${tr(["Tela:", "Screen:", "Pantalla:", "Écran :"])} ${item.title}`}
            loading="lazy"
            className="w-full"
          />
          <figcaption className="px-3 py-1.5 text-[11px] text-muted-foreground">
            {tr([
              "Print da tela no computador (design Natural, dados de exemplo).",
              "Desktop screenshot (Natural design, sample data).",
              "Captura de pantalla en el ordenador (diseño Natural, datos de ejemplo).",
              "Capture d'écran sur ordinateur (design Natural, données d'exemple).",
            ])}
          </figcaption>
        </figure>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-border/70 p-4">
          <h3 className="text-sm font-bold text-foreground">
            {tr([
              "O que dá para fazer",
              "What you can do",
              "Qué se puede hacer",
              "Ce qu'on peut faire",
            ])}
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-foreground">
            {item.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-border/70 p-4">
          <h3 className="text-sm font-bold text-foreground">
            {tr(["Como usar", "How to use", "Cómo usarla", "Mode d'emploi"])}
          </h3>
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
              <MousePointerClick className="h-4 w-4 text-accent" />{" "}
              {tr(["Testar aqui", "Try it here", "Probar aquí", "Tester ici"])}
            </h3>
            <button
              type="button"
              onClick={() => setDemo((d) => !d)}
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-secondary"
            >
              {demo
                ? tr(["Fechar", "Close", "Cerrar", "Fermer"])
                : tr([
                    "Abrir a função",
                    "Open the feature",
                    "Abrir la función",
                    "Ouvrir la fonction",
                  ])}
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {tr([
              "É a função de verdade, com a sua conta: o que você fizer aqui fica salvo como se usasse pela página Funções.",
              "It's the real feature, with your account: whatever you do here is saved as if you used it from the Features page.",
              "Es la función real, con tu cuenta: lo que hagas aquí se guarda como si la usaras desde la página Funciones.",
              "C'est la vraie fonction, avec votre compte : ce que vous faites ici est enregistré comme si vous l'utilisiez depuis la page Fonctions.",
            ])}
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
            {tr([
              `O que ainda vamos melhorar (rodada ${q.lastRound})`,
              `What we'll still improve (round ${q.lastRound})`,
              `Lo que todavía vamos a mejorar (ronda ${q.lastRound})`,
              `Ce que nous allons encore améliorer (série ${q.lastRound})`,
            ])}
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
  const tr = useTr();
  const nFuncs = CATALOG.filter((i) => i.kind === "funcao").length;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">
          {tr([
            "Como o NutriConnect funciona",
            "How NutriConnect works",
            "Cómo funciona NutriConnect",
            "Comment fonctionne NutriConnect",
          ])}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {tr([
            `Tudo o que o site faz, por área: ${nFuncs} funções (consulta, acompanhamento, diário, geladeira, grupo familiar…), com as partes de cada uma e as páginas simples. Escolha no menu ou comece por uma área abaixo.`,
            `Everything the site does, by area: ${nFuncs} features (appointments, follow-up, diary, fridge, family group…), with the parts of each one and the simple pages. Pick from the menu or start with an area below.`,
            `Todo lo que hace el sitio, por área: ${nFuncs} funciones (consulta, seguimiento, diario, nevera, grupo familiar…), con las partes de cada una y las páginas simples. Elige en el menú o empieza por un área de abajo.`,
            `Tout ce que fait le site, par domaine : ${nFuncs} fonctions (consultation, suivi, journal, frigo, groupe familial…), avec les parties de chacune et les pages simples. Choisissez dans le menu ou commencez par un domaine ci-dessous.`,
          ])}
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
                {items.length}{" "}
                {items.length === 1
                  ? tr(["item", "item", "elemento", "élément"])
                  : tr(["itens", "items", "elementos", "éléments"])}{" "}
                →
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DocsSection() {
  const tr = useTr();
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
            placeholder={tr([
              "Buscar função ou página",
              "Search feature or page",
              "Buscar función o página",
              "Rechercher une fonction ou une page",
            ])}
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
          <BookOpen className="h-4 w-4" />{" "}
          {tr(["Visão geral", "Overview", "Visión general", "Vue d'ensemble"])}
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
                      {i.kind !== "funcao" && (
                        <Badge>
                          {i.kind === "pagina"
                            ? tr(["página", "page", "página", "page"])
                            : tr(["parte", "part", "parte", "partie"])}
                        </Badge>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {groups.length === 0 && (
            <p className="px-2 text-xs text-muted-foreground">
              {tr(["Nada encontrado.", "Nothing found.", "No se encontró nada.", "Rien trouvé."])}
            </p>
          )}
        </nav>
      </Panel>
      <Panel>{item ? <ItemPage item={item} /> : <Overview onPick={pick} />}</Panel>
    </div>
  );
}
