// Grupo familiar "Minha casa" (F1): sem casa, criar ou entrar com código; com casa, a lista de
// compras da casa em tempo real (quem adicionou, quem comprou), quem mora junto, convites e sair.
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  CalendarDays,
  CheckCircle2,
  Copy,
  Crown,
  Home,
  Backpack,
  KeyRound,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Refrigerator,
  Send,
  Share2,
  ShoppingBasket,
  StickyNote,
  Trash2,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { BuyAtMarket } from "@/components/buy-at-market";
import { EmojiIcon } from "@/components/emoji-icon";
import { useTr } from "@/components/settings-ui";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { initials } from "@/lib/community";
import {
  useAddShoppingItems,
  useDeleteShoppingItems,
  useShoppingItems,
  useUpdateShoppingItem,
} from "@/lib/fridge";
import {
  HOUSE_EMOJIS,
  HOUSE_EMOJI_NAMES,
  MAX_MEMBERS,
  NOTE_MAX,
  countMyPersonalItems,
  joinLink,
  useAddHouseNote,
  useBringMyItems,
  useCreateHousehold,
  useDeleteHouseNote,
  useHouseNotes,
  useHouseholdPeople,
  useInviteCode,
  useInviteFriendToHouse,
  useLeaveHousehold,
  useMyHousehold,
  useNewInviteCode,
  useRemoveHouseMember,
  useTransferHousehold,
  useUpdateHousehold,
  type MyHousehold,
} from "@/lib/household";
import type { PersonCard } from "@/lib/social/api";
import { useFriends } from "@/lib/social/queries";
import { cn } from "@/lib/utils";

const card = "rounded-3xl border border-border/70 bg-card p-5 shadow-xs";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50";
const btnSoft =
  "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50";
const iconBtn =
  "rounded-full p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-50";
const field =
  "w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground";

const onError = (err: unknown) => toast.error((err as Error).message);

function Avatar({ person, size = 36 }: { person?: PersonCard; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full avatar-shape bg-primary-soft text-xs font-bold text-primary"
      style={{ width: size, height: size }}
    >
      {person?.avatarUrl ? (
        <img src={person.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(person?.name ?? "?")
      )}
    </span>
  );
}

export function HouseholdPanel() {
  const tr = useTr();
  const { user } = useAuth();
  const mine = useMyHousehold(user?.id);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1
          data-page-head={mine.data ? undefined : ""}
          className="text-2xl font-extrabold font-display text-foreground"
        >
          {mine.data ? (
            <span className="inline-flex items-center gap-2">
              <EmojiIcon emoji={mine.data.house.emoji} fallback={Home} tinted className="h-6 w-6" />
              {mine.data.house.name}
            </span>
          ) : (
            tr(["Minha casa", "My home", "Mi casa", "Ma maison"])
          )}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {tr([
            "Quem mora junto compartilha a lista de compras, a geladeira e o cardápio da semana, atualizados na hora para todos. Diário, metas, peso e acompanhamento continuam só de cada um.",
            "People who live together share the shopping list, fridge and weekly menu, updated instantly for everyone. Diary, goals, weight and care stay private to each person.",
            "Quienes viven juntos comparten la lista de compras, la nevera y el menú semanal, actualizados al instante para todos. Diario, metas, peso y seguimiento siguen siendo de cada uno.",
            "Ceux qui vivent ensemble partagent la liste de courses, le frigo et le menu de la semaine, mis à jour instantanément. Journal, objectifs, poids et suivi restent personnels.",
          ])}
        </p>
      </header>

      {mine.isLoading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : mine.data ? (
        <HouseView mine={mine.data} />
      ) : (
        <NoHouse />
      )}
    </div>
  );
}

// ───────────────────────────── Sem casa ─────────────────────────────

