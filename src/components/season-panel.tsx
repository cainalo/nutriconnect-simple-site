// Calendário da feira (N5): frutas, legumes e verduras da estação no estado da pessoa, com como
// escolher, conservar e aproveitar; um toque manda para a lista de compras.
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Leaf, Loader2, MapPin, Search, ShoppingBasket, Sprout } from "lucide-react";
import { Panel } from "@/components/rail-cards";
import { useTr } from "@/components/settings-ui";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type { Names } from "@/lib/appearance-data";
import { useAddShoppingItems } from "@/lib/fridge";
import { useSeasonUf } from "@/lib/season";
import { useSitePhotos } from "@/lib/site-photos";
import {
  KIND_NAMES,
  MONTH_NAMES,
  REGION_NAMES,
  UFS,
  SEASON_FOODS,
  availableIn,
  monthsIn,
  phaseOf,
  seasonFoods,
  type FoodKind,
  type Region,
  type SeasonFood,
  type SeasonPhase,
} from "@/lib/season-data";
import { EmojiIcon } from "@/components/emoji-icon";

const card = "rounded-3xl border border-border/70 bg-card p-5 shadow-xs";
const btnSoft =
  "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50";

const PHASE_NAMES: Record<SeasonPhase, Names> = {
  auge: ["No auge", "At its peak", "En su mejor momento", "En pleine saison"],
  comecando: ["Começando", "Starting", "Empezando", "Début de saison"],
  terminando: ["Últimas semanas", "Last weeks", "Últimas semanas", "Fin de saison"],
  "ano-todo": ["O ano todo", "All year", "Todo el año", "Toute l'année"],
};
/** Alimentos com foto em public/images/season (Open Images/Flickr, CC BY 2.0; créditos lá). */
const SEASON_PHOTOS = new Set([
  "abacate",
  "abacaxi",
  "abobora",
  "abobrinha",
  "acai",
  "acerola",
  "alface",
  "banana",
  "batata-doce",
  "berinjela",
  "beterraba",
  "brocolis",
  "caju",
  "caqui",
  "cenoura",
  "chuchu",
  "couve",
  "couve-flor",
  "espinafre",
  "goiaba",
  "inhame",
  "laranja",
  "limao",
  "maca",
  "mamao",
  "mandioca",
  "manga",
  "maracuja",
  "melancia",
  "milho",
  "morango",
  "pepino",
  "pessego",
  "pimentao",
  "quiabo",
  "repolho",
  "tangerina",
  "tomate",
  "uva",
  "vagem",
]);
/** Versão anterior (site sem fotos): recortes em fundo branco em public/images/season-cutout
 * (Fruits-360, CC BY-SA 4.0; créditos lá). */
const SEASON_CUTOUTS = new Set([
  "abacate",
  "abacaxi",
  "abobrinha",
  "banana",
  "batata-doce",
  "berinjela",
  "beterraba",
  "caqui",
  "cenoura",
  "couve-flor",
  "goiaba",
  "laranja",
  "limao",
  "maca",
  "mamao",
  "manga",
  "maracuja",
  "melancia",
  "milho",
  "morango",
  "pepino",
  "pessego",
  "pimentao",
  "repolho",
  "tangerina",
  "tomate",
]);
/** Rótulo para quem buscou um alimento fora da época. */
const OFF_SEASON: Names = ["Fora de época", "Out of season", "Fuera de temporada", "Hors saison"];
const plainText = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
/** Selo da fase por cima da foto (cores sólidas, legíveis sobre qualquer foto). */
const PHASE_BADGE: Record<SeasonPhase, string> = {
  auge: "bg-primary text-primary-foreground",
  comecando: "bg-accent text-accent-foreground",
  terminando: "bg-foreground/75 text-background",
  "ano-todo": "bg-foreground/60 text-background",
};
const PHASE_STYLE: Record<SeasonPhase, string> = {
  auge: "bg-primary/15 text-primary",
  comecando: "bg-accent-soft text-accent",
  terminando: "bg-secondary text-muted-foreground",
  "ano-todo": "bg-secondary text-muted-foreground",
};

