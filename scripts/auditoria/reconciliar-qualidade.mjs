// Reconcilia o catálogo de qualidade (src/lib/quality/catalog*.ts) com as rodadas de notas
// (src/lib/quality/results.ts): contagem por rodada, IDs únicos, itens sem nota e IDs órfãos.
// Uso: node scripts/auditoria/reconciliar-qualidade.mjs [--md]
// Só lê o código; não muda nenhuma nota.
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// Carrega os módulos TypeScript pelo próprio Vite, sem servidor HTTP.
const vite = await createServer({
  root,
  configFile: false,
  logLevel: "error",
  resolve: { alias: { "@": path.join(root, "src") } },
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
const load = (p) => vite.ssrLoadModule(path.join(root, p));
const mod = {
  ...(await load("src/lib/quality/catalog.ts")),
  ...(await load("src/lib/quality/results.ts")),
  ...(await load("src/lib/quality/criteria.ts")),
};
await vite.close();
const { CATALOG, ROUNDS, CRITERIA } = mod;

const catIds = CATALOG.map((i) => i.id);
const dup = catIds.filter((id, i) => catIds.indexOf(id) !== i);
const catSet = new Set(catIds);
const crit = CRITERIA.map((c) => c.id);
const rows = ROUNDS.map((r) => {
  const ids = Object.keys(r.items);
  const incomplete = ids.filter((id) => crit.some((c) => r.items[id].scores[c] == null));
  return {
    round: r.round,
    date: r.date,
    items: ids.length,
    orphans: ids.filter((id) => !catSet.has(id)),
    incomplete: incomplete.length,
    missing: catIds.filter((id) => !(id in r.items)),
  };
});
const everRated = new Set(ROUNDS.flatMap((r) => Object.keys(r.items)));
const byKind = {};
for (const i of CATALOG) byKind[i.kind] = (byKind[i.kind] ?? 0) + 1;
const report = {
  catalog: { total: catIds.length, unique: catSet.size, duplicates: dup, byKind },
  criteria: crit.length,
  rounds: rows,
  neverRated: catIds.filter((id) => !everRated.has(id)),
  occurrences: rows.reduce((s, r) => s + r.items, 0),
};

if (process.argv.includes("--md")) {
  const L = [];
  L.push(
    `Catálogo: ${report.catalog.total} itens (${report.catalog.unique} IDs únicos; duplicados: ${dup.length ? dup.join(", ") : "nenhum"}).`,
  );
  L.push(
    `Por tipo: ${Object.entries(byKind)
      .map(([k, v]) => `${k} ${v}`)
      .join(", ")}. Critérios: ${report.criteria}.`,
  );
  L.push(
    "",
    "| Rodada | Data | Itens com nota | Notas incompletas | IDs sem item no catálogo | Itens do catálogo sem nota |",
    "|---|---|---|---|---|---|",
  );
  for (const r of rows)
    L.push(
      `| ${r.round} | ${r.date} | ${r.items} | ${r.incomplete} | ${r.orphans.length ? r.orphans.join(", ") : "0"} | ${r.missing.length} |`,
    );
  L.push(
    "",
    `Ocorrências somadas: ${report.occurrences}. Itens nunca avaliados: ${report.neverRated.length ? report.neverRated.join(", ") : "nenhum"}.`,
  );
  console.log(L.join("\n"));
} else console.log(JSON.stringify(report, null, 2));
