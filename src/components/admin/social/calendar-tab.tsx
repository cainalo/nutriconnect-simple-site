// Calendário editorial do estúdio (S1): os posts com data no mês, as datas de saúde e os posts
// ainda sem data, para arrastar o planejamento.
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Panel, btnCls } from "@/components/admin/admin-ui";
import { HEALTH_DATES } from "@/lib/social-calendar";
import {
  FORMAT_LABEL,
  STATUS_LABEL,
  useSocialPosts,
  type PostStatus,
  type SocialPost,
} from "@/lib/social-studio";
import type { PostFormat } from "@/lib/social-studio.functions";

const WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const pad = (n: number) => String(n).padStart(2, "0");
const STATUS_DOT: Record<PostStatus, string> = {
  ideia: "bg-muted-foreground/40",
  rascunho: "bg-warning",
  aprovado: "bg-accent",
  agendado: "bg-primary",
  publicado: "bg-emerald-500",
};

export function CalendarTab({
  onOpen,
  onNew,
}: {
  onOpen: (p: SocialPost) => void;
  /** Novo post já com a data do dia. */
  onNew?: (date: string) => void;
}) {
  const posts = useSocialPosts();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const first = new Date(cursor.y, cursor.m, 1);
  const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const lead = first.getDay();
  const cells = Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, i) => i - lead + 1);
  const list = (posts.data ?? []).filter((p) => !p.is_template);
  const byDay = new Map<number, SocialPost[]>();
  for (const p of list) {
    if (!p.scheduled_for) continue;
    const [y, m, d] = p.scheduled_for.split("-").map(Number);
    if (y === cursor.y && m === cursor.m + 1) byDay.set(d, [...(byDay.get(d) ?? []), p]);
  }
  const dates = HEALTH_DATES.filter((d) => d.month === cursor.m + 1);
  const monthCampaigns = dates.filter((d) => !d.day);
  const unscheduled = list.filter((p) => !p.scheduled_for && p.status !== "publicado");
  const today = new Date();
  const isToday = (d: number) =>
    today.getFullYear() === cursor.y && today.getMonth() === cursor.m && today.getDate() === d;
  const move = (n: number) =>
    setCursor((c) => {
      const d = new Date(c.y, c.m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
      <Panel
        title={first.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        action={
          <div className="flex gap-1">
            <button
              type="button"
              className={btnCls}
              onClick={() => move(-1)}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={btnCls}
              onClick={() => move(1)}
              aria-label="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        }
      >
        {monthCampaigns.length > 0 && (
          <p className="mb-3 text-xs text-muted-foreground">
            Campanhas do mês: {monthCampaigns.map((d) => d.title).join(" · ")}
          </p>
        )}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-muted-foreground">
          {WEEK.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            const inMonth = d >= 1 && d <= days;
            const special = inMonth ? dates.filter((x) => x.day === d) : [];
            return (
              <div
                key={i}
                className={`group min-h-24 rounded-xl border p-1.5 text-left transition hover:border-accent/50 ${
                  inMonth ? "border-border/70 bg-card" : "border-transparent"
                } ${isToday(d) ? "ring-2 ring-accent/60" : ""}`}
              >
                {inMonth && (
                  <>
                    <p className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                      {pad(d)}
                      {onNew && (
                        <button
                          type="button"
                          onClick={() => onNew(`${cursor.y}-${pad(cursor.m + 1)}-${pad(d)}`)}
                          className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[12px] leading-none text-accent-foreground opacity-0 transition group-hover:opacity-100"
                          aria-label="Novo post neste dia"
                        >
                          +
                        </button>
                      )}
                    </p>
                    {special.map((s) => (
                      <p
                        key={s.title}
                        className="mt-0.5 rounded bg-accent-soft px-1 text-[10px] leading-tight text-foreground"
                        title={s.angle}
                      >
                        {s.title}
                      </p>
                    ))}
                    {(byDay.get(d) ?? []).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onOpen(p)}
                        className="mt-0.5 flex w-full items-center gap-1 truncate rounded bg-secondary px-1 text-left text-[10px] leading-tight text-foreground hover:bg-secondary/70"
                        title={`${FORMAT_LABEL[p.format as PostFormat]} · ${STATUS_LABEL[p.status as PostStatus]}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[p.status as PostStatus]}`}
                        />
                        <span className="truncate">{p.title}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          {(Object.keys(STATUS_DOT) as PostStatus[]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} /> {STATUS_LABEL[s]}
            </span>
          ))}
        </div>
      </Panel>

      <Panel
        title={`Sem data (${unscheduled.length})`}
        hint="Abra um post e escolha a data para ele aparecer no calendário."
      >
        <ul className="space-y-1.5">
          {unscheduled.slice(0, 40).map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onOpen(p)}
                className="w-full truncate rounded-xl border border-border/70 px-3 py-2 text-left text-xs text-foreground hover:bg-secondary/50"
              >
                {p.title}
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
