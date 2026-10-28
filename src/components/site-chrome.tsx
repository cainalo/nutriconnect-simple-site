import { Link, useRouterState } from "@tanstack/react-router";
import {
  Search,
  Bell,
  Home,
  Users,
  Award,
  Plus,
  Sparkles,
  CalendarDays,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { featureOfPath, useFeatures } from "@/lib/features";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { ShareModal } from "@/components/share-modal";
import { AccountMenu } from "@/components/account-menu";
import { useUnreadCount } from "@/lib/social/notifications";
import {
  CHROME_HIDE_EVENT,
  FUNCOES_AREA,
  useHideOnScroll,
  useNavState,
  type NavKey,
  type NavPath,
} from "@/components/site-nav";
export { CHROME_HIDE_EVENT };
import { FloatingChrome, MastheadChrome, PorticoChrome, SidebarChrome } from "@/components/site-chrome-designs";
import { useDesignId } from "@/lib/site-design";
import { AndroidAppBanner } from "@/components/android-app";

type NavVariant = "desktop" | "top" | "bottom";

function NavTab({
  to,
  navKey,
  icon: Icon,
  label,
  variant,
  showLabel = true,
  also,
}: {
  to: NavPath;
  navKey: NavKey;
  icon: LucideIcon;
  label: string;
  variant: NavVariant;
  showLabel?: boolean;
  /** Outros endereços em que a aba também fica acesa. */
  also?: string[];
}) {
  const { color, active, tint } = useNavState(navKey, to, also);
  const { user } = useAuth();
  const features = useFeatures();
  const feature = featureOfPath(to);
  const off = !!feature && !features[feature.key] && !user?.isAdmin;
  // Ponto de "não lidas" no sino.
  const unread = useUnreadCount(navKey === "notificacoes" ? user?.id : undefined).data ?? 0;
  const dot =
    unread > 0 ? (
      <span
        className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background"
        style={{ background: color }}
        aria-label={`${unread}`}
      />
    ) : null;
  // Funcionalidade desligada pela administração: some do menu (administradores continuam vendo).
  if (off) return null;
  if (variant === "bottom") {
    return (
      <Link
        to={to}
        aria-current={active ? "page" : undefined}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground transition"
        style={active ? { color } : undefined}
      >
        <span
          className="grid h-7 w-12 place-items-center rounded-full transition"
          style={active ? { backgroundColor: tint } : undefined}
        >
          <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
        </span>
        <span className={active ? "font-bold" : ""}>{label}</span>
      </Link>
    );
  }
  if (variant === "top") {
    return (
      <Link
        to={to}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        title={label}
        className={`relative grid h-10 w-10 place-items-center rounded-full transition ${active ? "" : "text-foreground hover:bg-secondary"}`}
        style={active ? { color, backgroundColor: tint } : undefined}
      >
        <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
        {dot}
      </Link>
    );
  }
  return (
    <Link
      to={to}
      aria-label={showLabel ? undefined : label}
      aria-current={active ? "page" : undefined}
      title={showLabel ? undefined : label}
      className={`relative flex items-center gap-2 rounded-full text-sm font-medium transition ${
        showLabel ? "px-4 py-2" : "h-10 w-10 justify-center"
      } ${active ? "font-bold" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
      style={active ? { color, backgroundColor: tint } : undefined}
    >
      <Icon className="h-4 w-4" strokeWidth={active ? 2.4 : 2} />
      {showLabel && label}
      {dot}
    </Link>
  );
}

function NaturalHeader() {
  const { user } = useAuth();
  const { t } = useI18n();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const hidden = useHideOnScroll(pathname);
  const profile = useNavState("perfil", "/perfil");

  return (
    <>
      {user && <AndroidAppBanner />}
      <header
        data-site-header
        data-hidden={hidden}
        className="sticky top-0 z-40 w-full border-b bg-background/90 backdrop-blur-md shadow-xs max-lg:transition-transform max-lg:duration-300 max-lg:data-[hidden=true]:-translate-y-[calc(100%+0.5rem)]"
      >
        {/* Cabeçalho mobile */}
        <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:hidden">
          {/* Dois botões de cada lado e a logo no centro exato da tela. */}
          <div className="flex items-center">
            <NavTab
              to="/notificacoes"
              navKey="notificacoes"
              icon={Bell}
              label={t("nav.notifications")}
              variant="top"
            />
            {user ? (
              <NavTab
                to="/tema-da-semana"
                navKey="tema"
                icon={CalendarDays}
                label={t("weekly.badge")}
                variant="top"
              />
            ) : (
              <span className="h-10 w-10" aria-hidden="true" />
            )}
          </div>

          <Link
            to="/"
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center"
          >
            <span className="text-lg font-bold tracking-tight leading-none text-foreground font-logo-serif">
              Nutri<span className="text-accent">Connect</span>
            </span>
          </Link>

          <div className="flex items-center">
            {user ? (
              <NavTab
                to="/nina"
                navKey="nina"
                icon={Sparkles}
                label={t("nav.nina")}
                variant="top"
              />
            ) : (
              <span className="h-10 w-10" aria-hidden="true" />
            )}
            <NavTab
              to="/explorar"
              navKey="explorar"
              icon={Search}
              label={t("nav.search")}
              variant="top"
            />
          </div>
        </div>

        {/* Cabeçalho desktop — reúne os atalhos que no mobile ficam na barra inferior */}
        <div className="relative mx-auto hidden h-16 max-w-7xl items-center justify-between gap-4 px-6 lg:flex">
          {user ? (
            <nav aria-label={t("nav.mainAria")} className="flex items-center gap-1">
              <NavTab
                to="/espaco"
                navKey="espaco"
                icon={Home}
                label={t("nav.space")}
                variant="desktop"
              />
              <NavTab
                to="/comunidades"
                navKey="comunidades"
                icon={Users}
                label={t("nav.communities")}
                variant="desktop"
              />
              <NavTab
                to="/desafios"
                navKey="desafios"
                icon={Award}
                label={t("nav.challenges")}
                variant="desktop"
              />
              <NavTab
                to="/nina"
                navKey="nina"
                icon={Sparkles}
                label={t("nav.nina")}
                variant="desktop"
              />
            </nav>
          ) : (
            <span />
          )}

          <Link
            to="/"
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center"
          >
            <span className="text-lg font-bold tracking-tight leading-none text-foreground font-logo-serif">
              Nutri<span className="text-accent">Connect</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            {user && (
              <NavTab
                to="/funcoes"
                navKey="funcoes"
                icon={LayoutGrid}
                label={t("nav.functions")}
                variant="desktop"
                showLabel={false}
              />
            )}
            <NavTab
              to="/explorar"
              navKey="explorar"
              icon={Search}
              label={t("nav.search")}
              variant="desktop"
              showLabel={false}
            />
            <NavTab
              to="/notificacoes"
              navKey="notificacoes"
              icon={Bell}
              label={t("nav.notifications")}
              variant="desktop"
              showLabel={false}
            />

            {user && (
              <ShareModal
                triggerButton={
                  <button
                    type="button"
                    className="ml-1 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-soft transition hover:bg-accent/90 cursor-pointer"
                    aria-label={t("nav.post")}
                  >
                    <Plus className="h-4 w-4" />
                    {t("nav.post")}
                  </button>
                }
              />
            )}

            {user && (
              <AccountMenu
                trigger={
                  <button
                    type="button"
                    className="grid h-10 w-10 cursor-pointer place-items-center overflow-hidden rounded-full avatar-shape bg-primary-soft text-sm font-bold text-primary transition hover:opacity-80"
                    style={
                      profile.active
                        ? { boxShadow: `0 0 0 2px ${profile.color}`, color: profile.color }
                        : undefined
                    }
                    aria-label={t("nav.profile")}
                    title={t("nav.profile")}
                  >
                    <UserInitial name={user.name} url={user.avatarUrl} />
                  </button>
                }
              />
            )}
          </div>
        </div>
      </header>

      {/* Logo flutuante: fica fixo no celular enquanto a barra superior está recolhida */}
      <Link
        to="/"
        aria-label={t("nav.homeAria")}
        aria-hidden={!hidden}
        tabIndex={hidden ? 0 : -1}
        className={`fixed left-1/2 top-3 z-40 -translate-x-1/2 rounded-full border border-border/60 bg-background/75 px-4 py-1.5 shadow-lg backdrop-blur-md transition-all duration-300 lg:hidden ${
          hidden ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <span className="font-logo-serif text-base font-bold leading-none tracking-tight text-foreground">
          Nutri<span className="text-accent">Connect</span>
        </span>
      </Link>

      {/* Barra de navegação inferior estilo app — atalhos essenciais no mobile */}
      {user && (
        <nav
          data-site-bottom-nav
          data-hidden={hidden}
          aria-label={t("nav.mainAria")}
          className="transition-transform duration-300 data-[hidden=true]:translate-y-[calc(100%+1rem)] fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border bg-background/95 backdrop-blur-md shadow-[0_-4px_16px_-8px_rgba(0,0,0,0.15)] pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          <NavTab
            to="/espaco"
            navKey="espaco"
            icon={Home}
            label={t("nav.space")}
            variant="bottom"
          />
          <NavTab
            to="/comunidades"
            navKey="comunidades"
            icon={Users}
            label={t("nav.communities")}
            variant="bottom"
          />

          <div className="flex flex-1 items-center justify-center">
            <ShareModal
              triggerButton={
                <button
                  type="button"
                  className="grid h-12 w-12 -translate-y-3 place-items-center rounded-full bg-accent text-accent-foreground shadow-soft transition hover:bg-accent/90 cursor-pointer"
                  aria-label={t("nav.post")}
                >
                  <Plus className="h-6 w-6" />
                </button>
              }
            />
          </div>

          <NavTab
            to="/funcoes"
            navKey="funcoes"
            icon={LayoutGrid}
            label={t("nav.functions")}
            variant="bottom"
            also={FUNCOES_AREA}
          />

          <AccountMenu
            side="top"
            trigger={
              <button
                type="button"
                className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground transition"
                style={profile.active ? { color: profile.color } : undefined}
              >
                <span
                  className="grid h-7 w-12 place-items-center rounded-full transition"
                  style={profile.active ? { backgroundColor: profile.tint } : undefined}
                >
                  <span
                    className="grid h-5 w-5 place-items-center overflow-hidden rounded-full avatar-shape bg-primary-soft text-[10px] font-bold text-primary"
                    style={
                      profile.active
                        ? { boxShadow: `0 0 0 2px ${profile.color}`, color: profile.color }
                        : undefined
                    }
                  >
                    <UserInitial name={user.name} url={user.avatarUrl} />
                  </span>
                </span>
                <span className={profile.active ? "font-bold" : ""}>{t("nav.profile")}</span>
              </button>
            }
          />
        </nav>
      )}
    </>
  );
}

/** Cabeçalho do design escolhido pelo admin: cada design tem a própria navegação. */
export function SiteHeader() {
  const design = useDesignId();
  if (design === "vibrante") return <SidebarChrome />;
  if (design === "editorial") return <MastheadChrome />;
  if (design === "portico") return <PorticoChrome />;
  if (design === "aurora") return <FloatingChrome />;
  return <NaturalHeader />;
}

/** Foto da pessoa (ou a inicial do nome, se não tiver foto). */
function UserInitial({ name, url }: { name: string; url?: string }) {
  return url ? (
    <img src={url} alt="" className="h-full w-full object-cover" />
  ) : (
    <>{name.charAt(0).toUpperCase()}</>
  );
}

export function AuthGateLoading() {
  const { t } = useI18n();
  return (
    <div className="grid min-h-screen place-items-center text-muted-foreground text-sm">
      {t("common.loading")}
    </div>
  );
}
