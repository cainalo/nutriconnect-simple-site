// Perfis do estúdio (S1): cadastro das redes do NutriConnect com o que a IA precisa para analisar
// (bio, legendas recentes, números e um print), e o diagnóstico salvo.
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, ExternalLink, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import {
  Badge,
  Empty,
  Panel,
  QueryError,
  btnCls,
  btnDanger,
  btnPrimary,
  dateTime,
  inputCls,
} from "@/components/admin/admin-ui";
import { useI18n } from "@/hooks/use-i18n";
import { fileToDataUrl } from "@/lib/image";
import {
  NETWORK_LABEL,
  studioKeys,
  useDeleteProfile,
  useSaveProfile,
  useSocialProfiles,
  type SocialProfile,
} from "@/lib/social-studio";
import {
  NETWORKS,
  analyzeSocialProfile,
  type Network,
  type SocialAnalysis,
} from "@/lib/social-studio.functions";
import { useQueryClient } from "@tanstack/react-query";

const METRICS: [string, string][] = [
  ["followers", "Seguidores"],
  ["posts_per_week", "Posts por semana"],
  ["avg_likes", "Média de curtidas"],
  ["avg_comments", "Média de comentários"],
  ["avg_reach", "Alcance médio"],
];

type Draft = {
  id?: string;
  network: string;
  handle: string;
  url?: string | null;
  notes?: string;
  sample_posts?: string;
  metrics: Record<string, string>;
};

