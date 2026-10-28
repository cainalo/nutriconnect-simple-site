// Cabeçalhos e menus dos designs do site. Cada design é uma navegação própria, como se tivesse sido
// desenhada por outra pessoa: Vibrante (barra lateral + dock), Editorial (capa de revista, sem barra
// inferior) e Aurora (cápsula flutuante + dock em vidro + paleta de comandos). O design Natural usa
// o cabeçalho clássico de site-chrome.tsx. Todos reutilizam as mesmas páginas e permissões.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Award,
  ArrowLeft,
  Bell,
  CornerDownLeft,
  Home,
  LayoutGrid,
  LogIn,
  Plus,
  Search,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { AndroidAppBanner } from "@/components/android-app";
import { ShareModal } from "@/components/share-modal";
import { useTr } from "@/components/settings-ui";
import {
  FUNCOES_AREA,
  useHideOnScroll,
  useNavState,
  type NavKey,
  type NavPath,
} from "@/components/site-nav";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { featureOfPath, useFeatures } from "@/lib/features";
import { useUnreadCount } from "@/lib/social/notifications";

// ───────────────────────── Itens de navegação compartilhados ─────────────────────────

interface NavDef {
  to: NavPath;
  key: NavKey;
  icon: LucideIcon;
  label: string;
  also?: string[];
}

function useNavDefs(): NavDef[] {
  const { t } = useI18n();
  return [
    { to: "/espaco", key: "espaco", icon: Home, label: t("nav.space") },
    { to: "/comunidades", key: "comunidades", icon: Users, label: t("nav.communities") },
    { to: "/desafios", key: "desafios", icon: Award, label: t("nav.challenges") },
    { to: "/nina", key: "nina", icon: Sparkles, label: t("nav.nina") },
    {
      to: "/funcoes",
      key: "funcoes",
      icon: LayoutGrid,
      label: t("nav.functions"),
      also: FUNCOES_AREA,
    },
    { to: "/explorar", key: "explorar", icon: Search, label: t("nav.search") },
    { to: "/notificacoes", key: "notificacoes", icon: Bell, label: t("nav.notifications") },
  ];
}

interface ItemState {
  active: boolean;
  color: string;
  tint: string;
  unread: number;
}

/** Um item do menu: cuida de "ativo", cor da página, não lidas e funcionalidade desligada. */
function NavItem({ def, children }: { def: NavDef; children: (s: ItemState) => ReactNode }) {
  const { color, active, tint } = useNavState(def.key, def.to, def.also);
  const { user } = useAuth();
  const features = useFeatures();
  const feature = featureOfPath(def.to);
  const unread = useUnreadCount(def.key === "notificacoes" ? user?.id : undefined).data ?? 0;
  if (feature && !features[feature.key] && !user?.isAdmin) return null;
  return <>{children({ active, color, tint, unread })}</>;
}

