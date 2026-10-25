// Mensagens da moderação por IA no idioma da pessoa (a IA responde em português).
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { loadTs, closeTs } from "../load-ts.mjs";

const { rejectionMessage } = await loadTs("src/lib/social/content-check.ts");
after(closeTs);

test("em português, mostra a dica específica da IA", () => {
  assert.equal(rejectionMessage("spam", "Tire o link da loja.", "pt-BR"), "Tire o link da loja.");
});

test("nos outros idiomas, mostra o motivo traduzido pelo código", () => {
  assert.match(rejectionMessage("spam", "Tire o link da loja.", "en"), /advertising/);
  assert.match(rejectionMessage("limite_diario", undefined, "fr"), /limite quotidienne/);
  assert.match(rejectionMessage("codigo_novo", undefined, "es"), /no es apropiado/);
});