function NoHouse() {
  const tr = useTr();
  const navigate = useNavigate();
  const create = useCreateHousehold();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(HOUSE_EMOJIS[0]);
  const [code, setCode] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim(), emoji },
      {
        onSuccess: () =>
          toast.success(tr(["Casa criada!", "Home created!", "¡Casa creada!", "Maison créée !"])),
        onError,
      },
    );
  };

  const clean = code
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form onSubmit={submit} className={card}>
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Home className="h-4 w-4 text-accent" />
          {tr(["Criar uma casa", "Create a home", "Crear una casa", "Créer une maison"])}
        </h2>
        <label className="mt-3 block text-xs font-semibold text-muted-foreground">
          {tr(["Nome da casa", "Home name", "Nombre de la casa", "Nom de la maison"])}
          <input
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            placeholder={tr([
              "Ex.: Casa da família Silva",
              "E.g. The Silva home",
              "Ej.: Casa de la familia Silva",
              "Ex. : La maison des Silva",
            ])}
            className={cn(field, "mt-1")}
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup">
          {HOUSE_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              role="radio"
              aria-checked={emoji === e}
              aria-label={HOUSE_EMOJI_NAMES[e] ? tr(HOUSE_EMOJI_NAMES[e]) : undefined}
              onClick={() => setEmoji(e)}
              className={cn(
                "grid h-9 w-9 place-items-center rounded-xl border transition",
                emoji === e ? "border-accent bg-accent-soft" : "border-border hover:bg-secondary",
              )}
            >
              <EmojiIcon emoji={e} fallback={Home} tinted className="h-5 w-5" />
            </button>
          ))}
        </div>
        <button
          type="submit"
          className={cn(btnPrimary, "mt-4")}
          disabled={!name.trim() || create.isPending}
        >
          <Plus className="h-4 w-4" />
          {tr(["Criar casa", "Create home", "Crear casa", "Créer"])}
        </button>
      </form>

      <form
        className={card}
        onSubmit={(e) => {
          e.preventDefault();
          if (clean.length === 6)
            void navigate({ to: "/casa/entrar/$code", params: { code: clean } });
        }}
      >
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <KeyRound className="h-4 w-4 text-accent" />
          {tr([
            "Entrar com um código",
            "Join with a code",
            "Entrar con un código",
            "Rejoindre avec un code",
          ])}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {tr([
            "Peça o código de 6 letras a quem já está na casa.",
            "Ask someone in the home for the 6-letter code.",
            "Pide el código de 6 letras a alguien de la casa.",
            "Demandez le code à 6 lettres à quelqu'un de la maison.",
          ])}
        </p>
        <input
          value={clean}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ABC234"
          aria-label={tr(["Código", "Code", "Código", "Code"])}
          className={cn(field, "mt-3 text-center font-mono text-lg tracking-[0.4em] uppercase")}
        />
        <button type="submit" className={cn(btnPrimary, "mt-4")} disabled={clean.length !== 6}>
          {tr(["Continuar", "Continue", "Continuar", "Continuer"])}
        </button>
      </form>

      <section className={cn(card, "bg-secondary/40 md:col-span-2")}>
        <h2 className="text-sm font-bold text-foreground">
          {tr(["Como funciona", "How it works", "Cómo funciona", "Comment ça marche"])}
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-foreground/85">
          {(
            [
              [
                `Uma casa por pessoa, com até ${MAX_MEMBERS} pessoas. Quem cria é o(a) responsável e pode passar o papel.`,
                `One home per person, up to ${MAX_MEMBERS} people. The creator is in charge and can hand it over.`,
                `Una casa por persona, hasta ${MAX_MEMBERS} personas. Quien la crea es responsable y puede pasar el rol.`,
                `Une maison par personne, jusqu'à ${MAX_MEMBERS} personnes. Le créateur est responsable et peut passer la main.`,
              ],
              [
                "Ao entrar, você escolhe se leva a sua lista de compras para a casa ou se ela fica guardada.",
                "When you join, you choose whether to bring your shopping list or keep it saved.",
                "Al entrar, eliges si llevas tu lista de compras a la casa o si queda guardada.",
                "En rejoignant, vous choisissez d'apporter votre liste de courses ou de la garder de côté.",
              ],
              [
                "Ao sair, a sua lista pessoal volta; o que você pôs na lista da casa fica para quem continua.",
                "When you leave, your personal list comes back; what you added to the home list stays.",
                "Al salir, tu lista personal vuelve; lo que pusiste en la lista de la casa se queda.",
                "En partant, votre liste perso revient ; ce que vous avez ajouté à la liste commune reste.",
              ],
              [
                "Os adultos da casa montam as lancheiras de todas as crianças, e há um mural de recados.",
                "The adults plan every child's lunchbox, and there's a message board.",
                "Los adultos arman las loncheras de todos los niños, y hay un mural de mensajes.",
                "Les adultes préparent les goûters de tous les enfants, et il y a un tableau de messages.",
              ],
            ] as [string, string, string, string][]
          ).map((t) => (
            <li key={t[0]}>{tr(t)}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ───────────────────────────── Com casa ─────────────────────────────

function HouseView({ mine }: { mine: MyHousehold }) {
  const { user } = useAuth();
  const people = useHouseholdPeople(mine.members.map((m) => m.user_id));
  const isOwner = mine.role === "responsavel";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <BringItemsPrompt houseId={mine.house.id} />
        <HouseShopping people={people.data} />
        <HouseKitchen />
        <HouseNotes mine={mine} people={people.data} me={user?.id} />
      </div>
      <div className="space-y-4">
        {isOwner && <EditHouse mine={mine} />}
        <Members mine={mine} people={people.data} me={user?.id} />
        <Invite mine={mine} />
        <LeaveHouse />
      </div>
    </div>
  );
}

/** Pergunta, uma vez por casa, se a pessoa quer levar a lista pessoal para a casa. */
function BringItemsPrompt({ houseId }: { houseId: string }) {
  const tr = useTr();
  const { user } = useAuth();
  const bring = useBringMyItems();
  const storageKey = `nc_casa_lista_${houseId}`;
  const [count, setCount] = useState(0);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    try {
      setDismissed(window.localStorage.getItem(storageKey) === "1");
    } catch {
      setDismissed(false);
    }
    countMyPersonalItems(user.id)
      .then((n) => alive && setCount(n))
      .catch(() => alive && setCount(0));
    return () => {
      alive = false;
    };
  }, [user?.id, storageKey]);

  const hide = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // Sem armazenamento: a pergunta volta na próxima visita.
    }
  };

  if (dismissed || count === 0) return null;
  return (
    <div className={cn(card, "border-accent/40 bg-accent-soft/30")}>
      <p className="text-sm font-semibold text-foreground">
        {tr([
          `Você tem ${count} ${count === 1 ? "item" : "itens"} na sua lista de compras e na sua geladeira.`,
          `You have ${count} ${count === 1 ? "item" : "items"} on your own shopping list and fridge.`,
          `Tienes ${count} ${count === 1 ? "artículo" : "artículos"} en tu lista y tu nevera.`,
          `Vous avez ${count} article${count === 1 ? "" : "s"} dans votre liste et votre frigo.`,
        ])}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {tr([
          "Levar para a casa? Se preferir, eles ficam guardados e voltam se você sair da casa.",
          "Bring them to the home? Or keep them saved; they come back if you leave the home.",
          "¿Llevarlos a la casa? Si prefieres, quedan guardados y vuelven si sales.",
          "Les apporter à la maison ? Sinon, ils restent de côté et reviennent si vous partez.",
        ])}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={btnPrimary}
          disabled={bring.isPending}
          onClick={() =>
            bring.mutate(undefined, {
              onSuccess: (n) => {
                hide();
                toast.success(
                  tr([
                    `${n} item(ns) na lista da casa.`,
                    `${n} item(s) moved to the home list.`,
                    `${n} artículo(s) en la lista de la casa.`,
                    `${n} article(s) sur la liste commune.`,
                  ]),
                );
              },
              onError,
            })
          }
        >
          {tr(["Levar para a casa", "Bring them", "Llevar a la casa", "Les apporter"])}
        </button>
        <button type="button" className={btnSoft} onClick={hide}>
          {tr(["Deixar guardados", "Keep them saved", "Dejar guardados", "Les garder de côté"])}
        </button>
      </div>
    </div>
  );
}