function Avatar({ name, url, className }: { name: string; url?: string; className?: string }) {
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full avatar-shape bg-primary-soft font-bold text-primary ${className ?? ""}`}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  );
}

function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`font-logo-serif font-bold leading-none tracking-tight ${className ?? ""}`}>
      Nutri<span className="text-accent">Connect</span>
    </span>
  );
}

/** Convidado (sem conta) vê só Explorar e o convite para entrar. */
function useVisibleDefs(): NavDef[] {
  const { user } = useAuth();
  const defs = useNavDefs();
  return user ? defs : defs.filter((d) => d.key === "explorar");
}

// ───────────────────────── Vibrante: barra lateral + dock ─────────────────────────

export function SidebarChrome() {
  const { user } = useAuth();
  const { t } = useI18n();
  const tr = useTr();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hidden = useHideOnScroll(pathname);
  const defs = useVisibleDefs();
  const profile = useNavState("perfil", "/perfil");
  const side = defs.filter((d) => d.key !== "notificacoes");
  const bell = defs.find((d) => d.key === "notificacoes");
  const search = defs.find((d) => d.key === "explorar");

  return (
    <>
      {user && <AndroidAppBanner />}

      {/* Computador: barra lateral fixa (só para quem tem conta). */}
      {user && (
        <aside
          data-site-sidebar
          aria-label={t("nav.mainAria")}
          className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r bg-sidebar px-4 pb-4 pt-5 lg:flex"
        >
          <Link
            to="/"
            aria-label={t("nav.homeAria")}
            className="mb-5 flex items-center gap-2.5 px-2"
          >
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-lg font-black text-primary-foreground shadow-soft">
              N
            </span>
            <Wordmark className="text-lg" />
          </Link>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {[...side, ...(bell ? [bell] : [])].map((def) => (
              <NavItem key={def.key} def={def}>
                {({ active, color, tint, unread }) => (
                  <Link
                    to={def.to}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center gap-3 rounded-2xl px-2.5 py-2 text-sm transition ${
                      active
                        ? "font-extrabold"
                        : "font-semibold text-muted-foreground hover:bg-card hover:text-foreground"
                    }`}
                    style={active ? { backgroundColor: tint, color } : undefined}
                  >
                    <span
                      className="grid h-9 w-9 place-items-center rounded-xl transition group-hover:scale-105"
                      style={{
                        backgroundColor: active ? color : tint,
                        color: active ? "#fff" : color,
                      }}
                    >
                      <def.icon className="h-[18px] w-[18px]" strokeWidth={2.3} />
                    </span>
                    {def.label}
                    {unread > 0 && (
                      <span
                        className="ml-auto grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10px] font-bold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </Link>
                )}
              </NavItem>
            ))}
          </nav>

          <ShareModal
            triggerButton={
              <button
                type="button"
                className="mb-3 mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground shadow-soft transition hover:brightness-110 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" strokeWidth={3} />
                {t("nav.post")}
              </button>
            }
          />

          <AccountMenu
            side="top"
            trigger={
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border bg-card px-3 py-2.5 text-left transition hover:shadow-card"
                style={profile.active ? { borderColor: profile.color } : undefined}
              >
                <Avatar name={user.name} url={user.avatarUrl} className="h-9 w-9 text-sm" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{user.name}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {tr(["Minha conta", "My account", "Mi cuenta", "Mon compte"])}
                  </span>
                </span>
              </button>
            }
          />
        </aside>
      )}

      {/* Celular (e convidados): barra fina no topo. */}
      <header
        data-site-header
        data-hidden={hidden}
        className={`sticky top-0 z-40 w-full border-b bg-background/85 backdrop-blur-md transition-transform duration-300 data-[hidden=true]:-translate-y-full ${user ? "lg:hidden" : ""}`}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" aria-label={t("nav.homeAria")} className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-sm font-black text-primary-foreground">
              N
            </span>
            <Wordmark className="text-base" />
          </Link>
          <div className="flex items-center gap-1">
            {[search, bell].map(
              (def) =>
                def && (
                  <NavItem key={def.key} def={def}>
                    {({ active, color, tint, unread }) => (
                      <Link
                        to={def.to}
                        aria-label={def.label}
                        className="relative grid h-10 w-10 place-items-center rounded-2xl transition hover:bg-secondary"
                        style={active ? { color, backgroundColor: tint } : undefined}
                      >
                        <def.icon className="h-5 w-5" />
                        {unread > 0 && (
                          <span
                            className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background"
                            style={{ backgroundColor: color }}
                          />
                        )}
                      </Link>
                    )}
                  </NavItem>
                ),
            )}
            {!user && <LoginLink />}
          </div>
        </div>
      </header>

      {/* Celular: dock arredondado flutuante. */}
      {user && (
        <nav
          data-site-bottom-nav
          data-hidden={hidden}
          aria-label={t("nav.mainAria")}
          className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-3xl border bg-card/95 px-1.5 py-1.5 shadow-xl backdrop-blur-md transition-transform duration-300 data-[hidden=true]:translate-y-[calc(100%+1rem)] pb-[calc(0.375rem+env(safe-area-inset-bottom))] lg:hidden"
        >
          {defs
            .filter((d) => ["espaco", "comunidades"].includes(d.key))
            .map((def) => (
              <DockItem key={def.key} def={def} />
            ))}
          <ShareModal
            triggerButton={
              <button
                type="button"
                aria-label={t("nav.post")}
                className="grid h-12 w-12 cursor-pointer place-items-center rounded-2xl bg-primary text-primary-foreground shadow-soft transition active:scale-95"
              >
                <Plus className="h-6 w-6" strokeWidth={3} />
              </button>
            }
          />
          {defs
            .filter((d) => d.key === "funcoes")
            .map((def) => (
              <DockItem key={def.key} def={def} />
            ))}
          <AccountMenu
            side="top"
            trigger={
              <button
                type="button"
                aria-label={t("nav.profile")}
                className="grid h-12 w-14 cursor-pointer place-items-center rounded-2xl transition"
                style={profile.active ? { backgroundColor: profile.tint } : undefined}
              >
                <Avatar name={user.name} url={user.avatarUrl} className="h-7 w-7 text-xs" />
              </button>
            }
          />
        </nav>
      )}
    </>
  );
}

