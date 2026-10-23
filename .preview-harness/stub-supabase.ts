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
      get_care_invite: [
        { code: "ABC123", professional_id: PRO, professional_name: "Ana Paula Reis", invitee_name: "Maria", valid: true },
      ],
      event_questions_list: [
        { id: "q1", author_id: "f1", body: "Dá para trocar o arroz branco pelo integral sem mudar o tempo de cozimento?", votes: 4, voted: false, pinned: true, hidden: false, answer: "Dá sim: deixe de molho 30 min e aumente um pouco a água.", answered_at: "2026-10-18T12:00:00Z", created_at: "2026-10-18T11:00:00Z" },
        { id: "q2", author_id: "u1", body: "Qual a melhor fruta para levar na lancheira das crianças?", votes: 1, voted: false, pinned: false, hidden: false, answer: null, answered_at: null, created_at: "2026-10-18T11:10:00Z" },
        { id: "q3", author_id: "f2", body: "Pão de fermentação natural é mais leve?", votes: 2, voted: true, pinned: false, hidden: false, answer: null, answered_at: null, created_at: "2026-10-18T11:20:00Z" },
      ],
      reward_balance: 480,
      reward_week_preview: 120,
    }
  : {};
// Tabelas com dados de exemplo (&fx=1).
const TABLES: Record<string, unknown> = fx
  ? {
      professional_directory: [
        { id: PRO, name: "Ana Paula Reis", avatar_url: null, profession: "Nutricionista", council: "CRN", registration: "12345", uf: "SP", verified_at: "2026-09-01T00:00:00Z", headline: null, bio: null, specialties: [], accepting_patients: true },
      ],
      community_events: [
        { id: "ev1", community_id: "cm1", host_id: "f9", title: "Lancheira saudável sem gastar muito", description: "Perguntas ao vivo com a nutricionista da comunidade.", starts_at: "2099-01-10T22:00:00Z", duration_min: 60, canceled: false, created_at: "2026-10-18T00:00:00Z", communities: { slug: "lancheira", name: "Lancheira" } },
      ],
      rewards: [
        { id: "rw1", kind: "desconto_programa", title: "10% de desconto num programa da Loja", description: "Vale para um programa de qualquer profissional. O desconto sai da taxa do NutriConnect: o profissional recebe o mesmo valor.", cost: 600, discount_percent: 10, partner_id: null, stock: null, valid_days: 60, active: true, position: 0, created_at: "2026-10-18T00:00:00Z" },
        { id: "rw2", kind: "brinde_parceiro", title: "Kit de temperos do Empório", description: "Retire na loja parceira com o código.", cost: 400, discount_percent: null, partner_id: null, stock: 12, valid_days: 30, active: true, position: 1, created_at: "2026-10-18T00:00:00Z" },
      ],
      reward_redemptions: [
        { id: "rd1", user_id: "u1", reward_id: "rw2", cost: 400, code: "NC-7F3A9C21", status: "ativo", used_at: null, used_ref: null, expires_at: "2099-11-17T00:00:00Z", created_at: "2026-10-12T00:00:00Z", rewards: { title: "Kit de temperos do Empório", kind: "brinde_parceiro", discount_percent: null, description: "" } },
      ],
      reward_points: [
        { id: 3, user_id: "u1", delta: -400, reason: "resgate", ref: "rd1", note: null, created_at: "2026-10-12T00:00:00Z" },
        { id: 2, user_id: "u1", delta: 50, reason: "desafio", ref: "c1", note: null, created_at: "2026-10-12T00:00:00Z" },
        { id: 1, user_id: "u1", delta: 830, reason: "semana", ref: "2026-10-05", note: null, created_at: "2026-10-12T00:00:00Z" },
      ],
    }
  : {};

function make(data: unknown): any {
  const c: any = new Proxy(function () {}, {
    get: (_t, p) =>
      p === "then"
        ? (r: any) => r({ data, error: null })
        : // .single()/.maybeSingle() devolvem a primeira linha, como no Supabase.
          (p === "single" || p === "maybeSingle") && Array.isArray(data)
          ? () => make(data[0] ?? null)
          : c,
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
        : p === "from"
          ? (name: string) => make(name in TABLES ? TABLES[name] : [])
          : empty[p as any],
  apply: () => empty,
});
