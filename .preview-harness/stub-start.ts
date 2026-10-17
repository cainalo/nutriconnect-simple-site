// Bancada: funções de servidor viram chamadas vazias (nada sai do navegador).
const builder: any = new Proxy(function () {}, {
  get: (_t, p) => (p === "handler" ? () => async () => ({}) : () => builder),
  apply: () => builder,
});
export const createServerFn = () => builder;
export const createMiddleware = () => builder;
export const createStart = () => ({});
export const getRequest = () => new Request("http://localhost/");
