// Faixa do modo demonstração nas telas clínicas (só aparece para administradores com o modo ligado).
import { useQueryClient } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";
import { useTr } from "@/components/appearance-editor";
import { setDemoEnabled, useClinicalDemo } from "@/lib/clinical/demo";
import { qk } from "@/lib/clinical/queries";

export function ClinicalDemoBanner() {
  const on = useClinicalDemo();
  const tr = useTr();
  const qc = useQueryClient();
  if (!on) return null;
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
      <FlaskConical className="h-5 w-5 shrink-0 text-warning" />
      <p className="min-w-0 flex-1 text-foreground">
        <b>{tr(["Modo demonstração", "Demo mode", "Modo demostración", "Mode démonstration"])}:</b>{" "}
        {tr([
          "dados de exemplo, só neste navegador. Nada é salvo no banco.",
          "sample data, only in this browser. Nothing is saved.",
          "datos de ejemplo, solo en este navegador. No se guarda nada.",
          "données d'exemple, uniquement dans ce navigateur. Rien n'est enregistré.",
        ])}
      </p>
      <button
        type="button"
        onClick={() => {
          setDemoEnabled(false);
          qc.removeQueries({ queryKey: qk.all });
        }}
        className="cursor-pointer rounded-full border border-warning/50 px-3 py-1.5 text-xs font-semibold text-warning transition hover:bg-warning/15 "
      >
        {tr(["Desligar", "Turn off", "Desactivar", "Désactiver"])}
      </button>
    </div>
  );
}
