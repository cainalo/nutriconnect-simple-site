// Perfil infantil: o PIN do responsável confere, é por conta e não fica em texto puro.
import { test, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { loadTs, closeTs } from "../load-ts.mjs";

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
const pin = await loadTs("src/lib/parent-pin.ts");
after(closeTs);
beforeEach(() => store.clear());

test("PIN certo libera, errado não", async () => {
  await pin.setParentPin("conta-A", "4821");
  assert.equal(await pin.checkParentPin("conta-A", "4821"), true);
  assert.equal(await pin.checkParentPin("conta-A", "1234"), false);
});

test("o PIN é de cada conta e não fica guardado em texto puro", async () => {
  await pin.setParentPin("conta-A", "4821");
  assert.equal(await pin.checkParentPin("conta-B", "4821"), false);
  assert.ok(![...store.values()].some((v) => v.includes("4821")));
});

test("só aceita 4 dígitos", async () => {
  assert.equal(pin.isValidPin("12a4"), false);
  assert.equal(pin.isValidPin("123"), false);
  await assert.rejects(pin.setParentPin("conta-A", "12"));
});

test("sem PIN definido, nada confere", async () => {
  assert.equal(pin.hasParentPin("conta-A"), false);
  assert.equal(await pin.checkParentPin("conta-A", "0000"), false);
});

test("5 erros seguidos bloqueiam por 5 minutos, até com o PIN certo", async () => {
  await pin.setParentPin("conta-A", "4821");
  const t0 = 1_000_000;
  for (let i = 0; i < pin.MAX_TRIES; i++)
    assert.equal(await pin.checkParentPin("conta-A", "0000", t0), false);
  assert.ok(pin.pinLockedUntil("conta-A", t0) > t0);
  assert.equal(await pin.checkParentPin("conta-A", "4821", t0 + 1000), false);
  assert.equal(await pin.checkParentPin("conta-A", "4821", t0 + pin.LOCK_MS + 1), true);
});
