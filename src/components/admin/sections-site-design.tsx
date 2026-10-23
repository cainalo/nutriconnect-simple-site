// Design do site: o admin escolhe entre designs completos (cores, cantos, tipografia, superfícies).
// "Testar" aplica só neste navegador; "Publicar" grava para todo mundo. Modelos de post, regras de
// rolagem e layouts não mudam. A personalização de cada pessoa continua valendo por cima.
import { useEffect, useState } from "react";
import { Check, Eye, Moon, Sun, Upload } from "lucide-react";
import { Badge, Panel, btnCls, btnPrimary } from "@/components/admin/admin-ui";
import { useSaveSiteConfig, useSiteConfigs } from "@/lib/site-config";
import { applySiteDesign, readSiteDesign, SITE_DESIGNS, type SiteDesign } from "@/lib/site-design";
import { useTr } from "@/components/settings-ui";

function Mini({ d, dark }: { d: SiteDesign; dark: boolean }) {
  const tr = useTr();
  const s = d.swatch;
  const bg = dark ? s.darkBg : s.bg;
  const card = dark ? s.darkCard : s.card;
  const ink = dark ? "#f4efe6" : s.ink;
  const glass = d.id === "aurora";
  return (
    <div
      className="relative overflow-hidden border border-black/10 p-3"
      style={{
        background: glass
          ? `radial-gradient(circle at 15% 10%, ${s.primary}55, transparent 55%), radial-gradient(circle at 90% 90%, ${s.accent}55, transparent 55%), ${bg}`
          : d.id === "vibrante"
            ? `linear-gradient(160deg, ${bg}, ${dark ? s.darkBg : "#e8f6ec"})`
            : bg,
        borderRadius: Math.min(d.radius, 20),
        color: ink,
      }}
    >
      <p
        className="text-[15px] font-bold leading-tight"
        style={{ fontFamily: d.headingFont, textAlign: "left" }}
      >
        {tr(["Bom dia, Maria", "Good morning, Maria", "Buenos días, María", "Bonjour, Maria"])}
      </p>
      <p className="mt-0.5 text-[10px] opacity-70" style={{ textAlign: "left" }}>
        {tr([
          "3 hábitos hoje · sequência de 5 dias",
          "3 habits today · 5-day streak",
          "3 hábitos hoy · racha de 5 días",
          "3 habitudes aujourd'hui · série de 5 jours",
        ])}
      </p>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {[s.primary, s.accent].map((c, i) => (
          <div
            key={c}
            className="p-2"
            style={{
              background: glass ? `${card}${dark ? "99" : "b3"}` : card,
              border: `1px solid ${ink}${d.id === "editorial" ? "55" : "1f"}`,
              borderRadius: Math.min(d.radius, 16),
              boxShadow: d.id === "editorial" ? "none" : "0 6px 14px -8px rgba(0,0,0,0.35)",
              backdropFilter: glass ? "blur(6px)" : undefined,
            }}
          >
            <div
              className="mb-1.5 h-4 w-4"
              style={{
                background: c,
                borderRadius: d.id === "editorial" ? 2 : 999,
              }}
            />
            <div className="h-1.5 w-4/5 rounded-full" style={{ background: `${ink}40` }} />
            <div className="mt-1 h-1.5 w-3/5 rounded-full" style={{ background: `${ink}25` }} />
            <div
              className="mt-2 h-4 w-12 text-center text-[8px] font-bold leading-4"
              style={{
                background: i ? s.accent : s.primary,
                color: "#fff",
                borderRadius: d.id === "editorial" ? 2 : 999,
              }}
            >
              {tr(["Abrir", "Open", "Abrir", "Ouvrir"])}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SiteDesignSection() {
  const tr = useTr();
  const configs = useSiteConfigs();
  const save = useSaveSiteConfig();
  const saved = readSiteDesign(configs.data?.site_design);
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
                  onClick={() => {
                    if (
                      !window.confirm(
                        tr([
                          `Publicar o design "${d.name}" para todo o site?`,
                          `Publish the "${d.name}" design for the whole site?`,
                          `¿Publicar el diseño "${d.name}" para todo el sitio?`,
                          `Publier le design « ${d.name} » pour tout le site ?`,
                        ]),
                      )
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
    </Panel>
  );
}