/** Item do dock do celular: ícone com fundo colorido e rótulo só na página atual. */
function DockItem({ def }: { def: NavDef }) {
  return (
    <NavItem def={def}>
      {({ active, color, tint }) => (
        <Link
          to={def.to}
          aria-label={def.label}
          aria-current={active ? "page" : undefined}
          className="flex h-12 min-w-14 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 text-[10px] font-bold transition"
          style={active ? { backgroundColor: tint, color } : { color: "var(--muted-foreground)" }}
        >
          <def.icon className="h-5 w-5" strokeWidth={active ? 2.6 : 2} />
          <span className={active ? "" : "sr-only"}>{def.label}</span>
        </Link>
      )}
    </NavItem>
  );
}

function LoginLink() {
  const tr = useTr();
  return (
    <Link
      to="/login"
      className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-xs font-bold text-accent-foreground transition hover:bg-accent/90"
    >
      <LogIn className="h-3.5 w-3.5" />
      {tr(["Entrar", "Sign in", "Entrar", "Connexion"])}
    </Link>
  );
}

// ───────────────────────── Pórtico: masthead editorial contemporâneo ───────────────────────

export function EditorialVibranteChrome() {
  const { user } = useAuth();
  const { t } = useI18n();
  const tr = useTr();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hidden = useHideOnScroll(pathname);
  const defs = useVisibleDefs();
  const profile = useNavState("perfil", "/perfil");
  const bell = defs.find((d) => d.key === "notificacoes");
  const search = defs.find((d) => d.key === "explorar");
  const primaryNav = defs.filter((d) => ["espaco", "comunidades", "desafios", "funcoes"].includes(d.key));
  const onHome = pathname === "/" || pathname === "/espaco";
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
    else void navigate({ to: (user ? "/espaco" : "/") as never });
  };

  const write = user ? (
    <ShareModal triggerButton={
      <button type="button" data-ev-action className="ev-header-action ev-header-action--write">
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span>{tr(["Publicar", "Post", "Publicar", "Publier"])}</span>
      </button>
    } />
  ) : null;
  const account = user ? (
    <AccountMenu trigger={
      <button type="button" aria-label={t("nav.profile")} title={t("nav.profile")} className="ev-account-trigger">
        <Avatar name={user.name} url={user.avatarUrl} className="h-8 w-8 text-xs" />
      </button>
    } />
  ) : (
    <Link to="/login" className="ev-header-action ev-header-action--login">
      <LogIn className="h-4 w-4" aria-hidden="true" />
      <span>{tr(["Entrar", "Sign in", "Entrar", "Connexion"])}</span>
    </Link>
  );

  return (
    <>
      {user && <AndroidAppBanner />}
      <header data-site-header data-ev-header data-hidden={hidden} className="sticky top-0 z-40 w-full transition-transform duration-300 data-[hidden=true]:-translate-y-full">
        <div className="ev-header-top">
          <div className="ev-header-leading">
            {!onHome && (
              <button type="button" onClick={goBack} data-ev-back aria-label={tr(["Voltar à página anterior", "Go to previous page", "Volver a la página anterior", "Retourner à la page précédente"])} title={tr(["Voltar", "Back", "Volver", "Retour"])}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <Link to="/" aria-label={t("nav.homeAria")} className="nc-brand-lockup flex min-w-0 items-center gap-2">
              <img src="/brand/nutriconnect-mark.svg" alt="" width="36" height="36" className="nc-brand-mark" />
              <img src="/brand/nutriconnect-wordmark.svg" alt="NutriConnect" width="180" height="20" className="nc-brand-wordmark nc-brand-wordmark--light" />
              <img src="/brand/nutriconnect-wordmark-reverse.svg" alt="" aria-hidden="true" width="180" height="20" className="nc-brand-wordmark nc-brand-wordmark--dark" />
            </Link>
          </div>
          <p className="ev-header-manifesto">{tr(["Cuidar da alimentação é construir algo em comum.", "Food care is something we build together.", "Cuidar la alimentación es construir algo en común.", "Prendre soin de l’alimentation, c’est construire ensemble."])}</p>
          <div className="ev-header-actions">
            {search && <NavItem def={search}>{({ active, color }) => <Link to={search.to} aria-label={search.label} title={search.label} aria-current={active ? "page" : undefined} className="ev-icon-action" style={active ? { color, background: "color-mix(in srgb, var(--ev-terracotta) 12%, transparent)" } : undefined}><Search className="h-[18px] w-[18px]" aria-hidden="true" /></Link>}</NavItem>}
            {bell && user && <NavItem def={bell}>{({ unread, color }) => <Link to={bell.to} aria-label={bell.label} title={bell.label} className="ev-icon-action ev-notification-action"><Bell className="h-[18px] w-[18px]" aria-hidden="true" />{unread > 0 && <span className="ev-notification-count" style={{ background: color }}>{unread > 99 ? "99+" : unread}</span>}</Link>}</NavItem>}
            {write}
            {account}
          </div>
        </div>
        <nav data-ev-topnav aria-label={t("nav.mainAria")} className="ev-topnav">
          <span className="ev-nav-overline">{tr(["SEÇÕES", "SECTIONS", "SECCIONES", "RUBRIQUES"])}</span>
          <div className="ev-topnav-links">
            {defs.map((def) => (
              <NavItem key={def.key} def={def}>
                {({ active, color, unread }) => (
                  <Link to={def.to} aria-current={active ? "page" : undefined} className={`ev-topnav-link ${active ? "is-active" : ""}`} style={active ? { color, borderBottomColor: color } : undefined}>
                    <def.icon className="h-4 w-4" aria-hidden="true" />
                    <span>{def.label}</span>
                    {unread > 0 && <span className="ev-topnav-unread">{unread > 99 ? "99+" : unread}</span>}
                  </Link>
                )}
              </NavItem>
            ))}
          </div>
          <span className="ev-nav-edition">{tr(["NUTRIÇÃO · COMUNIDADE · CUIDADO", "NUTRITION · COMMUNITY · CARE", "NUTRICIÓN · COMUNIDAD · CUIDADO", "NUTRITION · COMMUNAUTÉ · SOIN"])}</span>
        </nav>
      </header>

      {/* A barra inferior compartilha exatamente o estado de recolhimento da superior. */}
      <nav data-site-bottom-nav data-ev-bottom-nav data-hidden={hidden} aria-label={tr(["Navegação inferior", "Bottom navigation", "Navegación inferior", "Navigation inférieure"])} className="fixed inset-x-2 bottom-2 z-40 transition-transform duration-300 data-[hidden=true]:translate-y-[calc(100%+1rem)] lg:hidden">
        <div className="ev-bottom-dock">
          {user ? (
            <>
              {primaryNav.map((def) => (
                <NavItem key={def.key} def={def}>
                  {({ active, color }) => (
                    <Link to={def.to} aria-label={def.label} aria-current={active ? "page" : undefined} className={`ev-bottom-item ${active ? "is-active" : ""}`} style={active ? { color } : undefined}>
                      <span className="ev-bottom-icon" style={active ? { background: `color-mix(in srgb, ${color} 15%, transparent)` } : undefined}><def.icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.4 : 1.9} aria-hidden="true" /></span>
                      <span className={active ? "ev-bottom-label" : "sr-only"}>{def.label}</span>
                    </Link>
                  )}
                </NavItem>
              ))}
              <ShareModal triggerButton={<button type="button" aria-label={t("nav.post")} className="ev-bottom-create"><Plus className="h-5 w-5" strokeWidth={2.7} aria-hidden="true" /></button>} />
              <AccountMenu side="top" trigger={<button type="button" aria-label={t("nav.profile")} className={`ev-bottom-item ${profile.active ? "is-active" : ""}`} style={profile.active ? { color: profile.color } : undefined}><span className="ev-bottom-icon"><Avatar name={user.name} url={user.avatarUrl} className="h-6 w-6 text-[10px]" /></span><span className={profile.active ? "ev-bottom-label" : "sr-only"}>{t("nav.profile")}</span></button>} />
            </>
          ) : (
            <>
              {search && <NavItem def={search}>{({ active, color }) => <Link to={search.to} aria-current={active ? "page" : undefined} className={`ev-bottom-item ${active ? "is-active" : ""}`} style={active ? { color } : undefined}><span className="ev-bottom-icon"><Search className="h-5 w-5" aria-hidden="true" /></span><span>{search.label}</span></Link>}</NavItem>}
              <Link to="/login" className="ev-bottom-login"><LogIn className="h-4 w-4" aria-hidden="true" />{tr(["Entrar", "Sign in", "Entrar", "Connexion"])}</Link>
              <Link to="/cadastro" className="ev-bottom-signup">{tr(["Criar conta", "Create account", "Crear cuenta", "Créer un compte"])}</Link>
            </>
          )}
        </div>
      </nav>
    </>
  );
}
// ───────────────────────── Editorial: capa de revista ─────────────────────────

