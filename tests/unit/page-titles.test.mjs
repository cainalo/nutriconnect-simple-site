// Títulos da aba nos 4 idiomas, e todo título declarado nas rotas tem tradução.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { loadTs, closeTs, root } from "../load-ts.mjs";

const { translateTitle, PAGE_TITLES } = await loadTs("src/lib/page-titles.ts");
after(closeTs);

test("traduz parte por parte e mantém o que não tem tradução", () => {
  assert.equal(
    translateTitle("Cardápio da semana — NutriConnect", "en"),
    "Weekly menu — NutriConnect",
  );
  assert.equal(
    translateTitle("Espaço de Hoje | NutriConnect", "fr"),
    "Espace du jour | NutriConnect",
  );
  assert.equal(translateTitle("Horta Viva — NutriConnect", "es"), "Horta Viva — NutriConnect");
  assert.equal(
    translateTitle("Cardápio da semana — NutriConnect", "pt-BR"),
    "Cardápio da semana — NutriConnect",
  );
});

test("todo título fixo das rotas tem tradução", () => {
  const dir = path.join(root, "src/routes");
  const faltando = [];
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".tsx"))) {
    const src = readFileSync(path.join(dir, f), "utf8");
    for (const m of src.matchAll(/\{\s*title:\s*"([^"]+)"\s*\}/g)) {
      for (const part of m[1].split(/\s[—|]\s/))
        if (!PAGE_TITLES[part]) faltando.push(`${f}: ${part}`);
    }
  }
  assert.deepEqual(faltando, []);
});
