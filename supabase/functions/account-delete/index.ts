// Exclusão da própria conta (LGPD, art. 18, VI), feita no servidor para não deixar nada para trás:
// 1. cancela na hora as assinaturas de membros pagas no Stripe (como membro e como profissional),
//    para ninguém continuar sendo cobrado por uma conta que não existe mais;
// 2. apaga os arquivos da pessoa no Storage (tudo que fica na pasta <id>/ de cada bucket);
// 3. apaga o usuário do Auth, o que apaga em cascata os dados do banco.
// Se o Stripe falhar, nada é apagado e a pessoa recebe o erro para tentar de novo.
import { json, serve } from "../_shared/http.ts";
import { cancelSubscriptionNow } from "../_shared/stripe.ts";
import { adminClient, requireUser } from "../_shared/supabase.ts";

const BUCKETS = [
  "avatars",
  "patient-files",
  "diary-photos",
  "chat-attachments",
  "verification-docs",
  "post-images",
  "community-covers",
  "social-media",
];

serve(async (req) => {
  const user = await requireUser(req);
  const db = adminClient();

  const { data: subs } = await db
    .from("member_subscriptions")
    .select("id, stripe_subscription_id, status")
    .or(`member_id.eq.${user.id},professional_id.eq.${user.id}`)
    .in("status", ["ativa", "cancelando", "inadimplente"]);
  for (const s of subs ?? []) {
    if (s.stripe_subscription_id) await cancelSubscriptionNow(s.stripe_subscription_id);
    await db.from("member_subscriptions").update({ status: "cancelada" }).eq("id", s.id);
  }

  let files = 0;
  for (const bucket of BUCKETS) files += await removeFolder(db, bucket, user.id);

  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) return json({ error: "Não foi possível excluir a conta. Tente de novo." }, 500);
  return json({ ok: true, subscriptions: subs?.length ?? 0, files });
});

/** Apaga tudo abaixo de <prefix>/ num bucket (as pastas são listadas uma a uma). */
async function removeFolder(db: ReturnType<typeof adminClient>, bucket: string, prefix: string) {
  let removed = 0;
  const { data: items, error } = await db.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error || !items) return 0;
  const files = items.filter((i) => i.id).map((i) => `${prefix}/${i.name}`);
  const folders = items.filter((i) => !i.id).map((i) => `${prefix}/${i.name}`);
  for (const f of folders) removed += await removeFolder(db, bucket, f);
  if (files.length) {
    await db.storage.from(bucket).remove(files);
    removed += files.length;
  }
  return removed;
}
