// Nina: histórico dos modelos (abrir, girar, ver as ações e escolher qual o site usa) e personalização
// da aparência (cores, cabelo, roupa, acessórios). Tudo fica em platform_settings ("site_nina").
import { useEffect, useMemo, useRef, useState } from "react";
import { siteConfirm } from "@/components/confirm-action";
import { Check, Eye, Paintbrush, RotateCcw, Save, Star, Trash2 } from "lucide-react";
import { Badge, Panel, btnCls, btnDanger, btnPrimary, inputCls } from "@/components/admin/admin-ui";
import { NinaLive } from "@/components/nina-live";
import { NinaViewer } from "@/components/nina-viewer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LABELS,
  defaultLook,
  NINA_VERSIONS,
  PALETTES,
  modelKey,
  type Glasses,
  type HairStyle,
  type HeadAccessory,
  type NinaLook,
  type NinaModel,
  type NinaSiteConfig,
  type NinaVersion,
  type Outfit,
  type SavedNinaModel,
} from "@/lib/characters/nina-config";
import { useNinaSiteConfig } from "@/lib/nina-model";
import { useSaveSiteConfig } from "@/lib/site-config";
import { useTr } from "@/components/settings-ui";
import type { Names } from "@/lib/appearance-data";

// Rótulos exibidos no painel (os de nina-config continuam sendo usados no nome salvo no histórico).
const HAIR_TR: Record<HairStyle, Names> = {
  trancas: ["Duas tranças", "Two braids", "Dos trenzas", "Deux tresses"],
  marias: ["Marias-chiquinhas", "Pigtails", "Coletas", "Couettes"],
  rabo: ["Rabo de cavalo", "Ponytail", "Coleta alta", "Queue de cheval"],
  coque: ["Coque", "Bun", "Moño", "Chignon"],
  solto: ["Solto e comprido", "Long and loose", "Suelto y largo", "Longs et détachés"],
  curto: ["Curtinho", "Short", "Cortito", "Courts"],
};
const OUTFIT_TR: Record<Outfit, Names> = {
  jaleco: [
    "Jaleco de nutricionista",
    "Nutritionist's lab coat",
    "Bata de nutricionista",
    "Blouse de nutritionniste",
  ],
  camiseta: ["Camiseta", "T-shirt", "Camiseta", "T-shirt"],
  moletom: ["Moletom", "Hoodie", "Sudadera", "Sweat à capuche"],
  vestido: ["Vestido", "Dress", "Vestido", "Robe"],
};
const ACCESSORY_TR: Record<HeadAccessory, Names> = {
  folha: ["Presilha de folha", "Leaf hair clip", "Pasador de hoja", "Barrette feuille"],
  laco: ["Laço", "Bow", "Lazo", "Nœud"],
  flor: ["Flor", "Flower", "Flor", "Fleur"],
  tiara: ["Tiara", "Headband", "Diadema", "Serre-tête"],
  nenhum: ["Nenhum", "None", "Ninguno", "Aucun"],
};
const GLASSES_TR: Record<Glasses, Names> = {
  nenhum: ["Sem óculos", "No glasses", "Sin gafas", "Sans lunettes"],
  redondo: ["Redondos", "Round", "Redondas", "Rondes"],
  quadrado: ["Quadrados", "Square", "Cuadradas", "Carrées"],
};
const VERSION_DESC_TR: Record<NinaVersion, Names> = {
  v2: [
    "Cabeça grande e redonda, olhos castanhos grandes com brilho, sardas e tranças. Aceita toda a personalização.",
    "Big round head, large shiny brown eyes, freckles and braids. Supports full customization.",
    "Cabeza grande y redonda, ojos marrones grandes y brillantes, pecas y trenzas. Admite toda la personalización.",
    "Grosse tête ronde, grands yeux marron brillants, taches de rousseur et tresses. Entièrement personnalisable.",
  ],
  v1: [
    "O primeiro modelo 3D, criado para a apresentação: olhos ovais escuros, franja em mechas, tranças de bolinhas e tablet. Aceita toda a personalização.",
    "The first 3D model, made for the presentation: dark oval eyes, wispy bangs, bubble braids and a tablet. Supports full customization.",
    "El primer modelo 3D, creado para la presentación: ojos ovalados oscuros, flequillo en mechones, trenzas de burbujas y tableta. Admite toda la personalización.",
    "Le premier modèle 3D, créé pour la présentation : yeux ovales foncés, frange effilée, tresses à bulles et tablette. Entièrement personnalisable.",
  ],
  desenho: [
    "Desenho com aparência 3D (luz e sombra), feito a partir da imagem original. Não gira.",
    "A drawing with a 3D look (light and shadow), made from the original image. It doesn't rotate.",
    "Dibujo con aspecto 3D (luz y sombra), hecho a partir de la imagen original. No gira.",
    "Dessin à l'aspect 3D (ombre et lumière), réalisé à partir de l'image d'origine. Il ne tourne pas.",
  ],
};

