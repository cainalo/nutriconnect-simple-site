import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useTr } from "@/components/settings-ui";
import type { Names } from "@/lib/appearance-data";

type Target = "post" | "comment" | "user";

const REASONS: { value: string; label: Names }[] = [
  {
    value: "spam",
    label: [
      "Spam, golpe ou venda enganosa",
      "Spam, scam or misleading sales",
      "Spam, estafa o venta engañosa",
      "Spam, arnaque ou vente trompeuse",
    ],
  },
  {
    value: "desinformacao",
    label: [
      "Desinformação de saúde",
      "Health misinformation",
      "Desinformación de salud",
      "Désinformation sur la santé",
    ],
  },
  {
    value: "ofensivo",
    label: [
      "Ofensivo ou discriminatório",
      "Offensive or discriminatory",
      "Ofensivo o discriminatorio",
      "Offensant ou discriminatoire",
    ],
  },
  {
    value: "assedio",
    label: [
      "Assédio ou ameaça",
      "Harassment or threat",
      "Acoso o amenaza",
      "Harcèlement ou menace",
    ],
  },
  {
    value: "inadequado",
    label: [
      "Conteúdo impróprio (sexual, violento, envolve menores)",
      "Inappropriate content (sexual, violent, involves minors)",
      "Contenido inapropiado (sexual, violento, involucra a menores)",
      "Contenu inapproprié (sexuel, violent, implique des mineurs)",
    ],
  },
  { value: "outro", label: ["Outro motivo", "Other reason", "Otro motivo", "Autre motif"] },
];

/** Formulário de denúncia (aberto por fora: botão ou menu ⋯). Grava em reports; a equipe revisa no /admin. */
export function ReportDialog({
  targetType,
  targetId,
  open,
  onOpenChange,
}: {
  targetType: Target;
  targetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const tr = useTr();
  const { user } = useAuth();
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const setOpen = onOpenChange;

  if (!user) return null;
  const send = async () => {
    setSending(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      details: details.trim() || null,
    });
    setSending(false);
    if (error) {
      // 23505 = já denunciou este mesmo item.
      if (error.code === "23505")
        toast.info(
          tr([
            "Você já denunciou este conteúdo. Obrigado!",
            "You already reported this content. Thank you!",
            "Ya denunciaste este contenido. ¡Gracias!",
            "Vous avez déjà signalé ce contenu. Merci !",
          ]),
        );
      else
        toast.error(
          tr([
            "Não foi possível enviar a denúncia. Tente novamente.",
            "Could not send the report. Please try again.",
            "No se pudo enviar la denuncia. Inténtalo de nuevo.",
            "Impossible d’envoyer le signalement. Réessayez.",
          ]),
        );
    } else {
      toast.success(
        tr([
          "Denúncia enviada. Nossa equipe vai analisar.",
          "Report sent. Our team will review it.",
          "Denuncia enviada. Nuestro equipo la revisará.",
          "Signalement envoyé. Notre équipe va l’examiner.",
        ]),
      );
    }
    setOpen(false);
    setDetails("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-2xl">
        <DialogHeader className="text-left">
          <DialogTitle className="font-display">
            {tr(["Denunciar", "Report", "Denunciar", "Signaler"])}
          </DialogTitle>
          <DialogDescription>
            {tr([
              "Sua denúncia é anônima para o autor. Veja as",
              "The author won't know who reported. See the",
              "Tu denuncia es anónima para el autor. Mira las",
              "Votre signalement reste anonyme pour l’auteur. Voir les",
            ])}{" "}
            <a href="/diretrizes" target="_blank" rel="noreferrer" className="underline">
              {tr([
                "Diretrizes da Comunidade",
                "Community Guidelines",
                "Normas de la Comunidad",
                "Règles de la communauté",
              ])}
            </a>
            .
          </DialogDescription>
        </DialogHeader>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-foreground">
            {tr(["Motivo", "Reason", "Motivo", "Motif"])}
          </span>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {tr(r.label)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-foreground">
            {tr([
              "Detalhes (opcional)",
              "Details (optional)",
              "Detalles (opcional)",
              "Détails (facultatif)",
            ])}
          </span>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-secondary"
          >
            {tr(["Cancelar", "Cancel", "Cancelar", "Annuler"])}
          </button>
          <button
            type="button"
            disabled={sending}
            onClick={send}
            className="rounded-full bg-destructive px-5 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {sending
              ? tr(["Enviando…", "Sending…", "Enviando…", "Envoi…"])
              : tr(["Enviar denúncia", "Send report", "Enviar denuncia", "Envoyer le signalement"])}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Botão “Denunciar” com o formulário. */
export function ReportButton({
  targetType,
  targetId,
  className = "",
  label,
}: {
  targetType: Target;
  targetId: string;
  className?: string;
  label?: string;
}) {
  const tr = useTr();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  label ??= tr(["Denunciar", "Report", "Denunciar", "Signaler"]);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={label}
        aria-label={label}
        className={`inline-flex items-center gap-1 text-[10px] text-muted-foreground transition hover:text-destructive cursor-pointer ${className}`}
      >
        <Flag className="h-3 w-3" />
        <span>{label}</span>
      </button>
      <ReportDialog
        targetType={targetType}
        targetId={targetId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
