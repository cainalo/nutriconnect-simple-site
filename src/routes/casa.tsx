import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppScreen } from "@/components/app-screen";
import { AuthGateLoading } from "@/components/site-chrome";
import { useRequireAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/casa")({
  head: () => ({
    meta: [
      { title: "Minha casa — NutriConnect" },
      {
        name: "description",
        content:
          "Grupo familiar: quem mora junto compartilha a lista de compras, atualizada na hora para todos.",
      },
    ],
  }),
  component: CasaLayout,
});

function CasaLayout() {
  const { user, hydrated } = useRequireAuth();
  if (!hydrated || !user) return <AuthGateLoading />;
  return (
    <AppScreen>
      <Outlet />
    </AppScreen>
  );
}