/** Seletor de estado (UF) salvo na conta. */
function UfSelect({ className }: { className?: string }) {
  const tr = useTr();
  const { uf, set } = useSeasonUf();
  return (
    <label className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", className)}>
      <MapPin className="h-4 w-4 text-accent" />
      <span className="sr-only">{tr(["Seu estado", "Your state", "Tu estado", "Votre État"])}</span>
      <select
        value={uf ?? ""}
        onChange={(e) =>
          set.mutate(e.target.value, { onError: (err) => toast.error((err as Error).message) })
        }
        className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground"
      >
        <option value="" disabled>
          {tr(["Escolha seu estado", "Choose your state", "Elige tu estado", "Choisissez l'État"])}
        </option>
        {UFS.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
    </label>
  );
}

function MonthsBar({
  food,
  region,
  plain,
}: {
  food: SeasonFood;
  region: Region;
  /** Card claro do site sem fotos (o padrão é por cima da foto). */
  plain?: boolean;
}) {
  const tr = useTr();
  const months = monthsIn(food, region);
  return (
    <div className={cn("grid grid-cols-12 gap-0.5", plain ? "mt-3" : "mt-2")} aria-hidden>
      {MONTH_NAMES.map((m, i) => (
        <div key={i} className="text-center">
          <div
            className={cn(
              "h-1.5 rounded-full",
              months.includes(i + 1)
                ? plain
                  ? "bg-primary"
                  : "bg-white"
                : plain
                  ? "bg-secondary"
                  : "bg-white/25",
            )}
          />
          <span className={cn("text-[8px]", plain ? "text-muted-foreground" : "text-white/75")}>
            {tr(m).slice(0, 1)}
          </span>
        </div>
      ))}
    </div>
  );
}

function FoodCard({
  food,
  phase,
  region,
}: {
  food: SeasonFood;
  phase: SeasonPhase | null;
  region: Region;
}) {
  const tr = useTr();
  const { user } = useAuth();
  const add = useAddShoppingItems(user?.id);
  const [open, setOpen] = useState(false);
  const photos = useSitePhotos();
  const months = monthsIn(food, region)
    .slice()
    .sort((a, b) => a - b)
    .map((m) => tr(MONTH_NAMES[m - 1]));

  if (!photos)
    return (
      <li className={cn(card, "group flex flex-col overflow-hidden p-0")}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="relative block text-left"
        >
          {/* Foto do alimento (fundo branco, como vitrine de feira); sem foto, o ícone grande. */}
          <span
            className={cn(
              "relative grid h-36 place-items-center overflow-hidden",
              SEASON_CUTOUTS.has(food.id) ? "bg-white" : "bg-accent-soft/70",
            )}
          >
            {SEASON_CUTOUTS.has(food.id) ? (
              <img
                src={`/images/season-cutout/${food.id}.jpg`}
                alt={tr(food.name)}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-contain p-2 transition duration-500 group-hover:scale-110"
              />
            ) : (
              <EmojiIcon
                emoji={food.emoji}
                tinted
                className="h-16 w-16 transition duration-500 group-hover:scale-110 group-hover:-rotate-6"
              />
            )}
            <span
              className={cn(
                "absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold shadow-xs",
                phase ? PHASE_BADGE[phase] : "bg-foreground/60 text-background",
              )}
            >
              {tr(phase ? PHASE_NAMES[phase] : OFF_SEASON)}
            </span>
          </span>
          <span className="block px-4 pt-3 font-display text-base font-bold text-foreground">
            {tr(food.name)}
          </span>
        </button>
        <div className="flex flex-1 flex-col px-4 pb-4">
          <MonthsBar food={food} region={region} plain />
          <p className="sr-only">
            {tr(["Safra:", "Season:", "Temporada:", "Saison :"])} {months.join(", ")}
          </p>
          {open && (
            <dl className="mt-3 space-y-2 text-xs text-foreground">
              <div>
                <dt className="font-bold text-muted-foreground">
                  {tr(["Como escolher", "How to choose", "Cómo elegir", "Comment choisir"])}
                </dt>
                <dd>{tr(food.choose)}</dd>
              </div>
              <div>
                <dt className="font-bold text-muted-foreground">
                  {tr(["Como conservar", "How to store", "Cómo conservar", "Comment conserver"])}
                </dt>
                <dd>{tr(food.keep)}</dd>
              </div>
              <dd className="flex gap-1.5 rounded-xl bg-accent-soft/50 px-2 py-1.5">
                <Leaf className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                {tr(food.tip)}
              </dd>
            </dl>
          )}
          <div className="mt-auto pt-3">
            <button
              type="button"
              disabled={!user || add.isPending}
              onClick={() =>
                add.mutate(
                  { texts: [{ text: tr(food.name), section: "hortifruti" }], source: "manual" },
                  {
                    onSuccess: (n) =>
                      toast.success(
                        n
                          ? tr([
                              "Na sua lista de compras.",
                              "On your shopping list.",
                              "En tu lista de compras.",
                              "Dans votre liste de courses.",
                            ])
                          : tr([
                              "Já estava na lista.",
                              "Already on the list.",
                              "Ya estaba en la lista.",
                              "Déjà dans la liste.",
                            ]),
                      ),
                    onError: (err) => toast.error((err as Error).message),
                  },
                )
              }
              className={btnSoft}
            >
              <ShoppingBasket className="h-3.5 w-3.5" />
              {tr(["Pôr na lista", "Add to list", "Añadir a la lista", "Ajouter à la liste"])}
            </button>
          </div>
        </div>
      </li>
    );
  return (
    <li className="group relative isolate flex min-h-72 flex-col overflow-hidden rounded-3xl border border-border/70 bg-primary text-white shadow-xs">
      {/* A foto do alimento é o fundo do card inteiro; o escuro de baixo deixa o texto legível. */}
      {SEASON_PHOTOS.has(food.id) ? (
        <img
          src={`/images/season/${food.id}.jpg`}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 -z-10 h-full w-full object-cover transition duration-700 group-hover:scale-110"
        />
      ) : (
        <span className="absolute inset-x-0 top-6 -z-10 grid place-items-center">
          <EmojiIcon
            emoji={food.emoji}
            className="h-20 w-20 transition duration-500 group-hover:scale-110 group-hover:-rotate-6"
          />
        </span>
      )}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 -z-10 bg-gradient-to-t transition-colors duration-500",
          open ? "from-black/90 via-black/75 to-black/30" : "from-black/85 via-black/45 to-black/0",
        )}
      />
      <span
        className={cn(
          "absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold shadow-xs",
          phase ? PHASE_BADGE[phase] : "bg-foreground/60 text-background",
        )}
      >
        {tr(phase ? PHASE_NAMES[phase] : OFF_SEASON)}
      </span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={tr(food.name)}
        className="flex flex-1 flex-col justify-end px-4 pt-32 text-left"
      >
        <span className="block font-display text-lg font-bold text-white drop-shadow">
          {tr(food.name)}
        </span>
      </button>
      <div className="flex flex-col px-4 pb-4">
        <MonthsBar food={food} region={region} />
        <p className="sr-only">
          {tr(["Safra:", "Season:", "Temporada:", "Saison :"])} {months.join(", ")}
        </p>
        {open && (
          <dl className="mt-3 space-y-2 text-xs text-white/95">
            <div>
              <dt className="font-bold text-white/70">
                {tr(["Como escolher", "How to choose", "Cómo elegir", "Comment choisir"])}
              </dt>
              <dd>{tr(food.choose)}</dd>
            </div>
            <div>
              <dt className="font-bold text-white/70">
                {tr(["Como conservar", "How to store", "Cómo conservar", "Comment conserver"])}
              </dt>
              <dd>{tr(food.keep)}</dd>
            </div>
            <dd className="flex gap-1.5 rounded-xl bg-white/15 px-2 py-1.5 backdrop-blur-sm">
              <Leaf className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white" />
              {tr(food.tip)}
            </dd>
          </dl>
        )}
        <div className="pt-3">
          <button
            type="button"
            disabled={!user || add.isPending}
            onClick={() =>
              add.mutate(
                { texts: [{ text: tr(food.name), section: "hortifruti" }], source: "manual" },
                {
                  onSuccess: (n) =>
                    toast.success(
                      n
                        ? tr([
                            "Na sua lista de compras.",
                            "On your shopping list.",
                            "En tu lista de compras.",
                            "Dans votre liste de courses.",
                          ])
                        : tr([
                            "Já estava na lista.",
                            "Already on the list.",
                            "Ya estaba en la lista.",
                            "Déjà dans la liste.",
                          ]),
                    ),
                  onError: (err) => toast.error((err as Error).message),
                },
              )
            }
            className={cn(btnSoft, "border-white/40 bg-white/90 text-neutral-900 hover:bg-white")}
          >
            <ShoppingBasket className="h-3.5 w-3.5" />
            {tr(["Pôr na lista", "Add to list", "Añadir a la lista", "Ajouter à la liste"])}
          </button>
        </div>
      </div>
    </li>
  );
}

