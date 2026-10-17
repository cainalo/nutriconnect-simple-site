// Avaliações recebidas pelo profissional (P1): média, distribuição e resposta a cada avaliação.
import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { Card, PageHeader, buttonSecondary } from "@/components/clinical/ui";
import { ProReviewsSection } from "@/components/clinical/reviews";
import { useTr } from "@/components/settings-ui";
import { useAuth } from "@/hooks/use-auth";
import { useRatingSummaries } from "@/lib/clinical/reviews";

export const Route = createFileRoute("/painel/avaliacoes")({
  component: ProReviewsPage,
});

function ProReviewsPage() {
  const tr = useTr();
  const { user } = useAuth();
  const ratings = useRatingSummaries();
  if (!user) return null;
  return (
    <>
      <PageHeader
        title={tr(["Avaliações", "Reviews", "Reseñas", "Avis"])}
        subtitle={tr([
          "Só quem teve consulta com você avalia. Responder com calma e respeito também conta para quem está escolhendo.",
          "Only people who had an appointment with you can review. A calm, respectful reply also helps people choosing.",
          "Solo quien tuvo consulta contigo puede calificar. Responder con calma y respeto también ayuda a quien elige.",
          "Seules les personnes que vous avez reçues peuvent évaluer. Une réponse calme et respectueuse aide aussi ceux qui choisissent.",
        ])}
        action={
          <Link
            to="/profissionais/$professionalId"
            params={{ professionalId: user.id }}
            hash="avaliacoes"
            className={buttonSecondary}
          >
            <ExternalLink className="h-4 w-4" />
            {tr([
              "Ver no meu perfil",
              "See on my profile",
              "Ver en mi perfil",
              "Voir sur mon profil",
            ])}
          </Link>
        }
      />
      <Card>
        <ProReviewsSection proId={user.id} summary={ratings.data?.get(user.id)} isOwner />
      </Card>
    </>
  );
}
