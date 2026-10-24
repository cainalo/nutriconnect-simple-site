// Webhook do Stripe. Público (verify_jwt = false): a autenticidade vem da assinatura
// Stripe-Signature, verificada com STRIPE_WEBHOOK_SECRET.
// Eventos tratados: checkout.session.completed (confirma a consulta, a assinatura de membros ou a
// compra de um programa da loja) e charge.refunded
// (estorno feito direto no painel do Stripe).
// Repetição, ordem e falhas: cada evento é reservado em stripe_events antes de processar (reserva
// atômica: duas entregas simultâneas não processam juntas) e só fica "concluído" se todas as
// gravações derem certo. Qualquer erro do banco libera a reserva e responde 5xx para o Stripe
// reenviar. Um estorno que chega antes da confirmação do pagamento fica registrado ali, e a
// confirmação, quando chegar, já grava o pagamento como estornado.
import { json, serve } from "../_shared/http.ts";
import {
  createRefund,
  getSubscription,
  periodEnd,
  updateSubscription,
  verifyWebhookSignature,
} from "../_shared/stripe.ts";
import { adminClient } from "../_shared/supabase.ts";
import {
  canOverwritePayment,
  memberStatus,
  must,
  paymentIntentOf,
} from "../_shared/stripe-events.ts";

interface StripeEvent {
  id?: string;
  type?: string;
  data?: { object?: Record<string, unknown> };
}

serve(async (req) => {
  const rawBody = await req.text();
  if (!(await verifyWebhookSignature(req, rawBody))) {
    return json({ error: "assinatura inválida" }, 401);
  }
  const event = JSON.parse(rawBody) as StripeEvent;
  const db = adminClient();

  if (!event.id) return handleEvent(event, db);

  // Reserva atômica: só uma entrega de cada evento processa por vez; um evento já concluído é
  // ignorado; um que está sendo processado em outra entrega devolve 409 (o Stripe tenta depois).
  const { data: claim, error: claimError } = await db.rpc("claim_stripe_event", {
    p_id: event.id,
    p_type: event.type ?? "",
    p_payment_intent: paymentIntentOf(event),
  });
  if (claimError) return json({ error: "banco indisponível" }, 503);
  if (claim === "done") return json({ ok: true, duplicate: true });
  if (claim === "busy") return json({ error: "evento em processamento" }, 409);

  let res: Response;
  try {
    res = await handleEvent(event, db);
  } catch (err) {
    // Falhou no meio: libera a reserva e responde 5xx para o Stripe reenviar. Os passos já
    // feitos são idempotentes (constraints e checagens de estado), então repetir é seguro.
    await db.rpc("release_stripe_event", { p_id: event.id });
    console.error("stripe-webhook: falhou", event.type, (err as Error).message?.slice(0, 200));
    return json({ error: "falha ao processar; o Stripe vai tentar de novo" }, 500);
  }
  const done = await db.rpc("finish_stripe_event", { p_id: event.id });
  if (done.error) return json({ error: "banco indisponível" }, 503);
  return res;
});

type Db = ReturnType<typeof adminClient>;

/** Um estorno desse pagamento já chegou (às vezes antes da confirmação do pagamento). */
async function alreadyRefunded(db: Db, paymentIntent: string | null | undefined) {
  if (!paymentIntent) return false;
  const { data, error } = await db
    .from("stripe_events")
    .select("id")
    .eq("type", "charge.refunded")
    .eq("payment_intent", paymentIntent)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`stripe_events: ${error.message}`);
  return !!data;
}

