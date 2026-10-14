import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppScreen } from "@/components/app-screen";
import { AuthGateLoading } from "@/components/site-chrome";
import { useRequireAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/programas")({
  head: () => ({
    meta: [
      { title: "Programas — NutriConnect" },
      {
        name: "description",
        content:
          "Programas criados por nutricionistas e profissionais verificados, com módulos para seguir no seu ritmo.",
      },
    ],
  }),
  component: ProgramasLayout,
});

function ProgramasLayout() {
  const { user, hydrated } = useRequireAuth();
  if (!hydrated || !user) return <AuthGateLoading />;
  return (
    <AppScreen>
      <Outlet />
    </AppScreen>
  );
}
