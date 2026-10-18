import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { LEGAL_VERSION } from "@/lib/legal";
import { DataSummaryButton } from "@/components/data-summary-button";
import { useTr } from "@/components/settings-ui";

/** Direitos do titular (LGPD): consentimento de saúde, cópia dos dados e exclusão da conta. */
export function HealthConsentCard() {
  const tr = useTr();
  const { user } = useAuth();
  const userId = user?.id;
  const [granted, setGranted] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("consents")
      .select("granted")
      .eq("user_id", userId)
      .eq("kind", "saude")
      .order("created_at", { ascending: false })
      .limit(1);
    setGranted(data?.[0]?.granted ?? false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (value: boolean) => {
    setSaving(true);
    const { error } = await supabase.rpc("record_consent", {
      p_kind: "saude",
      p_version: LEGAL_VERSION,
      p_granted: value,
    });
    setSaving(false);
    if (error)
      return void toast.error(
        tr([
          "Não foi possível salvar. Tente novamente.",
          "Could not save. Please try again.",
          "No se pudo guardar. Inténtalo de nuevo.",
          "Impossible d’enregistrer. Réessayez.",
        ]),
      );
    setGranted(value);
    toast.success(
      value
        ? tr([
            "Consentimento registrado.",
            "Consent recorded.",
            "Consentimiento registrado.",
            "Consentement enregistré.",
          ])
        : tr([
            "Consentimento revogado.",
            "Consent withdrawn.",
            "Consentimiento revocado.",
            "Consentement retiré.",
          ]),
    );
  };

  const exportData = async () => {
    setExporting(true);
    const { data, error } = await supabase.rpc("export_my_data");
    setExporting(false);
    if (error || !data)
      return void toast.error(
        tr([
          "Não foi possível gerar o arquivo agora.",
          "Could not create the file right now.",
          "No se pudo generar el archivo ahora.",
          "Impossible de créer le fichier pour le moment.",
        ]),
      );
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nutriconnect-meus-dados.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const consentLabel = tr([
    "Consentimento para dados de saúde",
    "Consent for health data",
    "Consentimiento para datos de salud",
    "Consentement pour les données de santé",
  ]);

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-xs">
      <h2 className="text-sm font-bold font-display text-foreground">
        {tr(["Seus dados (LGPD)", "Your data (LGPD)", "Tus datos (LGPD)", "Vos données (LGPD)"])}
      </h2>
      <div className="mt-2 flex items-center justify-between gap-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{consentLabel}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {tr([
              "Necessário para o acompanhamento com profissionais (diário, metas, medidas, planos e consultas). Você pode revogar quando quiser.",
              "Needed for follow-up with professionals (diary, goals, measurements, plans and appointments). You can withdraw it at any time.",
              "Necesario para el seguimiento con profesionales (diario, metas, medidas, planes y consultas). Puedes revocarlo cuando quieras.",
              "Nécessaire au suivi avec des professionnels (journal, objectifs, mesures, plans et consultations). Vous pouvez le retirer à tout moment.",
            ])}{" "}
            <Link to="/privacidade" className="font-semibold text-primary underline">
              {tr([
                "Política de Privacidade",
                "Privacy Policy",
                "Política de Privacidad",
                "Politique de confidentialité",
              ])}
            </Link>
          </p>
        </div>
        <Switch
          aria-label={consentLabel}
          checked={granted === true}
          disabled={granted === null || saving}
          onCheckedChange={toggle}
        />
      </div>
      {/* Cópias dos dados: dois botões da mesma largura */}
      <div className="grid gap-2 border-t border-border/60 pt-4 sm:grid-cols-2">
        <button type="button" onClick={exportData} disabled={exporting} className={copyBtn}>
          <Download className="h-3.5 w-3.5" />
          {exporting
            ? tr(["Gerando…", "Creating…", "Generando…", "Création…"])
            : tr([
                "Baixar meus dados (JSON)",
                "Download my data (JSON)",
                "Descargar mis datos (JSON)",
                "Télécharger mes données (JSON)",
              ])}
        </button>
        <DataSummaryButton className={copyBtn} />
      </div>
      {/* Ação de risco separada, com a cor de perigo */}
      <div className="mt-4 flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-muted-foreground">
          {tr([
            "Apaga a conta e os dados para sempre. Você confirma na próxima tela.",
            "Deletes your account and data for good. You confirm on the next screen.",
            "Elimina la cuenta y los datos para siempre. Confirmas en la siguiente pantalla.",
            "Supprime le compte et les données définitivement. Vous confirmez à l'écran suivant.",
          ])}
        </p>
        <Link
          to="/perfil/configuracoes/conta"
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-destructive/40 px-4 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {tr([
            "Excluir minha conta",
            "Delete my account",
            "Eliminar mi cuenta",
            "Supprimer mon compte",
          ])}
        </Link>
      </div>
    </section>
  );
}

const copyBtn =
  "inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-border bg-secondary/40 px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60";
