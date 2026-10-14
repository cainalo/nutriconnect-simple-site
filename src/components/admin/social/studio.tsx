// Estúdio de redes sociais (S1) no painel do admin: perfis e diagnóstico, ideias com IA, calendário,
// modelos e tendências. Hoje só para a administração (social_studio_allowed no banco).
import { useState } from "react";
import { toast } from "sonner";
import { Badge, Empty, Panel, QueryError, btnCls } from "@/components/admin/admin-ui";
import { CalendarTab } from "@/components/admin/social/calendar-tab";
import { IdeasTab } from "@/components/admin/social/ideas-tab";
import { PostEditor } from "@/components/admin/social/post-editor";
import { ProfilesTab } from "@/components/admin/social/profiles-tab";
import { TrendsTab } from "@/components/admin/social/trends-tab";
import {
  FORMAT_LABEL,
  NETWORK_LABEL,
  useDuplicatePost,
  useSocialPosts,
  useSocialProfiles,
  type SocialPost,
} from "@/lib/social-studio";
import type { Network, PostFormat } from "@/lib/social-studio.functions";

type Tab = "ideias" | "perfis" | "calendario" | "modelos" | "tendencias";
const TABS: [Tab, string][] = [
  ["ideias", "Ideias e posts"],
  ["perfis", "Perfis"],
  ["calendario", "Calendário"],
  ["modelos", "Modelos"],
  ["tendencias", "Tendências"],
];

export function SocialStudioSection() {
  const [tab, setTab] = useState<Tab>("ideias");
  const [editing, setEditing] = useState<SocialPost | null>(null);
  const [prefill, setPrefill] = useState<string | undefined>();
  const profiles = useSocialProfiles();
  const posts = useSocialPosts();
  const handle =
    profiles.data?.find((p) => p.network === "instagram")?.handle ?? profiles.data?.[0]?.handle;

  // Sem as tabelas no banco (migration pendente), mostra o aviso em vez das abas.
  if (profiles.error && posts.error) {
    return (
      <Panel title="Redes sociais">
        {/schema cache|does not exist/i.test((profiles.error as Error).message) ? (
          <p className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm text-foreground">
            O estúdio já está no site, mas o banco de dados ainda não recebeu a atualização que cria
            as tabelas dele (junto com as outras funções novas: casa, dupla, eventos, loja e
            mercados). Assim que as migrations pendentes forem aplicadas no Supabase, esta seção
            funciona sozinha.
          </p>
        ) : (
          <QueryError error={profiles.error} />
        )}
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <div className="no-scrollbar flex max-w-full gap-1.5 overflow-x-auto p-1">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              tab === id
                ? "border-accent bg-accent-soft text-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "ideias" && <IdeasTab key={prefill ?? ""} onOpen={setEditing} prefill={prefill} />}
      {tab === "perfis" && <ProfilesTab />}
      {tab === "calendario" && <CalendarTab onOpen={setEditing} />}
      {tab === "modelos" && <TemplatesTab onOpen={setEditing} />}
      {tab === "tendencias" && (
        <TrendsTab
          onCreate={(theme) => {
            setPrefill(theme);
            setTab("ideias");
          }}
        />
      )}

      <PostEditor post={editing} handle={handle} onClose={() => setEditing(null)} />
    </div>
  );
}

function TemplatesTab({ onOpen }: { onOpen: (p: SocialPost) => void }) {
  const posts = useSocialPosts();
  const duplicate = useDuplicatePost();
  const templates = (posts.data ?? []).filter((p) => p.is_template);
  return (
    <Panel
      title="Modelos de postagem"
      hint="Abra qualquer post e use “Salvar como modelo”. Aqui, “Usar” cria um rascunho novo a partir do modelo."
    >
      {templates.length === 0 ? (
        <Empty>Nenhum modelo ainda.</Empty>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {templates.map((t) => (
            <li key={t.id} className="rounded-2xl border border-border/70 p-3">
              <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-foreground">
                <Badge tone="info">{FORMAT_LABEL[t.format as PostFormat]}</Badge>
                <Badge>{NETWORK_LABEL[t.network as Network]}</Badge>
                {t.title}
              </p>
              <p className="mt-1 line-clamp-3 whitespace-pre-line text-xs text-muted-foreground">
                {t.caption || t.hook}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className={btnCls}
                  onClick={() =>
                    duplicate.mutate(
                      { post: t, asTemplate: false },
                      { onSuccess: () => toast.success("Rascunho criado em Ideias e posts.") },
                    )
                  }
                >
                  Usar
                </button>
                <button type="button" className={btnCls} onClick={() => onOpen(t)}>
                  Editar modelo
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
