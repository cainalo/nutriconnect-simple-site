// Site com fotos ou a versão anterior, com menos imagens. "Testar" vale só neste navegador;
// "Publicar" grava para todo mundo.
import { Eye, ImageIcon, ImageOff, Upload } from "lucide-react";
import { Badge, Panel, btnCls, btnPrimary } from "@/components/admin/admin-ui";
import { useSaveSiteConfig, useSiteConfigs } from "@/lib/site-config";
import { readSitePhotos, setSitePhotosTest, useSitePhotosTest } from "@/lib/site-photos";

const OPTIONS = [
  {
    on: true,
    icon: ImageIcon,
    title: "Site com fotos",
    text: "Fotos nas faixas de título de cada página, fotos inteiras nos cards da Feira e nas receitas da Geladeira, temas da Trilha, atalhos da Casa, cards grandes de Funções e telas vazias.",
  },
  {
    on: false,
    icon: ImageOff,
    title: "Site anterior (menos imagens)",
    text: "Faixas de título só com ícones flutuando, Feira com frutas recortadas em fundo branco e ícones, receitas e telas vazias só com ícone.",
  },
];

export function SitePhotosSection() {
  const configs = useSiteConfigs();
  const save = useSaveSiteConfig();
  const published = readSitePhotos(configs.data?.site_photos);
  const test = useSitePhotosTest();

  return (
    <Panel
      title="Imagens do site"
      hint="Escolha entre o site com todas as fotos e a versão anterior, com menos imagens. Testar muda só neste navegador; Publicar muda para todos. Nada é apagado: dá para trocar quando quiser."
    >
      {test && (
        <p className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <Badge tone="warn">Testando neste navegador</Badge>
          <button
            type="button"
            className="font-semibold text-accent hover:underline"
            onClick={() => setSitePhotosTest(null)}
          >
            Parar o teste
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
                {o.title}
                {isPublished && <Badge tone="good">Publicado</Badge>}
                {isTesting && <Badge tone="warn">Em teste</Badge>}
              </p>
              <p className="mt-1 flex-1 text-xs text-muted-foreground">{o.text}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={btnCls}
                  onClick={() => setSitePhotosTest(o.on ? "on" : "off")}
                >
                  <Eye className="h-3.5 w-3.5" /> Testar
                </button>
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={isPublished || save.isPending}
                  onClick={() => {
                    if (!window.confirm(`Publicar para todos: ${o.title}?`)) return;
                    save.mutate(
                      { key: "site_photos", value: o.on ? null : { on: false } },
                      { onSuccess: () => setSitePhotosTest(null) },
                    );
                  }}
                >
                  <Upload className="h-3.5 w-3.5" /> Publicar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
