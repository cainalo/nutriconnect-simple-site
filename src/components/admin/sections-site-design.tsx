// Design do site: o admin escolhe entre designs completos (cores, cantos, tipografia, superfícies).
// "Testar" aplica só neste navegador; "Publicar" grava para todo mundo. Modelos de post, regras de
// rolagem e layouts não mudam. A personalização de cada pessoa continua valendo por cima.
import { useEffect, useState } from "react";
import { siteConfirm } from "@/components/confirm-action";
import { Check, Eye, Moon, Sun, Upload } from "lucide-react";
import { Badge, Panel, btnCls, btnPrimary } from "@/components/admin/admin-ui";
import { useSaveSiteConfig, useSiteConfigs } from "@/lib/site-config";
import { applySiteDesign, readSiteDesign, SITE_DESIGNS, type SiteDesign } from "@/lib/site-design";
import { useTr } from "@/components/settings-ui";

function Mini({ d, dark }: { d: SiteDesign; dark: boolean }) {
  const tr = useTr();
  const s = d.swatch;
  const editorialVibrante = d.id === "portico";
  const bg = dark ? s.darkBg : s.bg;
  const surface = dark ? s.darkCard : s.card;
  const ink = dark ? "#F7EFDF" : s.ink;
  const posterColors = ["#0F4C5C", "#C8402A", "#6B3A6E", "#556B2F", "#D4A017"];
  const tileData = [
    { number: "01", title: tr(["Receitas", "Recipes", "Recetas", "Recettes"]), color: posterColors[0] },
    { number: "02", title: tr(["Histórias", "Stories", "Historias", "Histoires"]), color: posterColors[1] },
    { number: "03", title: tr(["Perguntas", "Questions", "Preguntas", "Questions"]), color: posterColors[2] },
    { number: "04", title: tr(["Comunidade", "Community", "Comunidad", "Communauté"]), color: posterColors[3] },
    { number: "05", title: tr(["Progresso", "Progress", "Progreso", "Progrès"]), color: posterColors[4] },
  ];
  return (
    <div data-no-design className="relative overflow-hidden border p-3 sm:p-4" style={{ background: bg, borderColor: editorialVibrante ? "#D9C9AF" : `${ink}30`, borderRadius: Math.min(d.radius, 14), color: ink }}>
      <div className="flex items-center justify-between gap-2 border-b pb-2.5" style={{ borderColor: editorialVibrante ? "#D9C9AF" : `${ink}25` }}>
        <div className="flex min-w-0 items-center gap-2">
          {editorialVibrante ? <img src="/brand/nutriconnect-mark.svg" alt="" width="28" height="28" className="h-7 w-7 shrink-0" /> : <span className="grid h-7 w-7 shrink-0 place-items-center text-xs font-bold" style={{ background: s.primary, color: "#fff", borderRadius: Math.min(d.radius, 8) }}>N</span>}
          <span className="truncate text-xs font-bold" style={{ fontFamily: d.headingFont }}>Nutri<span style={{ color: s.accent }}>Connect</span></span>
        </div>
        <span className="shrink-0 text-[8px] font-bold uppercase tracking-[0.13em] opacity-60">{tr(["Comunidade", "Community", "Comunidad", "Communauté"])}</span>
      </div>
      <div className="py-3">
        <p className="mb-1 text-[8px] font-bold uppercase tracking-[0.15em]" style={{ color: editorialVibrante ? "#C8402A" : s.accent }}>{tr(["IDEIAS À MESA", "IDEAS AT THE TABLE", "IDEAS EN LA MESA", "IDÉES À TABLE"])}</p>
        <p className="text-[19px] font-semibold leading-[1.05] sm:text-[22px]" style={{ fontFamily: d.headingFont }}>{tr(["Alimentação que conecta.", "Food brings us together.", "La alimentación nos conecta.", "L’alimentation nous rassemble."])}</p>
        <p className="mt-1.5 max-w-sm text-[9px] leading-relaxed opacity-75">{tr(["Receitas, experiências e conversas em um só lugar.", "Recipes, experiences and conversations in one place.", "Recetas, experiencias y conversaciones en un solo lugar.", "Recettes, expériences et conversations au même endroit."])}</p>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {tileData.map((tile) => {
          const tileInk = tile.color === "#D4A017" ? "#10282E" : "#FFF9EF";
          return <div key={tile.number} className="flex min-h-[54px] flex-col justify-between p-2" style={{ background: editorialVibrante ? tile.color : surface, color: editorialVibrante ? tileInk : ink, border: editorialVibrante ? "1px solid transparent" : `1px solid ${ink}20`, borderRadius: editorialVibrante ? 4 : Math.min(d.radius, 10), boxShadow: "none" }}>
            <span className="text-[8px] font-semibold opacity-80">{tile.number}</span>
            <span className="text-[10px] font-bold leading-tight" style={{ fontFamily: editorialVibrante ? d.headingFont : undefined }}>{tile.title}</span>
          </div>;
        })}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2" style={{ borderColor: editorialVibrante ? "#D9C9AF" : `${ink}25` }}>
        <span className="text-[8px] opacity-70">{tr(["Ideias compartilhadas toda semana", "Ideas shared every week", "Ideas compartidas cada semana", "Des idées partagées chaque semaine"])}</span>
        <span className="shrink-0 px-2 py-1 text-[8px] font-bold" style={{ background: editorialVibrante ? "#0F4C5C" : s.primary, color: "#FFF9EF", borderRadius: editorialVibrante ? 4 : Math.min(d.radius, 10) }}>{tr(["Explorar", "Explore", "Explorar", "Explorer"])}</span>
      </div>
    </div>
  );
}

