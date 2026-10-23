// Confirmação com o diálogo do site (no lugar de window.confirm), de dois jeitos:
// - <ConfirmAction open … onConfirm /> controlada por estado;
// - `const [ask, dialog] = useConfirm()`, `if (!(await ask({ title, confirmLabel }))) return;` e
//   `{dialog}` em algum lugar do JSX.
import { useCallback, useRef, useState, type ReactNode } from "react";
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
  danger = true,
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

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  /** Conteúdo extra no corpo (ex.: uma prévia). */
  extra?: ReactNode;
}

export function useConfirm(): [(opts: ConfirmOptions) => Promise<boolean>, ReactNode] {
  const tr = useTr();
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const ask = useCallback(
    (o: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolver.current?.(false);
        resolver.current = resolve;
        setOpts(o);
      }),
    [],
  );

  const finish = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpts(null);
  };

  const dialog = (
    <AlertDialog open={!!opts} onOpenChange={(o) => !o && finish(false)}>
      <AlertDialogContent className="max-h-[90dvh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>{opts?.title}</AlertDialogTitle>
          {opts?.description && <AlertDialogDescription>{opts.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {opts?.extra}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => finish(false)}>
            {opts?.cancelLabel ?? tr(["Cancelar", "Cancel", "Cancelar", "Annuler"])}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => finish(true)}
            className={opts?.danger ? buttonVariants({ variant: "destructive" }) : undefined}
          >
            {opts?.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return [ask, dialog];
}
