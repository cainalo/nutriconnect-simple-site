// Regras do webhook do Stripe que não dependem de rede nem de banco (testadas em
// tests/unit/stripe-events.test.mjs). O Stripe pode reenviar um evento e entregar eventos fora de
// ordem; estas regras impedem que um evento atrasado desfaça um estado mais novo.

/** Estado da assinatura de membros a partir do que o Stripe diz agora sobre ela. */
export function memberStatus(
  sub: { status?: string; cancel_at_period_end?: boolean },
  eventType?: string,
): "ativa" | "cancelando" | "cancelada" | "inadimplente" {
  if (eventType === "customer.subscription.deleted" || sub.status === "canceled") {
    return "cancelada";
  }
  if (sub.status === "past_due" || sub.status === "unpaid") return "inadimplente";
  if (sub.status === "incomplete_expired") return "cancelada";
  return sub.cancel_at_period_end ? "cancelando" : "ativa";
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