interface Entry {
  key: string;
  name: string;
  date: string;
  description: string | Names;
  model: NinaModel;
  saved?: SavedNinaModel;
}

const versionInfo = (v: NinaVersion) => NINA_VERSIONS.find((x) => x.id === v)!;
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
};

export function SiteNinaSection() {
  const tr = useTr();
  const config = useNinaSiteConfig();
  const save = useSaveSiteConfig();
  const [open, setOpen] = useState<Entry | null>(null);
  const [draft, setDraft] = useState<NinaModel | null>(null);
  const editor = useRef<HTMLDivElement>(null);
  const activeKey = modelKey(config.active);
  const descText = (d: string | Names) => (typeof d === "string" ? d : tr(d));

  const entries: Entry[] = useMemo(
    () => [
      ...config.saved.map((s) => ({
        key: `saved-${s.id}`,
        name: s.name,
        date: fmtDate(s.savedAt),
        description: [
          `Personalizada a partir da ${versionInfo(s.version).name}.`,
          `Customized from ${versionInfo(s.version).name}.`,
          `Personalizada a partir de ${versionInfo(s.version).name}.`,
          `Personnalisée à partir de ${versionInfo(s.version).name}.`,
        ] as Names,
        model: { version: s.version, look: s.look },
        saved: s,
      })),
      ...NINA_VERSIONS.map((v) => ({
        key: v.id,
        name: v.name,
        date: v.date,
        description: VERSION_DESC_TR[v.id] ?? v.description,
        model: { version: v.id, look: defaultLook(v.id) },
      })),
    ],
    [config.saved],
  );

  const publish = (next: NinaSiteConfig, done?: () => void) =>
    save.mutate({ key: "site_nina", value: next }, { onSuccess: done });

  const use = (model: NinaModel) => publish({ ...config, active: model });

  const remove = async (s: SavedNinaModel) => {
    if (
      !(await siteConfirm(
        tr([
          `Excluir "${s.name}" do histórico?`,
          `Delete "${s.name}" from the history?`,
          `¿Eliminar "${s.name}" del historial?`,
          `Supprimer « ${s.name} » de l'historique ?`,
        ]),
      ))
    )
      return;
    publish({ ...config, saved: config.saved.filter((x) => x.id !== s.id) });
  };

  const edit = (model: NinaModel) => {
    setDraft({ version: model.version === "desenho" ? "v2" : model.version, look: model.look });
    setOpen(null);
    requestAnimationFrame(() =>
      editor.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const activeEntry = entries.find((e) => modelKey(e.model) === activeKey);

  return (
    <div className="space-y-4">
      <Panel
        title={tr([
          "Nina em uso no site",
          "Nina in use on the site",
          "Nina en uso en el sitio",
          "Nina utilisée sur le site",
        ])}
        hint={tr([
          "É a Nina que aparece para todo mundo: na conversa com a Nina, nas trilhas, nos desafios e na apresentação.",
          "This is the Nina everyone sees: in the chat with Nina, in the learning paths, in the challenges and in the presentation.",
          "Es la Nina que ve todo el mundo: en la conversación con Nina, en las rutas, en los desafíos y en la presentación.",
          "C'est la Nina que tout le monde voit : dans la conversation avec Nina, les parcours, les défis et la présentation.",
        ])}
      >
        <div className="flex flex-wrap items-center gap-4">
          <NinaLive
            model={config.active}
            framing="bust"
            entrance={false}
            className="h-28 w-24 shrink-0 rounded-2xl bg-secondary"
          />
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold">
              {activeEntry?.name ??
                tr([
                  "Nina personalizada",
                  "Customized Nina",
                  "Nina personalizada",
                  "Nina personnalisée",
                ])}
            </p>
            <p className="text-xs text-muted-foreground">
              {versionInfo(config.active.version).name}
              {activeEntry?.saved
                ? ` · ${tr(["personalizada", "customized", "personalizada", "personnalisée"])}`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnCls}
              onClick={() =>
                setOpen(
                  activeEntry ?? {
                    key: "active",
                    name: tr(["Nina em uso", "Nina in use", "Nina en uso", "Nina utilisée"]),
                    date: "",
                    description: "",
                    model: config.active,
                  },
                )
              }
            >
              <Eye className="h-3.5 w-3.5" /> {tr(["Abrir", "Open", "Abrir", "Ouvrir"])}
            </button>
            <button type="button" className={btnPrimary} onClick={() => edit(config.active)}>
              <Paintbrush className="h-3.5 w-3.5" />{" "}
              {tr(["Personalizar", "Customize", "Personalizar", "Personnaliser"])}
            </button>
          </div>
        </div>
      </Panel>

      <Panel
        title={tr([
          "Histórico de modelos",
          "Model history",
          "Historial de modelos",
          "Historique des modèles",
        ])}
        hint={tr([
          "Os modelos que a Nina já teve e as versões personalizadas que você guardou. Abra para girar e ver as ações; escolha qual o site usa.",
          "The models Nina has had and the customized versions you saved. Open one to rotate it and see its actions; choose which one the site uses.",
          "Los modelos que Nina ha tenido y las versiones personalizadas que guardaste. Ábrelos para girarlos y ver las acciones; elige cuál usa el sitio.",
          "Les modèles que Nina a eus et les versions personnalisées que vous avez enregistrées. Ouvrez-en un pour le faire tourner et voir ses actions ; choisissez celui qu'utilise le site.",
        ])}
      >
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map((e) => {
            const inUse = modelKey(e.model) === activeKey;
            const info = versionInfo(e.model.version);
            return (
              <li
                key={e.key}
                className={`flex flex-col overflow-hidden rounded-2xl border ${inUse ? "border-accent ring-2 ring-accent/30" : "border-border"}`}
              >
                <button
                  type="button"
                  onClick={() => setOpen(e)}
                  className="relative h-48 cursor-pointer bg-gradient-to-b from-secondary/50 to-secondary"
                  aria-label={`${tr(["Abrir", "Open", "Abrir", "Ouvrir"])} ${e.name}`}
                >
                  <NinaLive model={e.model} entrance={false} className="h-full w-full" />
                  <span className="absolute left-2 top-2 flex gap-1">
                    {inUse && (
                      <Badge tone="good">{tr(["Em uso", "In use", "En uso", "Utilisée"])}</Badge>
                    )}
                    {e.saved ? (
                      <Badge tone="info">
                        {tr(["Personalizada", "Customized", "Personalizada", "Personnalisée"])}
                      </Badge>
                    ) : (
                      <Badge>{tr(["Original", "Original", "Original", "Originale"])}</Badge>
                    )}
                    {!info.is3d && <Badge tone="warn">2D</Badge>}
                  </span>
                </button>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <div>
                    <p className="text-sm font-bold">{e.name}</p>
                    <p className="text-[11px] text-muted-foreground">{e.date}</p>
                  </div>
                  <p className="flex-1 text-xs text-muted-foreground">{descText(e.description)}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" className={btnCls} onClick={() => setOpen(e)}>
                      <Eye className="h-3.5 w-3.5" /> {tr(["Abrir", "Open", "Abrir", "Ouvrir"])}
                    </button>
                    {info.is3d && (
                      <button type="button" className={btnCls} onClick={() => edit(e.model)}>
                        <Paintbrush className="h-3.5 w-3.5" />{" "}
                        {tr(["Personalizar", "Customize", "Personalizar", "Personnaliser"])}
                      </button>
                    )}
                    <button
                      type="button"
                      className={btnPrimary}
                      disabled={inUse || save.isPending}
                      onClick={() => use(e.model)}
                    >
                      {inUse ? <Check className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
                      {inUse
                        ? tr(["Em uso", "In use", "En uso", "Utilisée"])
                        : tr([
                            "Usar no site",
                            "Use on the site",
                            "Usar en el sitio",
                            "Utiliser sur le site",
                          ])}
                    </button>
                    {e.saved && (
                      <button
                        type="button"
                        className={btnDanger}
                        aria-label={`${tr(["Excluir", "Delete", "Eliminar", "Supprimer"])} ${e.name}`}
                        onClick={() => remove(e.saved!)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <div ref={editor}>
        <Customizer
          draft={draft}
          setDraft={setDraft}
          start={config.active}
          busy={save.isPending}
          onSave={(model, name, andUse) => {
            const saved: SavedNinaModel = {
              ...model,
              id: Math.random().toString(36).slice(2, 10),
              name,
              savedAt: new Date().toISOString(),
            };
            publish(
              {
                active: andUse ? model : config.active,
                saved: [saved, ...config.saved].slice(0, 40),
              },
              () => setDraft(null),
            );
          }}
        />
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{open.name}</DialogTitle>
                <DialogDescription>
                  {[open.date, descText(open.description)].filter(Boolean).join(" · ")}
                </DialogDescription>
              </DialogHeader>
              <NinaViewer model={open.model} />
              <div className="flex flex-wrap justify-end gap-2">
                {versionInfo(open.model.version).is3d && (
                  <button type="button" className={btnCls} onClick={() => edit(open.model)}>
                    <Paintbrush className="h-3.5 w-3.5" />{" "}
                    {tr(["Personalizar", "Customize", "Personalizar", "Personnaliser"])}
                  </button>
                )}
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={modelKey(open.model) === activeKey || save.isPending}
                  onClick={() => use(open.model)}
                >
                  <Star className="h-3.5 w-3.5" />
                  {modelKey(open.model) === activeKey
                    ? tr([
                        "Em uso no site",
                        "In use on the site",
                        "En uso en el sitio",
                        "Utilisée sur le site",
                      ])
                    : tr([
                        "Usar no site",
                        "Use on the site",
                        "Usar en el sitio",
                        "Utiliser sur le site",
                      ])}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ───────────────────────── Personalizador ─────────────────────────

function Customizer({
  draft,
  setDraft,
  start,
  busy,
  onSave,
}: {
  draft: NinaModel | null;
  setDraft: (m: NinaModel | null) => void;
  start: NinaModel;
  busy: boolean;
  onSave: (model: NinaModel, name: string, andUse: boolean) => void;
}) {
  const tr = useTr();
  const model = draft ?? {
    version: start.version === "desenho" ? ("v2" as const) : start.version,
    look: start.look,
  };
  const look = model.look;
  const set = <K extends keyof NinaLook>(key: K, value: NinaLook[K]) =>
    setDraft({ ...model, look: { ...look, [key]: value } });

  // O nome sugerido acompanha o estilo escolhido.
  const [name, setName] = useState("");
  useEffect(() => {
    if (!draft) setName("");
  }, [draft]);

  const submit = (andUse: boolean) => {
    const n =
      name.trim() ||
      `Nina ${LABELS.outfit[look.outfit].toLowerCase()}, ${LABELS.hairStyle[look.hairStyle].toLowerCase()}`;
    onSave(model, n.slice(0, 60), andUse);
  };

  return (
    <Panel
      title={tr([
        "Personalizar a Nina",
        "Customize Nina",
        "Personalizar a Nina",
        "Personnaliser Nina",
      ])}
      hint={tr([
        "Mude cores, cabelo, roupa e acessórios vendo o resultado na hora. Guardar cria um item no histórico; você escolhe se ele já passa a valer no site.",
        "Change colors, hair, outfit and accessories and see the result right away. Saving adds an item to the history; you choose whether it goes live on the site.",
        "Cambia colores, pelo, ropa y accesorios viendo el resultado al instante. Guardar crea un elemento en el historial; tú eliges si ya pasa a usarse en el sitio.",
        "Changez les couleurs, les cheveux, la tenue et les accessoires en voyant le résultat tout de suite. Enregistrer ajoute un élément à l'historique ; vous choisissez s'il s'applique déjà au site.",
      ])}
      action={
        <button
          type="button"
          className={btnCls}
          onClick={() => setDraft({ version: model.version, look: defaultLook(model.version) })}
        >
          <RotateCcw className="h-3.5 w-3.5" />{" "}
          {tr([
            "Aparência original",
            "Original look",
            "Apariencia original",
            "Apparence d'origine",
          ])}
        </button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="lg:sticky lg:top-4 lg:self-start">
          <NinaViewer model={model} height={420} />
        </div>

        <div className="space-y-5">
          <Group title={tr(["Modelo", "Model", "Modelo", "Modèle"])}>
            <div className="flex flex-wrap gap-2">
              {NINA_VERSIONS.filter((v) => v.is3d).map((v) => (
                <Choice
                  key={v.id}
                  on={model.version === v.id}
                  onClick={() => setDraft({ ...model, version: v.id })}
                >
                  {v.name}
                </Choice>
              ))}
            </div>
          </Group>

          <Group title={tr(["Cores", "Colors", "Colores", "Couleurs"])}>
            <ColorField
              label={tr(["Pele", "Skin", "Piel", "Peau"])}
              value={look.skin}
              palette={PALETTES.skin}
              onChange={(v) => set("skin", v)}
            />
            <ColorField
              label={tr(["Cabelo", "Hair", "Pelo", "Cheveux"])}
              value={look.hair}
              palette={PALETTES.hair}
              onChange={(v) => set("hair", v)}
            />
            <ColorField
              label={tr(["Olhos", "Eyes", "Ojos", "Yeux"])}
              value={look.eyes}
              palette={PALETTES.eyes}
              onChange={(v) => set("eyes", v)}
            />
          </Group>

          <Group title={tr(["Cabelo", "Hair", "Pelo", "Cheveux"])}>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(LABELS.hairStyle) as NinaLook["hairStyle"][]).map((k) => (
                <Choice key={k} on={look.hairStyle === k} onClick={() => set("hairStyle", k)}>
                  {tr(HAIR_TR[k])}
                </Choice>
              ))}
            </div>
            <Toggle
              label={tr(["Franjinha", "Bangs", "Flequillo", "Frange"])}
              on={look.bangs}
              onChange={(v) => set("bangs", v)}
            />
          </Group>

          <Group title={tr(["Roupa", "Outfit", "Ropa", "Tenue"])}>
            <div className="mb-3 flex flex-wrap gap-2">
              {(Object.keys(LABELS.outfit) as NinaLook["outfit"][]).map((k) => (
                <Choice key={k} on={look.outfit === k} onClick={() => set("outfit", k)}>
                  {tr(OUTFIT_TR[k])}
                </Choice>
              ))}
            </div>
            <ColorField
              label={tr(outfitColorLabel(look.outfit))}
              value={look.outfitColor}
              palette={PALETTES.outfit}
              onChange={(v) => set("outfitColor", v)}
            />
            {look.outfit !== "moletom" && (
              <ColorField
                label={tr(shirtColorLabel(look.outfit))}
                value={look.shirt}
                palette={PALETTES.shirt}
                onChange={(v) => set("shirt", v)}
              />
            )}
            <ColorField
              label={
                look.outfit === "vestido"
                  ? tr(["Meia-calça", "Tights", "Medias", "Collant"])
                  : tr(["Calça", "Pants", "Pantalón", "Pantalon"])
              }
              value={look.pants}
              palette={PALETTES.pants}
              onChange={(v) => set("pants", v)}
            />
            <ColorField
              label={tr(["Sapatos", "Shoes", "Zapatos", "Chaussures"])}
              value={look.shoes}
              palette={PALETTES.shoes}
              onChange={(v) => set("shoes", v)}
            />
          </Group>

          <Group title={tr(["Acessórios", "Accessories", "Accesorios", "Accessoires"])}>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(LABELS.accessory) as NinaLook["accessory"][]).map((k) => (
                <Choice key={k} on={look.accessory === k} onClick={() => set("accessory", k)}>
                  {tr(ACCESSORY_TR[k])}
                </Choice>
              ))}
            </div>
            <ColorField
              label={tr([
                "Cor do acessório e dos elásticos",
                "Accessory and hair tie color",
                "Color del accesorio y de las gomas",
                "Couleur de l'accessoire et des élastiques",
              ])}
              value={look.accessoryColor}
              palette={PALETTES.accent}
              onChange={(v) => set("accessoryColor", v)}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {(Object.keys(LABELS.glasses) as NinaLook["glasses"][]).map((k) => (
                <Choice key={k} on={look.glasses === k} onClick={() => set("glasses", k)}>
                  {tr(GLASSES_TR[k])}
                </Choice>
              ))}
            </div>
            {look.glasses !== "nenhum" && (
              <ColorField
                label={tr(["Armação", "Frame", "Montura", "Monture"])}
                value={look.glassesColor}
                palette={["#3b2a20", "#1f1f24", "#c0392b", "#3b82c4", "#e86a92", "#e9c86e"]}
                onChange={(v) => set("glassesColor", v)}
              />
            )}
          </Group>

          <Group title={tr(["Detalhes", "Details", "Detalles", "Détails"])}>
            <div className="grid gap-1 sm:grid-cols-2">
              <Toggle
                label={tr(["Sardas", "Freckles", "Pecas", "Taches de rousseur"])}
                on={look.freckles}
                onChange={(v) => set("freckles", v)}
              />
              <Toggle
                label={tr([
                  "Bochechas rosadas",
                  "Rosy cheeks",
                  "Mejillas sonrosadas",
                  "Joues roses",
                ])}
                on={look.blush}
                onChange={(v) => set("blush", v)}
              />
              <Toggle
                label={tr(["Cílios", "Eyelashes", "Pestañas", "Cils"])}
                on={look.lashes}
                onChange={(v) => set("lashes", v)}
              />
              <Toggle
                label={tr(["Brincos", "Earrings", "Pendientes", "Boucles d'oreilles"])}
                on={look.earrings}
                onChange={(v) => set("earrings", v)}
              />
              <Toggle
                label={tr(["Crachá", "Name badge", "Credencial", "Badge"])}
                on={look.badge}
                onChange={(v) => set("badge", v)}
              />
              <Toggle
                label={tr([
                  "Tablet do plano alimentar",
                  "Meal plan tablet",
                  "Tableta del plan alimentario",
                  "Tablette du plan alimentaire",
                ])}
                on={look.tablet}
                onChange={(v) => set("tablet", v)}
              />
            </div>
          </Group>

          <div className="space-y-2 rounded-2xl border border-border p-3">
            <label className="block text-xs font-semibold" htmlFor="nina-name">
              {tr([
                "Nome no histórico",
                "Name in the history",
                "Nombre en el historial",
                "Nom dans l'historique",
              ])}
            </label>
            <input
              id="nina-name"
              className={inputCls}
              value={name}
              maxLength={60}
              placeholder={tr([
                "Ex.: Nina de moletom para o inverno",
                "E.g.: Nina in a hoodie for winter",
                "Ej.: Nina con sudadera para el invierno",
                "Ex. : Nina en sweat pour l'hiver",
              ])}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={btnCls}
                disabled={busy}
                onClick={() => submit(false)}
              >
                <Save className="h-3.5 w-3.5" />{" "}
                {tr([
                  "Guardar no histórico",
                  "Save to history",
                  "Guardar en el historial",
                  "Enregistrer dans l'historique",
                ])}
              </button>
              <button
                type="button"
                className={btnPrimary}
                disabled={busy}
                onClick={() => submit(true)}
              >
                <Star className="h-3.5 w-3.5" />{" "}
                {tr([
                  "Guardar e usar no site",
                  "Save and use on the site",
                  "Guardar y usar en el sitio",
                  "Enregistrer et utiliser sur le site",
                ])}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

const outfitColorLabel = (o: NinaLook["outfit"]): Names =>
  o === "jaleco"
    ? ["Jaleco", "Lab coat", "Bata", "Blouse"]
    : o === "moletom"
      ? ["Moletom", "Hoodie", "Sudadera", "Sweat à capuche"]
      : o === "vestido"
        ? ["Vestido", "Dress", "Vestido", "Robe"]
        : ["Detalhes", "Details", "Detalles", "Détails"];
const shirtColorLabel = (o: NinaLook["outfit"]): Names =>
  o === "jaleco"
    ? ["Blusa", "Top", "Blusa", "Haut"]
    : o === "vestido"
      ? ["Gola e faixa", "Collar and sash", "Cuello y fajín", "Col et ceinture"]
      : ["Camiseta", "T-shirt", "Camiseta", "T-shirt"];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Choice({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition ${on ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card hover:bg-secondary"}`}
    >
      {children}
    </button>
  );
}

function ColorField({
  label,
  value,
  palette,
  onChange,
}: {
  label: string;
  value: string;
  palette: string[];
  onChange: (v: string) => void;
}) {
  const tr = useTr();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-40 shrink-0 text-xs font-semibold">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {palette.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            aria-label={`${label}: ${c}`}
            aria-pressed={value === c}
            onClick={() => onChange(c)}
            className={`h-6 w-6 cursor-pointer rounded-full border shadow-xs transition hover:scale-110 ${value === c ? "ring-2 ring-accent ring-offset-2 ring-offset-card" : "border-border"}`}
            style={{ background: c }}
          />
        ))}
        <label
          className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-dashed border-border"
          title={tr(["Outra cor", "Other color", "Otro color", "Autre couleur"])}
          style={{ background: palette.includes(value) ? undefined : value }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={`${label}: ${tr(["outra cor", "other color", "otro color", "autre couleur"])}`}
          />
          {palette.includes(value) && (
            <span className="grid h-full place-items-center text-xs text-muted-foreground">+</span>
          )}
        </label>
      </div>
    </div>
  );
}

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-1.5 hover:bg-secondary/60">
      <span className="text-xs font-semibold">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition ${on ? "bg-accent" : "bg-border"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[1.125rem]" : "left-0.5"}`}
        />
      </button>
    </label>
  );
}
