// Habilitação para teleconsulta (M4) nas configurações do profissional: situação, envio do cadastro
// do conselho (e-Nutricionista, e-Psi...) com o comprovante, e o motivo de uma recusa.
import { useRef, useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Clock, FileUp, XCircle } from "lucide-react";
import { Card, Field, buttonPrimary, inputClass } from "@/components/clinical/ui";
import { useTr } from "@/components/appearance-editor";
import { useAuth } from "@/hooks/use-auth";
import {
  REGISTRY_LABEL,
  useMyTeleconsult,
  useSubmitTeleconsult,
  useTeleconsultRequired,
  type Registry,
} from "@/lib/teleconsult";

export function TeleconsultCard({ profession }: { profession?: string }) {
  const tr = useTr();
  const { user } = useAuth();
  const mine = useMyTeleconsult(user?.id);
  const required = useTeleconsultRequired();
  const submit = useSubmitTeleconsult(user?.id);
  const [registry, setRegistry] = useState<Registry>(
    /psic/i.test(profession ?? "") ? "e-psi" : "e-nutricionista",
  );
  const [number, setNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const input = useRef<HTMLInputElement>(null);

  // Sem a tabela no banco (migration pendente), o card não aparece.
  if (mine.isError || mine.isLoading) return null;
  const approvedAt = mine.data?.approvedAt;
  const latest = mine.data?.latest;
  const pending = latest?.status === "em_analise";

  return (
    <Card title={tr(["Teleconsulta", "Teleconsultation", "Teleconsulta", "Téléconsultation"])}>
      {approvedAt ? (
        <p className="flex items-center gap-2 text-sm text-foreground">
          <BadgeCheck className="h-5 w-5 text-accent" />
          {tr([
            "Habilitado(a) para teleconsulta. O selo “Teleconsulta verificada” aparece no seu perfil.",
            "Cleared for teleconsultation. The “Verified teleconsultation” badge shows on your profile.",
            "Habilitado(a) para teleconsulta. El sello “Teleconsulta verificada” aparece en tu perfil.",
            "Habilité(e) à la téléconsultation. Le badge « Téléconsultation vérifiée » apparaît sur votre profil.",
          ])}
        </p>
      ) : pending ? (
        <p className="flex items-center gap-2 text-sm text-foreground">
          <Clock className="h-5 w-5 text-muted-foreground" />
          {tr([
            "Recebemos o seu cadastro. A equipe confere e avisa você em breve.",
            "We got your registration. The team will check it and let you know soon.",
            "Recibimos tu registro. El equipo lo revisa y te avisa pronto.",
            "Nous avons reçu votre inscription. L'équipe vérifie et vous prévient bientôt.",
          ])}
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {tr([
              "Pela Resolução CFN 760/2023, quem atende a distância precisa do cadastro do conselho para teleconsulta. Informe o seu cadastro (e-Nutricionista, para nutricionistas) e envie o comprovante (print ou PDF).",
              "Under CFN Resolution 760/2023, remote care requires the council's teleconsultation registration. Enter your registration (e-Nutricionista for dietitians) and upload proof (screenshot or PDF).",
              "Según la Resolución CFN 760/2023, quien atiende a distancia necesita el registro del consejo para teleconsulta. Informa tu registro (e-Nutricionista para nutricionistas) y envía el comprobante.",
              "Selon la Résolution CFN 760/2023, la téléconsultation exige l'inscription auprès du conseil. Indiquez votre inscription (e-Nutricionista pour les diététiciens) et envoyez le justificatif.",
            ])}
            {required.data &&
              ` ${tr([
                "Sem a habilitação, as consultas online ficam indisponíveis.",
                "Without it, online consultations are unavailable.",
                "Sin la habilitación, las consultas online no están disponibles.",
                "Sans habilitation, les consultations en ligne sont indisponibles.",
              ])}`}
          </p>
          {latest?.status === "recusado" && (
            <p className="mt-2 flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {tr([
                "Pedido anterior recusado",
                "Previous request declined",
                "Solicitud anterior rechazada",
                "Demande précédente refusée",
              ])}
              {latest.rejection_reason ? `: ${latest.rejection_reason}` : "."}
            </p>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label={tr(["Cadastro", "Registration", "Registro", "Inscription"])}>
              <select
                value={registry}
                onChange={(e) => setRegistry(e.target.value as Registry)}
                className={inputClass}
              >
                {(Object.keys(REGISTRY_LABEL) as Registry[]).map((r) => (
                  <option key={r} value={r}>
                    {REGISTRY_LABEL[r]}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label={tr([
                "Número do cadastro",
                "Registration number",
                "Número de registro",
                "Numéro d'inscription",
              ])}
            >
              <input
                value={number}
                maxLength={60}
                onChange={(e) => setNumber(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
              onClick={() => input.current?.click()}
            >
              <FileUp className="h-4 w-4" />
              {file
                ? file.name
                : tr([
                    "Escolher comprovante",
                    "Choose proof",
                    "Elegir comprobante",
                    "Choisir le justificatif",
                  ])}
            </button>
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              className={buttonPrimary}
              disabled={number.trim().length < 2 || !file || submit.isPending}
              onClick={() =>
                file &&
                submit.mutate(
                  { registry, number, file },
                  {
                    onSuccess: () =>
                      toast.success(
                        tr([
                          "Cadastro enviado para análise.",
                          "Sent for review.",
                          "Enviado para revisión.",
                          "Envoyé pour vérification.",
                        ]),
                      ),
                    onError: (err) => toast.error((err as Error).message),
                  },
                )
              }
            >
              {tr(["Enviar para análise", "Send for review", "Enviar para revisión", "Envoyer"])}
            </button>
          </div>
        </>
      )}
    </Card>
  );
}
