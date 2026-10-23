// Limpeza do cache de consultas quando a conta muda no mesmo navegador (sair, entrar com outra
// conta, sessão expirada). As regras do banco (RLS) continuam sendo a barreira de acesso; isto
// garante que a tela da conta nova nunca mostre, nem por um instante, dados guardados da anterior.
import type { QueryClient } from "@tanstack/react-query";

export function resetSessionCache(queryClient: QueryClient) {
  void queryClient.cancelQueries();
  queryClient.getMutationCache().clear();
  // Consultas sem tela aberta saem do cache; as abertas voltam ao estado inicial (sem dados) e
  // buscam de novo já com a sessão nova.
  queryClient.removeQueries({ type: "inactive" });
  void queryClient.resetQueries({ type: "active" });
}

export type IdentityListener = (previous: string | null, next: string | null) => void;

/**
 * Acompanha o ID de quem está logado e avisa quando ele muda. A primeira leitura da sessão não
 * conta como troca (não havia ninguém antes dela, só "ainda não sei").
 */
export function createIdentityTracker() {
  const listeners = new Set<IdentityListener>();
  /** undefined = a sessão ainda não foi lida; null = ninguém logado. */
  let last: string | null | undefined;
  return {
    update(next: string | null) {
      if (last !== undefined && last !== next) {
        const previous = last;
        listeners.forEach((listener) => listener(previous, next));
      }
      last = next;
    },
    subscribe(listener: IdentityListener): () => void {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
