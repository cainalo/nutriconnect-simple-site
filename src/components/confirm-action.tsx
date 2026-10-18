// Confirmação com a janela do site (no lugar de window.confirm): `const [ask, dialog] = useConfirm()`,
// `if (!(await ask({ title, confirmLabel }))) return;` e `{dialog}` em algum lugar do JSX.
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
