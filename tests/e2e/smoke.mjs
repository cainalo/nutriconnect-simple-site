// Varredura de telas no navegador (harness com banco falso e dados sintéticos; nada de produção).
// Para cada página sem parâmetro em src/routes, em cada design e tema pedido, confere:
// rolagem lateral, alvos de toque < 24 px (WCAG 2.5.8), erros de JavaScript e, se o axe-core
// estiver disponível, violações WCAG A/AA (sem "document-title", que é do harness).
//
// Uso: npm run test:e2e -- [--designs natural,vibrante,editorial,portico,aurora] [--dark] [--widths 390,1280]
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
// E2E_TOOLS: pasta com playwright-core e axe-core em versões fixas (é assim no CI).
const TOOLS = [process.env.E2E_TOOLS, "/opt/node-tools"].filter(Boolean);
const pwPath = tryResolve("playwright-core", TOOLS);
if (!pwPath) {
  console.error("playwright-core não encontrado (npm i -D playwright-core).");
  process.exit(2);
}
const { chromium } = req(pwPath);
const axePath = args.includes("--axe")
  ? tryResolve("axe-core", [...TOOLS, "/tmp/claude-0/pg"])
  : null;
const AXE = axePath ? readFileSync(path.join(path.dirname(axePath), "axe.min.js"), "utf8") : null;
if (args.includes("--axe") && !AXE)
  console.warn("axe-core não encontrado: pulando a checagem WCAG.");

const executablePath =
  process.env.CHROMIUM_PATH ??
  ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find((p) => existsSync(p));

// Páginas: todo arquivo de rota sem parâmetro ($), sem layout de grupo e sem API.
const SKIP = new Set(["__root", "api", "sitemap[.]xml"]);
const PAGES =
  opt("pages", null)?.split(",") ??
  readdirSync(path.join(root, "src/routes"))
    .filter((f) => f.endsWith(".tsx") && !f.includes("$") && !f.startsWith("_"))
    .map((f) => f.replace(/\.tsx$/, ""))
    .filter((f) => !SKIP.has(f) && !f.startsWith("api."));

// Rotas com parâmetros: valores sintéticos, sem tokens nem dados de produção.
const PARAMETERIZED_ROUTES = [
  { file: "assinar.$professionalId", pattern: "/assinar/$professionalId", path: "/assinar/demo-professional" },
  { file: "casa.entrar.$code", pattern: "/casa/entrar/$code", path: "/casa/entrar/DEMO123" },
  { file: "comunidades.$slug", pattern: "/comunidades/$slug", path: "/comunidades/demo-community" },
  { file: "consulta.$appointmentId", pattern: "/consulta/$appointmentId", path: "/consulta/demo-appointment" },
  { file: "convite.$code", pattern: "/convite/$code", path: "/convite/DEMO123" },
  { file: "desafios.$challengeId", pattern: "/desafios/$challengeId", path: "/desafios/demo-challenge" },
  { file: "evento.$eventId", pattern: "/evento/$eventId", path: "/evento/demo-event" },
  { file: "pagamento.$appointmentId", pattern: "/pagamento/$appointmentId", path: "/pagamento/demo-appointment" },
  { file: "painel.adesao.$patientId", pattern: "/painel/adesao/$patientId", path: "/painel/adesao/demo-patient" },
  { file: "painel.pacientes.$patientId", pattern: "/painel/pacientes/$patientId", path: "/painel/pacientes/demo-patient" },
  { file: "painel.planos.$planId", pattern: "/painel/planos/$planId", path: "/painel/planos/demo-plan" },
  { file: "perfil.$userId", pattern: "/perfil/$userId", path: "/perfil/demo-user" },
  { file: "profissionais.$professionalId", pattern: "/profissionais/$professionalId", path: "/profissionais/demo-professional" },
  { file: "programas.$programId", pattern: "/programas/$programId", path: "/programas/demo-program" },
  { file: "receitas.$id", pattern: "/receitas/$id", path: "/receitas/demo-post" },
];

// Se uma nova rota dinâmica entrar no app, CI exige um caso explícito com parâmetro.
if (args.includes("--params")) {
  const actual = readdirSync(path.join(root, "src/routes"))
    .filter((f) => f.endsWith(".tsx") && f.includes("$"))
    .map((f) => f.replace(/\.tsx$/, ""))
    .sort();
  const declared = PARAMETERIZED_ROUTES.map((r) => r.file).sort();
  const missing = actual.filter((f) => !declared.includes(f));
  const stale = declared.filter((f) => !actual.includes(f));
  if (missing.length || stale.length) {
    console.error("Cobertura de rotas dinâmicas incompleta.");
    if (missing.length) console.error("Sem caso: " + missing.join(", "));
    if (stale.length) console.error("Casos obsoletos: " + stale.join(", "));
    process.exit(2);
  }
}