export function MastheadChrome() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const tr = useTr();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hidden = useHideOnScroll(pathname);
  const defs = useVisibleDefs();
  const today = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    [locale],
  );
  const textBtn =
    "cursor-pointer text-[11px] font-bold uppercase tracking-[0.18em] transition hover:text-accent";
  const edition = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 864e5,
  );
  const hour = new Date().getHours();
  const editionName = tr(
    hour < 12
      ? ["Edição da manhã", "Morning edition", "Edición de la mañana", "Édition du matin"]
      : hour < 18
        ? ["Edição da tarde", "Afternoon edition", "Edición de la tarde", "Édition de l'après-midi"]
        : ["Edição da noite", "Evening edition", "Edición de la noche", "Édition du soir"],
  );

  const write = user ? (
    <ShareModal
      triggerButton={
        <button type="button" className={`${textBtn} text-accent`}>
          {tr(["Escrever", "Write", "Escribir", "Écrire"])}
        </button>
      }
    />
  ) : null;
  const account = user ? (
    <AccountMenu
      trigger={
        <button type="button" className={`${textBtn} inline-flex items-center gap-1.5`}>
          <Avatar name={user.name} url={user.avatarUrl} className="h-5 w-5 text-[10px]" />
          {tr(["Conta", "Account", "Cuenta", "Compte"])}
        </button>
      }
    />
  ) : (
    <Link to="/login" className={textBtn}>
      {tr(["Entrar", "Sign in", "Entrar", "Connexion"])}
    </Link>
  );

  return (
    <>
      {user && <AndroidAppBanner />}
      <header
        data-site-header
        data-hidden={hidden}
        className="sticky top-0 z-40 w-full bg-background transition-transform duration-300 data-[hidden=true]:-translate-y-full"
      >
        <div className="w-full px-4 sm:px-6 lg:px-8">
          {/* Faixa superior: edição, data e ações (computador e tablet). */}
          <div className="hidden items-center justify-between border-b border-foreground/40 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:flex">
            <span>
              {tr(["Ano I", "Year I", "Año I", "An I"])} · Nº {edition} ·{" "}
              {tr(["Preço: grátis", "Price: free", "Precio: gratis", "Prix : gratuit"])}
            </span>
            <span className="hidden text-foreground md:inline">{today}</span>
            <span className="flex items-center gap-5 text-foreground">
              {write}
              {account}
            </span>
          </div>

          {/* Título da publicação, com "orelhas" nas laterais como nos jornais antigos. */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-2 sm:py-3">
            <div className="hidden border-y-2 border-double border-foreground/70 py-1.5 text-center text-[10px] font-bold uppercase leading-snug tracking-[0.15em] md:block">
              {tr([
                "Saúde e alimentação para todos",
                "Health and food for everyone",
                "Salud y alimentación para todos",
                "Santé et alimentation pour tous",
              ])}
            </div>
            <Link
              to="/"
              aria-label={t("nav.homeAria")}
              className="font-blackletter col-span-3 text-center md:col-span-1 md:col-start-2 text-[2.4rem] leading-none md:col-start-2 sm:text-[3.4rem] lg:text-[4.2rem]"
            >
              Nutri<span className="text-accent">Connect</span>
            </Link>
            <div className="hidden border-y-2 border-double border-foreground/70 py-1.5 text-center text-[10px] font-bold uppercase leading-snug tracking-[0.15em] md:block">
              {editionName}
            </div>
          </div>

          {/* Seções: só texto, filete duplo. */}
          <nav
            aria-label={t("nav.mainAria")}
            className="flex items-center gap-x-6 overflow-x-auto whitespace-nowrap border-y-[5px] border-double border-foreground py-1.5 sm:justify-center"
          >
            {defs.map((def) => (
              <NavItem key={def.key} def={def}>
                {({ active, color, unread }) => (
                  <Link
                    to={def.to}
                    aria-current={active ? "page" : undefined}
                    className={`relative shrink-0 text-[11px] font-bold uppercase tracking-[0.16em] transition hover:text-accent ${
                      active ? "" : "text-muted-foreground"
                    }`}
                    style={
                      active
                        ? {
                            color,
                            textDecoration: "underline",
                            textDecorationThickness: 2,
                            textUnderlineOffset: 6,
                          }
                        : undefined
                    }
                  >
                    {def.label}
                    {unread > 0 && (
                      <sup className="ml-0.5 text-[9px] text-accent">
                        {unread > 99 ? "99+" : unread}
                      </sup>
                    )}
                  </Link>
                )}
              </NavItem>
            ))}
            <span className="flex shrink-0 items-center gap-6 sm:hidden">
              {write}
              {account}
            </span>
          </nav>
        </div>
      </header>
    </>
  );
}

