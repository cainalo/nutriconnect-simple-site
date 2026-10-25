// NCV7-002/003/016/019: a exclusão de conta não pode seguir com arquivos para trás.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { loadTs, closeTs } from "../load-ts.mjs";

const { emptyFolder, CleanupError, PAGE } = await loadTs(
  "supabase/functions/_shared/account-cleanup.ts",
);
after(closeTs);

/** Storage falso em memória: caminhos "pasta/sub/arquivo". */
function fakeStorage(paths, { failList, failRemove, keep } = {}) {
  const files = new Set(paths);
  return {
    files,
    async list(prefix, { limit, offset }) {
      if (failList) return { data: null, error: { message: "list falhou" } };
      const children = new Map();
      for (const f of files) {
        if (!f.startsWith(prefix + "/")) continue;
        const rest = f.slice(prefix.length + 1);
        const [first, ...more] = rest.split("/");
        children.set(first, more.length ? null : "id-" + first);
      }
      const items = [...children].sort().map(([name, id]) => ({ name, id }));
      return { data: items.slice(offset, offset + limit), error: null };
    },
    async remove(batch) {
      if (failRemove) return { data: null, error: { message: "remove falhou" } };
      for (const p of batch) if (!keep?.includes(p)) files.delete(p);
      return { data: batch, error: null };
    },
  };
}

test("apaga arquivos e subpastas e confirma que ficou vazio", async () => {
  const st = fakeStorage(["u1/a.jpg", "u1/docs/b.pdf", "u1/docs/x/c.png", "u2/nao.jpg"]);
  assert.equal(await emptyFolder(st, "patient-files", "u1"), 3);
  assert.deepEqual([...st.files], ["u2/nao.jpg"]);
});

test("pagina quando há mais de 1000 arquivos", async () => {
  const many = Array.from(
    { length: PAGE * 2 + 37 },
    (_, i) => `u1/f${String(i).padStart(5, "0")}.jpg`,
  );
  const st = fakeStorage(many);
  assert.equal(await emptyFolder(st, "avatars", "u1"), many.length);
  assert.equal(st.files.size, 0);
});

test("erro ao listar interrompe (antes ia em frente como se não houvesse nada)", async () => {
  const st = fakeStorage(["u1/a.jpg"], { failList: true });
  await assert.rejects(emptyFolder(st, "avatars", "u1"), CleanupError);
});

test("erro ao apagar interrompe", async () => {
  const st = fakeStorage(["u1/a.jpg"], { failRemove: true });
  await assert.rejects(emptyFolder(st, "avatars", "u1"), /apagar/);
});

test("se algo continuar lá depois de apagar, não dá como concluído", async () => {
  const st = fakeStorage(["u1/a.jpg", "u1/b.jpg"], { keep: ["u1/b.jpg"] });
  await assert.rejects(emptyFolder(st, "avatars", "u1"), /conferir/);
});

test("nova tentativa depois de falha parcial continua de onde parou", async () => {
  const st = fakeStorage(["u1/a.jpg", "u1/b.jpg"], { keep: ["u1/b.jpg"] });
  await assert.rejects(emptyFolder(st, "avatars", "u1"));
  const retry = fakeStorage([...st.files]);
  assert.equal(await emptyFolder(retry, "avatars", "u1"), 1);
  assert.equal(retry.files.size, 0);
});
