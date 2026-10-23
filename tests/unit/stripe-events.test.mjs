// NC-PAY-005: eventos do Stripe repetidos ou fora de ordem não podem desfazer um estado mais novo.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { loadTs, closeTs } from "../load-ts.mjs";

const { memberStatus, canOverwritePayment, paymentIntentOf } = await loadTs(
  "supabase/functions/_shared/stripe-events.ts",
);
after(closeTs);

test("confirmação de assinatura reenviada depois do cancelamento não reativa", () => {
  // Antes da correção o webhook gravava "ativa" fixo ao receber checkout.session.completed.
  assert.equal(memberStatus({ status: "canceled" }), "cancelada");
  assert.equal(memberStatus({ status: "incomplete_expired" }), "cancelada");
});

test("estado da assinatura segue o Stripe", () => {
  assert.equal(memberStatus({ status: "active" }), "ativa");
  assert.equal(memberStatus({ status: "active", cancel_at_period_end: true }), "cancelando");
  assert.equal(memberStatus({ status: "past_due" }), "inadimplente");
  assert.equal(memberStatus({ status: "unpaid" }), "inadimplente");
  assert.equal(memberStatus({ status: "active" }, "customer.subscription.deleted"), "cancelada");
});

test("pagamento estornado não volta a aprovado com evento atrasado", () => {
  assert.equal(canOverwritePayment("reembolsado"), false);
  assert.equal(canOverwritePayment("aprovado"), true);
  assert.equal(canOverwritePayment("pendente"), true);
  assert.equal(canOverwritePayment(undefined), true);
});

test("payment_intent sai da sessão ou da cobrança", () => {
  assert.equal(paymentIntentOf({ data: { object: { payment_intent: "pi_1" } } }), "pi_1");
  assert.equal(paymentIntentOf({ data: { object: {} } }), null);
  assert.equal(paymentIntentOf({}), null);
});
