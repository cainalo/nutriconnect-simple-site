// Peças visuais compartilhadas pelo console de administração.
import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Database,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminSetupError } from "@/lib/admin-api";
import { useTr } from "@/components/settings-ui";
import { loadLocale, localeMeta } from "@/lib/i18n";

export const inputCls =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent";
export const btnCls =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50";
export const btnPrimary =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-bold text-accent-foreground shadow-soft transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50";
export const btnDanger =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-destructive/40 px-3.5 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50";

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export function Panel({
  title,
  hint,
  action,
  children,
  className = "",
}: {
  title?: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-3xl border border-border/80 bg-card p-4 shadow-xs sm:p-5 ${className}`}
    >
      {(title || action) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && (
              <h2 className="flex items-center gap-1.5 font-display text-base font-bold text-foreground">
                {title}
                {/* A explicação fica no ícone de ajuda, sem texto corrido no topo. */}
                {hint && (
                  <span
                    title={hint}
                    role="img"
                    aria-label={hint}
                    className="cursor-help text-muted-foreground"
                  >
                    <CircleHelp className="h-4 w-4" />
                  </span>
                )}
              </h2>
            )}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
  onClick,
  compact = false,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon: LucideIcon;
  tone?: "default" | "alert" | "good";
  onClick?: () => void;
  /** Em grade de 2 colunas no celular: ícone em cima e número menor até o sm. */
  compact?: boolean;
}) {
  // Cores do design escolhido (nada de cor fixa).
  const color =
    tone === "alert" ? "var(--destructive)" : tone === "good" ? "var(--primary)" : "var(--accent)";
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`flex items-start gap-3 rounded-3xl border border-border/80 bg-card p-4 text-left shadow-xs transition ${
        onClick ? "cursor-pointer hover:shadow-soft" : ""
      } ${compact ? "flex-col gap-2 p-3.5 sm:flex-row sm:gap-3 sm:p-4" : ""}`}
    >
      <span
        className={`grid shrink-0 place-items-center rounded-2xl ${compact ? "h-9 w-9 sm:h-11 sm:w-11" : "h-11 w-11"}`}
        style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 max-w-full">
        <span
          className={`block font-display font-bold leading-none text-foreground ${compact ? "break-words text-xl sm:text-2xl" : "text-2xl"}`}
        >
          {value}
        </span>
        <span className="mt-1 block text-xs font-medium text-muted-foreground">{label}</span>
        {sub && <span className="mt-0.5 block text-[11px] text-muted-foreground">{sub}</span>}
      </span>
    </Tag>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "good" | "warn" | "bad" | "info";
}) {
  const map = {
    default: "bg-secondary text-secondary-foreground",
    good: "bg-primary/15 text-primary",
    warn: "bg-warning/15 text-warning",
    bad: "bg-destructive/15 text-destructive",
    info: "bg-accent-soft text-accent",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${map[tone]}`}
    >
      {children}
    </span>
  );
}

/** Barras simples (um valor por dia). */
export function BarChart({
  data,
  color = "var(--accent)",
  height = 120,
  ariaLabel,
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  /** Descrição para leitor de tela (ex.: total e pico do período). */
  ariaLabel?: string;
}) {
  const tr = useTr();
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div
      className="flex items-end gap-[3px]"
      style={{ height }}
      role="img"
      aria-label={
        ariaLabel ??
        tr(["Gráfico de barras", "Bar chart", "Gráfico de barras", "Graphique à barres"])
      }
    >
      {data.map((d, i) => (
        <div
          key={i}
          className="group relative flex h-full min-w-0 flex-1 items-end"
          title={`${d.label}: ${d.value}`}
        >
          <div
            className="w-full rounded-t-[3px] transition-opacity group-hover:opacity-80"
            style={{
              height: `${Math.max(d.value > 0 ? 4 : 1, (d.value / max) * 100)}%`,
              background: color,
              opacity: d.value === 0 ? 0.25 : 1,
            }}
          />
        </div>
      ))}
    </div>
  );
}

