// Portão de lançamento comercial: falha (código 1) enquanto faltar algo que só o operador pode
// fornecer ou que bloqueia a divulgação. Uso: npm run audit:release
import { spawnSync } from "node:child_process";
import { loadTs, closeTs, root } from "../../tests/load-ts.mjs";

const problems = [];
const { missingLegalFields } = await loadTs("src/lib/legal.ts");
await closeTs();
const missing = missingLegalFields();
if (missing.length) problems.push(`Dados legais vazios em src/lib/legal.ts: ${missing.join(", ")}`);

const scan = spawnSync("python3", ["scripts/auditoria/varrer-segredos.py"], {
  cwd: root,
  encoding: "utf8",
});
if (scan.status !== 0)
  problems.push("A varredura de segredos achou algo para verificar (npm run audit:secrets).");

if (problems.length) {
  console.log("Lançamento comercial BLOQUEADO:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log("Nenhum bloqueio de lançamento encontrado.");
