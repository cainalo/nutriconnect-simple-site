// Mensagem de erro para a pessoa ler, nos 4 idiomas, no lugar da mensagem crua do servidor
// (em inglês ou técnica). Erros conhecidos viram um texto claro; o resto vira um aviso genérico.
import type { Names } from "@/lib/appearance-data";

const RULES: { test: RegExp; text: Names }[] = [
  {
    test: /failed to fetch|network|load failed|networkerror|timeout|offline/i,
    text: [
      "Sem conexão com a internet agora. Confira a rede e tente de novo.",
      "No internet connection right now. Check your network and try again.",
      "Sin conexión a internet ahora. Revisa la red e inténtalo de nuevo.",
      "Pas de connexion internet pour le moment. Vérifiez le réseau et réessayez.",
    ],
  },
  {
    test: /entre na sua conta|é preciso estar logado|jwt|not authenticated|unauthorized|401/i,
    text: [
      "Sua sessão terminou. Entre de novo na sua conta.",
      "Your session has ended. Please sign in again.",
      "Tu sesión terminó. Vuelve a entrar en tu cuenta.",
      "Votre session a expiré. Reconnectez-vous.",
    ],
  },
  {
    test: /pontos insuficientes|insufficient points/i,
    text: [
      "Você ainda não tem pontos suficientes para esta troca.",
      "You don't have enough points for this yet.",
      "Aún no tienes puntos suficientes para este cambio.",
      "Vous n'avez pas encore assez de points pour cet échange.",
    ],
  },
  {
    test: /acabou|esgotad|sold out|out of stock/i,
    text: [
      "Esta recompensa acabou. Escolha outra.",
      "This reward has run out. Pick another one.",
      "Esta recompensa se agotó. Elige otra.",
      "Cette récompense est épuisée. Choisissez-en une autre.",
    ],
  },
  {
    test: /indispon|not available|unavailable/i,
    text: [
      "Isto não está mais disponível. Atualize a página.",
      "This is no longer available. Refresh the page.",
      "Esto ya no está disponible. Actualiza la página.",
      "Ce n'est plus disponible. Actualisez la page.",
    ],
  },
  {
    test: /stripe|payment|pagamento|checkout|card|cartão|publishable/i,
    text: [
      "Não conseguimos abrir o pagamento agora. Nada foi cobrado. Tente de novo em instantes.",
      "We couldn't open the payment right now. Nothing was charged. Try again shortly.",
      "No pudimos abrir el pago ahora. No se cobró nada. Inténtalo de nuevo en un momento.",
      "Impossible d'ouvrir le paiement pour l'instant. Rien n'a été débité. Réessayez dans un instant.",
    ],
  },
  {
    test: /expir|tempo esgotado|hold expired/i,
    text: [
      "O tempo para concluir acabou. Comece de novo.",
      "The time to finish ran out. Please start again.",
      "Se acabó el tiempo para terminar. Empieza de nuevo.",
      "Le délai est écoulé. Recommencez.",
    ],
  },
  {
    test: /permission|permiss|42501|forbidden|403|rls|policy/i,
    text: [
      "Você não tem acesso a isto com esta conta.",
      "You don't have access to this with this account.",
      "No tienes acceso a esto con esta cuenta.",
      "Vous n'avez pas accès à ceci avec ce compte.",
    ],
  },
];

const GENERIC: Names = [
  "Algo deu errado do nosso lado. Tente de novo em instantes.",
  "Something went wrong on our side. Try again shortly.",
  "Algo salió mal de nuestro lado. Inténtalo de nuevo en un momento.",
  "Un problème est survenu de notre côté. Réessayez dans un instant.",
];

/** Texto (em Names) para um erro qualquer. Use com `tr(friendlyError(e))`. */
export function friendlyError(err: unknown, fallback: Names = GENERIC): Names {
  const msg = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  return RULES.find((r) => r.test.test(msg))?.text ?? fallback;
}
