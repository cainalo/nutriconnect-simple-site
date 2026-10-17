import "@/styles.css";
import { useEffect, useState } from "react";
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
function NewsDemo() {
  const lorem = "Uma receita simples para o dia a dia, com ingredientes frescos e pouca complicação, pensada para quem tem pouco tempo e quer comer bem. ";
  const items = Array.from({ length: 11 }, (_, i) => ({ id: i, title: ["Cozinha de verdade: menos rótulos, mais frescor", "Como montar o prato do dia", "Dúvida sobre fibras", "Feira de outubro", "Água ao longo do dia"][i % 5], text: lorem.repeat(1 + ((i * 3) % 6)), img: i % 3 === 0 }));
  return (
    <RouterApp>
      <div className="p-6">
        <div className="columns-1 gap-x-12 md:columns-2 lg:columns-3 2xl:columns-4 [column-rule:1px_solid_color-mix(in_srgb,var(--foreground)_30%,transparent)]">
          {items.map((it, i) => {
            const wide = i === 0 || i % 7 === 0;
            const rank = i === 0 ? "lead" : wide ? "major" : i <= 3 ? "major" : "minor";
            return (
              <div key={it.id} data-news-rank={rank} data-news-span={wide ? "all" : undefined} className={"mb-8 " + (wide ? "[column-span:all]" : "")}>
                <PostCardFrame type={["receita", "experiencia", "pergunta"][i % 3]} className="border bg-card" footer={<div className="flex gap-2"><button className="rounded-full border px-3 py-1 text-xs">Apoiar</button></div>}>
                  <div className="mb-4 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--pt)" }}>Receita comunitária</div>
                  {it.img && <img src="/images/presentation/market.jpg" alt="" className="mb-4 w-full rounded-2xl" />}
                  <h3 className="mb-2 text-lg font-bold font-display">{it.title}</h3>
                  <p className="text-sm leading-relaxed text-justify">{it.text}</p>
                </PostCardFrame>
              </div>
            );
          })}
        </div>
      </div>
    </RouterApp>
  );
}
import { PostMasonry } from "@/components/post-masonry";
function MasonryDemo() {
  const lorem = "Uma receita simples para o dia a dia, com ingredientes frescos e pouca complicação, pensada para quem tem pouco tempo e quer comer bem. ";
  const items = Array.from({ length: 12 }, (_, i) => ({
    id: "m" + i,
    node: (
      <PostCardFrame type={["receita", "experiencia", "pergunta", "geral"][i % 4]} className="border bg-card" footer={<div className="flex gap-2"><button className="rounded-full border px-3 py-1 text-xs">Apoiar</button></div>}>
        <div className="mb-4 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--pt)" }}>Receita comunitária</div>
        {i % 3 === 0 && <img src="/images/presentation/market.jpg" alt="" className="mb-4 w-full rounded-2xl" />}
        <h3 className="mb-2 text-lg font-bold font-display">Título do post número {i + 1}</h3>
        <p className="text-sm leading-relaxed">{lorem.repeat(1 + ((i * 5) % 7))}</p>
      </PostCardFrame>
    ),
  }));
  return <RouterApp><div className="p-6"><PostMasonry items={items} /></div></RouterApp>;
}
import { IdeasTab } from "@/components/admin/social/ideas-tab";
import { CalendarTab } from "@/components/admin/social/calendar-tab";
import { TrendsTab } from "@/components/admin/social/trends-tab";
import { ProfilesTab } from "@/components/admin/social/profiles-tab";
const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
if (!q.get("empty")) {
  qc.setQueryData(["social-studio", "posts"], fakePosts);
  qc.setQueryData(["social-studio", "profiles"], [
    { id: "pr1", network: "instagram", handle: "@nutriconnect", url: "https://instagram.com/nutriconnect", notes: "", sample_posts: "", created_at: now, analyzed_at: now,
      metrics: { followers: 12840, posts_per_week: 4, avg_likes: 310, avg_comments: 22, avg_reach: 5400 },
      analysis: { resumo: "Perfil com boa base de seguidores e conteúdo educativo consistente; falta conversa nos comentários e chamadas para o app.", tom_atual: "Didático e acolhedor, às vezes técnico demais.", publico: "Mulheres de 25 a 45 anos que cozinham para a família.", pilares: ["Comida de verdade", "Rótulos sem medo", "Rotina possível"], pontos_fortes: ["Artes consistentes", "Fontes confiáveis"], melhorar: ["Responder comentários em até 24 h", "Ganchos mais curtos"], formatos_recomendados: ["Carrossel com checklist", "Reels de 20 s"], frequencia: "4 posts por semana + stories diários", melhores_horarios: "Seg, qua e sex às 12h e 19h", acoes_engajamento: ["Enquete nos stories", "Caixinha de perguntas"], bio_sugerida: "Nutrição sem culpa, com comida de verdade.\nBaixe o app e fale com a Nina.", metas_30_dias: ["+800 seguidores", "Taxa de salvamento 3%"] } },
    { id: "pr2", network: "tiktok", handle: "@nutri.connect", url: null, notes: "", sample_posts: "", created_at: now, analyzed_at: null, metrics: {}, analysis: null },
  ]);
  qc.setQueryData(["social-studio", "trends"], {
    top_posts: [{ type: "receita", title: "Bolo de banana sem açúcar", tags: [], reactions: 48, comments: 12 }, { type: "pergunta", title: "Quanto de água por dia?", tags: [], reactions: 31, comments: 20 }, { type: "experiencia", title: "Minha primeira feira orgânica", tags: [], reactions: 22, comments: 5 }, { type: "geral", title: "Lancheira da semana", tags: [], reactions: 15, comments: 3 }],
    top_tags: [{ tag: "receitas", n: 18 }, { tag: "lancheira", n: 11 }, { tag: "agua", n: 7 }, { tag: "feira", n: 4 }],
    post_types: {}, theme: { title: "Cozinha de verdade: menos rótulos, mais frescor", subtitle: null },
    challenges: [{ title: "21 dias de água", people: 54 }, { title: "Mais verduras", people: 23 }],
  });
}
// Receitas de exemplo para a Roleta de receitas (v=card&c=RecipeRouletteCard).
import { qkFeed } from "@/lib/social/feed-queries";
const rec = (id: string, title: string, prep: string, diff: string, ing: string[], image?: string) => ({
  id, type: "receita", authorId: "a", authorName: "Ana Lima", title, text: "", image, tags: [], createdAt: now,
  pinned: false, likes: [], supports: [], preparedBy: [], comments: [],
  recipeData: { prepTime: prep, servings: "2", difficulty: diff, ingredients: ing, steps: [], category: "" },
});
qc.setQueryData(qkFeed.list({ scope: "todos", type: "receita", limit: 60 }), [
  rec("r1", "Omelete de espinafre", "15 min", "Fácil", ["2 ovos", "espinafre", "sal"], "/images/presentation/cooking-together.jpg"),
  rec("r2", "Feijoada leve", "1h 30 min", "Médio", ["feijão preto", "cebola", "alho"]),
  rec("r3", "Arroz de forno com legumes", "40 min", "Médio", ["arroz", "cenoura", "abobrinha"]),
  rec("r4", "Salada de grão-de-bico", "10 min", "Fácil", ["grão-de-bico", "tomate", "cebola"], "/images/presentation/market.jpg"),
]);
// Registros do dia de exemplo (Como me sinto, Hábitos): segundas pesadas, dias bons com mais hábitos.
if (q.get("checkins")) {
  const rows = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const mood = d.getDay() === 1 ? 3 : i % 5 === 0 ? 2 : i % 2;
    const habits = mood <= 1 ? ["water", "veg", "move", "sleep"].slice(0, 3 + (i % 2)) : ["water"];
    return { user_id: "u1", day, habits, mood, pledge: i % 3 !== 0, mindful_meals: 0, quiz_best: null, updated_at: now };
  }).reverse();
  qc.setQueryData(["checkins", "u1"], rows);
}
// Água de exemplo (&water=1): meta 8, últimos 5 dias batendo a meta.
import { lastWaterDays, waterKeys } from "@/lib/water";
if (q.get("water")) {
  for (const n of [7, 35]) {
    const keys = lastWaterDays(n);
    qc.setQueryData(waterKeys.days("u1", keys[0]), keys.map((day, i) => ({
      user_id: "u1", day, goal: 8, updated_at: now,
      glasses: i >= keys.length - 5 ? 8 + (i % 2) : (i * 3) % 9,
    })));
  }
}
// Lista de compras de exemplo (&shop=1).
if (q.get("shop")) {
  const it = (id: string, text: string, done = false, section: string | null = null) => ({
    id, text, done, section, user_id: "u1", household_id: null, bought_by: null, created_at: now, source: "manual",
  });
  qc.setQueryData(["shopping", "pessoal"], [
    it("1", "Tomates"), it("2", "Cebola", true), it("3", "Ovos"), it("4", "Peito de frango"),
    it("5", "Leite"), it("6", "Pão francês"), it("7", "Feijão carioca", true), it("8", "Aveia"), it("9", "Detergente"),
  ]);
}
// Estado para o Calendário da feira (&uf=SP).
if (q.get("uf")) qc.setQueryData(["social", "settings"], { season_uf: q.get("uf") });
// Geladeira de exemplo (&fridge=1).
if (q.get("fridge"))
  qc.setQueryData(["fridge-items", "pessoal"], ["ovos", "tomate", "cebola", "banana", "aveia", "batata"].map((text, i) => ({ id: String(i), text })));
