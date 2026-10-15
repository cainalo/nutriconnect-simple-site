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
import { FeedShell } from "@/components/feed-shell";
import { EspacoIntro } from "@/components/espaco-intro";
import { PostCardFrame } from "@/components/post-card-frame";
function FeedDemo() {
  const post = (
    <PostCardFrame type="receita" className="rounded-3xl border bg-card" footer={<div className="flex gap-2"><button className="rounded-full border px-3 py-1 text-xs">Apoiar</button></div>}>
      <div className="mb-4 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--pt)" }}>Receita comunitária</div>
      <h3 className="mb-2 text-lg font-bold font-display">Cozinha de verdade: menos rótulos, mais frescor</h3>
      <p className="text-sm leading-relaxed text-justify">Uma receita simples para o dia a dia, com ingredientes frescos e pouca complicação, pensada para quem tem pouco tempo e quer comer bem.</p>
    </PostCardFrame>
  );
  const pages = [{ id: "geral", label: "Geral", content: <div><EspacoIntro themeTitle="Cozinha de Verdade: Menos Rótulos, Mais Frescor" />{post}</div> }, { id: "tema", label: "Tema", content: <div>{post}</div> }];
  return <RouterApp><FeedShell pages={pages as any} wings={q.get("wings") ? { left: <div>L</div>, right: <div>R</div> } : undefined} /></RouterApp>;
}
function FormDemo() {
  return (
    <RouterApp>
      <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
        <SiteHeader />
        <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-4 pt-6">
          <form className="flex items-end gap-2">
            <button type="button" className="grid h-12 w-12 shrink-0 place-items-center rounded-full border">M</button>
            <textarea rows={2} placeholder="Pergunte algo sobre alimentação..." className="min-h-[3rem] flex-1 resize-none rounded-2xl border bg-background px-4 py-2.5 text-sm" />
            <button type="submit" className="grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-foreground">S</button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">1/20 perguntas hoje A Nina é uma IA educativa e não substitui um(a) profissional de saúde.</p>
        </main>
      </div>
    </RouterApp>
  );
}
function App() {
  if (v === "form") return <FormDemo />;
  if (v === "frame") return <iframe src={"?" + (q.get("src") ?? "")} style={{ width: Number(q.get("w") ?? 360), height: 760, border: "1px solid #888" }} />;
  if (v === "feed") return <FeedDemo />;
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
if (q.get("dbg")) setTimeout(() => {
  const w = innerWidth; const out: string[] = ["vw=" + w + " docW=" + document.documentElement.scrollWidth];
  document.querySelectorAll("body *").forEach((el) => {
    const r = (el as HTMLElement).getBoundingClientRect();
    const p = el.parentElement ? el.parentElement.getBoundingClientRect() : r;
    if (r.right > w + 2 && p.right <= r.right - 2 === false) return;
    if (r.right > w + 2 && r.width > 0 && p.right < r.right - 2) out.push(el.tagName + "." + String((el as HTMLElement).className).slice(0, 80) + " w=" + Math.round(r.width) + " r=" + Math.round(r.right));
  });
  document.body.insertAdjacentHTML("afterbegin", "<pre id=dbg>" + out.slice(0, 14).join("\n") + "</pre>");
}, 2500);