function HouseShopping({ people }: { people?: Map<string, PersonCard> }) {
  const tr = useTr();
  const { user } = useAuth();
  const list = useShoppingItems(user?.id);
  const add = useAddShoppingItems(user?.id);
  const update = useUpdateShoppingItem();
  const remove = useDeleteShoppingItems();
  const [text, setText] = useState("");

  const items = list.data ?? [];
  const open = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);
  const firstName = (id: string | null) =>
    id === user?.id
      ? tr(["você", "you", "ti", "vous"])
      : (people?.get(id ?? "")?.name.split(" ")[0] ?? "…");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const entries = text
      .split(/[,;\n]/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (!entries.length) return;
    add.mutate(
      { texts: entries },
      {
        onSuccess: (n) => {
          setText("");
          if (n === 0)
            toast.info(
              tr([
                "Já está na lista.",
                "Already on the list.",
                "Ya está en la lista.",
                "Déjà sur la liste.",
              ]),
            );
        },
        onError,
      },
    );
  };

  const row = (it: (typeof items)[number]) => (
    <li key={it.id} className="group flex items-center gap-2 py-1.5">
      <button
        type="button"
        onClick={() => update.mutate({ id: it.id, done: !it.done })}
        aria-pressed={it.done}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <CheckCircle2
          className={cn("h-5 w-5 shrink-0", it.done ? "text-accent" : "text-muted-foreground/50")}
        />
        <span className="min-w-0">
          <span
            className={cn(
              "block truncate text-sm",
              it.done ? "text-muted-foreground line-through" : "text-foreground",
            )}
          >
            {it.text}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {it.done && it.bought_by
              ? tr([
                  `comprado por ${firstName(it.bought_by)}`,
                  `bought by ${firstName(it.bought_by)}`,
                  `comprado por ${firstName(it.bought_by)}`,
                  `acheté par ${firstName(it.bought_by)}`,
                ])
              : tr([
                  `adicionado por ${firstName(it.user_id)}`,
                  `added by ${firstName(it.user_id)}`,
                  `añadido por ${firstName(it.user_id)}`,
                  `ajouté par ${firstName(it.user_id)}`,
                ])}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => remove.mutate([it.id])}
        className="text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100 focus:opacity-100"
        aria-label={tr(["Remover", "Remove", "Quitar", "Retirer"])}
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );

  return (
    <section className={card}>
      <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
        <ShoppingBasket className="h-4 w-4 text-accent" />
        {tr([
          "Lista de compras da casa",
          "Home shopping list",
          "Lista de compras de la casa",
          "Liste de courses commune",
        ])}
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          {tr(["ao vivo", "live", "en vivo", "en direct"])}
        </span>
      </h2>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={400}
          placeholder={tr([
            "Adicionar (separe com vírgula)",
            "Add (separate with commas)",
            "Añadir (separa con comas)",
            "Ajouter (séparez par des virgules)",
          ])}
          className={field}
        />
        <button type="submit" className={btnPrimary} disabled={!text.trim() || add.isPending}>
          <Plus className="h-4 w-4" />
          <span className="sr-only">{tr(["Adicionar", "Add", "Añadir", "Ajouter"])}</span>
        </button>
      </form>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {tr([
          "O que vocês mandarem da Geladeira, do Cardápio, da Feira e da Lancheira também cai aqui.",
          "Anything sent from the Fridge, Menu, Market and Lunchbox lands here too.",
          "Lo que envíen desde la Nevera, el Menú, la Feria y la Lonchera también llega aquí.",
          "Ce que vous envoyez du Frigo, du Menu, du Marché et de la Boîte à goûter arrive aussi ici.",
        ])}
      </p>
      <BuyAtMarket items={open.map((i) => i.text)} source="lista" className="mt-2" />

      {list.isLoading ? (
        <Loader2 className="mx-auto mt-6 h-5 w-5 animate-spin text-muted-foreground" />
      ) : items.length === 0 ? (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          {tr([
            "A lista da casa está vazia.",
            "The home list is empty.",
            "La lista de la casa está vacía.",
            "La liste commune est vide.",
          ])}
        </p>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-border/50">{open.map(row)}</ul>
          {done.length > 0 && (
            <>
              <h3 className="mt-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {tr(["Comprados", "Bought", "Comprados", "Achetés"])}
              </h3>
              <ul className="mt-1 divide-y divide-border/50">{done.map(row)}</ul>
              <button
                type="button"
                onClick={() => remove.mutate(done.map((i) => i.id))}
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {tr(["Limpar comprados", "Clear bought", "Quitar comprados", "Retirer les achats"])}
              </button>
            </>
          )}
        </>
      )}
    </section>
  );
}

