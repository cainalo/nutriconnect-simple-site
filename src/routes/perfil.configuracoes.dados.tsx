import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { LEGAL_VERSION } from "@/lib/legal";
import { useI18n } from "@/hooks/use-i18n";
import { formatDate } from "@/lib/clinical/format";
import { DataSummaryButton } from "@/components/data-summary-button";
import { useConfirm } from "@/components/confirm-action";
import {
  Row,
  SettingsCard,
  SettingsPage,
  buttonClass,
  dangerButtonClass,
  useTr,
} from "@/components/settings-ui";

export const Route = createFileRoute("/perfil/configuracoes/dados")({
  head: () => ({ meta: [{ title: "Dados e histórico — NutriConnect" }] }),
  component: DadosPage,
});

/** Chaves guardadas só neste navegador que fazem parte do progresso da trilha. */
const trailKeys = () =>
  Object.keys(window.localStorage).filter((k) => k.startsWith("nutriconnect_trail_"));

function DadosPage() {
  const { user } = useAuth();
  const { locale } = useI18n();
  const tr = useTr();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [ask, confirmDialog] = useConfirm();
  const userId = user?.id;

  const nina = useQuery({
    queryKey: ["settings", "nina-count", userId],
    enabled: !!userId,
    queryFn: async () => {
      // Quantas mensagens e de quando são a mais antiga e a mais nova.
      const [{ count }, first, last] = await Promise.all([
        supabase
          .from("nina_messages")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId!),
        supabase
          .from("nina_messages")
          .select("created_at")
          .eq("user_id", userId!)
          .order("created_at", { ascending: true })
          .limit(1),
        supabase
          .from("nina_messages")
          .select("created_at")
          .eq("user_id", userId!)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);
      return {
        count: count ?? 0,
        oldest: (first.data?.[0]?.created_at as string | undefined) ?? null,
        newest: (last.data?.[0]?.created_at as string | undefined) ?? null,
      };
    },
  });

  const consents = useQuery({
    queryKey: ["settings", "consents", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("consents")
        .select("id, kind, version, granted, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  if (!user) return null;

  const exportData = async () => {
    setBusy("export");
    const { data, error } = await supabase.rpc("export_my_data");
    setBusy(null);
    if (error || !data)
      return void toast.error(
        tr([
          "Não foi possível gerar o arquivo agora.",
          "Could not generate the file right now.",
          "No se pudo generar el archivo ahora.",
          "Impossible de générer le fichier pour le moment.",
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

  const clearNina = async () => {
    const ok = await ask({
      title: tr([
        "Apagar todas as suas conversas com a Nina?",
        "Delete all your conversations with Nina?",
        "¿Borrar todas tus conversaciones con Nina?",
        "Supprimer toutes vos conversations avec Nina ?",
      ]),
      description: tr([
        "Isso não pode ser desfeito.",
        "This cannot be undone.",
        "No se puede deshacer.",
        "Action irréversible.",
      ]),
      confirmLabel: tr(["Apagar agora", "Delete now", "Borrar ahora", "Supprimer maintenant"]),
      danger: true,
    });
    if (!ok) return;
    setBusy("nina");
    const { error } = await supabase.from("nina_messages").delete().eq("user_id", user.id);
    setBusy(null);
    if (error)
      return void toast.error(
        tr([
          "Não foi possível apagar agora.",
          "Could not delete right now.",
          "No se pudo borrar ahora.",
          "Impossible de supprimer pour le moment.",
        ]),
      );
    toast.success(
      tr([
        "Conversas apagadas.",
        "Conversations deleted.",
        "Conversaciones borradas.",
        "Conversations supprimées.",
      ]),
    );
    void qc.invalidateQueries({ queryKey: ["settings", "nina-count"] });
  };

  const clearTrail = async () => {
    const keys = trailKeys();
    if (keys.length === 0) {
      return void toast.info(
        tr([
          "Não há progresso da trilha salvo neste aparelho.",
          "There is no trail progress saved on this device.",
          "No hay progreso de la ruta guardado en este dispositivo.",
          "Aucune progression du parcours n'est enregistrée sur cet appareil.",
        ]),
      );
    }
    const ok = await ask({
      title: tr([
        "Apagar o progresso da trilha deste aparelho?",
        "Delete the trail progress from this device?",
        "¿Borrar el progreso de la ruta de este dispositivo?",
        "Supprimer la progression du parcours de cet appareil ?",
      ]),
      description: tr([
        "O progresso e os perfis infantis ficam só aqui e não podem ser recuperados.",
        "The progress and child profiles live only here and cannot be recovered.",
        "El progreso y los perfiles infantiles solo están aquí y no se pueden recuperar.",
        "La progression et les profils enfants ne sont qu'ici et sont irrécupérables.",
      ]),
      confirmLabel: tr(["Apagar", "Delete", "Borrar", "Supprimer"]),
      danger: true,
    });
    if (!ok) return;
    for (const k of keys) window.localStorage.removeItem(k);
    toast.success(
      tr([
        "Progresso da trilha apagado deste aparelho.",
        "Trail progress deleted from this device.",
        "Progreso de la ruta borrado de este dispositivo.",
        "Progression du parcours supprimée de cet appareil.",
      ]),
    );
  };

  const kindName = (kind: string) =>
    kind === "saude"
      ? tr(["Dados de saúde", "Health data", "Datos de salud", "Données de santé"])
      : tr([
          "Termos e Política de Privacidade",
          "Terms and Privacy Policy",
          "Términos y Política de Privacidad",
          "Conditions et Politique de confidentialité",
        ]);

  // Versões dos termos são datas (AAAA-MM-DD): mostradas por extenso.
  const versionText = (v: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(v)
      ? formatDate(v, locale, { day: "numeric", month: "long", year: "numeric" })
      : v;
  const ninaCount = nina.data?.count ?? 0;
  const dayText = (iso: string) =>
    formatDate(iso, locale, { day: "numeric", month: "short", year: "numeric" });

  return (
    <SettingsPage
      title={tr([
        "Dados e histórico",
        "Data and history",
        "Datos e historial",
        "Données et historique",
      ])}
      hint={tr([
        "Veja, baixe ou apague o que o NutriConnect guarda sobre você.",
        "See, download or delete what NutriConnect keeps about you.",
        "Mira, descarga o borra lo que NutriConnect guarda sobre ti.",
        "Consultez, téléchargez ou supprimez ce que NutriConnect conserve sur vous.",
      ])}
    >
      <SettingsCard
        title={tr(["Meus dados", "My data", "Mis datos", "Mes données"])}
        hint={tr([
          "Uma cópia de tudo que sabemos sobre a sua conta: em arquivo JSON ou num resumo para ler e salvar em PDF.",
          "A copy of everything we know about your account: as a JSON file or a readable summary to save as PDF.",
          "Una copia de todo lo que sabemos sobre tu cuenta: en archivo JSON o en un resumen para leer y guardar en PDF.",
          "Une copie de tout ce que nous savons sur votre compte : en fichier JSON ou en résumé lisible à enregistrer en PDF.",
        ])}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={exportData}
            disabled={busy === "export"}
            className={`${buttonClass} min-h-10 w-full`}
          >
            <Download className="h-3.5 w-3.5" />
            {busy === "export"
              ? tr(["Gerando…", "Generating…", "Generando…", "Génération…"])
              : tr([
                  "Baixar meus dados (JSON)",
                  "Download my data (JSON)",
                  "Descargar mis datos (JSON)",
                  "Télécharger mes données (JSON)",
                ])}
          </button>
          <DataSummaryButton className={`${buttonClass} min-h-10 w-full`} />
        </div>
      </SettingsCard>

      <SettingsCard
        title={tr([
          "Conversas com a Nina",
          "Conversations with Nina",
          "Conversaciones con Nina",
          "Conversations avec Nina",
        ])}
        hint={tr([
          "As conversas ficam guardadas por 90 dias e depois são apagadas sozinhas.",
          "Conversations are kept for 90 days and then deleted automatically.",
          "Las conversaciones se guardan 90 días y luego se borran solas.",
          "Les conversations sont conservées 90 jours puis supprimées automatiquement.",
        ])}
      >
        <Row
          title={
            ninaCount === 1
              ? tr([
                  "1 mensagem guardada",
                  "1 saved message",
                  "1 mensaje guardado",
                  "1 message enregistré",
                ])
              : `${ninaCount} ${tr(["mensagens guardadas", "saved messages", "mensajes guardados", "messages enregistrés"])}`
          }
          hint={
            nina.data?.oldest && nina.data.newest
              ? `${tr(["De", "From", "Del", "Du"])} ${dayText(nina.data.oldest)} ${tr(["a", "to", "al", "au"])} ${dayText(nina.data.newest)}`
              : undefined
          }
        >
          <button
            type="button"
            onClick={clearNina}
            disabled={busy === "nina" || ninaCount === 0}
            className={dangerButtonClass}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {tr(["Apagar agora", "Delete now", "Borrar ahora", "Supprimer maintenant"])}
          </button>
        </Row>
      </SettingsCard>

      <SettingsCard
        title={tr(["Neste aparelho", "On this device", "En este dispositivo", "Sur cet appareil"])}
        hint={tr([
          "O progresso da trilha de aprendizado e os perfis infantis ficam salvos só neste navegador.",
          "The learning-trail progress and child profiles are saved only in this browser.",
          "El progreso de la ruta de aprendizaje y los perfiles infantiles se guardan solo en este navegador.",
          "La progression du parcours d'apprentissage et les profils enfants ne sont enregistrés que dans ce navigateur.",
        ])}
      >
        <button type="button" onClick={clearTrail} className={dangerButtonClass}>
          <Trash2 className="h-3.5 w-3.5" />
          {tr([
            "Apagar progresso da trilha deste aparelho",
            "Delete trail progress from this device",
            "Borrar el progreso de la ruta de este dispositivo",
            "Supprimer la progression du parcours de cet appareil",
          ])}
        </button>
      </SettingsCard>

      <SettingsCard
        title={tr([
          "Meus consentimentos",
          "My consents",
          "Mis consentimientos",
          "Mes consentements",
        ])}
        hint={tr([
          `Registro de quando você aceitou os documentos (versão atual: ${versionText(LEGAL_VERSION)}).`,
          `Record of when you accepted the documents (current version: ${versionText(LEGAL_VERSION)}).`,
          `Registro de cuándo aceptaste los documentos (versión actual: ${versionText(LEGAL_VERSION)}).`,
          `Historique de vos acceptations des documents (version actuelle : ${versionText(LEGAL_VERSION)}).`,
        ])}
      >
        {consents.data && consents.data.length > 0 ? (
          <ul className="divide-y divide-border/60 rounded-xl border border-border/60">
            {consents.data.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-xs"
              >
                <span className="font-medium text-foreground">{kindName(c.kind)}</span>
                <span className="text-muted-foreground">
                  {c.granted
                    ? tr(["aceito", "accepted", "aceptado", "accepté"])
                    : tr(["revogado", "revoked", "revocado", "révoqué"])}{" "}
                  · {tr(["versão de", "version of", "versión del", "version du"])}{" "}
                  {versionText(c.version)} ·{" "}
                  {formatDate(c.created_at, locale, {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">
            {tr([
              "Nenhum registro ainda.",
              "No records yet.",
              "Aún no hay registros.",
              "Aucun enregistrement pour le moment.",
            ])}
          </p>
        )}
        <Link
          to="/perfil/configuracoes/privacidade"
          className="inline-block text-xs font-semibold text-accent underline-offset-2 hover:underline"
        >
          {tr([
            "Gerenciar o consentimento de saúde →",
            "Manage health-data consent →",
            "Gestionar el consentimiento de datos de salud →",
            "Gérer le consentement pour les données de santé →",
          ])}
        </Link>
      </SettingsCard>

      <SettingsCard
        title={tr([
          "Excluir a conta",
          "Delete account",
          "Eliminar la cuenta",
          "Supprimer le compte",
        ])}
        hint={tr([
          "Apaga a sua conta e os seus dados pessoais, salvo o que a lei exige guardar.",
          "Deletes your account and personal data, except what the law requires us to keep.",
          "Elimina tu cuenta y tus datos personales, salvo lo que la ley exige conservar.",
          "Supprime votre compte et vos données personnelles, sauf ce que la loi impose de conserver.",
        ])}
        tone="danger"
      >
        <Link to="/perfil/configuracoes/conta" className={dangerButtonClass}>
          {tr([
            "Ir para exclusão da conta",
            "Go to account deletion",
            "Ir a eliminar la cuenta",
            "Aller à la suppression du compte",
          ])}
        </Link>
      </SettingsCard>
      {confirmDialog}
    </SettingsPage>
  );
}