// ───────────────────────── Aurora: cápsula flutuante + dock + paleta ─────────────────────────

const PALETTE_PAGES: { to: string; label: [string, string, string, string] }[] = [
  { to: "/espaco", label: ["Espaço (feed)", "Feed", "Inicio", "Fil"] },
  { to: "/comunidades", label: ["Comunidades", "Communities", "Comunidades", "Communautés"] },
  { to: "/desafios", label: ["Desafios", "Challenges", "Desafíos", "Défis"] },
  {
    to: "/nina",
    label: ["Nina, assistente", "Nina, assistant", "Nina, asistente", "Nina, assistante"],
  },
  { to: "/funcoes", label: ["Funções", "Tools", "Funciones", "Fonctions"] },
  { to: "/geladeira", label: ["Geladeira", "Fridge", "Nevera", "Réfrigérateur"] },
  {
    to: "/cardapio",
    label: ["Cardápio da semana", "Weekly menu", "Menú semanal", "Menu de la semaine"],
  },
  {
    to: "/feira",
    label: [
      "Calendário da feira",
      "Market calendar",
      "Calendario de temporada",
      "Calendrier de saison",
    ],
  },
  { to: "/lancheira", label: ["Lancheira", "Lunchbox", "Lonchera", "Boîte à lunch"] },
  { to: "/casa", label: ["Minha casa", "My home", "Mi casa", "Ma maison"] },
  { to: "/receitas", label: ["Receitas", "Recipes", "Recetas", "Recettes"] },
  {
    to: "/profissionais",
    label: ["Profissionais", "Professionals", "Profesionales", "Professionnels"],
  },
  { to: "/programas", label: ["Programas", "Programs", "Programas", "Programmes"] },
  {
    to: "/recompensas",
    label: [
      "Pontos e recompensas",
      "Points and rewards",
      "Puntos y recompensas",
      "Points et récompenses",
    ],
  },
  {
    to: "/acompanhamento",
    label: ["Meu acompanhamento", "My care", "Mi seguimiento", "Mon suivi"],
  },
  { to: "/explorar", label: ["Explorar", "Explore", "Explorar", "Explorer"] },
  {
    to: "/notificacoes",
    label: ["Notificações", "Notifications", "Notificaciones", "Notifications"],
  },
  {
    to: "/perfil/configuracoes",
    label: ["Configurações", "Settings", "Configuración", "Paramètres"],
  },
];