// ───────────────────────────── Página ─────────────────────────────

export function SeasonPanel() {
  const tr = useTr();
  const { region, loading } = useSeasonUf();
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [kind, setKind] = useState<FoodKind | "todos">("todos");
  const [query, setQuery] = useState("");
  const { user } = useAuth();
  const addMany = useAddShoppingItems(user?.id);
  const now = new Date().getMonth() + 1;

  const q = plainText(query.trim());
  // Com busca: todos os alimentos da região que batem com o nome (em qualquer idioma), mesmo fora
  // da época, os da estação primeiro. Sem busca: os da estação no mês escolhido.
  const foods: { food: SeasonFood; phase: SeasonPhase | null }[] = !region
    ? []
    : q
      ? SEASON_FOODS.filter(
          (f) => availableIn(f, region) && f.name.some((n) => plainText(n).includes(q)),
        )
          .map((food) => ({ food, phase: phaseOf(food, region, month) }))
          .sort((a, b) => Number(a.phase === null) - Number(b.phase === null))
      : seasonFoods(region, month).filter((x) => kind === "todos" || x.food.kind === kind);
  const peak = foods.filter((x) => x.phase === "auge");
  const addPeak = () =>
    addMany.mutate(
      {
        texts: peak.map((x) => ({ text: tr(x.food.name), section: "hortifruti" })),
        source: "manual",
      },
      {
        onSuccess: (n) =>
          toast.success(
            tr([
              `${n} ${n === 1 ? "item foi" : "itens foram"} para a sua lista de compras.`,
              `${n} ${n === 1 ? "item" : "items"} added to your shopping list.`,
              `${n} ${n === 1 ? "artículo fue" : "artículos fueron"} a tu lista de compras.`,
              `${n} ${n === 1 ? "élément ajouté" : "éléments ajoutés"} à votre liste de courses.`,
            ]),
          ),
        onError: (err) => toast.error((err as Error).message),
      },
    );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 data-page-head className="text-2xl font-extrabold font-display text-foreground">
            {tr([
              "Calendário da feira",
              "Market calendar",
              "Calendario de feria",
              "Calendrier du marché",
            ])}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {tr([
              "O que está na estação perto de você: mais sabor, mais barato e com menos desperdício.",
              "What's in season near you: more flavor, cheaper and less waste.",
              "Lo que está de temporada cerca de ti: más sabor, más barato y menos desperdicio.",
              "Ce qui est de saison près de chez vous : plus de goût, moins cher, moins de gaspillage.",
            ])}
          </p>
        </div>
        <UfSelect />
      </header>

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : !region ? (
        <p className={cn(card, "text-center text-sm text-muted-foreground")}>
          {tr([
            "Escolha seu estado acima para ver o que está na estação.",
            "Choose your state above to see what's in season.",
            "Elige tu estado arriba para ver lo que está de temporada.",
            "Choisissez votre État ci-dessus pour voir la saison.",
          ])}
        </p>
      ) : (
        <>
          <label className="mb-3 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tr([
                "Quando é época de… (ex.: manga)",
                "When is it in season… (e.g. mango)",
                "¿Cuándo es temporada de… (ej.: mango)",
                "Quand est-ce la saison de… (ex. : mangue)",
              ])}
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </label>
          <div className="flex flex-wrap items-center gap-1.5" role="group">
            {MONTH_NAMES.map((m, i) => (
              <button
                key={i}
                type="button"
                aria-pressed={month === i + 1}
                onClick={() => setMonth(i + 1)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                  month === i + 1
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                  now === i + 1 && month !== i + 1 && "border-accent/60",
                )}
              >
                {tr(m)}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {(["todos", "fruta", "legume", "verdura"] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition",
                  kind === k
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {k === "todos" ? tr(["Todos", "All", "Todos", "Tous"]) : tr(KIND_NAMES[k])}
              </button>
            ))}
            <span className="ml-auto text-[11px] text-muted-foreground">
              {tr(["Região", "Region", "Región", "Région"])}: {tr(REGION_NAMES[region])}
            </span>
          </div>

          {foods.length === 0 ? (
            <p className={cn(card, "mt-6 text-center text-sm text-muted-foreground")}>
              {q
                ? tr([
                    "Nenhum alimento com esse nome no calendário.",
                    "No food with that name in the calendar.",
                    "Ningún alimento con ese nombre en el calendario.",
                    "Aucun aliment de ce nom dans le calendrier.",
                  ])
                : tr([
                    "Nada nesta categoria neste mês.",
                    "Nothing in this category this month.",
                    "Nada en esta categoría este mes.",
                    "Rien dans cette catégorie ce mois-ci.",
                  ])}
            </p>
          ) : (
            <>
              {!q && peak.length > 1 && (
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={addPeak}
                    disabled={!user || addMany.isPending}
                    className={btnSoft}
                  >
                    <ShoppingBasket className="h-3.5 w-3.5" />
                    {tr([
                      `Pôr os ${peak.length} do auge na lista`,
                      `Add the ${peak.length} at their peak to the list`,
                      `Añadir los ${peak.length} de temporada alta a la lista`,
                      `Ajouter les ${peak.length} de pleine saison à la liste`,
                    ])}
                  </button>
                </div>
              )}
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {foods.map(({ food, phase }) => (
                  <FoodCard key={food.id} food={food} phase={phase} region={region} />
                ))}
              </ul>
            </>
          )}

          <div className="mt-8 flex flex-wrap gap-2">
            <Link to="/cardapio" className={btnSoft}>
              {tr([
                "Montar o cardápio com a estação",
                "Plan the menu with the season",
                "Armar el menú con la temporada",
                "Préparer le menu de saison",
              ])}
            </Link>
            <Link to="/geladeira" className={btnSoft}>
              {tr([
                "Receitas com o que tenho",
                "Recipes with what I have",
                "Recetas con lo que tengo",
                "Recettes avec ce que j'ai",
              ])}
            </Link>
          </div>
          <p className="mt-6 text-[11px] text-muted-foreground">
            {tr([
              "Referência aproximada (calendário da CEAGESP, Embrapa e Guia Alimentar), ajustada por região. A safra muda com o clima de cada ano.",
              "Approximate reference (CEAGESP calendar, Embrapa and the Brazilian Dietary Guidelines), adjusted by region. Seasons shift with each year's weather.",
              "Referencia aproximada (calendario de CEAGESP, Embrapa y Guía Alimentaria), ajustada por región. La temporada cambia con el clima de cada año.",
              "Référence approximative (calendrier CEAGESP, Embrapa et Guide alimentaire), ajustée par région. Les saisons varient avec la météo.",
            ])}
          </p>
        </>
      )}
    </div>
  );
}

