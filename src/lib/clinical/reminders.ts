// X2 — Lembretes de consulta e de exames. Os avisos saem do banco (send_care_reminders, a cada
// 10 min: consulta 24 h e 1 h antes, exame 24 h antes) como notificações, que também viram push.
// Aqui: confirmar presença e a lista de exames. Banco: 20261017140000_care_reminders.sql.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { demoActive } from "@/lib/clinical/demo";

export type ExamReminder = Tables<"exam_reminders">;

const KEY = ["exam-reminders"] as const;
let demoExams: ExamReminder[] = [];

/** Pode confirmar presença: consulta marcada, ainda não começou e começa em até 2 dias. */
export function canConfirmAttendance(
  a: { status: string; starts_at: string; patient_confirmed_at?: string | null },
  now = Date.now(),
) {
  const start = new Date(a.starts_at).getTime();
  return (
    ["agendada", "confirmada"].includes(a.status) &&
    !a.patient_confirmed_at &&
    start > now &&
    start - now <= 48 * 3_600_000
  );
}

export async function confirmAttendance(appointmentId: string) {
  const { error } = await supabase.rpc("confirm_attendance", { p_appointment: appointmentId });
  if (error) throw error;
}

async function listExams(patientId: string): Promise<ExamReminder[]> {
  if (demoActive()) return demoExams.filter((e) => e.patient_id === patientId);
  const { data, error } = await supabase
    .from("exam_reminders")
    .select("*")
    .eq("patient_id", patientId)
    .order("due_at", { ascending: true });
  // Sem a migration aplicada, a lista fica vazia (o resto da página segue funcionando).
  if (error) return [];
  return data ?? [];
}

export function useExams(patientId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, patientId ?? ""],
    queryFn: () => listExams(patientId!),
    enabled: !!patientId,
  });
}

export function useSaveExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      id?: string;
      patientId: string;
      requestedBy: string | null;
      title: string;
      dueAt: string;
      location: string;
      notes: string;
    }) => {
      const row = {
        patient_id: v.patientId,
        requested_by: v.requestedBy,
        title: v.title.trim(),
        due_at: v.dueAt,
        location: v.location.trim() || null,
        notes: v.notes.trim() || null,
      };
      if (demoActive()) {
        const rest = demoExams.filter((e) => e.id !== v.id);
        demoExams = [
          ...rest,
          {
            id: v.id ?? crypto.randomUUID(),
            ...row,
            done_at: null,
            reminded_at: null,
            created_at: new Date().toISOString(),
          },
        ];
        return;
      }
      const { error } = v.id
        ? await supabase
            .from("exam_reminders")
            .update({
              title: row.title,
              due_at: row.due_at,
              location: row.location,
              notes: row.notes,
            })
            .eq("id", v.id)
        : await supabase.from("exam_reminders").insert(row);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useToggleExamDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; done: boolean }) => {
      const done_at = v.done ? new Date().toISOString() : null;
      if (demoActive()) {
        demoExams = demoExams.map((e) => (e.id === v.id ? { ...e, done_at } : e));
        return;
      }
      const { error } = await supabase.from("exam_reminders").update({ done_at }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (demoActive()) {
        demoExams = demoExams.filter((e) => e.id !== id);
        return;
      }
      const { error } = await supabase.from("exam_reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
