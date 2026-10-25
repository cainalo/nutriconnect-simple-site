// Regras do webhook do Stripe que não dependem de rede nem de banco (testadas em
// tests/unit/stripe-events.test.mjs). O Stripe pode reenviar um evento e entregar eventos fora de
// ordem; estas regras impedem que um evento atrasado desfaça um estado mais novo.

/**
 * Estado da assinatura de membros a partir do que o Stripe diz agora sobre ela. Só "active" e
 * "trialing" dão acesso; um status desconhecido ou incompleto NÃO dá acesso (fica inadimplente
 * até o Stripe mandar um estado conhecido).
 */
export function memberStatus(
  sub: { status?: string; cancel_at_period_end?: boolean },
  eventType?: string,
): "ativa" | "cancelando" | "cancelada" | "inadimplente" {
  if (eventType === "customer.subscription.deleted") return "cancelada";
  switch (sub.status) {
    case "active":
    case "trialing":
      return sub.cancel_at_period_end ? "cancelando" : "ativa";
    case "canceled":
    case "incomplete_expired":
      return "cancelada";
    default:
      // past_due, unpaid, incomplete, paused e qualquer status novo: sem acesso.
      return "inadimplente";
  }
}

/**
 * Pagamento de consulta já gravado: um "pagamento concluído" repetido ou atrasado só pode mexer
 * nele se ainda não foi estornado (o estorno é o estado final).
 */
export function canOverwritePayment(existingStatus: string | null | undefined): boolean {
  return existingStatus !== "reembolsado";
}

/** payment_intent de um evento, venha ele de uma sessão de checkout ou de uma cobrança. */
export function paymentIntentOf(event: { data?: { object?: Record<string, unknown> } }) {
  const pi = event.data?.object?.payment_intent;
  return typeof pi === "string" ? pi : null;
}

/** Resposta do Supabase com erro vira exceção (o webhook responde 5xx e o Stripe tenta de novo). */
export function must<T extends { error: { message: string } | null }>(res: T, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res;
}
