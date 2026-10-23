// Confirmação com o diálogo do site (no lugar de window.confirm), de dois jeitos:
// - <ConfirmAction open … onConfirm /> controlada por estado;
// - `const [ask, dialog] = useConfirm()`, `if (!(await ask({ title, confirmLabel }))) return;` e
//   `{dialog}` em algum lugar do JSX.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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

// ── Confirmação de qualquer lugar, sem montar diálogo em cada tela ──
// `if (!(await siteConfirm("Apagar?"))) return;`. O diálogo fica num só lugar (ConfirmHost, no
// __root). Sem o host montado (ex.: testes), cai no confirm do navegador.
type Pending = ConfirmOptions & {
  resolve: (ok: boolean) => void;
  /** Pedido de texto (sitePrompt): valor inicial do campo. */
  input?: string;
};
let pushConfirm: ((p: Pending) => void) | null = null;

export function siteConfirm(
  message: string,
  opts: Partial<Omit<ConfirmOptions, "title">> = {},
): Promise<boolean> {
  if (!pushConfirm) return Promise.resolve(window.confirm(message));
  return new Promise((resolve) =>
    pushConfirm!({ title: message, confirmLabel: "", danger: true, ...opts, resolve }),
  );
}

/** Pede um texto com o diálogo do site; null se a pessoa cancelar. */
export function sitePrompt(message: string, initial = ""): Promise<string | null> {
  if (!pushConfirm) return Promise.resolve(window.prompt(message, initial));
  return new Promise((resolve) => {
    let value = initial;
    pushConfirm!({
      title: message,
      confirmLabel: "",
      danger: false,
      input: initial,
      onInput: (v: string) => (value = v),
      resolve: (ok) => resolve(ok ? value : null),
    } as Pending);
  });
}

export function ConfirmHost() {
  const tr = useTr();
  const [pending, setPending] = useState<Pending | null>(null);
  const [text, setText] = useState("");
  const current = useRef<Pending | null>(null);
  useEffect(() => {
    pushConfirm = (p) => {
      current.current?.resolve(false);
      current.current = p;
      setText(p.input ?? "");
      setPending(p);
    };
    return () => {
      pushConfirm = null;
    };
  }, []);
  const finish = (ok: boolean) => {
    current.current?.resolve(ok);
    current.current = null;
    setPending(null);
  };
  return (
    <AlertDialog open={!!pending} onOpenChange={(o) => !o && finish(false)}>
      <AlertDialogContent className="max-w-md rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base leading-snug">{pending?.title}</AlertDialogTitle>
          {pending?.description && (
            <AlertDialogDescription>{pending.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        {pending?.input !== undefined && (
          <input
            autoFocus
            value={text}
            aria-label={pending.title}
            onChange={(e) => {
              setText(e.target.value);
              (pending as Pending & { onInput?: (v: string) => void }).onInput?.(e.target.value);
            }}
            onKeyDown={(e) => e.key === "Enter" && finish(true)}
            className="min-h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
          />
        )}
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="min-h-10 rounded-full" onClick={() => finish(false)}>
            {pending?.cancelLabel ?? tr(["Cancelar", "Cancel", "Cancelar", "Annuler"])}
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              "min-h-10 rounded-full",
              pending?.danger && buttonVariants({ variant: "destructive" }),
            )}
            onClick={() => finish(true)}
          >
            {pending?.confirmLabel || tr(["Confirmar", "Confirm", "Confirmar", "Confirmer"])}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
