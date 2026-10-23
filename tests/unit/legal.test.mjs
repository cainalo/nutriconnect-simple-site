// NC-LEGAL-003: o site não se declara pronto para lançamento com dados legais vazios.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { loadTs, closeTs } from "../load-ts.mjs";

const { missingLegalFields } = await loadTs("src/lib/legal.ts");
after(closeTs);

test("aponta cada campo legal vazio ou só com espaços", () => {
  assert.deepEqual(
    missingLegalFields({ legalName: "", cnpj: " ", address: "Rua X", dpoName: "" }),
    ["legalName", "cnpj", "dpoName"],
  );
});

test("não aponta nada quando todos os campos estão preenchidos", () => {
  assert.deepEqual(
    missingLegalFields({ legalName: "Empresa", cnpj: "1", address: "Rua", dpoName: "Pessoa" }),
    [],
  );
});