async function handleEvent(event: StripeEvent, db: Db): Promise<Response> {
  if (event.type === "charge.refunded") {
    const charge = event.data?.object as { payment_intent?: string } | undefined;
    if (charge?.payment_intent) {
      must(
        await db
          .from("payments")
          .update({ status: "reembolsado", refunded_at: new Date().toISOString() })
          .eq("provider", "stripe")
          .eq("mp_payment_id", charge.payment_intent),
        "payments",
      );
      // Programa da loja estornado: o acesso aos módulos acaba.
      must(
        await db
          .from("program_purchases")
          .update({ status: "reembolsada", refunded_at: new Date().toISOString() })
          .eq("stripe_payment_intent", charge.payment_intent),
        "program_purchases",
      );
    }
    return json({ ok: true });
  }

  // ── Perfil de membros (assinaturas) ──────────────────────────────────────
  if (event.type?.startsWith("customer.subscription.") || event.type?.startsWith("invoice.")) {
    return await handleMemberEvent(event, db);
  }

  if (event.type !== "checkout.session.completed") return json({ ignored: true });

  const sessionObj = event.data?.object as {
    mode?: string;
    subscription?: string;
    metadata?: Record<string, string>;
  };
  if (sessionObj?.mode === "subscription" && sessionObj.metadata?.kind === "member") {
    const subId = sessionObj.subscription;
    if (!subId) return json({ ignored: "sem assinatura" });
    const sub = await getSubscription(subId);
    const price = sub.items?.data?.[0]?.price?.unit_amount ?? 0;
    must(
      await db.rpc("upsert_member_subscription", {
        p_pro: sessionObj.metadata.professional_id,
        p_member: sessionObj.metadata.member_id,
        // O estado de agora no Stripe: uma confirmação reenviada depois do cancelamento não reativa.
        p_status: memberStatus(sub),
        p_price_cents: price,
        p_stripe_subscription: subId,
        p_stripe_customer: sub.customer ?? null,
        p_period_end: periodEnd(sub),
      }),
      "upsert_member_subscription",
    );
    return json({ ok: true, member: true });
  }

  // ── Loja de programas (pagamento único) ───────────────────────────────────
  const paid = event.data?.object as {
    id?: string;
    payment_intent?: string;
    payment_status?: string;
    amount_total?: number;
    metadata?: Record<string, string>;
  };
  if (paid?.metadata?.kind === "program") {
    if (paid.payment_status !== "paid") return json({ ignored: "não pago" });
    const amount = paid.amount_total ?? 0;
    const feePercent = Number(paid.metadata.fee_percent ?? 20);
    must(
      await db.rpc("record_program_purchase", {
        p_program: paid.metadata.program_id,
        p_buyer: paid.metadata.buyer_id,
        p_amount_cents: amount,
        // Com desconto de recompensa, a taxa já vem reduzida (fee_cents); sem ele, a conta de sempre.
        p_fee_cents: paid.metadata.fee_cents
          ? Number(paid.metadata.fee_cents)
          : Math.round((amount * feePercent) / 100),
        p_fee_percent: feePercent,
        p_stripe_session: paid.id ?? null,
        p_payment_intent: paid.payment_intent ?? null,
      }),
      "record_program_purchase",
    );
    if (await alreadyRefunded(db, paid.payment_intent)) {
      must(
        await db
          .from("program_purchases")
          .update({ status: "reembolsada", refunded_at: new Date().toISOString() })
          .eq("stripe_payment_intent", paid.payment_intent!),
        "program_purchases",
      );
    }
    if (paid.metadata.redemption_id) {
      must(
        await db.rpc("use_reward_redemption", {
          p_redemption: paid.metadata.redemption_id,
          p_ref: `programa:${paid.metadata.program_id}`,
        }),
        "use_reward_redemption",
      );
    }
    return json({ ok: true, program: true });
  }

  const session = event.data?.object as {
    id?: string;
    payment_intent?: string;
    payment_status?: string;
    amount_total?: number;
    metadata?: { appointment_id?: string };
  };
  const appointmentId = session?.metadata?.appointment_id;
  if (!appointmentId || session.payment_status !== "paid") return json({ ignored: true });

  const { data: appt } = must(
    await db.from("appointments").select("*").eq("id", appointmentId).maybeSingle(),
    "appointments",
  );
  if (!appt) return json({ ignored: "consulta inexistente" });

  const { data: existing } = must(
    await db
      .from("payments")
      .select("id, status")
      .eq("appointment_id", appt.id)
      .eq("provider", "stripe")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    "payments",
  );
  if (existing && !canOverwritePayment(existing.status)) {
    return json({ ignored: "pagamento já estornado" });
  }

  let status = "aprovado";
  const patch: Record<string, unknown> = {
    status,
    mp_payment_id: session.payment_intent ?? null, // payment_intent do Stripe
    method: null,
    paid_at: new Date().toISOString(),
    raw: session,
  };

  if (appt.status === "aguardando_pagamento") {
    must(
      await db
        .from("appointments")
        .update({ status: "agendada", hold_expires_at: null })
        .eq("id", appt.id),
      "appointments",
    );
  } else if (
    appt.status === "cancelada" &&
    appt.cancel_reason === "Pagamento não concluído a tempo"
  ) {
    // Pagou depois de o horário expirar: tenta recuperar a reserva; se já foi ocupada, estorna.
    const { error } = await db
      .from("appointments")
      .update({
        status: "agendada",
        hold_expires_at: null,
        cancel_reason: null,
        cancelled_at: null,
      })
      .eq("id", appt.id);
    if (error && session.payment_intent) {
      // Numa nova tentativa o estorno pode já ter sido feito: não é erro.
      await createRefund(session.payment_intent).catch((e: Error) => {
        if (!/already been refunded|charge_already_refunded/i.test(e.message)) throw e;
      });
      status = "reembolsado";
      patch.status = status;
      patch.refunded_at = new Date().toISOString();
    }
  }

  if (status !== "reembolsado" && (await alreadyRefunded(db, session.payment_intent))) {
    status = "reembolsado";
    patch.status = status;
    patch.refunded_at = new Date().toISOString();
  }

  if (existing) {
    must(await db.from("payments").update(patch).eq("id", existing.id), "payments");
  } else {
    must(
      await db.from("payments").insert({
        ...patch,
        appointment_id: appt.id,
        patient_id: appt.patient_id,
        professional_id: appt.professional_id,
        amount_cents: session.amount_total ?? appt.price_cents,
        provider: "stripe",
        mp_preference_id: session.id ?? null,
      }),
      "payments",
    );
  }
  return json({ ok: true, status });
}

