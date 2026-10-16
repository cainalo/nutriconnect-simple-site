import { createFileRoute } from "@tanstack/react-router";
import { AppScreen } from "@/components/app-screen";
import { JourneyPanel } from "@/components/journey-panel";
import { AuthGateLoading } from "@/components/site-chrome";
import { useRequireAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/parceiro")({
  head: () => ({
    meta: [
      { title: "Parceiro de jornada — NutriConnect" },
      {
        name: "description",
        content:
          "Uma dupla de apoio com um amigo: check-in diário, recado curto e uma força quando o dia pesar.",
      },
    ],
  }),
  component: ParceiroPage,
});

function ParceiroPage() {
  const { user, hydrated } = useRequireAuth();
  if (!hydrated || !user) return <AuthGateLoading />;
  return (
    <AppScreen>
      <JourneyPanel />
    </AppScreen>
  );
}
