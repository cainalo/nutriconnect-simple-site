// Tendências do estúdio (S1): o que está em alta dentro do NutriConnect (só conteúdo público), o
// tema da semana, datas de saúde e alimentos da estação; a IA transforma isso em oportunidades.
import { useState } from "react";
import { toast } from "sonner";
import { Lightbulb, Sparkles } from "lucide-react";
import { Badge, Empty, Panel, QueryError, btnCls, btnPrimary } from "@/components/admin/admin-ui";
import { useI18n } from "@/hooks/use-i18n";
import { upcomingHealthDates } from "@/lib/social-calendar";
import { seasonNamesPt } from "@/lib/season-data";
import { useInternalTrends } from "@/lib/social-studio";
import { socialTrendsBrief, type TrendOpportunity } from "@/lib/social-studio.functions";

export function TrendsTab({ onCreate }: { onCreate: (theme: string) => void }) {
  const { locale } = useI18n();
  const trends = useInternalTrends();
  const [busy, setBusy] = useState(false);
  const [ops, setOps] = useState<TrendOpportunity[]>([]);
  const dates = upcomingHealthDates();
  const season = seasonNamesPt("SE").slice(0, 20);
  const t = trends.data;

  const brief = async () => {
    setBusy(true);
    try {
      const res = await socialTrendsBrief({
        data: { network: "instagram", locale: locale as never },
      });
      if ("error" in res)
        toast.error(
          res.error === "limit"
            ? "A cota de IA de hoje acabou."
            : "A IA não conseguiu responder agora.",
        );
      else setOps(res.opportunities);
    } catch {
      toast.error("A IA não conseguiu responder agora.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Panel
        title="Oportunidades da semana"
        hint="A IA cruza o que está em alta no NutriConnect, o calendário de saúde e a estação. Não são tendências “ao vivo” do Instagram (a rede não libera esses dados); confira também o painel de tendências da própria rede."
        action={
          <button type="button" className={btnPrimary} disabled={busy} onClick={() => void brief()}>
            <Sparkles className="h-3.5 w-3.5" /> {busy ? "Pensando…" : "Gerar oportunidades"}
          </button>
        }
      >
        {ops.length === 0 ? (
          <Empty icon={Lightbulb}>Clique em “Gerar oportunidades”.</Empty>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {ops.map((o) => (
              <article key={o.titulo} className="rounded-2xl border border-border/70 p-3 text-sm">
                <p className="font-semibold text-foreground">{o.titulo}</p>
                <p className="mt-1 text-xs text-muted-foreground">{o.por_que}</p>
                <p className="mt-2 text-foreground/90">{o.ideia}</p>
                <p className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  {o.formato && <Badge tone="info">{o.formato}</Badge>}
                  {o.quando && <Badge>{o.quando}</Badge>}
                </p>
                <button
                  type="button"
                  className={`${btnCls} mt-2`}
                  onClick={() => onCreate(`${o.titulo}: ${o.ideia}`)}
                >
                  Criar ideias com isto
                </button>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Em alta no NutriConnect (14 dias)"
          hint="Só publicações públicas, fora das comunidades."
        >
          {trends.error ? (
            <QueryError error={trends.error} />
          ) : !t ? null : (
            <div className="space-y-3 text-sm">
              {t.theme?.title && (
                <p>
                  <span className="font-semibold">Tema da semana:</span> {t.theme.title}
                </p>
              )}
              {t.top_tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {t.top_tags.map((x) => (
                    <Badge key={x.tag}>
                      #{x.tag} · {x.n}
                    </Badge>
                  ))}
                </div>
              )}
              <ol className="list-decimal space-y-1 pl-5">
                {t.top_posts.map((p, i) => (
                  <li key={i}>
                    {p.title}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({p.reactions} apoios · {p.comments} comentários)
                    </span>
                  </li>
                ))}
              </ol>
              {t.top_posts.length === 0 && (
                <p className="text-muted-foreground">Ainda pouco movimento público.</p>
              )}
              {t.challenges.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Desafios mais procurados:{" "}
                  {t.challenges.map((c) => `${c.title} (${c.people})`).join(" · ")}
                </p>
              )}
            </div>
          )}
        </Panel>
        <Panel title="Calendário e estação">
          <ul className="space-y-1 text-sm">
            {dates.map((d) => (
              <li key={d.title}>
                <span className="font-semibold">
                  {d.day ? `${d.day}/${d.month}` : `mês ${d.month}`}
                </span>{" "}
                · {d.title} <span className="text-xs text-muted-foreground">— {d.angle}</span>
              </li>
            ))}
          </ul>
          {season.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Da estação (Sudeste): {season.join(", ")}.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}
