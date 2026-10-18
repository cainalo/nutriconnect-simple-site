import { useState } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { buildDataSummaryHtml, preopenDataSummary, writeDataSummary } from "@/lib/data-summary";
import { useTr } from "@/components/settings-ui";

/**
 * "Resumo para ler (PDF)": cópia dos dados (LGPD) em versão legível. A aba abre já no
 * clique, antes de buscar os dados, para o celular e o app não bloquearem a janela.
 */
export function DataSummaryButton({ className }: { className?: string }) {
  const tr = useTr();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    const win = preopenDataSummary(
      tr([
        "Gerando o resumo…",
        "Creating the summary…",
        "Generando el resumen…",
        "Création du résumé…",
      ]),
    );
    if (!win)
      return void toast.error(
        tr([
          "O navegador bloqueou a nova aba. Permita pop-ups e tente de novo.",
          "The browser blocked the new tab. Allow pop-ups and try again.",
          "El navegador bloqueó la pestaña. Permite ventanas emergentes e inténtalo de nuevo.",
          "Le navigateur a bloqué l'onglet. Autorisez les fenêtres et réessayez.",
        ]),
      );
    setBusy(true);
    const { data, error } = await supabase.rpc("export_my_data");
    setBusy(false);
    if (error || !data) {
      win.close();
      return void toast.error(
        tr([
          "Não foi possível gerar o resumo agora.",
          "Could not create the summary right now.",
          "No se pudo generar el resumen ahora.",
          "Impossible de créer le résumé pour le moment.",
        ]),
      );
    }
    const html = buildDataSummaryHtml(data as Record<string, unknown>, {
      title: tr([
        "Meus dados no NutriConnect",
        "My data on NutriConnect",
        "Mis datos en NutriConnect",
        "Mes données sur NutriConnect",
      ]),
      intro: tr([
        "Cópia de tudo o que o NutriConnect guarda sobre você (LGPD, art. 18). Para salvar em PDF, escolha “Salvar como PDF” na impressão.",
        "A copy of everything NutriConnect keeps about you (LGPD, art. 18). To save as PDF, choose “Save as PDF” when printing.",
        "Copia de todo lo que NutriConnect guarda sobre ti (LGPD, art. 18). Para guardar en PDF, elige “Guardar como PDF” al imprimir.",
        "Copie de tout ce que NutriConnect conserve sur vous (LGPD, art. 18). Pour un PDF, choisissez « Enregistrer au format PDF » à l'impression.",
      ]),
      empty: tr([
        "Nada registrado.",
        "Nothing recorded.",
        "Nada registrado.",
        "Rien d'enregistré.",
      ]),
      generated: new Date().toLocaleString(),
    });
    writeDataSummary(win, html);
  };

  return (
    <button type="button" onClick={run} disabled={busy} className={className}>
      <Printer className="h-3.5 w-3.5" />
      {busy
        ? tr(["Gerando…", "Creating…", "Generando…", "Création…"])
        : tr([
            "Resumo para ler (PDF)",
            "Readable summary (PDF)",
            "Resumen para leer (PDF)",
            "Résumé lisible (PDF)",
          ])}
    </button>
  );
}