export function SiteDesignSection() {
  const tr = useTr();
  const configs = useSiteConfigs();
  const save = useSaveSiteConfig();
  const saved = readSiteDesign(configs.data?.site_design);
  const currentDesign = SITE_DESIGNS.find((d) => d.id === saved) ?? SITE_DESIGNS[0]!;
  const editorialVibrante = SITE_DESIGNS.find((d) => d.id === "portico") ?? SITE_DESIGNS[0]!;
  const [testing, setTesting] = useState<string | null>(null);
  const [dark, setDark] = useState(false);

  // Ao sair da tela, volta ao design publicado (o teste vale só aqui).
  useEffect(() => () => applySiteDesign(readSiteDesign(configs.data?.site_design)), [configs.data]);

  return (
    <Panel
      title={tr(["Design do site", "Site design", "Diseño del sitio", "Design du site"])}
      hint={tr([
        "Escolha o visual completo do NutriConnect. Vale para todas as pessoas, em todas as páginas; quem personalizou a própria aparência mantém as suas escolhas por cima. Modelos de post, rolagem e layouts não mudam.",
        "Choose NutriConnect's complete look. It applies to everyone, on every page; people who customized their own appearance keep their choices on top. Post templates, scrolling and layouts don't change.",
        "Elige el aspecto completo de NutriConnect. Se aplica a todas las personas, en todas las páginas; quien personalizó su propia apariencia mantiene sus elecciones por encima. Las plantillas de publicación, el desplazamiento y los diseños no cambian.",
        "Choisissez l'apparence complète de NutriConnect. Elle s'applique à tout le monde, sur toutes les pages ; ceux qui ont personnalisé leur apparence gardent leurs choix par-dessus. Les modèles de publication, le défilement et les mises en page ne changent pas.",
      ])}
      action={
        <button type="button" className={btnCls} onClick={() => setDark((v) => !v)}>
          {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          {dark
            ? tr([
                "Miniaturas no modo claro",
                "Thumbnails in light mode",
                "Miniaturas en modo claro",
                "Miniatures en mode clair",
              ])
            : tr([
                "Miniaturas no modo escuro",
                "Thumbnails in dark mode",
                "Miniaturas en modo oscuro",
                "Miniatures en mode sombre",
              ])}
        </button>
      }
    >
      <ul className="grid gap-4 md:grid-cols-2">
        {SITE_DESIGNS.map((d) => {
          const isSaved = d.id === saved;
          const isTesting = testing === d.id;
          return (
            <li
              key={d.id}
              className={`flex flex-col gap-3 rounded-2xl border p-3.5 ${
                isSaved ? "border-accent ring-1 ring-accent/40" : "border-border"
              }`}
            >
              <Mini d={d} dark={dark} />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
                  {d.name}
                  {isSaved && (
                    <Badge tone="good">
                      {tr([
                        "Em uso no site",
                        "In use on the site",
                        "En uso en el sitio",
                        "Utilisé sur le site",
                      ])}
                    </Badge>
                  )}
                  {isTesting && (
                    <Badge tone="warn">
                      {tr(["Testando aqui", "Testing here", "Probando aquí", "Test en cours ici"])}
                    </Badge>
                  )}
                </p>
                <p className="text-xs font-semibold text-accent">{d.tagline}</p>
                <p className="mt-1 text-xs text-muted-foreground">{d.description}</p>
              </div>
              <div className="mt-auto flex flex-wrap gap-2">
                <button
                  type="button"
                  className={btnCls}
                  onClick={() => {
                    applySiteDesign(d.id);
                    setTesting(d.id === saved ? null : d.id);
                  }}
                >
                  <Eye className="h-3.5 w-3.5" />{" "}
                  {tr([
                    "Testar neste navegador",
                    "Test in this browser",
                    "Probar en este navegador",
                    "Tester dans ce navigateur",
                  ])}
                </button>
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={isSaved || save.isPending}
                  onClick={async () => {
                    if (
                      !(await siteConfirm(
                        tr([
                          `Publicar o design "${d.name}" para todo o site?`,
                          `Publish the "${d.name}" design for the whole site?`,
                          `¿Publicar el diseño "${d.name}" para todo el sitio?`,
                          `Publier le design « ${d.name} » pour tout le site ?`,
                        ]),
                      ))
                    )
                      return;
                    save.mutate(
                      { key: "site_design", value: d.id === "natural" ? null : { id: d.id } },
                      { onSuccess: () => setTesting(null) },
                    );
                  }}
                >
                  {isSaved ? (
                    <>
                      <Check className="h-3.5 w-3.5" />{" "}
                      {tr(["Publicado", "Published", "Publicado", "Publié"])}
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />{" "}
                      {tr([
                        "Publicar no site",
                        "Publish on the site",
                        "Publicar en el sitio",
                        "Publier sur le site",
                      ])}
                    </>
                  )}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <section className="mt-6 border-t border-border pt-5" aria-labelledby="design-comparison-title">
        <div className="mb-3">
          <h3 id="design-comparison-title" className="text-base font-bold">{tr(["Comparação visual", "Visual comparison", "Comparación visual", "Comparaison visuelle"])}</h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">{tr(["Conteúdo idêntico nos dois exemplos. Compare a composição atual com o sistema de cards-pôster e cores inteiramente preenchidas do Editorial Vibrante.", "Identical content in both examples. Compare the current composition with Editorial Vibrante’s poster cards and full-color surfaces.", "El mismo contenido en ambos ejemplos. Compara la composición actual con las tarjetas póster y superficies de color de Editorial Vibrante.", "Le contenu est identique dans les deux exemples. Comparez la composition actuelle aux cartes-affiches et surfaces en couleur d’Editorial Vibrante."])}</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">{tr(["Tema atual", "Current theme", "Tema actual", "Thème actuel"])} — <span className="text-foreground">{currentDesign.name}</span></p>
            <Mini d={currentDesign} dark={dark} />
          </div>
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">{tr(["Novo sistema visual", "New visual system", "Nuevo sistema visual", "Nouveau système visuel"])} — <span className="text-foreground">Editorial Vibrante</span></p>
            <Mini d={editorialVibrante} dark={dark} />
          </div>
        </div>
      </section>
    </Panel>
  );
}
