// Site com fotos ou a versão anterior, com menos imagens. "Testar" vale só neste navegador;
// "Publicar" grava para todo mundo.
import { Eye, ImageIcon, ImageOff, Upload } from "lucide-react";
import { Badge, Panel, btnCls, btnPrimary } from "@/components/admin/admin-ui";
import { useSaveSiteConfig, useSiteConfigs } from "@/lib/site-config";
import { readSitePhotos, setSitePhotosTest, useSitePhotosTest } from "@/lib/site-photos";
import { useTr } from "@/components/settings-ui";
import type { Names } from "@/lib/appearance-data";

const OPTIONS: { on: boolean; icon: typeof ImageIcon; title: Names; text: Names }[] = [
  {
    on: true,
    icon: ImageIcon,
    title: ["Site com fotos", "Site with photos", "Sitio con fotos", "Site avec photos"],
    text: [
      "Fotos nas faixas de título de cada página, fotos inteiras nos cards da Feira e nas receitas da Geladeira, temas da Trilha, atalhos da Casa, cards grandes de Funções e telas vazias.",
      "Photos in each page's title banner, full photos on Market cards and Fridge recipes, Path themes, Home shortcuts, large Features cards and empty screens.",
      "Fotos en las franjas de título de cada página, fotos completas en las tarjetas de la Feria y en las recetas de la Nevera, temas de la Ruta, accesos de Inicio, tarjetas grandes de Funciones y pantallas vacías.",
      "Photos dans les bandeaux de titre de chaque page, photos entières sur les cartes du Marché et les recettes du Frigo, thèmes du Parcours, raccourcis de l'Accueil, grandes cartes des Fonctions et écrans vides.",
    ],
  },
  {
    on: false,
    icon: ImageOff,
    title: [
      "Site anterior (menos imagens)",
      "Previous site (fewer images)",
      "Sitio anterior (menos imágenes)",
      "Site précédent (moins d'images)",
    ],
    text: [
      "Faixas de título só com ícones flutuando, Feira com frutas recortadas em fundo branco e ícones, receitas e telas vazias só com ícone.",
      "Title banners with floating icons only, Market with cut-out fruit on a white background and icons, recipes and empty screens with an icon only.",
      "Franjas de título solo con iconos flotando, Feria con frutas recortadas sobre fondo blanco e iconos, recetas y pantallas vacías solo con icono.",
      "Bandeaux de titre avec seulement des icônes flottantes, Marché avec des fruits détourés sur fond blanc et des icônes, recettes et écrans vides avec une simple icône.",
    ],
  },
];

export function SitePhotosSection() {
  const tr = useTr();
  const configs = useSiteConfigs();
  const save = useSaveSiteConfig();
  const published = readSitePhotos(configs.data?.site_photos);
  const test = useSitePhotosTest();

  return (
    <Panel
      title={tr(["Imagens do site", "Site images", "Imágenes del sitio", "Images du site"])}
      hint={tr([
        "Escolha entre o site com todas as fotos e a versão anterior, com menos imagens. Testar muda só neste navegador; Publicar muda para todos. Nada é apagado: dá para trocar quando quiser.",
        "Choose between the site with all the photos and the previous version with fewer images. Test changes only this browser; Publish changes it for everyone. Nothing is deleted: you can switch whenever you like.",
        "Elige entre el sitio con todas las fotos y la versión anterior, con menos imágenes. Probar cambia solo este navegador; Publicar lo cambia para todos. No se borra nada: puedes cambiar cuando quieras.",
        "Choisissez entre le site avec toutes les photos et la version précédente, avec moins d'images. Tester ne change que ce navigateur ; Publier change pour tout le monde. Rien n'est supprimé : vous pouvez changer quand vous voulez.",
      ])}
    >
      {test && (
        <p className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <Badge tone="warn">
            {tr([
              "Testando neste navegador",
              "Testing in this browser",
              "Probando en este navegador",
              "Test dans ce navigateur",
            ])}
          </Badge>
          <button
            type="button"
            className="font-semibold text-accent hover:underline"
            onClick={() => setSitePhotosTest(null)}
          >
            {tr(["Parar o teste", "Stop the test", "Detener la prueba", "Arrêter le test"])}
          </button>
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((o) => {
          const isPublished = published === o.on;
          const isTesting = test !== null && (test === "on") === o.on;
          return (
            <div key={String(o.on)} className="flex flex-col rounded-2xl border border-border p-4">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                <o.icon className="h-4 w-4 text-accent" />
                {tr(o.title)}
                {isPublished && (
                  <Badge tone="good">{tr(["Publicado", "Published", "Publicado", "Publié"])}</Badge>
                )}
                {isTesting && (
                  <Badge tone="warn">{tr(["Em teste", "Testing", "En prueba", "En test"])}</Badge>
                )}
              </p>
              <p className="mt-1 flex-1 text-xs text-muted-foreground">{tr(o.text)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={btnCls}
                  onClick={() => setSitePhotosTest(o.on ? "on" : "off")}
                >
                  <Eye className="h-3.5 w-3.5" /> {tr(["Testar", "Test", "Probar", "Tester"])}
                </button>
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={isPublished || save.isPending}
                  onClick={() => {
                    if (
                      !window.confirm(
                        tr([
                          `Publicar para todos: ${o.title[0]}?`,
                          `Publish for everyone: ${o.title[1]}?`,
                          `¿Publicar para todos: ${o.title[2]}?`,
                          `Publier pour tout le monde : ${o.title[3]} ?`,
                        ]),
                      )
                    )
                      return;
                    save.mutate(
                      { key: "site_photos", value: o.on ? null : { on: false } },
                      { onSuccess: () => setSitePhotosTest(null) },
                    );
                  }}
                >
                  <Upload className="h-3.5 w-3.5" />{" "}
                  {tr(["Publicar", "Publish", "Publicar", "Publier"])}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