const TEST_PAGES = [
  ...PAGES,
  ...(args.includes("--params") ? PARAMETERIZED_ROUTES.map((r) => "param:" + r.file) : []),
];

// Sem build novo não há teste: nunca roda sobre arquivos antigos.
const build = spawnSync("npx", ["vite", "build", "--config", ".preview-harness/vite.config.mjs"], {
  cwd: root,
  stdio: "inherit",
});
if (build.status !== 0) {
  console.error("O build do harness falhou: a varredura não roda.");
  process.exit(2);
}
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
      for (const p of TEST_PAGES) {
        const routeCase = p.startsWith("param:")
          ? PARAMETERIZED_ROUTES.find((r) => r.file === p.slice(6))
          : undefined;
        const name = routeCase ? routeCase.pattern + " → " + routeCase.path : p;
        const query = routeCase
          ? new URLSearchParams({
              v: "param-route",
              f: routeCase.file,
              pattern: routeCase.pattern,
              path: routeCase.path,
              fx: "1",
              d: design,
            })
          : null;
        if (query && theme === "escuro") query.set("dark", "1");
        const url = routeCase
          ? "http://localhost:" + PORT + "/?" + query.toString()
          : `http://localhost:${PORT}/?v=page&p=${encodeURIComponent(p)}&fx=1&d=${design}${theme === "escuro" ? "&dark=1" : ""}`;
        const errors = [];
        page.removeAllListeners("pageerror");
        page.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
        let navigationProblem = "";
        try {
          // O teste mede layout e acessibilidade, não tráfego de rede: aguardar "networkidle"
          // prende a varredura a cada imagem/fonte e pode estourar o timeout sem defeito de página.
          const response = await page.goto(url, { waitUntil: "domcontentloaded" });
          if (!response) navigationProblem = "navegação sem resposta HTTP";
          else if (!response.ok()) navigationProblem = `HTTP ${response.status()}`;
        } catch (err) {
          navigationProblem =
            err instanceof Error ? err.message.slice(0, 160) : String(err).slice(0, 160);
        }
        await page.waitForTimeout(250);
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
          const harnessError = document.querySelector("[data-e2e-error]")?.textContent?.trim() ?? "";
          return { hscroll: document.documentElement.scrollWidth > W + 1, small, harnessError };
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
        // Falhas funcionais bloqueiam CI; acessibilidade fica registrada no relatório
        // para remediação gradual, sem esconder ocorrências nem tornar o gate inoperante.
        const blockers = [
          ...(navigationProblem ? [`falha ao abrir página: ${navigationProblem}`] : []),
          ...(r.hscroll ? ["rolagem lateral"] : []),
          ...(r.harnessError ? [`falha do harness: ${r.harnessError.slice(0, 160)}`] : []),
          ...errors.map((e) => `erro JS: ${e}`),
        ];
        const accessibility = [
          ...r.small.map((s) => `alvo pequeno ${s}`),
          ...axe.map((a) => `WCAG ${a}`),
        ];
        const problems = [...blockers, ...accessibility];
        report.push({ page: name, design, theme, width, blockers, accessibility, problems });
        if (blockers.length)
          console.log(`✗ BLOQUEADOR ${name} [${design}/${theme}/${width}px]\n    ${blockers.join("\n    ")}`);
        if (accessibility.length)
          console.log(`⚠ ACESSIBILIDADE ${name} [${design}/${theme}/${width}px]\n    ${accessibility.join("\n    ")}`);
      }
    }
  }
  await page.close();
}
await browser.close();
stop();

mkdirSync(path.join(root, "tests/e2e/out"), { recursive: true });
writeFileSync(path.join(root, "tests/e2e/out/smoke.json"), JSON.stringify(report, null, 1));
const bad = report.filter((r) => r.blockers.length);
const accessibilityCount = report.reduce((n, r) => n + (r.accessibility?.length ?? 0), 0);
console.log(`\n${report.length} telas verificadas; ${bad.length} com bloqueadores funcionais; ${accessibilityCount} ocorrências de acessibilidade registradas.`);
process.exit(bad.length ? 1 : 0);
