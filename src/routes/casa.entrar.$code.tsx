import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Home, Loader2, TicketX, WifiOff } from "lucide-react";
import { EmojiIcon } from "@/components/emoji-icon";
import { useTr } from "@/components/settings-ui";
import { useAuth } from "@/hooks/use-auth";
import { useHouseholdPreview, useJoinHousehold, useMyHousehold } from "@/lib/household";

export const Route = createFileRoute("/casa/entrar/$code")({
  head: () => ({ meta: [{ title: "Entrar na casa — NutriConnect" }] }),
  component: JoinHousePage,
});

const card = "rounded-3xl border border-border/70 bg-card p-6 text-center shadow-xs";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50";
const btnSoft =
  "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary";

function JoinHousePage() {
  const { code } = Route.useParams();
  const tr = useTr();
  const navigate = useNavigate();
  const { user } = useAuth();
  const mine = useMyHousehold(user?.id);
  const preview = useHouseholdPreview(code);
  const join = useJoinHousehold();

  const loading = mine.isLoading || preview.isLoading;
  const house = preview.data;

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : preview.isError ? (
        // Falha de rede não é "código inválido": oferece tentar de novo.
        <div className={card}>
          <WifiOff className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
          <h1 className="mt-3 text-lg font-bold text-foreground">
            {tr([
              "Não foi possível conferir o código",
              "We couldn't check the code",
              "No se pudo comprobar el código",
              "Impossible de vérifier le code",
            ])}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tr([
              "Confira a internet e tente de novo.",
              "Check your connection and try again.",
              "Revisa la conexión e inténtalo de nuevo.",
              "Vérifiez la connexion et réessayez.",
            ])}
          </p>
          <button
            type="button"
            onClick={() => void preview.refetch()}
            className={`${btnSoft} mt-5`}
          >
            {tr(["Tentar de novo", "Try again", "Intentar de nuevo", "Réessayer"])}
          </button>
        </div>
      ) : !house ? (
        <div className={card}>
          <TicketX className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-3 text-lg font-bold text-foreground">
            {tr([
              "Código inválido ou vencido",
              "Invalid or expired code",
              "Código inválido o vencido",
              "Code invalide ou expiré",
            ])}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tr([
              "Peça um código novo a quem convidou você.",
              "Ask whoever invited you for a new code.",
              "Pide un código nuevo a quien te invitó.",
              "Demandez un nouveau code à la personne qui vous a invité(e).",
            ])}
          </p>
          <Link to="/casa" className={`${btnSoft} mt-5`}>
            {tr(["Voltar", "Back", "Volver", "Retour"])}
          </Link>
        </div>
      ) : mine.data ? (
        <div className={card}>
          <Home className="mx-auto h-8 w-8 text-accent" />
          <p className="mt-3 text-sm text-foreground">
            {tr([
              `Você já está na casa ${mine.data.house.name}. Para entrar em outra, saia dela primeiro.`,
              `You're already in ${mine.data.house.name}. Leave it first to join another.`,
              `Ya estás en la casa ${mine.data.house.name}. Sal de ella para entrar en otra.`,
              `Vous êtes déjà dans ${mine.data.house.name}. Quittez-la d'abord.`,
            ])}
          </p>
          <Link to="/casa" className={`${btnPrimary} mt-5`}>
            {tr(["Ir para a minha casa", "Go to my home", "Ir a mi casa", "Aller à ma maison"])}
          </Link>
        </div>
      ) : (
        <div className={card}>
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-accent-soft">
            <EmojiIcon emoji={house.emoji} fallback={Home} tinted className="h-9 w-9" />
          </span>
          <h1 className="mt-3 text-xl font-extrabold font-display text-foreground">{house.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tr([
              `${house.members} ${house.members === 1 ? "pessoa mora" : "pessoas moram"} aqui. Ao entrar, vocês passam a compartilhar a lista de compras.`,
              `${house.members} ${house.members === 1 ? "person lives" : "people live"} here. Once you join, you'll share the shopping list.`,
              `${house.members} ${house.members === 1 ? "persona vive" : "personas viven"} aquí. Al entrar, compartirán la lista de compras.`,
              `${house.members} personne${house.members === 1 ? "" : "s"} ici. En rejoignant, vous partagerez la liste de courses.`,
            ])}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className={btnPrimary}
              disabled={join.isPending}
              onClick={() =>
                join.mutate(code, {
                  onSuccess: () => {
                    toast.success(
                      tr([
                        "Bem-vindo(a) à casa!",
                        "Welcome home!",
                        "¡Bienvenido(a) a la casa!",
                        "Bienvenue à la maison !",
                      ]),
                    );
                    void navigate({ to: "/casa" });
                  },
                  onError: (err) => toast.error((err as Error).message),
                })
              }
            >
              {tr(["Entrar na casa", "Join the home", "Entrar a la casa", "Rejoindre"])}
            </button>
            <Link to="/casa" className={btnSoft}>
              {tr(["Agora não", "Not now", "Ahora no", "Pas maintenant"])}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
