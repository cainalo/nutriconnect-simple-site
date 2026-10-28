import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Editorial Vibrante is selectable and preserves the existing newspaper Editorial theme", async () => {
  const [design, admin] = await Promise.all([read("../../src/lib/site-design.ts"), read("../../src/components/admin/sections-site-design.tsx")]);
  assert.ok(design.includes('"natural" | "vibrante" | "editorial" | "portico" | "aurora"'));
  assert.ok(design.includes('id: "portico"'));
  assert.ok(design.includes('name: "Editorial Vibrante"'));
  assert.ok(design.includes('id: "editorial",'));
  assert.ok(design.includes('tagline: "Papel quente, tipografia autoral e cards-pôster"'));
  assert.ok(admin.includes("SITE_DESIGNS.map"));
  assert.ok(admin.includes("applySiteDesign(d.id)"));
  assert.ok(admin.includes("save.mutate"));
  assert.ok(admin.includes("Comparação visual"));
  assert.ok(admin.includes("<Mini d={currentDesign} dark={dark} />"));
  assert.ok(admin.includes("<Mini d={editorialVibrante} dark={dark} />"));
});

test("Editorial Vibrante defines accessible color tokens and colored cards for the feed and admin", async () => {
  const [styles, chrome, shell, adminUi, design] = await Promise.all([
    read("../../src/styles.css"), read("../../src/components/site-chrome-designs.tsx"),
    read("../../src/components/site-chrome.tsx"), read("../../src/components/admin/admin-ui.tsx"),
    read("../../src/lib/site-design.ts"),
  ]);
  for (const token of ['html[data-design="portico"]', 'html[data-design="portico"].dark', "--background: #F7EFDF", "--card: #FFF9EF", "--primary: #0F4C5C", "--accent: #C8402A", "--ev-ochre: #D4A017", "--ev-plum: #6B3A6E", "--ev-olive: #556B2F", '--font-display: "Fraunces"', '--font-sans: "Inter Tight"', '.post-card[data-post-type="receita"]', "[data-admin-stat]:nth-child(5n + 5)"]) assert.ok(styles.includes(token), token);
  assert.ok(adminUi.includes("data-admin-stat"));
  assert.ok(chrome.includes("export function EditorialVibranteChrome()"));
  assert.ok(chrome.includes("nc-brand-wordmark--light"));
  assert.ok(chrome.includes("nc-brand-wordmark--dark"));
  assert.ok(shell.includes('design === "portico") return <EditorialVibranteChrome />'));
  assert.ok(design.includes('favicon.href = id === "portico" ? "/favicon.svg" : "/favicon.png"'));
});

test("NutriConnect wordmark and symbol are vector assets used by the theme header and landing", async () => {
  const [mark, wordmark, reverse, appIcon, favicon, chrome, landing, root] = await Promise.all([
    read("../../public/brand/nutriconnect-mark.svg"), read("../../public/brand/nutriconnect-wordmark.svg"),
    read("../../public/brand/nutriconnect-wordmark-reverse.svg"), read("../../public/icons/nutriconnect-app.svg"),
    read("../../public/favicon.svg"), read("../../src/components/site-chrome-designs.tsx"),
    read("../../src/components/landing-designs.tsx"), read("../../src/routes/__root.tsx"),
  ]);
  assert.ok(mark.includes("Folhas que crescem sobre uma tigela compartilhada"));
  assert.ok(mark.includes('viewBox="0 0 48 48"'));
  assert.ok(wordmark.includes('fill="#0F4C5C"') && wordmark.includes('fill="#C8402A"'));
  assert.ok(reverse.includes("#F7EFDF"));
  assert.ok(appIcon.includes('viewBox="0 0 512 512"'));
  assert.ok(favicon.includes("<svg"));
  assert.ok(chrome.includes('src="/brand/nutriconnect-wordmark.svg"'));
  assert.ok(landing.includes('src="/brand/nutriconnect-wordmark.svg"'));
  assert.ok(root.includes('id: "site-favicon", href: "/favicon.png"'));
});

test("Fonts load and visual CI covers all five site designs", async () => {
  const [shell, workflow, smoke] = await Promise.all([read("../../src/routes/__root.tsx"), read("../../.github/workflows/verificacoes.yml"), read("../e2e/smoke.mjs")]);
  assert.ok(shell.includes("family=Fraunces:wght@400;500;600;700;800"));
  assert.ok(shell.includes("family=Inter+Tight:wght@400;500;600;700;800"));
  assert.ok(workflow.includes("--designs natural,vibrante,editorial,portico,aurora"));
  assert.ok(smoke.includes("--designs natural,vibrante,editorial,portico,aurora"));
});

test("Editorial Vibrante landing uses full poster colors and legible dark ink on ochre", async () => {
  const landing = await read("../../src/components/landing-designs.tsx");
  assert.ok(landing.includes('const posterColors = ["#C8402A", "#0F4C5C", "#D4A017", "#6B3A6E", "#556B2F"]'));
  assert.ok(landing.includes('color === "#D4A017" ? "#10282E" : "#FFF9EF"'));
  assert.ok(landing.includes("className=\"nc-brand-lockup"));
  assert.ok(landing.includes("data-landing"));
});

test("Documentation explains preview, publishing, visual comparison and how to revert", async () => {
  const docs = await read("../../docs/designs/editorial-vibrante.md");
  for (const term of ["Editorial Vibrante", "Testar neste navegador", "Publicar no site", "Comparação visual", "reverter"]) assert.ok(docs.toLowerCase().includes(term.toLowerCase()), term);
});

test("Editorial Vibrante has a dedicated top bar, bottom dock, back action, and shared collapse state", async () => {
  const [chrome, navigation, styles] = await Promise.all([
    read("../../src/components/site-chrome-designs.tsx"),
    read("../../src/components/site-nav.tsx"),
    read("../../src/styles.css"),
  ]);
  assert.ok(chrome.includes("export function EditorialVibranteChrome()"));
  assert.ok(chrome.includes("data-ev-header"));
  assert.ok(chrome.includes("data-ev-topnav"));
  assert.ok(chrome.includes("data-ev-bottom-nav"));
  assert.ok(chrome.includes("const hidden = useHideOnScroll(pathname)"));
  assert.ok(chrome.includes("data-hidden={hidden}"));
  assert.ok(chrome.includes("window.history.back()"));
  assert.ok(chrome.includes("data-ev-back"));
  assert.ok(navigation.includes("export function useHideOnScroll(pathname: string)"));
  assert.ok(navigation.includes("CHROME_HIDE_EVENT"));
  for (const selector of [".ev-header-top", ".ev-topnav-links", ".ev-bottom-dock", ".ev-bottom-create", "[data-ev-back]"]) {
    assert.ok(styles.includes(selector), selector);
  }
  assert.ok(styles.includes("body:has([data-ev-bottom-nav])"));
  assert.ok(styles.includes("prefers-reduced-motion: reduce"));
});

test("Editorial Vibrante section pages use a unique masthead and functional components have a designed treatment", async () => {
  const [pageHead, styles] = await Promise.all([
    read("../../src/components/design-page-head.tsx"),
    read("../../src/styles.css"),
  ]);
  assert.ok(pageHead.includes("data-ev-page-head"));
  assert.ok(pageHead.includes("ev-page-masthead"));
  assert.ok(pageHead.includes("ev-page-visual-stamp"));
  for (const selector of [".ev-page-title", ".ev-page-annotation", ".nc-menu-item[data-highlighted]", '[role="dialog"]', "html[data-design=\"portico\"] thead"]) {
    assert.ok(styles.includes(selector), selector);
  }
});
