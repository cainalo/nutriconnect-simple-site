import "@/styles.css";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRootRoute, createRouter, createMemoryHistory } from "@tanstack/react-router";
import { Landing } from "@/components/landing";
import { SiteHeader } from "@/components/site-chrome";
import { Composer } from "@/components/admin/social/composer";
import { NetworkPreview } from "@/components/admin/social/previews";
import { StudioDashboard } from "@/components/admin/social/dashboard";
import { StudioBoard } from "@/components/admin/social/board";
import { TemplatesGallery } from "@/components/admin/social/templates-gallery";
import { draftFromTemplate, useArtImages, artSizeFor, type PreviewMode } from "@/components/admin/social/use-art";
import { EMPTY_DRAFT } from "@/components/admin/social/use-art";
import { TEMPLATES } from "@/lib/social-templates";
import { ArtThumb } from "@/components/admin/social/template-thumb";
import { coverBody } from "@/components/admin/social/use-art";

const q = new URLSearchParams(location.search);
const v = q.get("v") ?? "grid";
const tpl = TEMPLATES.find((t) => t.id === (q.get("t") ?? "checklist-rotulo"))!;
const draft = draftFromTemplate(tpl);

function Cell({ mode }: { mode: PreviewMode }) {
  const { images, busy } = useArtImages(draft, artSizeFor(mode, draft.format), "nutriconnect");
  return (
    <div className="w-[340px]">
      <p className="mb-2 text-xs font-bold">{mode}</p>
      <NetworkPreview mode={mode} draft={draft} images={images} handle="nutriconnect" busy={busy} />
    </div>
  );
}
const modes: PreviewMode[] = ["ig-feed", "ig-story", "ig-reels", "tiktok", "facebook", "linkedin", "x", "youtube"];
const now = new Date().toISOString();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const fakePosts: any[] = TEMPLATES.slice(0, 8).map((t, i) => {
  const dr = draftFromTemplate(t);
  return {
    ...dr, id: "p" + i, created_at: now, updated_at: now, source: "manual", design: dr.design,
    status: ["ideia", "rascunho", "agendado", "publicado", "rascunho", "ideia", "aprovado", "rascunho"][i],
    scheduled_for: i % 2 ? iso(new Date(Date.now() + i * 86400000)) : null, slides: t.slides,
  };
});
fakePosts[0].title = "Nina Desvenda: O Que Tem no Meu Prato? 🥗";
fakePosts[0].design = { layout: "classico", theme: "oliva", emoji: "🥗" };
function Arts() {
  const size = (q.get("size") ?? "feed") as any;
  const w = size === "story" ? 200 : size === "paisagem" ? 360 : 260;
  const list = TEMPLATES.filter((t, i) => !q.get("ids") || q.get("ids")!.split(",").includes(t.id));
  return (
    <div className="flex flex-wrap gap-3 bg-neutral-300 p-3">
      {list.map((t) => {
        const dr = draftFromTemplate(t);
        return (
          <div key={t.id} style={{ width: w }}>
            <ArtThumb
              className="w-full"
              input={{ size, theme: dr.design.theme ?? "oliva", layout: dr.design.layout, icon: dr.design.icon, kicker: dr.design.kicker, image: dr.design.image, title: dr.title, body: coverBody(dr, "nutriconnect"), handle: "nutriconnect", scale: 0.4 }}
            />
            <p className="truncate text-[10px]">{t.id} · {dr.design.layout}</p>
          </div>
        );
      })}
    </div>
  );
}
const design = q.get("d");
if (design) document.documentElement.setAttribute("data-design", design);
if (q.get("dark")) document.documentElement.classList.add("dark");
document.documentElement.setAttribute("data-hydrated", "");
function RouterApp({ children }: { children: any }) {
  const root = createRootRoute({ component: () => children });
  const router = createRouter({ routeTree: root, history: createMemoryHistory({ initialEntries: ["/"] }) });
  return <RouterProvider router={router} />;
}
import { Panel } from "@/components/rail-cards";
function RailDemo() {
  const col = (side: string) => (
    <aside data-rail-col={side} className="w-[300px] overflow-hidden text-left">
      <div className="flex flex-col gap-5">
        {["Minhas comunidades", "Desafios ativos", "Atalhos", "Dicas"].map((t) => (
          <div key={t}><Panel title={t}><p className="text-sm">Conteúdo de exemplo do card lateral com duas linhas de texto para ver o ritmo.</p><a className="mt-2 block text-sm font-semibold text-accent">Ver mais</a></Panel></div>
        ))}
      </div>
    </aside>
  );
  return <div className="flex justify-between gap-6 p-6">{col("left")}<div className="flex-1 rounded-3xl border bg-card p-6">Conteúdo da página</div>{col("right")}</div>;
}
function App() {
  if (v === "rails") return <RailDemo />;
  if (v === "landing") return <RouterApp><Landing /></RouterApp>;
  if (v === "header") return <RouterApp><div className="min-h-[600px]"><SiteHeader /></div></RouterApp>;
  if (v === "arts") return <Arts />;
  if (v === "composer")
    return <Composer initial={q.get("t") ? draft : EMPTY_DRAFT} handle="nutriconnect" profiles={[]} onClose={() => {}} />;
  if (v === "dash")
    return <div className="st-root mx-auto max-w-[1100px] p-6"><StudioDashboard posts={q.get("empty") ? [] : fakePosts} onNew={() => {}} onTemplate={() => {}} onOpen={() => {}} go={() => {}} /></div>;
  if (v === "board")
    return <div className="st-root mx-auto max-w-[1100px] p-6"><StudioBoard posts={fakePosts} onOpen={() => {}} onNew={() => {}} /></div>;
  if (v === "gallery")
    return <div className="st-root mx-auto max-w-[1100px] p-6"><TemplatesGallery posts={fakePosts} onUseTemplate={() => {}} onUseTeam={() => {}} onEditTeam={() => {}} /></div>;
  return <div className="flex flex-wrap gap-6 p-6">{modes.map((m) => <Cell key={m} mode={m} />)}</div>;
}
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>,
);
const click = q.get("click");
if (click) setTimeout(() => {
  const b = [...document.querySelectorAll("button")].find((x) => x.textContent?.trim() === click);
  b?.click();
}, 1200);
