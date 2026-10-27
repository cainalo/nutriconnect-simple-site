// Falhas de leitura/Canvas não podem deixar o envio de fotos preso em "Enviando…".
import { test, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import { loadTs, closeTs } from "../load-ts.mjs";

const { compressToBlob } = await loadTs("src/lib/social-media.ts");
after(closeTs);

const originalImage = globalThis.Image;
const originalDocument = globalThis.document;
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;
afterEach(() => {
  globalThis.Image = originalImage;
  globalThis.document = originalDocument;
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
});

function fakeBrowser({ decodeFails = false, noContext = false, drawFails = false, encodeFails = false } = {}) {
  const revoked = [];
  let drawn = null;
  URL.createObjectURL = () => "blob:unit-test";
  URL.revokeObjectURL = (url) => revoked.push(url);

  globalThis.Image = class {
    width = 2000;
    height = 1000;
    naturalWidth = 2000;
    naturalHeight = 1000;
    onload = null;
    onerror = null;
    set src(_value) {
      queueMicrotask(() => {
        if (decodeFails) this.onerror?.(new Error("decode failed"));
        else this.onload?.();
      });
    }
  };

  const canvas = {
    width: 0,
    height: 0,
    getContext(type) {
      assert.equal(type, "2d");
      if (noContext) return null;
      return {
        drawImage(_image, _x, _y, width, height) {
          if (drawFails) throw new Error("draw failed");
          drawn = { width, height };
        },
      };
    },
    toBlob(callback, type, quality) {
      assert.equal(type, "image/jpeg");
      assert.equal(quality, 0.82);
      queueMicrotask(() => callback(encodeFails ? null : new Blob(["jpeg"], { type })));
    },
  };
  globalThis.document = {
    createElement(tag) {
      assert.equal(tag, "canvas");
      return canvas;
    },
  };
  return { canvas, revoked, get drawn() { return drawn; } };
}

test("comprime para JPEG, preserva a proporção e libera a URL temporária", async () => {
  const fake = fakeBrowser();
  const blob = await compressToBlob({ name: "foto.jpg" });
  assert.equal(blob.type, "image/jpeg");
  assert.deepEqual(fake.drawn, { width: 1600, height: 800 });
  assert.deepEqual(fake.revoked, ["blob:unit-test"]);
});

test("imagem inválida rejeita em vez de deixar o envio esperando", async () => {
  const fake = fakeBrowser({ decodeFails: true });
  await assert.rejects(compressToBlob({ name: "invalida.jpg" }), /Não foi possível ler a imagem/);
  assert.deepEqual(fake.revoked, ["blob:unit-test"]);
});

test("contexto Canvas indisponível rejeita e libera a URL", async () => {
  const fake = fakeBrowser({ noContext: true });
  await assert.rejects(compressToBlob({ name: "foto.jpg" }), /Não foi possível ler a imagem/);
  assert.deepEqual(fake.revoked, ["blob:unit-test"]);
});

test("erro durante drawImage rejeita e libera a URL", async () => {
  const fake = fakeBrowser({ drawFails: true });
  await assert.rejects(compressToBlob({ name: "foto.jpg" }), /Não foi possível ler a imagem/);
  assert.deepEqual(fake.revoked, ["blob:unit-test"]);
});

test("Canvas sem Blob rejeita com mensagem controlada", async () => {
  const fake = fakeBrowser({ encodeFails: true });
  await assert.rejects(compressToBlob({ name: "foto.jpg" }), /Não foi possível ler a imagem/);
  assert.deepEqual(fake.revoked, ["blob:unit-test"]);
});
