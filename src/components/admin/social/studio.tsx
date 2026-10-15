// Estúdio de redes sociais no painel do admin: início, quadro (kanban), ideias com IA, modelos,
// calendário, tendências e perfis, com o editor de posts em tela cheia e prévia fiel de cada rede.
// Hoje só para a administração (social_studio_allowed no banco).
import { useState } from "react";
import {
  CalendarDays,
  Home,
  KanbanSquare,
  LayoutTemplate,
  Lightbulb,
  Plus,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Panel, QueryError } from "@/components/admin/admin-ui";
import { StudioBoard } from "@/components/admin/social/board";
import { CalendarTab } from "@/components/admin/social/calendar-tab";
import { Composer } from "@/components/admin/social/composer";
import { StudioDashboard, type StudioTab } from "@/components/admin/social/dashboard";
import { SectionTitle } from "@/components/admin/social/kit";
import { badgeBg } from "@/components/admin/social/kit-styles";
import { IdeasTab } from "@/components/admin/social/ideas-tab";
import { ProfilesTab } from "@/components/admin/social/profiles-tab";
import { TemplatesGallery } from "@/components/admin/social/templates-gallery";
import { TrendsTab } from "@/components/admin/social/trends-tab";
import {
  EMPTY_DRAFT,
  draftFromPost,
  draftFromTemplate,
  type Draft,
} from "@/components/admin/social/use-art";
import { useSocialPosts, useSocialProfiles, type SocialPost } from "@/lib/social-studio";
import type { SocialTemplate } from "@/lib/social-templates";
import { cn } from "@/lib/utils";

type Tab = StudioTab;
const TABS: { id: Tab; label: string; title: string; icon: LucideIcon; color: string }[] = [
  { id: "inicio", label: "Início", title: "Início", icon: Home, color: "#b4532a" },
  {
    id: "quadro",
    label: "Quadro",
    title: "Quadro de produção",
    icon: KanbanSquare,
    color: "#3b7bbf",
  },
  {
    id: "ideias",
    label: "Ideias com IA",
    title: "Ideias com IA",
    icon: Lightbulb,
    color: "#7a5cc4",
  },
  {
    id: "modelos",
    label: "Modelos",
    title: "Modelos de post",
    icon: LayoutTemplate,
    color: "#c58a12",
  },
  {
    id: "calendario",
    label: "Calendário",
    title: "Calendário editorial",
    icon: CalendarDays,
    color: "#d6456b",
  },
  {
    id: "tendencias",
    label: "Tendências",
    title: "Tendências do momento",
    icon: TrendingUp,
    color: "#2f8a5b",
  },
  { id: "perfis", label: "Perfis", title: "Perfis das redes", icon: UserRound, color: "#555f36" },
];

export function SocialStudioSection() {
  const [tab, setTab] = useState<Tab>("inicio");
  const [composer, setComposer] = useState<Draft | null>(null);
  const [prefill, setPrefill] = useState<string | undefined>();
  const profiles = useSocialProfiles();
  const posts = useSocialPosts();
  const handle =
    profiles.data?.find((p) => p.network === "instagram")?.handle ??
    profiles.data?.[0]?.handle ??
    "nutriconnect";
  const all = posts.data ?? [];
  const current = TABS.find((t) => t.id === tab) ?? TABS[0];

  const openNew = (date?: string) => setComposer({ ...EMPTY_DRAFT, scheduled_for: date ?? null });
  const openPost = (p: SocialPost) => setComposer(draftFromPost(p));
  const openTemplate = (t: SocialTemplate) => setComposer(draftFromTemplate(t));

  // Sem as tabelas no banco (migration pendente), mostra o aviso em vez das abas.
  if (profiles.error && posts.error) {
    return (
      <Panel title="Redes sociais">
        {/schema cache|does not exist/i.test((profiles.error as Error).message) ? (
          <p className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm text-foreground">
            O estúdio já está no site, mas o banco de dados ainda não recebeu a atualização que cria
            as tabelas dele.
          </p>
        ) : (
          <QueryError error={profiles.error} />
        )}
      </Panel>
    );
  }

  return (
    <div className="st-root min-w-0 space-y-5">
      <nav className="st-glass sticky top-0 z-20 flex min-w-0 items-center gap-2 rounded-full border border-border/60 p-1.5 shadow-sm">
        <div className="no-scrollbar flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-all duration-300",
                  on
                    ? "text-white shadow-md"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
                style={on ? { background: badgeBg(t.color) } : undefined}
              >
                <t.icon
                  className="h-3.5 w-3.5 transition group-hover:scale-110"
                  style={on ? undefined : { color: t.color }}
                />
                {t.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => openNew()}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 text-xs font-bold text-accent-foreground shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Criar post</span>
        </button>
      </nav>

      {tab !== "inicio" && (
        <SectionTitle icon={current.icon} color={current.color}>
          {current.title}
        </SectionTitle>
      )}

      <div key={tab} className="min-w-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
        {tab === "inicio" && (
          <StudioDashboard
            posts={all}
            onNew={openNew}
            onTemplate={openTemplate}
            onOpen={openPost}
            go={(t) => setTab(t)}
          />
        )}
        {tab === "quadro" && <StudioBoard posts={all} onOpen={openPost} onNew={() => openNew()} />}
        {tab === "ideias" && (
          <IdeasTab
            key={prefill ?? ""}
            prefill={prefill}
            onOpen={openPost}
            onEditIdea={(draft) => setComposer(draft)}
          />
        )}
        {tab === "modelos" && (
          <TemplatesGallery
            posts={all}
            onUseTemplate={openTemplate}
            onUseTeam={(p) =>
              setComposer({
                ...draftFromPost(p),
                id: undefined,
                is_template: false,
                status: "rascunho",
              })
            }
            onEditTeam={openPost}
          />
        )}
        {tab === "calendario" && <CalendarTab onOpen={openPost} onNew={openNew} />}
        {tab === "tendencias" && (
          <TrendsTab
            onCreate={(theme) => {
              setPrefill(theme);
              setTab("ideias");
            }}
          />
        )}
        {tab === "perfis" && <ProfilesTab />}
      </div>

      {composer && (
        <Composer
          key={composer.id ?? "novo"}
          initial={composer}
          handle={handle}
          profiles={profiles.data ?? []}
          onClose={() => setComposer(null)}
        />
      )}
    </div>
  );
}
