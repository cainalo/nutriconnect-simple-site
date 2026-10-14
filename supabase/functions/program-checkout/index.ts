// Cria o Checkout (pagamento único) de um programa da loja de um profissional. O valor vai para a
// conta Stripe do profissional (Connect) e a plataforma retém a parte do nível dele — a mesma taxa
// das assinaturas de membros (pro_membership_fee_percent). A compra é gravada pelo stripe-webhook.
// Entrada: { programId, origin }. Saída: { clientSecret, publishableKey }.
import { HttpError, env, json, serve } from "../_shared/http.ts";
import { createCheckoutSession } from "../_shared/stripe.ts";
import { adminClient, requireUser } from "../_shared/supabase.ts";

serve(async (req) => {
  const user = await requireUser(req);
  const { programId, origin } = (await req.json().catch(() => ({}))) as {
    programId?: string;
    origin?: string;
  };
  if (!programId || !/^[0-9a-f-]{36}$/i.test(programId)) throw new HttpError(400, "Programa não informado.");
  const appUrl = Deno.env.get("APP_URL") ?? (origin && /^https?:\/\//.test(origin) ? origin : "");
  if (!appUrl) throw new HttpError(400, "Origem inválida.");

  const db = adminClient();
  const { data: program } = await db.from("pro_programs").select("*").eq("id", programId).maybeSingle();
  if (!program?.active) throw new HttpError(409, "Este programa não está à venda agora.");
  const pro = program.professional_id as string;
  if (pro === user.id) throw new HttpError(400, "Você não pode comprar o próprio programa.");

  const [{ data: allowed }, { data: acct }, { data: blocked }, { data: owned }] = await Promise.all([
    db.rpc("pro_has_feature", { p_pro: pro, p_feature: "loja_programas" }),
    db
      .from("pro_stripe_accounts")
      .select("stripe_account_id, charges_enabled")
      .eq("professional_id", pro)
      .maybeSingle(),
    db.rpc("is_blocked_between", { a: pro, b: user.id }),
    db.rpc("has_program", { p_program: programId, p_user: user.id }),
  ]);
  if (!allowed || !acct?.charges_enabled || blocked) {
    throw new HttpError(409, "Este programa não está à venda agora.");
  }
  if (owned) throw new HttpError(409, "Você já tem este programa.");

  const { data: feeRaw } = await db.rpc("pro_membership_fee_percent", { p_pro: pro });
  const feePercent = Number(feeRaw ?? 20);
  const price = Number(program.price_cents);
  const feeCents = Math.round((price * feePercent) / 100);
  const { data: proProfile } = await db.from("profiles").select("name").eq("id", pro).single();
  const meta = {
    kind: "program",
    program_id: programId,
    buyer_id: user.id,
    professional_id: pro,
    fee_percent: String(feePercent),
  };

  const session = await createCheckoutSession({
    mode: "payment",
    ui_mode: "embedded_page",
    locale: "pt-BR",
    payment_method_types: ["card"],
    return_url: `${appUrl}/programas/${programId}?compra=sucesso`,
    custom_text: {
      submit: { message: "Pagamento único. Você aceita os Termos de Uso do NutriConnect." },
    },
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: meta,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "brl",
          unit_amount: price,
          product_data: { name: `${program.title} — ${proProfile?.name ?? "profissional"}` },
        },
      },
    ],
    payment_intent_data: {
      application_fee_amount: feeCents,
      transfer_data: { destination: acct.stripe_account_id },
      metadata: meta,
    },
  });
  if (!session.client_secret) throw new HttpError(502, "O Stripe não devolveu o formulário de pagamento.");
  return json({ clientSecret: session.client_secret, publishableKey: env("STRIPE_PUBLISHABLE_KEY") });
});