// ───────────────────────────── Cartão da coluna ─────────────────────────────

export function SeasonCard() {
  const tr = useTr();
  const { region, loading } = useSeasonUf();
  const month = new Date().getMonth() + 1;
  const top = region
    ? seasonFoods(region, month)
        .filter((x) => x.phase === "auge" || x.phase === "comecando")
        .slice(0, 5)
    : [];

  return (
    <Panel
      title={tr([
        "Na feira este mês",
        "At the market this month",
        "En la feria este mes",
        "Au marché ce mois-ci",
      ])}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : !region ? (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sprout className="h-4 w-4" />
            {tr([
              "Escolha seu estado para ver o que está na estação.",
              "Choose your state to see what's in season.",
              "Elige tu estado para ver lo que está de temporada.",
              "Choisissez votre État pour voir la saison.",
            ])}
          </p>
          <UfSelect />
        </div>
      ) : (
        <ul className="space-y-1.5">
          {top.map(({ food, phase }) => (
            <li key={food.id} className="flex items-center gap-2 text-xs text-foreground">
              <EmojiIcon emoji={food.emoji} tinted className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{tr(food.name)}</span>
              <span className="text-[10px] text-muted-foreground">{tr(PHASE_NAMES[phase])}</span>
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/feira"
        className="mt-3 inline-block text-[11px] font-semibold text-accent hover:underline"
      >
        {tr([
          "Ver o calendário →",
          "See the calendar →",
          "Ver el calendario →",
          "Voir le calendrier →",
        ])}
      </Link>
    </Panel>
  );
}
