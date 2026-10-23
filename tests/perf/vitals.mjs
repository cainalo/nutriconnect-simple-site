// Medição de desempenho (NC-PERF-015): abre páginas públicas com celular simulado (CPU 4× mais
// lenta, rede 4G lenta) e mede FCP, LCP, CLS, peso transferido e número de pedidos, com cache
// frio e quente. Só lê páginas públicas; não entra em conta nenhuma.
// Uso: node tests/perf/vitals.mjs [url-base] [caminho...]
import { createRequire } from "node:module";
import path from "node:path";
import { existsSync } from "node:fs";

const base = process.argv[2] ?? "https://nutri-connect.netlify.app";
const pages = process.argv.slice(3).length ? process.argv.slice(3) : ["/", "/login", "/termos"];
const req = createRequire(import.meta.url);
let pw;
for (const b of [process.cwd(), "/opt/node-tools"]) {
  try {
    pw = req(createRequire(path.join(b, "x.js")).resolve("playwright-core"));
    break;
  } catch {
    /* próximo */
  }
}
const executablePath = ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find(existsSync);
const browser = await pw.chromium.launch({ executablePath });

async function measure(page, url) {
  let bytes = 0;
  let requests = 0;
  page.on("response", async (r) => {
    requests++;
    const len = Number(r.headers()["content-length"] ?? 0);
    bytes += len;
  });
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "load", timeout: 90_000 });
  await page.waitForTimeout(2500);
  const v = await page.evaluate(() => {
    const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? null;
    return new Promise((resolve) => {
      let lcp = null;
      let cls = 0;
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) lcp = e.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
      setTimeout(() => resolve({ fcp, lcp, cls }), 300);
    });
  });
  return { ...v, load: Date.now() - t0, kb: Math.round(bytes / 1024), requests };
}

const rows = [];
for (const p of pages) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const cold = await measure(page, base + p);
  const warm = await measure(page, base + p);
  rows.push({ page: p, cold, warm });
  await ctx.close();
}
await browser.close();
const f = (n) => (n == null ? "–" : `${(n / 1000).toFixed(1)} s`);
console.log("| Página | FCP frio | LCP frio | CLS | Peso frio | Pedidos | LCP quente |");
console.log("|---|---|---|---|---|---|---|");
for (const r of rows)
  console.log(
    `| ${r.page} | ${f(r.cold.fcp)} | ${f(r.cold.lcp)} | ${r.cold.cls.toFixed(3)} | ${r.cold.kb} KB | ${r.cold.requests} | ${f(r.warm.lcp)} |`,
  );
