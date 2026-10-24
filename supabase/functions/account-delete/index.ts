// Exclusão da própria conta (LGPD, art. 18, VI), feita no servidor para não deixar nada para trás:
// 1. cancela na hora as assinaturas de membros pagas no Stripe (como membro e como profissional),
//    para ninguém continuar sendo cobrado por uma conta que não existe mais;
// 2. apaga os arquivos da pessoa no Storage (tudo que fica na pasta <id>/ de cada bucket);
// 3. apaga o usuário do Auth, o que apaga em cascata os dados do banco.
// Qualquer falha (Stripe, banco ou Storage) interrompe ANTES de apagar a conta: a pessoa recebe o
// erro e pode tentar de novo; o que já foi feito não se repete (assinatura já cancelada, arquivo já
// apagado), então a nova tentativa continua de onde parou.
import { json, serve } from "../_shared/http.ts";
import { cancelSubscriptionNow } from "../_shared/stripe.ts";
import { adminClient, requireUser } from "../_shared/supabase.ts";
import { CleanupError, emptyFolder } from "../_shared/account-cleanup.ts";

const BUCKETS = [
  "avatars",
  "patient-files",
  "diary-photos",
  "chat-attachments",
  "verification-docs",
  "post-images",
  "community-covers",
  "social-media",
  "ai-rejections",
];

serve(async (req) => {
  const user = await requireUser(req);
  const db = adminClient();

  // 1. Assinaturas pagas: cancela no Stripe (erro do Stripe interrompe tudo, nada é apagado).
  const { data: subs, error: subsError } = await db
    .from("member_subscriptions")
    .select("id, stripe_subscription_id, status")
    .or(`member_id.eq.${user.id},professional_id.eq.${user.id}`)
    .in("status", ["ativa", "cancelando", "inadimplente"]);
  if (subsError) return fail("assinaturas", subsError.message);
  for (const s of subs ?? []) {
    if (s.stripe_subscription_id) await cancelSubscriptionNow(s.stripe_subscription_id);
    const { error } = await db.from("member_subscriptions").update({ status: "cancelada" }).eq("id", s.id);
    if (error) return fail("assinaturas", error.message);
  }

  // 2. Arquivos: cada bucket precisa ficar vazio de verdade antes de seguir.
  let files = 0;
  for (const bucket of BUCKETS) {
    try {
      files += await emptyFolder(db.storage.from(bucket), bucket, user.id);
    } catch (err) {
      return fail("arquivos", err instanceof CleanupError ? err.message : String(err));
    }
  }

  // 3. A conta (o banco apaga em cascata).
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) return fail("conta", error.message);
  console.log("account-delete: ok", { subscriptions: subs?.length ?? 0, files });
  return json({ ok: true, subscriptions: subs?.length ?? 0, files });
});

/** Falha parcial: a conta continua existindo e a pessoa pode tentar de novo. Log sem dados pessoais. */
function fail(step: string, detail: string) {
  console.error("account-delete: falhou", { step, detail: detail.slice(0, 200) });
  return json({ error: "Não foi possível excluir a conta agora. Tente de novo em instantes." }, 500);
}
