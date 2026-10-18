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
      friends_weekly_league: [
        { user_id: "f1", name: "Juliana Prado", username: "ju", avatar_url: null, points: 17, agua: 5, verduras: 4, caseira: 3, mover: 2, calma: 1, trilha: 2, is_me: false },
        { user_id: "u1", name: "Maria Silva", username: "maria", avatar_url: null, points: 12, agua: 4, verduras: 3, caseira: 2, mover: 1, calma: 0, trilha: 2, is_me: true },
        { user_id: "f2", name: "Marcos Lima", username: "marcos", avatar_url: null, points: 9, agua: 3, verduras: 2, caseira: 2, mover: 1, calma: 1, trilha: 0, is_me: false },
        { user_id: "f3", name: "Ana Costa", username: "ana", avatar_url: null, points: 4, agua: 2, verduras: 1, caseira: 1, mover: 0, calma: 0, trilha: 0, is_me: false },
      ],
      my_friend_challenges: [
        { id: "c1", metric: "agua", target: 5, title: "Turma da água", week_start: "2099-01-01", creator_id: "u1", my_status: "aceito", members: [
          { user_id: "u1", name: "Maria Silva", avatar_url: null, status: "aceito", days: 4, is_me: true },
          { user_id: "f1", name: "Juliana Prado", avatar_url: null, status: "aceito", days: 5, is_me: false },
          { user_id: "f2", name: "Marcos Lima", avatar_url: null, status: "convidado", days: 0, is_me: false },
        ] },
        { id: "c2", metric: "verduras", target: 4, title: null, week_start: "2099-01-01", creator_id: "f3", my_status: "convidado", members: [
          { user_id: "f3", name: "Ana Costa", avatar_url: null, status: "aceito", days: 1, is_me: false },
        ] },
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
