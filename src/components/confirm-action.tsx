// Confirmação com o diálogo do site (no lugar de window.confirm), controlada por `open`.
import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { useTr } from "@/components/settings-ui";
import { cn } from "@/lib/utils";

export function ConfirmAction({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Ação que apaga ou encerra algo: botão na cor de perigo. */
  danger?: boolean;
  onConfirm: () => void;
}) {
  const tr = useTr();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="min-h-10 rounded-full">
            {cancelLabel ?? tr(["Voltar", "Go back", "Volver", "Retour"])}
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              "min-h-10 rounded-full",
              danger && buttonVariants({ variant: "destructive" }),
              danger && "min-h-10 rounded-full",
            )}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