/** Barras empilhadas com legenda (várias séries por dia). */
export function StackedBars({
  labels,
  series,
  height = 140,
  ariaLabel,
}: {
  labels: string[];
  series: { name: string; color: string; values: number[] }[];
  height?: number;
  ariaLabel?: string;
}) {
  const tr = useTr();
  const totals = labels.map((_, i) => series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0));
  const max = Math.max(1, ...totals);
  return (
    <div>
      <div
        className="flex items-end gap-[3px]"
        style={{ height }}
        role="img"
        aria-label={
          ariaLabel ??
          tr([
            "Gráfico de barras empilhadas",
            "Stacked bar chart",
            "Gráfico de barras apiladas",
            "Graphique à barres empilées",
          ])
        }
      >
        {labels.map((label, i) => (
          <div
            key={i}
            className="flex h-full min-w-0 flex-1 flex-col-reverse"
            title={`${label}: ${series.map((s) => `${s.name} ${s.values[i] ?? 0}`).join(" · ")}`}
          >
            {series.map((s) => (
              <div
                key={s.name}
                style={{ height: `${((s.values[i] ?? 0) / max) * 100}%`, background: s.color }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const tr = useTr();
  return (
    <label className="relative block min-w-[14rem] flex-1">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${inputCls} pl-10 [&::-webkit-search-cancel-button]:hidden`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
          aria-label={tr([
            "Limpar busca",
            "Clear search",
            "Borrar búsqueda",
            "Effacer la recherche",
          ])}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </label>
  );
}

export function Pagination({
  offset,
  limit,
  total,
  onChange,
}: {
  offset: number;
  limit: number;
  total: number;
  onChange: (offset: number) => void;
}) {
  const tr = useTr();
  if (total <= limit)
    return total > 0 ? (
      <p className="mt-3 text-xs text-muted-foreground">
        {total}{" "}
        {total === 1
          ? tr(["resultado", "result", "resultado", "résultat"])
          : tr(["resultados", "results", "resultados", "résultats"])}
      </p>
    ) : null;
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.ceil(total / limit);
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
      <span>
        {offset + 1}–{Math.min(offset + limit, total)} {tr(["de", "of", "de", "sur"])} {total}
      </span>
      <span className="inline-flex items-center gap-2">
        <button
          type="button"
          disabled={offset === 0}
          onClick={() => onChange(Math.max(0, offset - limit))}
          className={btnCls}
          aria-label={tr([
            "Página anterior",
            "Previous page",
            "Página anterior",
            "Page précédente",
          ])}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="font-semibold text-foreground">
          {page}/{pages}
        </span>
        <button
          type="button"
          disabled={offset + limit >= total}
          onClick={() => onChange(offset + limit)}
          className={btnCls}
          aria-label={tr(["Próxima página", "Next page", "Página siguiente", "Page suivante"])}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </span>
    </div>
  );
}

export function Empty({ children, icon: Icon }: { children: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
      {Icon && <Icon className="mx-auto mb-2 h-7 w-7 opacity-50" />}
      {children}
    </div>
  );
}

/** Mostra o aviso certo quando uma consulta do painel falha (inclusive "falta aplicar a migration"). */
export function QueryError({ error }: { error: unknown }) {
  const tr = useTr();
  if (!error) return null;
  if (error instanceof AdminSetupError) {
    return (
      <div className="flex gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm text-foreground">
        <Database className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div>
          <p className="font-semibold">
            {tr([
              "As funções do painel ainda não estão no banco.",
              "The admin functions are not in the database yet.",
              "Las funciones del panel aún no están en la base de datos.",
              "Les fonctions du panneau ne sont pas encore dans la base.",
            ])}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            <code className="rounded bg-secondary px-1.5 py-0.5">npx supabase db push</code>{" "}
            {tr([
              "aplica a migration do console de administração; depois recarregue esta página.",
              "applies the admin console migration; then reload this page.",
              "aplica la migración de la consola de administración; luego recarga esta página.",
              "applique la migration de la console d'administration ; rechargez ensuite cette page.",
            ])}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
      <p>
        {error instanceof Error
          ? error.message
          : tr([
              "Não foi possível carregar.",
              "Could not load.",
              "No se pudo cargar.",
              "Chargement impossible.",
            ])}
      </p>
    </div>
  );
}

/** Confirmação antes de uma ação séria; pode pedir um motivo. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  danger = false,
  askReason = false,
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  danger?: boolean;
  askReason?: boolean;
  busy?: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const tr = useTr();
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (open) setReason("");
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {askReason && (
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-foreground">
              {tr([
                "Motivo (a pessoa será avisada)",
                "Reason (the person will be notified)",
                "Motivo (la persona será avisada)",
                "Motif (la personne sera prévenue)",
              ])}
            </span>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 300))}
              className={`${inputCls} resize-none`}
            />
          </label>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnCls}>
            {tr(["Cancelar", "Cancel", "Cancelar", "Annuler"])}
          </button>
          <button
            type="button"
            disabled={busy || (askReason && reason.trim().length < 3)}
            onClick={() => onConfirm(reason.trim())}
            className={
              danger
                ? "inline-flex cursor-pointer items-center rounded-full bg-destructive px-4 py-2 text-xs font-bold text-white transition hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
                : btnPrimary
            }
          >
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Datas no idioma da pessoa. */
const adminTag = () => localeMeta(loadLocale()).tag;
export const shortDate = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat(adminTag(), {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(iso))
    : "—";
export const dateTime = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat(adminTag(), {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso))
    : "—";
