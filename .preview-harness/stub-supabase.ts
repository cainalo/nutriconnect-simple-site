// Banco falso do harness: tudo devolve lista vazia, menos as funções (rpc) com dados de exemplo
// abaixo, ligados com &fx=1 na URL (para ver telas que dependem de dados, como as avaliações).
const fx = new URLSearchParams(location.search).get("fx");
const PRO = "00000000-0000-4000-a000-00000000de01";
const FIXTURES: Record<string, unknown> = fx
  ? {
      professional_rating_summaries: [
        { professional_id: PRO, average: 4.7, total: 3, r1: 0, r2: 0, r3: 0, r4: 1, r5: 2 },
      ],
      list_professional_reviews: [
        { id: "r1", rating: 5, comment: "Ela montou um plano com o que eu já comia em casa. Em um mês eu já levava marmita todo dia.", reply: "Que bom ler isso! Continue mandando as fotos no diário.", replied_at: "2026-10-10T12:00:00Z", created_at: "2026-10-09T18:00:00Z", author_name: "Juliana", author_avatar: null, mine: false },
        { id: "r2", rating: 4, comment: "Consulta atenciosa e sem julgamento. Só atrasou uns 10 minutos.", reply: null, replied_at: null, created_at: "2026-10-02T15:00:00Z", author_name: null, author_avatar: null, mine: false },
        { id: "r3", rating: 5, comment: null, reply: null, replied_at: null, created_at: "2026-09-21T10:00:00Z", author_name: "Marcos", author_avatar: null, mine: false },
      ],
    }
  : {};

function make(data: unknown): any {
  const c: any = new Proxy(function () {}, {
    get: (_t, p) => (p === "then" ? (r: any) => r({ data, error: null }) : c),
    apply: () => c,
  });
  return c;
}
const empty = make([]);
export const supabase: any = new Proxy(function () {}, {
  get: (_t, p) =>
    p === "then"
      ? undefined
      : p === "rpc"
        ? (name: string) => make(name in FIXTURES ? FIXTURES[name] : [])
        : empty[p as any],
  apply: () => empty,
});