// Eventos de assinatura: status, fim do período, faturas e a taxa do nível atual.
async function handleMemberEvent(event: StripeEvent, db: Db) {
  const obj = event.data?.object as Record<string, unknown>;

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const sub = obj as { id: string; status?: string; cancel_at_period_end?: boolean };
    const { data: row } = must(
      await db
        .from("member_subscriptions")
        .select("id, professional_id, member_id, price_cents")
        .eq("stripe_subscription_id", sub.id)
        .maybeSingle(),
      "member_subscriptions",
    );
    if (!row) return json({ ignored: "assinatura desconhecida" });
    const status = memberStatus(sub, event.type);
    must(
      await db.rpc("upsert_member_subscription", {
        p_pro: row.professional_id,
        p_member: row.member_id,
        p_status: status,
        p_price_cents: row.price_cents,
        p_stripe_subscription: sub.id,
        p_stripe_customer: null,
        p_period_end: periodEnd(obj as never),
      }),
      "upsert_member_subscription",
    );
    return json({ ok: true, status });
  }

  const invoice = obj as {
    id: string;
    subscription?: string;
    parent?: { subscription_details?: { subscription?: string } };
    amount_paid?: number;
    billing_reason?: string;
    application_fee_amount?: number;
  };
  const subId = invoice.subscription ?? invoice.parent?.subscription_details?.subscription;
  if (!subId) return json({ ignored: "fatura sem assinatura" });

  if (event.type === "invoice.created" && invoice.billing_reason === "subscription_cycle") {
    // A taxa acompanha o nível atual do profissional: atualiza antes de a fatura ser cobrada.
    const { data: row } = must(
      await db
        .from("member_subscriptions")
        .select("professional_id")
        .eq("stripe_subscription_id", subId)
        .maybeSingle(),
      "member_subscriptions",
    );
    if (row) {
      const { data: fee } = must(
        await db.rpc("pro_membership_fee_percent", { p_pro: row.professional_id }),
        "pro_membership_fee_percent",
      );
      if (fee != null) await updateSubscription(subId, { application_fee_percent: Number(fee) });
    }
    return json({ ok: true, fee: true });
  }

  if (event.type === "invoice.paid") {
    const amount = invoice.amount_paid ?? 0;
    const { data: row } = must(
      await db
        .from("member_subscriptions")
        .select("professional_id, status")
        .eq("stripe_subscription_id", subId)
        .maybeSingle(),
      "member_subscriptions",
    );
    if (!row) return json({ ignored: "assinatura desconhecida" });
    const { data: feePct } = must(
      await db.rpc("pro_membership_fee_percent", { p_pro: row.professional_id }),
      "pro_membership_fee_percent",
    );
    const fee = invoice.application_fee_amount ?? Math.round((amount * Number(feePct ?? 20)) / 100);
    must(
      await db.rpc("record_member_invoice", {
        p_stripe_subscription: subId,
        p_stripe_invoice: invoice.id,
        p_amount_cents: amount,
        p_fee_cents: fee,
      }),
      "record_member_invoice",
    );
    // Pagamento em dia tira a assinatura da inadimplência e renova o período.
    const sub = await getSubscription(subId);
    must(
      await db
        .from("member_subscriptions")
        .update({
          status: sub.cancel_at_period_end ? "cancelando" : "ativa",
          current_period_end: periodEnd(sub),
        })
        .eq("stripe_subscription_id", subId),
      "member_subscriptions",
    );
    return json({ ok: true, invoice: true });
  }

  if (event.type === "invoice.payment_failed") {
    must(
      await db
        .from("member_subscriptions")
        .update({ status: "inadimplente" })
        .eq("stripe_subscription_id", subId),
      "member_subscriptions",
    );
    return json({ ok: true });
  }

  return json({ ignored: true });
}
