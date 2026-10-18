import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { signOut } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { LEGAL_VERSION } from "@/lib/legal";
import { useTr } from "@/components/settings-ui";

/**
 * Pede o aceite dos Termos e da Política de Privacidade na versão atual (e, opcionalmente, o
 * consentimento para dados de saúde). Aparece para quem está logado e ainda não aceitou esta
 * versão — contas novas e antigas, e toda vez que LEGAL_VERSION mudar. O aceite fica registrado
 * na tabela consents (data, hora e versão), como prova do consentimento (LGPD, art. 8º).
 */
export function ConsentGate() {
  const { user } = useAuth();
  const tr = useTr();
  const [needs, setNeeds] = useState(false);
  const [terms, setTerms] = useState(false);
  const [health, setHealth] = useState(false);
  const [saving, setSaving] = useState(false);
  const userId = user?.id;

  useEffect(() => {
    setNeeds(false);
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("consents")
        .select("version")
        .eq("user_id", userId)
        .eq("kind", "termos")
        .eq("version", LEGAL_VERSION)
        .limit(1);
      // Se a consulta falhar (ex.: sem rede), não trava o uso; tentamos de novo no próximo login.
      if (!cancelled && !error && (data?.length ?? 0) === 0) setNeeds(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId || !needs) return null;

  const accept = async () => {
    setSaving(true);
    const first = await supabase.rpc("record_consent", {
      p_kind: "termos",
      p_version: LEGAL_VERSION,
      p_granted: true,
    });
    const second = health
      ? await supabase.rpc("record_consent", {
          p_kind: "saude",
          p_version: LEGAL_VERSION,
          p_granted: true,
        })
      : null;
    setSaving(false);
    if (first.error || second?.error) {
      toast.error(
        tr([
          "Não foi possível registrar o aceite. Tente novamente.",
          "We couldn't record your acceptance. Please try again.",
          "No se pudo registrar la aceptación. Inténtalo de nuevo.",
          "Impossible d'enregistrer votre acceptation. Réessayez.",
        ]),
      );
      return;
    }
    setNeeds(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 sm:items-center"
    >
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-card p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <h2 id="consent-title" className="font-display text-xl font-bold text-foreground">
            {tr([
              "Antes de continuar",
              "Before you continue",
              "Antes de continuar",
              "Avant de continuer",
            ])}
          </h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {tr([
            "Atualizamos nossos documentos. Para usar o NutriConnect, leia e aceite os Termos de Uso e a Política de Privacidade (você tem 18 anos ou mais e os dados do seu cadastro são verdadeiros).",
            "We've updated our documents. To use NutriConnect, please read and accept the Terms of Use and the Privacy Policy (you are 18 or older and your sign-up details are true).",
            "Actualizamos nuestros documentos. Para usar NutriConnect, lee y acepta los Términos de Uso y la Política de Privacidad (tienes 18 años o más y los datos de tu registro son verdaderos).",
            "Nous avons mis à jour nos documents. Pour utiliser NutriConnect, lisez et acceptez les Conditions d'utilisation et la Politique de confidentialité (vous avez 18 ans ou plus et vos informations sont exactes).",
          ])}
        </p>

        <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-primary)]"
          />
          <span>
            {tr([
              "Li e aceito os",
              "I have read and accept the",
              "He leído y acepto los",
              "J'ai lu et j'accepte les",
            ])}{" "}
            <a href="/termos" target="_blank" rel="noreferrer" className="text-primary underline">
              {tr(["Termos de Uso", "Terms of Use", "Términos de Uso", "Conditions d'utilisation"])}
            </a>
            {tr([", a", ", the", ", la", ", la"])}{" "}
            <a
              href="/privacidade"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            >
              {tr([
                "Política de Privacidade",
                "Privacy Policy",
                "Política de Privacidad",
                "Politique de confidentialité",
              ])}
            </a>{" "}
            {tr(["e as", "and the", "y las", "et les"])}{" "}
            <a
              href="/diretrizes"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            >
              {tr([
                "Diretrizes da Comunidade",
                "Community Guidelines",
                "Normas de la Comunidad",
                "Règles de la communauté",
              ])}
            </a>
            . <span className="text-destructive">*</span>
          </span>
        </label>

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-border/70 bg-secondary/30 p-3 text-sm text-foreground">
          <input
            type="checkbox"
            checked={health}
            onChange={(e) => setHealth(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-primary)]"
          />
          <span>
            <span className="font-semibold">
              {tr([
                "Dados de saúde (opcional).",
                "Health data (optional).",
                "Datos de salud (opcional).",
                "Données de santé (facultatif).",
              ])}
            </span>{" "}
            {tr([
              "Consinto que o NutriConnect trate meus dados de saúde (diário alimentar, metas, medidas, planos e consultas) para o acompanhamento com profissionais. Posso revogar quando quiser em Configurações → Privacidade. Sem este consentimento você usa a rede social, mas não o acompanhamento clínico.",
              "I consent to NutriConnect processing my health data (food diary, goals, measurements, plans and appointments) for care with professionals. I can revoke it anytime in Settings → Privacy. Without this consent you can use the social network, but not clinical care.",
              "Consiento que NutriConnect trate mis datos de salud (diario alimentario, metas, medidas, planes y consultas) para el seguimiento con profesionales. Puedo revocarlo cuando quiera en Ajustes → Privacidad. Sin este consentimiento usas la red social, pero no el seguimiento clínico.",
              "J'accepte que NutriConnect traite mes données de santé (journal alimentaire, objectifs, mesures, plans et consultations) pour le suivi avec des professionnels. Je peux le retirer à tout moment dans Paramètres → Confidentialité. Sans ce consentement, vous utilisez le réseau social, mais pas le suivi clinique.",
            ])}
          </span>
        </label>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary"
          >
            {tr([
              "Não aceito, sair",
              "I don't accept, sign out",
              "No acepto, salir",
              "Je refuse, me déconnecter",
            ])}
          </button>
          <button
            type="button"
            disabled={!terms || saving}
            onClick={accept}
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition hover:bg-primary-hover disabled:opacity-50"
          >
            {saving
              ? tr(["Salvando…", "Saving…", "Guardando…", "Enregistrement…"])
              : tr([
                  "Aceitar e continuar",
                  "Accept and continue",
                  "Aceptar y continuar",
                  "Accepter et continuer",
                ])}
          </button>
        </div>
      </div>
    </div>
  );
}