function EditHouse({ mine }: { mine: MyHousehold }) {
  const tr = useTr();
  const save = useUpdateHousehold();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(mine.house.name);
  const [emoji, setEmoji] = useState(mine.house.emoji);

  if (!editing) {
    return (
      <button type="button" className={btnSoft} onClick={() => setEditing(true)}>
        <Pencil className="h-3.5 w-3.5" />
        {tr(["Editar nome e ícone", "Edit name and icon", "Editar nombre e ícono", "Modifier"])}
      </button>
    );
  }
  return (
    <form
      className={card}
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate({ name: name.trim(), emoji }, { onSuccess: () => setEditing(false), onError });
      }}
    >
      <input
        value={name}
        maxLength={40}
        onChange={(e) => setName(e.target.value)}
        className={field}
        aria-label={tr(["Nome da casa", "Home name", "Nombre de la casa", "Nom de la maison"])}
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {HOUSE_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            aria-pressed={emoji === e}
            aria-label={HOUSE_EMOJI_NAMES[e] ? tr(HOUSE_EMOJI_NAMES[e]) : undefined}
            onClick={() => setEmoji(e)}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-xl border transition",
              emoji === e ? "border-accent bg-accent-soft" : "border-border hover:bg-secondary",
            )}
          >
            <EmojiIcon emoji={e} fallback={Home} tinted className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button type="submit" className={btnPrimary} disabled={!name.trim() || save.isPending}>
          {tr(["Salvar", "Save", "Guardar", "Enregistrer"])}
        </button>
        <button type="button" className={btnSoft} onClick={() => setEditing(false)}>
          {tr(["Cancelar", "Cancel", "Cancelar", "Annuler"])}
        </button>
      </div>
    </form>
  );
}

