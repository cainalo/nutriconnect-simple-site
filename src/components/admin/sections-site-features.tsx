// Ligar e desligar partes da plataforma. Desligada: some dos menus e das laterais, e o endereço
// mostra um aviso. Administradores continuam entrando, com uma faixa avisando.
import { useMemo, useState } from "react";
import { siteConfirm } from "@/components/confirm-action";
import { useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { Badge, Panel, btnPrimary } from "@/components/admin/admin-ui";
import { FEATURES, readFeatures, type FeatureFlags } from "@/lib/features";
import { useSaveSiteConfig, useSiteConfigs } from "@/lib/site-config";
import { setDemoEnabled, useDemoEnabled } from "@/lib/clinical/demo";
import { qk } from "@/lib/clinical/queries";
import { useTr } from "@/components/settings-ui";

export function SiteFeaturesSection() {
  const tr = useTr();
  const configs = useSiteConfigs();
  const save = useSaveSiteConfig();
  const saved = useMemo(() => readFeatures(configs.data?.site_features), [configs.data]);
  const [draft, setDraft] = useState<FeatureFlags | null>(null);
  const current = draft ?? saved;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(saved);
  const offCount = FEATURES.filter((f) => !current[f.key]).length;

  return (
    <Panel
      title={tr(["Funcionalidades", "Features", "Funcionalidades", "Fonctionnalités"])}
      hint={tr([
        "Desligar esconde a funcionalidade dos menus e das colunas laterais, e o endereço dela passa a mostrar um aviso de pausa. Nada é apagado: ao ligar de novo, tudo volta como estava.",
        "Turning a feature off hides it from the menus and side columns, and its address shows a pause notice. Nothing is deleted: when you turn it back on, everything returns as it was.",
        "Desactivar oculta la funcionalidad de los menús y de las columnas laterales, y su dirección muestra un aviso de pausa. No se borra nada: al activarla de nuevo, todo vuelve a estar como antes.",
        "Désactiver masque la fonctionnalité des menus et des colonnes latérales, et son adresse affiche un avis de pause. Rien n'est supprimé : en la réactivant, tout revient comme avant.",
      ])}
      action={
        <button
          type="button"
          className={btnPrimary}
          disabled={!dirty || save.isPending}
          onClick={async () => {
            const off = FEATURES.filter((f) => !current[f.key]).map((f) => f.label);
            if (
              off.length &&
              !(await siteConfirm(
                tr([
                  `Desligar para todos: ${off.join(", ")}?`,
                  `Turn off for everyone: ${off.join(", ")}?`,
                  `¿Desactivar para todos: ${off.join(", ")}?`,
                  `Désactiver pour tout le monde : ${off.join(", ")} ?`,
                ]),
              ))
            )
              return;
            save.mutate(
              { key: "site_features", value: off.length ? current : null },
              { onSuccess: () => setDraft(null) },
            );
          }}
        >
          <Save className="h-3.5 w-3.5" />{" "}
          {save.isPending
            ? tr(["Salvando…", "Saving…", "Guardando…", "Enregistrement…"])
            : tr(["Salvar", "Save", "Guardar", "Enregistrer"])}
        </button>
      }
    >
      <p className="mb-3 text-xs text-muted-foreground">
        {offCount === 0
          ? tr(["Tudo ligado.", "Everything on.", "Todo activado.", "Tout est activé."])
          : tr([
              `${offCount} desligada(s).`,
              `${offCount} turned off.`,
              `${offCount} desactivada(s).`,
              `${offCount} désactivée(s).`,
            ])}
        {dirty && (
          <span className="ml-2 font-semibold text-amber-600">
            {tr([
              "Alterações ainda não salvas.",
              "Unsaved changes.",
              "Cambios todavía sin guardar.",
              "Modifications non enregistrées.",
            ])}
          </span>
        )}
      </p>
      <ul className="divide-y divide-border rounded-2xl border border-border">
        {FEATURES.map((f) => {
          const on = current[f.key];
          return (
            <li key={f.key} className="flex items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  {f.label}
                  {!on && (
                    <Badge tone="warn">
                      {tr(["Desligada", "Off", "Desactivada", "Désactivée"])}
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{f.description}</p>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/80">
                  {f.paths.join(" · ")}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`${on ? tr(["Desligar", "Turn off", "Desactivar", "Désactiver"]) : tr(["Ligar", "Turn on", "Activar", "Activer"])} ${f.label}`}
                onClick={() => setDraft({ ...current, [f.key]: !on })}
                className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition ${on ? "bg-accent" : "bg-border"}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[1.375rem]" : "left-0.5"}`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/** Modo demonstração do acompanhamento: dados de exemplo nas telas clínicas, só para quem liga. */
export function ClinicalDemoPanel() {
  const tr = useTr();
  const on = useDemoEnabled();
  const qc = useQueryClient();
  const toggle = () => {
    setDemoEnabled(!on);
    // Troca os dados já carregados (exemplo ↔ reais).
    qc.removeQueries({ queryKey: qk.all });
  };
  return (
    <Panel
      title={tr([
        "Modo demonstração do acompanhamento",
        "Follow-up demo mode",
        "Modo demostración del seguimiento",
        "Mode démonstration du suivi",
      ])}
      hint={tr([
        "Liga dados de exemplo (paciente, profissional, plano, metas, diário, conversa, consultas e exame) nas telas de acompanhamento e no painel do profissional. Vale só para você, neste navegador, e nada é salvo no banco. Útil para apresentar e testar sem pacientes reais.",
        "Turns on sample data (patient, professional, plan, goals, diary, chat, appointments and lab test) on the follow-up screens and the professional's dashboard. It applies only to you, in this browser, and nothing is saved to the database. Handy for demos and testing without real patients.",
        "Activa datos de ejemplo (paciente, profesional, plan, metas, diario, conversación, consultas y examen) en las pantallas de seguimiento y en el panel del profesional. Solo vale para ti, en este navegador, y no se guarda nada en la base de datos. Útil para presentar y probar sin pacientes reales.",
        "Active des données d'exemple (patient, professionnel, plan, objectifs, journal, conversation, consultations et examen) sur les écrans de suivi et le tableau de bord du professionnel. Cela ne vaut que pour vous, dans ce navigateur, et rien n'est enregistré dans la base. Pratique pour présenter et tester sans vrais patients.",
      ])}
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-semibold">
            {on
              ? tr([
                  "Ligado neste navegador",
                  "On in this browser",
                  "Activado en este navegador",
                  "Activé dans ce navigateur",
                ])
              : tr(["Desligado", "Off", "Desactivado", "Désactivé"])}
            {on && (
              <Badge tone="warn">
                {tr(["Dados de exemplo", "Sample data", "Datos de ejemplo", "Données d'exemple"])}
              </Badge>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {tr([
              "Com o modo ligado, você entra em /acompanhamento como o paciente de exemplo e em /painel como a profissional de exemplo. Ações que não dão para simular (pagamentos, agenda, convites) avisam que estão indisponíveis.",
              "With the mode on, you open /acompanhamento as the sample patient and /painel as the sample professional. Actions that can't be simulated (payments, schedule, invites) say they're unavailable.",
              "Con el modo activado, entras en /acompanhamento como el paciente de ejemplo y en /painel como la profesional de ejemplo. Las acciones que no se pueden simular (pagos, agenda, invitaciones) avisan de que no están disponibles.",
              "Avec le mode activé, vous ouvrez /acompanhamento comme le patient d'exemple et /painel comme la professionnelle d'exemple. Les actions impossibles à simuler (paiements, agenda, invitations) indiquent qu'elles sont indisponibles.",
            ])}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={
            on
              ? tr([
                  "Desligar o modo demonstração",
                  "Turn off demo mode",
                  "Desactivar el modo demostración",
                  "Désactiver le mode démonstration",
                ])
              : tr([
                  "Ligar o modo demonstração",
                  "Turn on demo mode",
                  "Activar el modo demostración",
                  "Activer le mode démonstration",
                ])
          }
          onClick={toggle}
          className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition ${on ? "bg-accent" : "bg-border"}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[1.375rem]" : "left-0.5"}`}
          />
        </button>
      </div>
    </Panel>
  );
}
