// Habilitação para teleconsulta (M4, Resolução CFN 760/2023): o profissional envia o cadastro do
// conselho (e-Nutricionista, e-Psi...) e o comprovante; a administração aprova. Com a exigência
// ligada, só profissionais aprovados atendem online (o banco recusa as outras consultas online).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type TeleconsultCheck = Tables<"teleconsult_checks">;
export type Registry = "e-nutricionista" | "e-psi" | "outro";

export const REGISTRY_LABEL: Record<Registry, string> = {
  "e-nutricionista": "e-Nutricionista (CFN)",
  "e-psi": "e-Psi (CFP)",
  outro: "Outro cadastro do conselho",
};

const fail = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

export const teleKeys = {
  all: ["teleconsult"] as const,
  mine: (id: string) => ["teleconsult", "mine", id] as const,
  required: () => ["teleconsult", "required"] as const,
  allowed: (pro: string) => ["teleconsult", "allowed", pro] as const,
  badge: (pro: string) => ["teleconsult", "badge", pro] as const,
  admin: () => ["teleconsult", "admin"] as const,
};

/** Situação do próprio profissional: aprovado desde quando e o pedido mais recente. */
export function useMyTeleconsult(userId: string | undefined) {
  return useQuery({
    queryKey: teleKeys.mine(userId ?? ""),
    enabled: !!userId,
    retry: false,
    queryFn: async () => {
      const [pro, checks] = await Promise.all([
        supabase
          .from("professionals")
          .select("teleconsult_approved_at")
          .eq("user_id", userId!)
          .maybeSingle(),
        supabase
          .from("teleconsult_checks")
          .select("*")
          .eq("professional_id", userId!)
          .order("submitted_at", { ascending: false })
          .limit(1),
      ]);
      fail(pro.error);
      fail(checks.error);
      return {
        approvedAt: pro.data?.teleconsult_approved_at ?? null,
        latest: (checks.data?.[0] as TeleconsultCheck | undefined) ?? null,
      };
    },
  });
}

export function useSubmitTeleconsult(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      registry,
      number,
      file,
    }: {
      registry: Registry;
      number: string;
      file: File;
    }) => {
      if (file.size > 10 * 1024 * 1024) throw new Error("O comprovante pode ter até 10 MB.");
      const ext =
        file.type === "application/pdf"
          ? "pdf"
          : file.type === "image/png"
            ? "png"
            : file.type === "image/webp"
              ? "webp"
              : "jpg";
      const path = `${userId}/${Date.now()}-teleconsulta.${ext}`;
      const up = await supabase.storage
        .from("verification-docs")
        .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
      fail(up.error);
      const { error } = await supabase.rpc("teleconsult_submit", {
        p_registry: registry,
        p_number: number.trim(),
        p_document_path: path,
      });
      fail(error);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: teleKeys.all }),
  });
}

/** A administração exige a habilitação para atender online? (sem a migration: não) */
export function useTeleconsultRequired() {
  return useQuery({
    queryKey: teleKeys.required(),
    retry: false,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("teleconsult_required");
      if (error) return false;
      return !!data;
    },
  });
}

/** O profissional pode receber consulta online agora? (sem a migration: pode) */
export function useProOnlineAllowed(proId: string | undefined) {
  return useQuery({
    queryKey: teleKeys.allowed(proId ?? ""),
    enabled: !!proId,
    retry: false,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("pro_online_allowed", { p_pro: proId! });
      if (error) return true;
      return !!data;
    },
  });
}

/** Selo "Teleconsulta verificada" no perfil do profissional. */
export function useTeleconsultBadge(proId: string | undefined) {
  return useQuery({
    queryKey: teleKeys.badge(proId ?? ""),
    enabled: !!proId,
    retry: false,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("teleconsult_approved_at")
        .eq("user_id", proId!)
        .maybeSingle();
      if (error) return false;
      return !!data?.teleconsult_approved_at;
    },
  });
}

// ── Administração ───────────────────────────────────────────────────────────

export interface AdminTeleconsultCheck extends TeleconsultCheck {
  documentUrl: string | null;
}

export function useAdminTeleconsultChecks(enabled = true) {
  return useQuery({
    queryKey: teleKeys.admin(),
    enabled,
    retry: false,
    queryFn: async (): Promise<AdminTeleconsultCheck[]> => {
      const { data, error } = await supabase
        .from("teleconsult_checks")
        .select("*")
        .order("submitted_at", { ascending: false })
        .limit(100);
      fail(error);
      const rows = data ?? [];
      const urls = await Promise.all(
        rows.map(async (r) =>
          r.status === "em_analise"
            ? ((
                await supabase.storage
                  .from("verification-docs")
                  .createSignedUrl(r.document_path, 600)
              ).data?.signedUrl ?? null)
            : null,
        ),
      );
      return rows.map((r, i) => ({ ...r, documentUrl: urls[i] }));
    },
  });
}

export function useReviewTeleconsult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      approve,
      reason,
    }: {
      id: string;
      approve: boolean;
      reason?: string;
    }) => {
      const { error } = await supabase.rpc("admin_review_teleconsult", {
        p_check: id,
        p_approve: approve,
        p_reason: reason,
      });
      fail(error);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: teleKeys.all }),
  });
}

export function useSetTeleconsultRequired() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (on: boolean) => {
      const { error } = await supabase.rpc("admin_set_site_config", {
        p_key: "site_teleconsult_required",
        p_value: on,
      });
      fail(error);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: teleKeys.all }),
  });
}