const wrap = (el: any) => <div className="st-root mx-auto max-w-[1100px] p-3 sm:p-6">{el}</div>;
// v=page&p=funcoes → monta o componente da rota src/routes/funcoes.tsx (Supabase simulado e vazio).
const ROUTES = import.meta.glob("../src/routes/*.tsx");
import { BackToTop } from "@/components/back-to-top";
function PageDemo() {
  const [Comp, setComp] = useState<any>(null);
  useEffect(() => {
    const load = ROUTES[`../src/routes/${q.get("p") ?? "funcoes"}.tsx`];
    void load?.().then((m: any) => setComp(() => m.Route.options.component));
  }, []);
  if (!Comp) return null;
  const root = createRootRoute({ component: () => <><Comp /><BackToTop /></> });
  // Endereço real da página (comunidades.index → /comunidades), para a faixa de título aparecer.
  const path = "/" + (q.get("p") ?? "funcoes").split(".").filter((x) => x !== "index" && !x.startsWith("$")).join("/");
  const router = createRouter({ routeTree: root, history: createMemoryHistory({ initialEntries: [path] }) });
  return <RouterProvider router={router} />;
}
// v=card&c=HabitCheckinCard → um card de Funções sozinho (&click=<texto do botão> para clicar).
import * as FunCards from "@/components/fun-cards";
function CardDemo() {
  const Card = (FunCards as any)[q.get("c") ?? "HabitCheckinCard"];
  return <RouterApp><div className="mx-auto max-w-md p-4">{Card ? <Card /> : "card?"}</div></RouterApp>;
}
// v=post → um PostCard real (fileira de ações: conversa, apoiar, compartilhar…).
import { PostCard } from "@/components/community-cards";
function PostDemo() {
  const post = { id: "p1", type: "experiencia", title: "Arroz de forno com legumes", text: "Uma receita simples para o dia a dia.", authorName: "Maria Silva", authorId: "u2", createdAt: new Date().toISOString(), comments: [], supports: ["a", "b"], likes: [], preparedBy: [], pinned: false, tags: [] };
  return <RouterApp><div className="mx-auto max-w-md p-4"><PostCard post={post as any} /></div></RouterApp>;
}
// v=docs / v=quality → Admin: Documentação e Qualidade, sozinhos.
import { DocsSection } from "@/components/admin/sections-docs";
import { QualitySection } from "@/components/admin/sections-quality";
// v=photos → painel "Imagens do site" do admin, sozinho.
import { SitePhotosSection } from "@/components/admin/sections-site-photos";
// v=reviews → avaliações (P1) do profissional de demonstração; &dialog=1 abre o formulário.
import { setDemoEnabled, DEMO_PRO } from "@/lib/clinical/demo";
import { ProReviewsSection, ReviewDialog } from "@/components/clinical/reviews";
import { useRatingSummaries } from "@/lib/clinical/reviews";
if (q.get("demo")) setDemoEnabled(true);
function ReviewsDemo() {
  const s = useRatingSummaries();
  return (
    <RouterApp>
      <div className="mx-auto max-w-2xl p-4">
        <div className="rounded-2xl border bg-card p-5"><ProReviewsSection proId={DEMO_PRO} summary={s.data?.get(DEMO_PRO)} isOwner={!!q.get("owner")} /></div>
        {q.get("dialog") && <ReviewDialog appointmentId="a1" proName="Ana Paula" open onOpenChange={() => {}} />}
      </div>
    </RouterApp>
  );
}
function App() {
  if (v === "card") return <CardDemo />;
  if (v === "photos") return wrap(<SitePhotosSection />);
  if (v === "docs") return <RouterApp><div className="p-4"><DocsSection /></div></RouterApp>;
  if (v === "quality") return <RouterApp><div className="p-4"><QualitySection /></div></RouterApp>;
  if (v === "post") return <PostDemo />;
  if (v === "page") return <PageDemo />;
  if (v === "reviews") return <ReviewsDemo />;
  if (v === "ideas") return wrap(<IdeasTab onOpen={() => {}} onEditIdea={() => {}} />);
  if (v === "calendar") return wrap(<CalendarTab onOpen={() => {}} onNew={() => {}} />);
  if (v === "trends") return wrap(<TrendsTab onCreate={() => {}} />);
  if (v === "profiles") return wrap(<ProfilesTab />);
  if (v === "masonry") return <MasonryDemo />;
  if (v === "news") return <NewsDemo />;
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
  <QueryClientProvider client={qc}><App /></QueryClientProvider>,
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