/** Paleta de comandos (Ctrl/⌘+K): digite para ir a qualquer página. */
function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const tr = useTr();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  const results = PALETTE_PAGES.map((p) => ({ to: p.to, label: tr(p.label) })).filter(
    (p) => !query || norm(p.label).includes(norm(query)),
  );
  const go = (to: string) => {
    onOpenChange(false);
    setQuery("");
    void navigate({ to: to as never });
  };
  useEffect(() => setCursor(0), [query, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[22%] max-w-md translate-y-0 gap-0 overflow-hidden rounded-3xl p-0">
        <DialogTitle className="sr-only">
          {tr(["Ir para…", "Go to…", "Ir a…", "Aller à…"])}
        </DialogTitle>
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (e.key === "Enter" && results[cursor]) go(results[cursor].to);
            }}
            placeholder={tr([
              "Ir para… (geladeira, desafios, Nina)",
              "Go to… (fridge, challenges, Nina)",
              "Ir a… (nevera, desafíos, Nina)",
              "Aller à… (frigo, défis, Nina)",
            ])}
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul className="max-h-72 overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              {tr(["Nada encontrado.", "Nothing found.", "Nada encontrado.", "Rien trouvé."])}
            </li>
          )}
          {results.map((r, i) => (
            <li key={r.to}>
              <button
                type="button"
                onClick={() => go(r.to)}
                onMouseEnter={() => setCursor(i)}
                className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  i === cursor ? "bg-primary-soft font-semibold text-primary" : ""
                }`}
              >
                {r.label}
                {i === cursor && <CornerDownLeft className="h-3.5 w-3.5" />}
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

export function FloatingChrome() {
  const { user } = useAuth();
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hidden = useHideOnScroll(pathname);
  const defs = useVisibleDefs();
  const profile = useNavState("perfil", "/perfil");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const bell = defs.find((d) => d.key === "notificacoes");
  const capsule = defs.filter((d) => d.key !== "notificacoes" && d.key !== "explorar");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {user && <AndroidAppBanner />}
      <header
        data-site-header
        data-hidden={hidden}
        className="pointer-events-none sticky top-0 z-40 h-[4.75rem] w-full transition-transform duration-300 data-[hidden=true]:-translate-y-full"
      >
        {/* Computador: cápsula de vidro solta do topo. */}
        <div className="pointer-events-auto mx-auto mt-3 hidden w-fit max-w-[calc(100%-2rem)] items-center gap-1 rounded-full border bg-card/70 px-2 py-1.5 shadow-xl backdrop-blur-xl lg:flex">
          <Link
            to="/"
            aria-label={t("nav.homeAria")}
            className="mr-1 flex items-center gap-2 rounded-full py-1 pl-1.5 pr-3"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-black text-primary-foreground">
              N
            </span>
            <Wordmark className="text-[15px]" />
          </Link>
          {capsule.map((def) => (
            <NavItem key={def.key} def={def}>
              {({ active, color, tint }) => (
                <Link
                  to={def.to}
                  aria-label={def.label}
                  title={def.label}
                  aria-current={active ? "page" : undefined}
                  className="flex h-9 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold transition hover:bg-secondary"
                  style={
                    active ? { backgroundColor: tint, color } : { color: "var(--muted-foreground)" }
                  }
                >
                  <def.icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.5 : 2} />
                  {active && <span>{def.label}</span>}
                </Link>
              )}
            </NavItem>
          ))}
          <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex h-9 cursor-pointer items-center gap-2 rounded-full bg-secondary/80 px-3 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            <Search className="h-4 w-4" />
            {t("nav.search")}
            <kbd className="rounded-md border bg-background px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
          </button>
          {bell && (
            <NavItem def={bell}>
              {({ active, color, tint, unread }) => (
                <Link
                  to={bell.to}
                  aria-label={bell.label}
                  className="relative grid h-9 w-9 place-items-center rounded-full transition hover:bg-secondary"
                  style={active ? { backgroundColor: tint, color } : undefined}
                >
                  <Bell className="h-[18px] w-[18px]" />
                  {unread > 0 && (
                    <span
                      className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card"
                      style={{ backgroundColor: color }}
                    />
                  )}
                </Link>
              )}
            </NavItem>
          )}
          {user ? (
            <>
              <ShareModal
                triggerButton={
                  <button
                    type="button"
                    className="ml-1 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:brightness-110"
                  >
                    <Plus className="h-4 w-4" strokeWidth={3} />
                    {t("nav.post")}
                  </button>
                }
              />
              <AccountMenu
                trigger={
                  <button
                    type="button"
                    aria-label={t("nav.profile")}
                    className="ml-1 cursor-pointer rounded-full transition hover:opacity-80"
                    style={profile.active ? { boxShadow: `0 0 0 2px ${profile.color}` } : undefined}
                  >
                    <Avatar name={user.name} url={user.avatarUrl} className="h-9 w-9 text-sm" />
                  </button>
                }
              />
            </>
          ) : (
            <LoginLink />
          )}
        </div>

        {/* Celular: marca em uma pílula e busca/sino de cada lado. */}
        <div className="pointer-events-auto mx-auto mt-3 flex w-[calc(100%-2rem)] items-center justify-between lg:hidden">
          <button
            type="button"
            aria-label={t("nav.search")}
            onClick={() => setPaletteOpen(true)}
            className="grid h-10 w-10 cursor-pointer place-items-center rounded-full border bg-card/70 shadow-lg backdrop-blur-xl"
          >
            <Search className="h-[18px] w-[18px]" />
          </button>
          <Link
            to="/"
            aria-label={t("nav.homeAria")}
            className="rounded-full border bg-card/70 px-4 py-2 shadow-lg backdrop-blur-xl"
          >
            <Wordmark className="text-[15px]" />
          </Link>
          {bell && user ? (
            <NavItem def={bell}>
              {({ unread, color }) => (
                <Link
                  to={bell.to}
                  aria-label={bell.label}
                  className="relative grid h-10 w-10 place-items-center rounded-full border bg-card/70 shadow-lg backdrop-blur-xl"
                >
                  <Bell className="h-[18px] w-[18px]" />
                  {unread > 0 && (
                    <span
                      className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-card"
                      style={{ backgroundColor: color }}
                    />
                  )}
                </Link>
              )}
            </NavItem>
          ) : (
            <LoginLink />
          )}
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      {/* Celular: dock de vidro. */}
      {user && (
        <nav
          data-site-bottom-nav
          data-hidden={hidden}
          aria-label={t("nav.mainAria")}
          className="fixed inset-x-5 bottom-3 z-40 flex items-center justify-between rounded-full border bg-card/75 px-2 py-1.5 shadow-2xl backdrop-blur-xl transition-transform duration-300 data-[hidden=true]:translate-y-[calc(100%+1rem)] pb-[calc(0.375rem+env(safe-area-inset-bottom))] lg:hidden"
        >
          {capsule
            .filter((d) => ["espaco", "comunidades"].includes(d.key))
            .map((def) => (
              <AuroraDockItem key={def.key} def={def} />
            ))}
          <ShareModal
            triggerButton={
              <button
                type="button"
                aria-label={t("nav.post")}
                className="grid h-12 w-12 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition active:scale-95"
              >
                <Plus className="h-6 w-6" strokeWidth={3} />
              </button>
            }
          />
          {capsule
            .filter((d) => d.key === "funcoes")
            .map((def) => (
              <AuroraDockItem key={def.key} def={def} />
            ))}
          <AccountMenu
            side="top"
            trigger={
              <button
                type="button"
                aria-label={t("nav.profile")}
                className="grid h-11 w-11 cursor-pointer place-items-center rounded-full transition"
                style={profile.active ? { backgroundColor: profile.tint } : undefined}
              >
                <Avatar name={user.name} url={user.avatarUrl} className="h-7 w-7 text-xs" />
              </button>
            }
          />
        </nav>
      )}
    </>
  );
}

function AuroraDockItem({ def }: { def: NavDef }) {
  return (
    <NavItem def={def}>
      {({ active, color, tint }) => (
        <Link
          to={def.to}
          aria-label={def.label}
          aria-current={active ? "page" : undefined}
          className="grid h-11 w-11 place-items-center rounded-full transition"
          style={active ? { backgroundColor: tint, color } : { color: "var(--muted-foreground)" }}
        >
          <def.icon className="h-5 w-5" strokeWidth={active ? 2.6 : 2} />
        </Link>
      )}
    </NavItem>
  );
}
