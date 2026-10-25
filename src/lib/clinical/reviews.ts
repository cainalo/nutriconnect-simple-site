// Avaliações verificadas dos profissionais (P1). Regras no banco:
// supabase/migrations/20261017120000_professional_reviews.sql. Só quem teve a consulta avalia.
// Se a migration ainda não estiver aplicada, as leituras voltam vazias (o site segue funcionando).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_PRO, demoActive } from "@/lib/clinical/demo";

export interface RatingSummary {
  average: number;
  total: number;
  /** Quantidade de avaliações com 1, 2, 3, 4 e 5 estrelas. */
  counts: [number, number, number, number, number];
}

export interface ProReview {
  id: string;
  rating: number;
  comment: string | null;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
  authorName: string | null;
  authorAvatar: string | null;
  mine: boolean;
}

export interface MyReview {
  id: string;
  appointmentId: string;
  rating: number;
  comment: string | null;
  anonymous: boolean;
}

const KEY = ["pro-reviews"] as const;

// Modo demonstração (admin): avaliações de exemplo do profissional de demonstração, só na memória.
const DEMO_REVIEWS: ProReview[] = [
  {
    id: "demo-r1",
    rating: 5,
    comment:
      "Ela montou um plano com o que eu já comia em casa. Em um mês eu já estava levando marmita todo dia.",
    reply: "Que bom ler isso! Continue mandando as fotos das marmitas no diário.",
    repliedAt: "2026-10-10T12:00:00Z",
    createdAt: "2026-10-09T18:00:00Z",
    authorName: "Juliana",
    authorAvatar: null,
    mine: false,
  },
  {
    id: "demo-r2",
    rating: 4,
    comment: "Consulta atenciosa e sem julgamento. Só atrasou uns 10 minutos.",
    reply: null,
    repliedAt: null,
    createdAt: "2026-10-02T15:00:00Z",
    authorName: null,
    authorAvatar: null,
    mine: false,
  },
  {
    id: "demo-r3",
    rating: 5,
    comment: null,
    reply: null,
    repliedAt: null,
    createdAt: "2026-09-21T10:00:00Z",
    authorName: "Marcos",
    authorAvatar: null,
    mine: false,
  },
];
const demoMine = new Map<string, MyReview>();

function summarize(list: { rating: number }[]): RatingSummary {
  const counts: RatingSummary["counts"] = [0, 0, 0, 0, 0];
  for (const r of list) counts[r.rating - 1]++;
  const avg = list.reduce((t, r) => t + r.rating, 0) / (list.length || 1);
  return { average: Math.round(avg * 10) / 10, total: list.length, counts };
}

async function fetchSummaries(): Promise<Map<string, RatingSummary>> {
  if (demoActive()) {
    return new Map([[DEMO_PRO, summarize([...DEMO_REVIEWS, ...demoMine.values()])]]);
  }
  const { data, error } = await supabase.rpc("professional_rating_summaries");
  if (error || !data) return new Map();
  return new Map(
    data.map((r) => [
      r.professional_id,
      {
        average: Number(r.average),
        total: r.total,
        counts: [r.r1, r.r2, r.r3, r.r4, r.r5],
      },
    ]),
  );
}

async function fetchReviews(proId: string, limit: number): Promise<ProReview[]> {
  if (demoActive()) {
    if (proId !== DEMO_PRO) return [];
    const mine: ProReview[] = [...demoMine.values()].map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      reply: null,
      repliedAt: null,
      createdAt: new Date().toISOString(),
      authorName: r.anonymous ? null : "Você",
      authorAvatar: null,
      mine: true,
    }));
    return [...mine, ...DEMO_REVIEWS].slice(0, limit);
  }
  const { data, error } = await supabase.rpc("list_professional_reviews", {
    p_professional: proId,
    p_limit: limit,
  });
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    reply: r.reply,
    repliedAt: r.replied_at,
    createdAt: r.created_at,
    authorName: r.author_name,
    authorAvatar: r.author_avatar,
    mine: r.mine,
  }));
}

async function fetchMine(userId: string): Promise<Map<string, MyReview>> {
  if (demoActive()) return new Map(demoMine);
  const { data, error } = await supabase
    .from("professional_reviews")
    .select("id, appointment_id, rating, comment, anonymous")
    .eq("patient_id", userId);
  if (error || !data) return new Map();
  return new Map(
    data.map((r) => [
      r.appointment_id,
      {
        id: r.id,
        appointmentId: r.appointment_id,
        rating: r.rating,
        comment: r.comment,
        anonymous: r.anonymous,
      },
    ]),
  );
}

/** Média e total de todos os profissionais (uma chamada só, para a busca). */
export function useRatingSummaries() {
  return useQuery({
    queryKey: [...KEY, "summaries"],
    queryFn: fetchSummaries,
    staleTime: 5 * 60_000,
  });
}

export function useProReviews(proId: string | undefined, limit = 20) {
  return useQuery({
    queryKey: [...KEY, "list", proId ?? "", limit],
    queryFn: () => fetchReviews(proId!, limit),
    enabled: !!proId,
  });
}

/** Avaliações que a pessoa já fez, por consulta. */
export function useMyReviews(userId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, "mine", userId ?? ""],
    queryFn: () => fetchMine(userId!),
    enabled: !!userId,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: KEY });
}

export function useSubmitReview() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (v: {
      appointmentId: string;
      rating: number;
      comment: string;
      anonymous: boolean;
    }) => {
      if (demoActive()) {
        demoMine.set(v.appointmentId, {
          id: `demo-mine-${v.appointmentId}`,
          appointmentId: v.appointmentId,
          rating: v.rating,
          comment: v.comment.trim() || null,
          anonymous: v.anonymous,
        });
        return;
      }
      const { error } = await supabase.rpc("submit_professional_review", {
        p_appointment: v.appointmentId,
        p_rating: v.rating,
        p_comment: v.comment,
        p_anonymous: v.anonymous,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteReview() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      if (demoActive()) {
        for (const [k, r] of demoMine) if (r.id === id) demoMine.delete(k);
        return;
      }
      const { error } = await supabase.from("professional_reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useReplyReview() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (v: { reviewId: string; reply: string }) => {
      if (demoActive()) {
        const r = DEMO_REVIEWS.find((x) => x.id === v.reviewId);
        if (r) {
          r.reply = v.reply.trim() || null;
          r.repliedAt = r.reply ? new Date().toISOString() : null;
        }
        return;
      }
      const { error } = await supabase.rpc("reply_professional_review", {
        p_review: v.reviewId,
        p_reply: v.reply,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Consulta que já pode ser avaliada (mesma regra do banco: até 90 dias depois do fim). */
export function isReviewable(a: { status: string; ends_at: string }, now = Date.now()) {
  const end = new Date(a.ends_at).getTime();
  const done =
    a.status === "realizada" || (["agendada", "confirmada"].includes(a.status) && end < now);
  return done && end > now - 90 * 86_400_000;
}
