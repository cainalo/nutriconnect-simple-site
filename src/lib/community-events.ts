// Eventos ao vivo nas comunidades (M8): "Pergunte à nutri". O profissional da comunidade marca o
// evento; membros perguntam antes e durante e votam; o profissional responde e fixa. Perguntas e
// votos chegam em tempo real. As regras (quem vê, quem pergunta, limites) moram no banco.
import { useEffect, useId } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Tables } from "@/integrations/supabase/types";

export type CommunityEvent = Tables<"community_events">;
export type EventQuestion =
  Database["public"]["Functions"]["event_questions_list"]["Returns"][number];
export type EventPhase = "agendado" | "ao_vivo" | "encerrado" | "cancelado";

export const QUESTION_MIN = 5;
export const QUESTION_MAX = 300;

const fail = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

export const eventKeys = {
  all: ["community-events"] as const,
  list: (communityId: string) => ["community-events", "list", communityId] as const,
  one: (eventId: string) => ["community-events", "one", eventId] as const,
  questions: (eventId: string) => ["community-events", "questions", eventId] as const,
};

export const endsAt = (e: CommunityEvent) =>
  new Date(new Date(e.starts_at).getTime() + e.duration_min * 60_000);

export function phaseOf(e: CommunityEvent, now = new Date()): EventPhase {
  if (e.canceled) return "cancelado";
  if (now < new Date(e.starts_at)) return "agendado";
  if (now < endsAt(e)) return "ao_vivo";
  return "encerrado";
}

/** Eventos da comunidade: os próximos e os das últimas semanas. */
export function useCommunityEvents(communityId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: eventKeys.list(communityId ?? ""),
    enabled: !!communityId && enabled,
    retry: false,
    refetchInterval: 60_000,
    queryFn: async (): Promise<CommunityEvent[]> => {
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from("community_events")
        .select("*")
        .eq("community_id", communityId!)
        .gte("starts_at", since)
        .order("starts_at", { ascending: true });
      fail(error);
      return data ?? [];
    },
  });
}

export function useCommunityEvent(eventId: string) {
  return useQuery({
    queryKey: eventKeys.one(eventId),
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_events")
        .select("*, communities(slug, name)")
        .eq("id", eventId)
        .maybeSingle();
      fail(error);
      return data as
        (CommunityEvent & { communities: { slug: string; name: string } | null }) | null;
    },
  });
}

export function useEventQuestions(eventId: string) {
  return useQuery({
    queryKey: eventKeys.questions(eventId),
    queryFn: async (): Promise<EventQuestion[]> => {
      const { data, error } = await supabase.rpc("event_questions_list", { p_event: eventId });
      fail(error);
      return data ?? [];
    },
  });
}

/** Perguntas e votos do evento ao vivo, para todos que estão na página. */
export function useEventRealtime(eventId: string) {
  const qc = useQueryClient();
  const id = useId();
  useEffect(() => {
    const reload = () => void qc.invalidateQueries({ queryKey: eventKeys.questions(eventId) });
    const filter = `event_id=eq.${eventId}`;
    const channel = supabase
      .channel(`evento-${eventId}-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "event_questions", filter },
        reload,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "event_questions", filter },
        reload,
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "event_questions" },
        reload,
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "event_question_votes", filter },
        reload,
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "event_question_votes" },
        reload,
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId, id, qc]);
}

function useEventMutation<T, R = unknown>(fn: (arg: T) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
  });
}

export function useCreateEvent() {
  return useEventMutation(
    async (v: {
      communityId: string;
      title: string;
      description: string;
      startsAt: string;
      duration: number;
    }) => {
      const { data, error } = await supabase.rpc("event_create", {
        p_community: v.communityId,
        p_title: v.title,
        p_description: v.description,
        p_starts_at: v.startsAt,
        p_duration: v.duration,
      });
      fail(error);
      return data;
    },
  );
}

export function useCancelEvent() {
  return useEventMutation(async (eventId: string) => {
    const { error } = await supabase.rpc("event_cancel", { p_event: eventId });
    fail(error);
  });
}

export function useAskQuestion(eventId: string) {
  return useEventMutation(async (body: string) => {
    const { error } = await supabase.rpc("event_ask", { p_event: eventId, p_body: body.trim() });
    fail(error);
  });
}

export function useVoteQuestion(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (questionId: string) => {
      const { error } = await supabase.rpc("event_vote", { p_question: questionId });
      fail(error);
    },
    // O voto aparece na hora.
    onMutate: (questionId) =>
      qc.setQueryData<EventQuestion[]>(eventKeys.questions(eventId), (old) =>
        old?.map((q) =>
          q.id === questionId ? { ...q, voted: !q.voted, votes: q.votes + (q.voted ? -1 : 1) } : q,
        ),
      ),
    onSettled: () => qc.invalidateQueries({ queryKey: eventKeys.questions(eventId) }),
  });
}

export function useAnswerQuestion() {
  return useEventMutation(
    async ({ questionId, answer, pin }: { questionId: string; answer: string; pin: boolean }) => {
      const { error } = await supabase.rpc("event_answer", {
        p_question: questionId,
        p_answer: answer,
        p_pin: pin,
      });
      fail(error);
    },
  );
}

export function useModerateQuestion() {
  return useEventMutation(
    async ({
      questionId,
      pinned,
      hidden,
    }: {
      questionId: string;
      pinned?: boolean;
      hidden?: boolean;
    }) => {
      const { error } = await supabase.rpc("event_moderate", {
        p_question: questionId,
        p_pinned: pinned,
        p_hidden: hidden,
      });
      fail(error);
    },
  );
}

export function useFlagQuestion() {
  return useEventMutation(async (questionId: string) => {
    const { error } = await supabase.rpc("event_flag", { p_question: questionId });
    fail(error);
  });
}

export function useDeleteQuestion() {
  return useEventMutation(async (questionId: string) => {
    const { error } = await supabase.rpc("event_delete_question", { p_question: questionId });
    fail(error);
  });
}
