import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DiaryComposer, DiaryFeed } from "@/components/clinical/diary";
import { SymptomsPanel } from "@/components/clinical/symptoms-panel";
import { PageHeader, Tabs } from "@/components/clinical/ui";
import { useTr } from "@/components/settings-ui";
import { useAuth } from "@/hooks/use-auth";
import { useClinicalI18n } from "@/lib/clinical/i18n";

export const Route = createFileRoute("/acompanhamento/diario")({
  validateSearch: (search: Record<string, unknown>): { aba?: "sintomas" } => ({
    aba: search.aba === "sintomas" ? "sintomas" : undefined,
  }),
  component: PatientDiaryPage,
});

function PatientDiaryPage() {
  const { user } = useAuth();
  const { t } = useClinicalI18n();
  const tr = useTr();
  const { aba } = Route.useSearch();
  const [tab, setTab] = useState<"refeicoes" | "sintomas">(aba ?? "refeicoes");
  if (!user) return null;
  return (
    <>
      <PageHeader title={t("diary.title")} subtitle={t("diary.subtitle")} />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "refeicoes", label: tr(["Refeições", "Meals", "Comidas", "Repas"]) },
          { value: "sintomas", label: tr(["Sintomas", "Symptoms", "Síntomas", "Symptômes"]) },
        ]}
      />
      {tab === "refeicoes" ? (
        <div className="space-y-6">
          <DiaryComposer patientId={user.id} />
          <DiaryFeed patientId={user.id} meId={user.id} canComment isOwner />
        </div>
      ) : (
        <SymptomsPanel patientId={user.id} canEdit />
      )}
    </>
  );
}
