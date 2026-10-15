// Peças visuais do estúdio de redes sociais, no estilo da página de Funções: cards de seção com selo
// em degradê, tiles coloridos que inclinam com o mouse, títulos de seção com traço e ícones flutuando.
import { useRef, type CSSProperties, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ART_ICONS } from "@/lib/art-icons";
import { cn } from "@/lib/utils";
import { badgeBg, tileBg, tint } from "@/components/admin/social/kit-styles";

/** Ícone do conjunto das artes (lib/art-icons) como <svg>. */
export function ArtIcon({
  name,
  className,
  strokeWidth = 2,
}: {
  name: string;
  className?: string;
  strokeWidth?: number;
}) {
  const icon = ART_ICONS[name];
  if (!icon) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-5 w-5 shrink-0", className)}
      aria-hidden="true"
    >
      {icon.node.map(([Tag, attrs], i) => {
        const El = Tag as "path";
        return <El key={i} {...(attrs as Record<string, string>)} />;
      })}
    </svg>
  );
}

/** Selo quadrado em degradê com ícone. */
export function IconBadge({
  icon: Icon,
  color,
  size = "md",
  className,
}: {
  icon: LucideIcon;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const box =
    size === "sm"
      ? "h-8 w-8 rounded-xl"
      : size === "lg"
        ? "h-12 w-12 rounded-2xl"
        : "h-10 w-10 rounded-2xl";
  const ico = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";
  return (
    <span
      className={cn("grid shrink-0 place-items-center text-white shadow-md", box, className)}
      style={{ background: badgeBg(color) }}
    >
      <Icon className={ico} />
    </span>
  );
}

/** Card de uma seção do editor: selo, título, dica e conteúdo. */
export function StudioCard({
  icon,
  color,
  title,
  hint,
  right,
  children,
  delay = 0,
  className,
}: {
  icon: LucideIcon;
  color: string;
  title: string;
  hint?: string;
  right?: ReactNode;
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <section
      className={cn("nc-tile-in min-w-0 rounded-[1.6rem] border p-4 shadow-xs", className)}
      style={{
        animationDelay: `${delay}ms`,
        background: `linear-gradient(160deg, ${tint(color, 9)} 0%, var(--card) 55%)`,
        borderColor: `color-mix(in srgb, ${color} 20%, var(--border))`,
      }}
    >
      <header className="mb-3.5 flex min-w-0 items-center gap-3">
        <IconBadge icon={icon} color={color} size="sm" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold leading-tight text-foreground">{title}</h3>
          {hint && (
            <p className="truncate text-[11px] leading-snug text-muted-foreground">{hint}</p>
          )}
        </div>
        {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
      </header>
      {children}
    </section>
  );
}

/** Título de seção da página com selo e traço em degradê (como na página de Funções). */
export function SectionTitle({
  icon: Icon,
  color,
  children,
  right,
}: {
  icon: LucideIcon;
  color: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <h2 className="mb-3 flex min-w-0 items-center gap-2 font-display text-lg font-bold text-foreground">
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-white shadow-sm"
        style={{ background: color }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="truncate">{children}</span>
      <span
        aria-hidden="true"
        className="ml-1 h-[3px] min-w-6 flex-1 rounded-full"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)`, opacity: 0.35 }}
      />
      {right && <span className="shrink-0 font-sans text-xs font-semibold">{right}</span>}
    </h2>
  );
}

/** Tile colorido clicável que inclina na direção do mouse. */
export function Tile({
  icon: Icon,
  color,
  color2,
  title,
  text,
  badge,
  active,
  onClick,
  className,
  children,
  delay = 0,
  compact,
}: {
  icon: LucideIcon;
  color: string;
  color2?: string;
  title: string;
  text?: string;
  badge?: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
  delay?: number;
  compact?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.setProperty("--rx", `${(-y * 6).toFixed(2)}deg`);
    ref.current.style.setProperty("--ry", `${(x * 8).toFixed(2)}deg`);
  };
  const onLeave = () => {
    ref.current?.style.removeProperty("--rx");
    ref.current?.style.removeProperty("--ry");
  };
  return (
    <div className="nc-tile-in h-full min-w-0" style={{ animationDelay: `${delay}ms` }}>
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        aria-pressed={active}
        className={cn(
          "nc-tile group relative flex h-full w-full flex-col items-start overflow-hidden rounded-[1.4rem] border text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compact ? "gap-2 p-3" : "gap-2 p-3.5",
          active && "ring-2 ring-offset-2 ring-offset-background",
          className,
        )}
        style={
          {
            background: tileBg(color, color2 ?? color, active ? 26 : 14, active ? 38 : 24),
            borderColor: `color-mix(in srgb, ${color} ${active ? 55 : 22}%, transparent)`,
            "--tile": color,
            "--tw-ring-color": color,
          } as CSSProperties
        }
      >
        <span className="relative flex w-full items-start justify-between gap-2">
          <span
            className={cn(
              "grid shrink-0 place-items-center rounded-xl text-white shadow-md transition duration-300 group-hover:-rotate-6 group-hover:scale-110",
              compact ? "h-8 w-8" : "h-10 w-10 rounded-2xl",
            )}
            style={{ background: badgeBg(color) }}
          >
            <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
          </span>
          {badge}
        </span>
        {children}
        <span
          className={cn(
            "relative mt-auto block w-full truncate font-bold leading-tight",
            compact ? "text-xs" : "text-[13px]",
          )}
          style={{ color: `color-mix(in srgb, ${color} 45%, var(--foreground))` }}
        >
          {title}
        </span>
        {text && (
          <span className="relative -mt-1 line-clamp-2 block w-full text-[11px] leading-snug text-foreground/70">
            {text}
          </span>
        )}
      </button>
    </div>
  );
}

/** Ícones que flutuam no fundo de um destaque (só decoração). */
export function Floaters({
  items,
}: {
  items: { icon: LucideIcon; color: string; className: string; delay?: string }[];
}) {
  return (
    <>
      {items.map(({ icon: Icon, color, className, delay }, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn(
            "nc-floaty pointer-events-none absolute hidden opacity-60 sm:block",
            className,
          )}
          style={{ animationDelay: delay }}
        >
          <Icon className="h-6 w-6" style={{ color }} />
        </span>
      ))}
    </>
  );
}

/** Estado vazio com ícone, texto e ação opcional. */
export function EmptyState({
  icon: Icon,
  color = "#555f36",
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  color?: string;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="nc-tile-in flex flex-col items-center rounded-[1.6rem] border border-dashed px-6 py-10 text-center"
      style={{
        borderColor: `color-mix(in srgb, ${color} 35%, var(--border))`,
        background: tint(color, 5),
      }}
    >
      <span className="nc-floaty">
        <IconBadge icon={Icon} color={color} size="lg" />
      </span>
      <p className="mt-3 text-sm font-bold text-foreground">{title}</p>
      {text && (
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{text}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
