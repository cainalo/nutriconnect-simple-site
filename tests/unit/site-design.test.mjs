import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Pórtico is registered as an independent site design and appears in admin gallery", async () => {
  const [design, admin] = await Promise.all([
    read("../../src/lib/site-design.ts"),
    read("../../src/components/admin/sections-site-design.tsx"),
  ]);
  assert.match(design, /"natural" \| "vibrante" \| "editorial" \| "portico" \| "aurora"/);
  assert.match(design, /id: "portico"/);
  assert.match(design, /name: "Pórtico"/);
  assert.match(admin, /SITE_DESIGNS\.map/);
  assert.match(admin, /portico \? \[s\.primary, s\.accent, "#6b3a6e", "#d4a017"\]/);
});

test("Pórtico has distinct light and dark palettes and a dedicated navigation", async () => {
  const [styles, chrome, shell] = await Promise.all([
    read("../../src/styles.css"),
    read("../../src/components/site-chrome-designs.tsx"),
    read("../../src/components/site-chrome.tsx"),
  ]);
  assert.match(styles, /html\[data-design="portico"\]/);
  assert.match(styles, /html\[data-design="portico"\]\.dark/);
  assert.match(styles, /--background: #f7efdf/);
  assert.match(styles, /--foreground: #0f4c5c/);
  assert.match(styles, /--font-display: "Fraunces"/);
  assert.match(styles, /--font-sans: "Inter Tight"/);
  assert.match(chrome, /export function PorticoChrome\(\)/);
  assert.match(chrome, /data-portico-mark/);
  assert.match(shell, /design === "portico"\) return <PorticoChrome \/>/);
});

test("Pórtico fonts are loaded in the app shell", async () => {
  const shell = await read("../../src/routes/__root.tsx");
  assert.match(shell, /family=Fraunces:wght@400;500;600;700;800/);
  assert.match(shell, /family=Inter\+Tight:wght@400;500;600;700;800/);
});

test("the visual CI sweep includes Pórtico in its design matrix", async () => {
  const [workflow, smoke] = await Promise.all([
    read("../../.github/workflows/verificacoes.yml"),
    read("../e2e/smoke.mjs"),
  ]);
  assert.match(workflow, /--designs natural,vibrante,editorial,portico,aurora/);
  assert.match(smoke, /--designs natural,vibrante,editorial,portico,aurora/);
});
