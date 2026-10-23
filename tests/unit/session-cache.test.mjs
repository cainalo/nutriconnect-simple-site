// NC-SEC-018: ao trocar de conta no mesmo navegador, nenhum dado da sessão anterior pode ficar no
// cache de consultas (nem aparecer por um instante na tela da conta nova).
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { loadTs, closeTs } from "../load-ts.mjs";

const { resetSessionCache, createIdentityTracker } = await loadTs("src/lib/session-cache.ts");
after(closeTs);

const PRONTUARIO = ["clinical", "patientPrivate", "paciente-sintetico-A"];

test("troca de conta tira do cache os dados que ninguém está vendo", () => {
  const qc = new QueryClient();
  qc.setQueryData(PRONTUARIO, { alergias: "dado sintético da conta A" });
  resetSessionCache(qc);
  assert.equal(qc.getQueryData(PRONTUARIO), undefined);
});

test("consulta aberta na tela volta sem dados e busca de novo com a sessão nova", async () => {
  const qc = new QueryClient();
  let sessao = "A";
  const queryFn = async () => ({ dono: sessao });
  await qc.fetchQuery({ queryKey: PRONTUARIO, queryFn });
  const observer = new QueryObserver(qc, { queryKey: PRONTUARIO, queryFn, staleTime: Infinity });
  const vistos = [];
  const stop = observer.subscribe((r) => vistos.push(r.data?.dono));
  assert.equal(observer.getCurrentResult().data.dono, "A");

  sessao = "B";
  resetSessionCache(qc);
  // Logo depois da troca a tela já não tem o dado de A.
  assert.notEqual(observer.getCurrentResult().data?.dono, "A");
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(observer.getCurrentResult().data.dono, "B");
  // Em nenhum momento depois da troca o dado de A foi entregue à tela.
  assert.ok(!vistos.includes("A"), `a tela recebeu dado da conta anterior: ${vistos}`);
  stop();
});

test("se a busca nova falhar, a tela fica sem dados (não volta ao dado da conta anterior)", async () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await qc.fetchQuery({ queryKey: PRONTUARIO, queryFn: async () => ({ dono: "A" }) });
  const observer = new QueryObserver(qc, {
    queryKey: PRONTUARIO,
    queryFn: async () => {
      throw new Error("sem rede");
    },
    staleTime: Infinity,
  });
  const stop = observer.subscribe(() => {});
  resetSessionCache(qc);
  await new Promise((r) => setTimeout(r, 20));
  const r = observer.getCurrentResult();
  assert.equal(r.data, undefined);
  assert.equal(r.status, "error");
  stop();
});

test("o aviso de troca de conta só dispara quando o ID muda de verdade", () => {
  const t = createIdentityTracker();
  const trocas = [];
  t.subscribe((a, b) => trocas.push(`${a}->${b}`));
  t.update("A"); // primeira leitura da sessão: não é troca
  t.update("A"); // mesma conta (ex.: perfil recarregado)
  t.update(null); // saiu
  t.update("B"); // entrou outra conta
  t.update("C"); // trocou direto
  assert.deepEqual(trocas, ["A->null", "null->B", "B->C"]);
});