export function ProfilesTab() {
  const profiles = useSocialProfiles();
  const [draft, setDraft] = useState<Draft | null>(null);

  return (
    <Panel
      title="Perfis nas redes"
      hint="O Instagram e as outras redes não deixam ler um perfil só pelo link. Cole a bio, algumas legendas recentes e os números do painel da rede (ou envie um print na hora de analisar): a IA usa isso para o diagnóstico."
      action={
        <button
          type="button"
          className={btnPrimary}
          onClick={() => setDraft({ network: "instagram", handle: "", metrics: {} })}
        >
          <Plus className="h-3.5 w-3.5" /> Novo perfil
        </button>
      }
    >
      {draft && <ProfileForm draft={draft} onDone={() => setDraft(null)} />}
      {profiles.error ? (
        <QueryError error={profiles.error} />
      ) : (profiles.data ?? []).length === 0 && !draft ? (
        <Empty>Cadastre o primeiro perfil (ex.: o Instagram do NutriConnect).</Empty>
      ) : (
        <div className="space-y-3">
          {(profiles.data ?? []).map((p) => (
            <ProfileCard
              key={p.id}
              profile={p}
              onEdit={() =>
                setDraft({
                  id: p.id,
                  network: p.network,
                  handle: p.handle,
                  url: p.url,
                  notes: p.notes,
                  sample_posts: p.sample_posts,
                  metrics: Object.fromEntries(
                    Object.entries((p.metrics ?? {}) as Record<string, unknown>).map(([k, v]) => [
                      k,
                      String(v ?? ""),
                    ]),
                  ),
                })
              }
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

function ProfileForm({ draft, onDone }: { draft: Draft; onDone: () => void }) {
  const save = useSaveProfile();
  const [d, setD] = useState<Draft>(draft);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((o) => ({ ...o, [k]: v }));

  return (
    <div className="mb-4 space-y-3 rounded-2xl border border-accent/40 bg-accent-soft/20 p-4">
      <div className="grid gap-2 sm:grid-cols-[160px_1fr_1fr]">
        <select
          value={d.network}
          onChange={(e) => set("network", e.target.value)}
          className={inputCls}
          aria-label="Rede"
        >
          {NETWORKS.map((n) => (
            <option key={n} value={n}>
              {NETWORK_LABEL[n]}
            </option>
          ))}
        </select>
        <input
          value={d.handle}
          maxLength={80}
          onChange={(e) => set("handle", e.target.value)}
          placeholder="@perfil"
          className={inputCls}
        />
        <input
          value={d.url ?? ""}
          onChange={(e) => set("url", e.target.value)}
          placeholder="https://instagram.com/…"
          className={inputCls}
        />
      </div>
      <textarea
        value={d.notes ?? ""}
        maxLength={3000}
        rows={3}
        onChange={(e) => set("notes", e.target.value)}
        placeholder="Bio atual, público que queremos atingir, objetivo da conta…"
        className={inputCls}
      />
      <div className="grid gap-2 sm:grid-cols-5">
        {METRICS.map(([k, label]) => (
          <label key={k} className="text-[11px] font-semibold text-muted-foreground">
            {label}
            <input
              value={d.metrics[k] ?? ""}
              inputMode="numeric"
              onChange={(e) => set("metrics", { ...d.metrics, [k]: e.target.value })}
              className={`${inputCls} mt-1`}
            />
          </label>
        ))}
      </div>
      <textarea
        value={d.sample_posts ?? ""}
        maxLength={8000}
        rows={6}
        onChange={(e) => set("sample_posts", e.target.value)}
        placeholder="Cole aqui 5 a 10 legendas recentes (separe com uma linha em branco). Se souber, anote ao lado as curtidas e os comentários de cada uma."
        className={inputCls}
      />
      <div className="flex gap-2">
        <button
          type="button"
          className={btnPrimary}
          disabled={!d.handle.trim() || save.isPending}
          onClick={() =>
            save.mutate(
              {
                ...d,
                metrics: Object.fromEntries(
                  Object.entries(d.metrics)
                    .filter(([, v]) => v.trim())
                    .map(([k, v]) => [k, Number(v.replace(/\D/g, "")) || v]),
                ) as never,
              },
              { onSuccess: onDone, onError: (err) => toast.error((err as Error).message) },
            )
          }
        >
          Salvar perfil
        </button>
        <button type="button" className={btnCls} onClick={onDone}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function ProfileCard({ profile, onEdit }: { profile: SocialProfile; onEdit: () => void }) {
  const { locale } = useI18n();
  const qc = useQueryClient();
  const remove = useDeleteProfile();
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const analysis = profile.analysis as SocialAnalysis | null;

  const analyze = async (image?: File) => {
    setBusy(true);
    try {
      const dataUrl = image ? await fileToDataUrl(image, 1400, 0.8) : undefined;
      const res = await analyzeSocialProfile({
        data: { profileId: profile.id, image: dataUrl, locale: locale as never },
      });
      if ("error" in res)
        toast.error(
          res.error === "limit"
            ? "A cota de IA de hoje acabou."
            : "A IA não conseguiu analisar agora.",
        );
      else {
        toast.success("Diagnóstico pronto.");
        await qc.invalidateQueries({ queryKey: studioKeys.profiles() });
      }
    } catch (err) {
      toast.error((err as Error).message || "A IA não conseguiu analisar agora.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-2xl border border-border/70 bg-card p-4">
      <header className="flex flex-wrap items-center gap-2">
        <Badge tone="info">{NETWORK_LABEL[profile.network as Network] ?? profile.network}</Badge>
        <p className="font-semibold text-foreground">{profile.handle}</p>
        {profile.url && (
          <a
            href={profile.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-accent hover:underline"
          >
            <ExternalLink className="inline h-3.5 w-3.5" /> abrir
          </a>
        )}
        <span className="flex-1" />
        <button type="button" className={btnPrimary} disabled={busy} onClick={() => void analyze()}>
          <Sparkles className="h-3.5 w-3.5" />{" "}
          {busy ? "Analisando…" : analysis ? "Analisar de novo" : "Analisar com IA"}
        </button>
        <button
          type="button"
          className={btnCls}
          disabled={busy}
          onClick={() => file.current?.click()}
          title="Analisar com um print do perfil"
        >
          <Camera className="h-3.5 w-3.5" /> Com print
        </button>
        <input
          ref={file}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void analyze(f);
          }}
        />
        <button type="button" className={btnCls} onClick={onEdit} aria-label="Editar">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={btnDanger}
          aria-label="Apagar"
          onClick={() =>
            window.confirm(`Apagar o perfil ${profile.handle}?`) && remove.mutate(profile.id)
          }
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </header>

      {analysis ? (
        <div className="mt-3 space-y-3 text-sm">
          <p className="text-foreground">{analysis.resumo}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Block title="Tom atual" text={analysis.tom_atual} />
            <Block title="Público" text={analysis.publico} />
            <List title="Pilares de conteúdo" items={analysis.pilares} />
            <List title="Pontos fortes" items={analysis.pontos_fortes} />
            <List title="O que melhorar" items={analysis.melhorar} />
            <List title="Ações de engajamento" items={analysis.acoes_engajamento} />
            <List title="Formatos recomendados" items={analysis.formatos_recomendados} />
            <List title="Metas para 30 dias" items={analysis.metas_30_dias} />
            <Block title="Frequência" text={analysis.frequencia} />
            <Block title="Melhores horários" text={analysis.melhores_horarios} />
          </div>
          {analysis.bio_sugerida && (
            <div className="rounded-xl bg-accent-soft/40 p-3">
              <p className="text-xs font-bold text-accent">Bio sugerida</p>
              <p className="mt-1 whitespace-pre-line">{analysis.bio_sugerida}</p>
            </div>
          )}
          {profile.analyzed_at && (
            <p className="text-[11px] text-muted-foreground">
              Analisado em {dateTime(profile.analyzed_at)}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Ainda sem diagnóstico. Quanto mais legendas e números você colar, melhor a análise.
        </p>
      )}
    </article>
  );
}

function Block({ title, text }: { title: string; text: string }) {
  if (!text) return null;
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      <p className="mt-1 text-foreground">{text}</p>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-foreground">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