function Members({
  mine,
  people,
  me,
}: {
  mine: MyHousehold;
  people?: Map<string, PersonCard>;
  me?: string;
}) {
  const tr = useTr();
  const remove = useRemoveHouseMember();
  const transfer = useTransferHousehold();
  const isOwner = mine.role === "responsavel";

  return (
    <section className={card}>
      <h2 className="text-sm font-bold text-foreground">
        {tr(["Quem mora aqui", "Who lives here", "Quién vive aquí", "Qui habite ici"])}{" "}
        <span className="font-normal text-muted-foreground">
          ({mine.members.length}/{MAX_MEMBERS})
        </span>
      </h2>
      <ul className="mt-2 space-y-1">
        {mine.members.map((m) => {
          const p = people?.get(m.user_id);
          const owner = m.role === "responsavel";
          return (
            <li key={m.user_id} className="flex items-center gap-2 py-1">
              <Avatar person={p} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {p?.name ?? "…"} {m.user_id === me && tr(["(você)", "(you)", "(tú)", "(vous)"])}
                </span>
                {owner && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-accent">
                    <Crown className="h-3 w-3" />
                    {tr(["Responsável", "In charge", "Responsable", "Responsable"])}
                  </span>
                )}
              </span>
              {isOwner && m.user_id !== me && (
                <>
                  <button
                    type="button"
                    className={iconBtn}
                    disabled={transfer.isPending}
                    title={tr([
                      "Passar o papel de responsável",
                      "Hand over the lead",
                      "Pasar el rol de responsable",
                      "Passer la main",
                    ])}
                    onClick={() => {
                      if (
                        window.confirm(
                          tr([
                            `Passar o papel de responsável para ${p?.name ?? ""}?`,
                            `Hand over the lead to ${p?.name ?? ""}?`,
                            `¿Pasar el rol de responsable a ${p?.name ?? ""}?`,
                            `Passer la main à ${p?.name ?? ""} ?`,
                          ]),
                        )
                      )
                        transfer.mutate(m.user_id, { onError });
                    }}
                  >
                    <Crown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className={iconBtn}
                    disabled={remove.isPending}
                    title={tr([
                      "Tirar da casa",
                      "Remove from home",
                      "Quitar de la casa",
                      "Retirer",
                    ])}
                    onClick={() => {
                      if (
                        window.confirm(
                          tr([
                            `Tirar ${p?.name ?? ""} da casa?`,
                            `Remove ${p?.name ?? ""} from the home?`,
                            `¿Quitar a ${p?.name ?? ""} de la casa?`,
                            `Retirer ${p?.name ?? ""} de la maison ?`,
                          ]),
                        )
                      )
                        remove.mutate(m.user_id, { onError });
                    }}
                  >
                    <UserMinus className="h-4 w-4" />
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Invite({ mine }: { mine: MyHousehold }) {
  const tr = useTr();
  const code = useInviteCode(mine.house.id);
  const renew = useNewInviteCode();
  const friends = useFriends();
  const inviteFriend = useInviteFriendToHouse();
  const [invited, setInvited] = useState<string[]>([]);
  const full = mine.members.length >= MAX_MEMBERS;
  const inHouse = new Set(mine.members.map((m) => m.user_id));
  const candidates = (friends.data ?? []).filter((f) => !inHouse.has(f.id));
  const value = code.data?.code;
  const link = value ? joinLink(value) : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success(tr(["Link copiado!", "Link copied!", "¡Enlace copiado!", "Lien copié !"]));
    } catch {
      toast.error(link);
    }
  };
  const share = async () => {
    const text = tr([
      `Entre na nossa casa no NutriConnect com o código ${value}:`,
      `Join our home on NutriConnect with code ${value}:`,
      `Únete a nuestra casa en NutriConnect con el código ${value}:`,
      `Rejoignez notre maison sur NutriConnect avec le code ${value} :`,
    ]);
    if (navigator.share) {
      await navigator.share({ title: "NutriConnect", text, url: link }).catch(() => undefined);
    } else {
      await copy();
    }
  };

  return (
    <section className={card}>
      <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
        <UserPlus className="h-4 w-4 text-accent" />
        {tr(["Chamar para a casa", "Invite to the home", "Invitar a la casa", "Inviter"])}
      </h2>
      {full ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {tr([
            `A casa está completa (${MAX_MEMBERS} pessoas).`,
            `The home is full (${MAX_MEMBERS} people).`,
            `La casa está completa (${MAX_MEMBERS} personas).`,
            `La maison est complète (${MAX_MEMBERS} personnes).`,
          ])}
        </p>
      ) : (
        <>
          <div className="mt-3 rounded-2xl bg-secondary/60 p-3 text-center">
            {code.isLoading ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <p className="font-mono text-2xl font-bold tracking-[0.35em] text-foreground">
                  {value}
                </p>
                {code.data?.expires_at && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {tr(["Vale até", "Valid until", "Válido hasta", "Valable jusqu'au"])}{" "}
                    {new Date(code.data.expires_at).toLocaleDateString()}
                  </p>
                )}
              </>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={btnSoft}
              onClick={() => void share()}
              disabled={!value}
            >
              <Share2 className="h-3.5 w-3.5" />
              {tr(["Compartilhar", "Share", "Compartir", "Partager"])}
            </button>
            <button type="button" className={btnSoft} onClick={() => void copy()} disabled={!value}>
              <Copy className="h-3.5 w-3.5" />
              {tr(["Copiar link", "Copy link", "Copiar enlace", "Copier le lien"])}
            </button>
            {mine.role === "responsavel" && (
              <button
                type="button"
                className={btnSoft}
                disabled={renew.isPending}
                onClick={() => renew.mutate(undefined, { onError })}
                title={tr([
                  "O código atual deixa de valer",
                  "The current code stops working",
                  "El código actual deja de valer",
                  "L'ancien code ne marchera plus",
                ])}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {tr(["Novo código", "New code", "Nuevo código", "Nouveau code"])}
              </button>
            )}
          </div>

          {candidates.length > 0 && (
            <>
              <h3 className="mt-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {tr(["Amigos", "Friends", "Amigos", "Amis"])}
              </h3>
              <ul className="mt-1 space-y-1">
                {candidates.slice(0, 8).map((f) => (
                  <li key={f.id} className="flex items-center gap-2 py-1">
                    <Avatar person={f} size={28} />
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {f.name}
                    </span>
                    {invited.includes(f.id) ? (
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        {tr(["Chamado(a)", "Invited", "Invitado(a)", "Invité(e)"])}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={btnSoft}
                        disabled={inviteFriend.isPending}
                        onClick={() =>
                          inviteFriend.mutate(f.id, {
                            onSuccess: () => setInvited((l) => [...l, f.id]),
                            onError,
                          })
                        }
                      >
                        {tr(["Chamar", "Invite", "Invitar", "Inviter"])}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}

function LeaveHouse() {
  const tr = useTr();
  const leave = useLeaveHousehold();
  return (
    <div className="flex justify-end">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
        disabled={leave.isPending}
        onClick={() => {
          if (
            !window.confirm(
              tr([
                "Sair da casa? A sua lista pessoal volta, e o que você pôs na lista da casa fica com ela.",
                "Leave the home? Your personal list comes back, and what you added to the home list stays.",
                "¿Salir de la casa? Tu lista personal vuelve, y lo que pusiste en la lista de la casa se queda.",
                "Quitter la maison ? Votre liste perso revient, et ce que vous avez ajouté reste à la maison.",
              ]),
            )
          )
            return;
          leave.mutate(undefined, { onError });
        }}
      >
        <LogOut className="h-3.5 w-3.5" />
        {tr(["Sair da casa", "Leave the home", "Salir de la casa", "Quitter la maison"])}
      </button>
    </div>
  );
}

/** Geladeira e cardápio, que também passam a ser da casa. */
function HouseKitchen() {
  const tr = useTr();
  const links = [
    {
      to: "/geladeira" as const,
      icon: Refrigerator,
      title: tr(["Geladeira da casa", "Home fridge", "Nevera de la casa", "Frigo de la maison"]),
      text: tr([
        "O que tem em casa, para receitas com o que sobrou",
        "What's at home, for recipes with what's left",
        "Lo que hay en casa, para recetas con lo que queda",
        "Ce qu'il y a à la maison, pour cuisiner les restes",
      ]),
    },
    {
      to: "/cardapio" as const,
      icon: CalendarDays,
      title: tr(["Cardápio da casa", "Home menu", "Menú de la casa", "Menu de la maison"]),
      text: tr([
        "Almoço e jantar da semana, com porções para todos",
        "The week's lunch and dinner, with servings for everyone",
        "Almuerzo y cena de la semana, con porciones para todos",
        "Déjeuners et dîners de la semaine, avec des portions pour tous",
      ]),
    },
    {
      to: "/lancheira" as const,
      icon: Backpack,
      title: tr(["Lancheiras", "Lunchboxes", "Loncheras", "Boîtes à goûter"]),
      text: tr([
        "Os adultos da casa montam o lanche de todas as crianças",
        "The adults at home plan every child's snacks",
        "Los adultos de la casa arman la merienda de todos los niños",
        "Les adultes préparent les goûters de tous les enfants",
      ]),
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {links.map((l) => (
        <Link
          key={l.to}
          to={l.to}
          className={cn(card, "flex items-start gap-3 transition hover:bg-secondary/50")}
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
            <l.icon className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-bold text-foreground">{l.title}</span>
            <span className="block text-xs text-muted-foreground">{l.text}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

/** Mural da casa: recados curtos para quem mora junto, em tempo real. */
function HouseNotes({
  mine,
  people,
  me,
}: {
  mine: MyHousehold;
  people?: Map<string, PersonCard>;
  me?: string;
}) {
  const tr = useTr();
  const { locale } = useI18n();
  const notes = useHouseNotes(mine.house.id);
  const add = useAddHouseNote(mine.house.id);
  const remove = useDeleteHouseNote();
  const [text, setText] = useState("");
  const isOwner = mine.role === "responsavel";

  const when = (iso: string) =>
    new Date(iso).toLocaleString(locale, {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <section className={card}>
      <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
        <StickyNote className="h-4 w-4 text-accent" />
        {tr(["Mural da casa", "Home board", "Mural de la casa", "Tableau de la maison"])}
      </h2>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          add.mutate(text, { onSuccess: () => setText(""), onError });
        }}
      >
        <input
          value={text}
          maxLength={NOTE_MAX}
          onChange={(e) => setText(e.target.value)}
          placeholder={tr([
            "Ex.: hoje janto fora · sobrou arroz",
            "E.g. eating out tonight · leftover rice",
            "Ej.: hoy ceno fuera · sobró arroz",
            "Ex. : je dîne dehors ce soir · il reste du riz",
          ])}
          className={field}
        />
        <button type="submit" className={btnPrimary} disabled={!text.trim() || add.isPending}>
          <Send className="h-4 w-4" />
          <span className="sr-only">{tr(["Enviar", "Send", "Enviar", "Envoyer"])}</span>
        </button>
      </form>
      {notes.isLoading ? (
        <Loader2 className="mx-auto mt-4 h-5 w-5 animate-spin text-muted-foreground" />
      ) : (notes.data ?? []).length === 0 ? (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {tr([
            "Nenhum recado ainda.",
            "No notes yet.",
            "Aún no hay mensajes.",
            "Aucun message pour l'instant.",
          ])}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {(notes.data ?? []).map((n) => {
            const author = people?.get(n.author_id);
            return (
              <li
                key={n.id}
                className="group flex items-start gap-2 rounded-2xl bg-secondary/50 p-2.5"
              >
                <Avatar person={author} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {n.author_id === me
                        ? tr(["Você", "You", "Tú", "Vous"])
                        : (author?.name.split(" ")[0] ?? "…")}
                    </span>{" "}
                    · {when(n.created_at)}
                  </p>
                  <p className="break-words text-sm text-foreground">{n.body}</p>
                </div>
                {(n.author_id === me || isOwner) && (
                  <button
                    type="button"
                    onClick={() => remove.mutate(n.id, { onError })}
                    className="text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100 focus:opacity-100"
                    aria-label={tr(["Apagar", "Delete", "Borrar", "Supprimer"])}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
