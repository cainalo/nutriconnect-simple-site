// Varredura de telas no navegador (harness com banco falso e dados sintéticos; nada de produção).
// Para cada página sem parâmetro em src/routes, em cada design e tema pedido, confere:
// rolagem lateral, alvos de toque < 24 px (WCAG 2.5.8), erros de JavaScript e, se o axe-core
// estiver disponível, violações WCAG A/AA (sem "document-title", que é do harness).
//
// Uso: npm run test:e2e -- [--designs natural,vibrante,editorial,aurora] [--dark] [--widths 390,1280]
//      [--pages espaco,cardapio] [--axe]
// Precisa de um Chromium (PLAYWRIGHT_BROWSERS_PATH ou CHROMIUM_PATH) e de playwright-core.
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? def : args[i + 1];
};
const DESIGNS = opt("designs", "natural").split(",");
const WIDTHS = opt("widths", "390,1280").split(",").map(Number);
const THEMES = args.includes("--dark") ? ["claro", "escuro"] : ["claro"];
const PORT = Number(opt("port", "4180"));

// playwright-core e axe-core: do projeto, se instalados, ou das pastas globais do ambiente.
const req = createRequire(import.meta.url);
const tryResolve = (name, extra = []) => {
  for (const base of [root, ...extra]) {
    try {
      return createRequire(path.join(base, "noop.js")).resolve(name);
    } catch {
      /* tenta a próxima */
    }
  }
  return null;
};
const pwPath = tryResolve("playwright-core", ["/opt/node-tools"]);
if (!pwPath) {
  console.error("playwright-core não encontrado (npm i -D playwright-core).");
  process.exit(2);
}
const { chromium } = req(pwPath);
const axePath = args.includes("--axe")
  ? tryResolve("axe-core", ["/opt/node-tools", "/tmp/claude-0/pg"])
  : null;
const AXE = axePath ? readFileSync(path.join(path.dirname(axePath), "axe.min.js"), "utf8") : null;
if (args.includes("--axe") && !AXE)
  console.warn("axe-core não encontrado: pulando a checagem WCAG.");

const executablePath =
  process.env.CHROMIUM_PATH ??
  ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find((p) => existsSync(p));

// Páginas: todo arquivo de rota sem parâmetro ($), sem layout de grupo e sem API.
const SKIP = new Set(["__root", "admin", "api", "sitemap[.]xml"]);
const PAGES =
  opt("pages", null)?.split(",") ??
  readdirSync(path.join(root, "src/routes"))
    .filter((f) => f.endsWith(".tsx") && !f.includes("$") && !f.startsWith("_"))
    .map((f) => f.replace(/\.tsx$/, ""))
    .filter((f) => !SKIP.has(f) && !f.startsWith("api."));

spawnSync("npx", ["vite", "build", "--config", ".preview-harness/vite.config.mjs"], {
  cwd: root,
  stdio: "ignore",
});
const server = spawn(
  "npx",
  [
    "vite",
    "preview",
    "--config",
    ".preview-harness/vite.config.mjs",
    "--port",
    String(PORT),
    "--strictPort",
  ],
  { cwd: root, stdio: "ignore", detached: true },
);
const stop = () => {
  try {
    process.kill(-server.pid);
  } catch {
    /* já parou */
  }
};
process.on("exit", stop);
for (let i = 0; i < 60; i++) {
  if (
    await fetch(`http://localhost:${PORT}/`).then(
      (r) => r.ok,
      () => false,
    )
  )
    break;
  await new Promise((r) => setTimeout(r, 500));
}

const browser = await chromium.launch({ executablePath });
const report = [];
for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 860 } });
  for (const design of DESIGNS) {
    for (const theme of THEMES) {
      for (const p of PAGES) {
        const url = `http://localhost:${PORT}/?v=page&p=${p}&fx=1&d=${design}${theme === "escuro" ? "&dark=1" : ""}`;
        const errors = [];
        page.removeAllListeners("pageerror");
        page.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
        await page.goto(url, { waitUntil: "networkidle" }).catch(() => {});
        await page.waitForTimeout(800);
        const r = await page.evaluate(() => {
          const W = innerWidth;
          const small = [
            ...document.querySelectorAll(
              "button, a[href], input:not([type=hidden]), select, [role=button]",
            ),
          ]
            .filter((e) => {
              const b = e.getBoundingClientRect();
              if (!b.width || getComputedStyle(e).visibility === "hidden") return false;
              if (e.tagName === "A" && getComputedStyle(e).display === "inline") return false;
              if (e.type === "checkbox" || e.type === "radio") return b.height < 20;
              return b.height < 24 || b.width < 24;
            })
            .map(
              (e) =>
                `${e.tagName.toLowerCase()}:${(e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 30)}`,
            );
          return { hscroll: document.documentElement.scrollWidth > W + 1, small };
        });
        let axe = [];
        if (AXE) {
          await page.evaluate(AXE);
          axe = await page.evaluate(async () => {
            const res = await window.axe.run(document, {
              resultTypes: ["violations"],
              runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] },
            });
            return res.violations
              .filter((v) => v.id !== "document-title")
              .map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(" ")}`);
          });
        }
        const problems = [
          ...(r.hscroll ? ["rolagem lateral"] : []),
          ...r.small.map((s) => `alvo pequeno ${s}`),
          ...errors.map((e) => `erro JS: ${e}`),
          ...axe.map((a) => `WCAG ${a}`),
        ];
        report.push({ page: p, design, theme, width, problems });
        if (problems.length)
          console.log(`✗ ${p} [${design}/${theme}/${width}px]\n    ${problems.join("\n    ")}`);
      }
    }
  }
  await page.close();
}
await browser.close();
stop();

mkdirSync(path.join(root, "tests/e2e/out"), { recursive: true });
writeFileSync(path.join(root, "tests/e2e/out/smoke.json"), JSON.stringify(report, null, 1));
const bad = report.filter((r) => r.problems.length);
console.log(`\n${report.length} telas verificadas, ${bad.length} com problema.`);
process.exit(bad.length ? 1 : 0);
