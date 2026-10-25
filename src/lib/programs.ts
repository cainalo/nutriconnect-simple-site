// Loja de programas dos profissionais (N10): vitrine, compra (Stripe, pagamento único), módulos
// com progresso para quem comprou e a gestão do profissional. As regras moram no banco.
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Program = Tables<"pro_programs">;
export type ProgramModule = Tables<"program_modules">;

export const PROGRAM_EMOJIS = ["🥗", "🥕", "🍎", "🥑", "🍲", "🧺", "💪", "🧘", "🌱", "🍳"];

const fail = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

export const programKeys = {
  all: ["programs"] as const,
  store: () => ["programs", "store"] as const,
  ofPro: (proId: string) => ["programs", "pro", proId] as const,
  one: (id: string) => ["programs", "one", id] as const,
  modules: (id: string) => ["programs", "modules", id] as const,
  progress: (id: string) => ["programs", "progress", id] as const,
  owned: (userId: string) => ["programs", "owned", userId] as const,
  sales: () => ["programs", "sales"] as const,
};

/** Programas à venda (a vitrine respeita bloqueios no banco). */
export function useProgramStore() {
  return useQuery({
    queryKey: programKeys.store(),
    retry: false,
    queryFn: async (): Promise<Program[]> => {
      const { data, error } = await supabase
        .from("pro_programs")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(100);
      fail(error);
      return data ?? [];
    },
  });
}

/** Programas de um profissional: os à venda (ou todos, para o próprio profissional). */
export function useProPrograms(proId: string | undefined, onlyActive = true) {
  return useQuery({
    queryKey: [...programKeys.ofPro(proId ?? ""), onlyActive],
    enabled: !!proId,
    retry: false,
    queryFn: async (): Promise<Program[]> => {
      let q = supabase.from("pro_programs").select("*").eq("professional_id", proId!);
      if (onlyActive) q = q.eq("active", true);
      const { data, error } = await q.order("created_at", { ascending: true });
      fail(error);
      return data ?? [];
    },
  });
}

export function useProgram(id: string) {
  return useQuery({
    queryKey: programKeys.one(id),
    retry: false,
    queryFn: async (): Promise<Program | null> => {
      const { data, error } = await supabase
        .from("pro_programs")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      fail(error);
      return data;
    },
  });
}

/** Módulos (só aparecem para quem comprou e para o dono). */
export function useProgramModules(id: string | undefined) {
  return useQuery({
    queryKey: programKeys.modules(id ?? ""),
    enabled: !!id,
    queryFn: async (): Promise<ProgramModule[]> => {
      const { data, error } = await supabase
        .from("program_modules")
        .select("*")
        .eq("program_id", id!)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      fail(error);
      return data ?? [];
    },
  });
}

export function useHasProgram(id: string, userId: string | undefined) {
  return useQuery({
    queryKey: [...programKeys.one(id), "has", userId ?? ""],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_program", { p_program: id });
      fail(error);
      return !!data;
    },
  });
}

/** Programas comprados pela pessoa. */
export function useOwnedPrograms(userId: string | undefined) {
  return useQuery({
    queryKey: programKeys.owned(userId ?? ""),
    enabled: !!userId,
    retry: false,
    queryFn: async (): Promise<Program[]> => {
      const { data: bought, error } = await supabase
        .from("program_purchases")
        .select("program_id")
        .eq("buyer_id", userId!)
        .eq("status", "paga");
      fail(error);
      const ids = (bought ?? []).map((b) => b.program_id);
      if (!ids.length) return [];
      const { data, error: err } = await supabase.from("pro_programs").select("*").in("id", ids);
      fail(err);
      return data ?? [];
    },
  });
}

/** Módulos concluídos pela pessoa neste programa. */
export function useProgramProgress(moduleIds: string[]) {
  const sorted = [...moduleIds].sort();
  return useQuery({
    queryKey: [...programKeys.all, "progress", ...sorted],
    enabled: sorted.length > 0,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("program_progress")
        .select("module_id")
        .in("module_id", sorted);
      fail(error);
      return new Set((data ?? []).map((r) => r.module_id));
    },
  });
}

export function useToggleModuleDone(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ moduleId, done }: { moduleId: string; done: boolean }) => {
      const { error } = done
        ? await supabase.from("program_progress").insert({ user_id: userId!, module_id: moduleId })
        : await supabase.from("program_progress").delete().eq("module_id", moduleId);
      fail(error);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [...programKeys.all, "progress"] }),
  });
}

export function useProgramSales(enabled = true) {
  return useQuery({
    queryKey: programKeys.sales(),
    enabled,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_program_sales", { p_days: 30 });
      fail(error);
      return data?.[0] ?? { sales: 0, gross_cents: 0, fee_cents: 0, net_cents: 0 };
    },
  });
}

function useProgramMutation<T, R = unknown>(fn: (arg: T) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => qc.invalidateQueries({ queryKey: programKeys.all }),
  });
}

export interface ProgramInput {
  id: string | null;
  title: string;
  summary: string;
  description: string;
  priceCents: number;
  weeks: number;
  emoji: string;
  active: boolean;
}

export function useSaveProgram() {
  return useProgramMutation(async (p: ProgramInput): Promise<Program> => {
    const { data, error } = await supabase.rpc("save_program", {
      p_id: p.id,
      p_title: p.title,
      p_summary: p.summary,
      p_description: p.description,
      p_price_cents: p.priceCents,
      p_weeks: p.weeks,
      p_emoji: p.emoji,
      p_active: p.active,
    });
    fail(error);
    return data as Program;
  });
}

export function useSaveModule(programId: string) {
  return useProgramMutation(
    async (m: { id: string | null; title: string; body: string; position: number | null }) => {
      const { error } = await supabase.rpc("save_program_module", {
        p_program: programId,
        p_id: m.id,
        p_title: m.title,
        p_body: m.body,
        p_position: m.position,
      });
      fail(error);
    },
  );
}

export function useDeleteModule() {
  return useProgramMutation(async (moduleId: string) => {
    const { error } = await supabase.rpc("delete_program_module", { p_module: moduleId });
    fail(error);
  });
}

/** Abre o pagamento do programa (formulário do Stripe embutido). */
export async function createProgramCheckout(
  programId: string,
  /** Código de desconto das recompensas (opcional). */
  redemptionId?: string,
): Promise<{ clientSecret: string; publishableKey: string }> {
  const { data, error } = await supabase.functions.invoke<{
    clientSecret?: string;
    publishableKey?: string;
  }>("program-checkout", {
    body: { programId, origin: window.location.origin, redemptionId },
  });
  if (error) {
    let message = "Não foi possível abrir o pagamento. Tente de novo em instantes.";
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      if (payload?.error) message = payload.error;
    }
    throw new Error(message);
  }
  if (!data?.clientSecret || !data.publishableKey) {
    throw new Error("Não foi possível abrir o pagamento.");
  }
  return { clientSecret: data.clientSecret, publishableKey: data.publishableKey };
}
