// Peças do estúdio usadas em várias abas: o card de um post salvo (miniatura da arte, rede, status e
// formato) e o botão em pílula com ícone e cor (filtros, redes, formatos).
import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  FORMAT_LABEL,
  NETWORK_LABEL,
  STATUS_LABEL,
  type PostStatus,
  type SocialPost,
} from "@/lib/social-studio";
import type { Network, PostFormat } from "@/lib/social-studio.functions";
import { cn } from "@/lib/utils";
import { NETWORK_STYLE, STATUS_STYLE, badgeBg, tint } from "@/components/admin/social/kit-styles";
import { PostThumb } from "@/components/admin/social/template-thumb";
import { useTr } from "@/components/settings-ui";

/** Card de um post salvo, com a miniatura da arte. */
export function PostCard({
  post,
  onOpen,
  delay = 0,
  extra,
}: {
  post: SocialPost;
  onOpen: () => void;
  delay?: number;
  /** Linha extra embaixo (ex.: a data agendada). */
  extra?: ReactNode;
}) {
  const tr = useTr();
  const net = NETWORK_STYLE[post.network as Network] ?? NETWORK_STYLE.outro;
  const st = STATUS_STYLE[post.status as PostStatus] ?? STATUS_STYLE.rascunho;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="nc-tile-in st-card group block w-full min-w-0 overflow-hidden rounded-[1.25rem] border border-border/60 bg-card text-left"
      style={{ animationDelay: `${Math.min(delay, 600)}ms` }}
    >
      <div className="relative overflow-hidden">
        <PostThumb
          post={post}
          className="aspect-[4/5] w-full transition duration-500 group-hover:scale-[1.04]"
        />
      </div>
      <div className="px-3 py-2.5">
        <p className="truncate text-xs font-bold text-foreground">
          {post.title || tr(["Sem título", "Untitled", "Sin título", "Sans titre"])}
        </p>
        <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
          <span
            className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-white"
            style={{ background: badgeBg(net.color) }}
            title={NETWORK_LABEL[post.network as Network]}
          >
            <net.icon className="h-3 w-3" />
          </span>
          <span
            className="inline-flex h-5 min-w-0 items-center gap-1 rounded-full px-1.5 text-[10px] font-bold"
            style={{ background: tint(st.color, 14), color: st.color }}
          >
            <st.icon className="h-3 w-3 shrink-0" />
            <span className="truncate">{STATUS_LABEL[post.status as PostStatus]}</span>
          </span>
          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
            {FORMAT_LABEL[post.format as PostFormat] ?? post.format}
          </span>
        </div>
        {extra}
      </div>
    </button>
  );
}

/** Pílula com ícone que liga e desliga (filtros e escolhas). */
export function Pill({
  icon: Icon,
  color,
  active,
  onClick,
  children,
  count,
}: {
  icon?: LucideIcon;
  color: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition duration-200 hover:-translate-y-0.5",
        active
          ? "border-transparent text-white shadow-sm"
          : "border-border/70 bg-card text-muted-foreground hover:text-foreground",
      )}
      style={active ? ({ background: badgeBg(color) } as CSSProperties) : undefined}
    >
      {Icon && (
        <Icon
          className="h-3.5 w-3.5 shrink-0"
          style={
            active ? undefined : { color: `color-mix(in srgb, ${color} 70%, var(--foreground))` }
          }
        />
      )}
      {children}
      {count != null && (
        <span
          className={cn(
            "grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold",
            active ? "bg-white/25 text-white" : "",
          )}
          style={active ? undefined : { background: tint(color, 14), color }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
