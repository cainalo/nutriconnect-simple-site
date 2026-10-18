import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { installTilt } from "@/lib/tilt";
import { Toaster } from "sonner";
import { ConsentGate } from "../components/consent-gate";
import { HeroCinematic } from "../components/hero-cinematic";
import { useAppSounds } from "../hooks/use-app-sounds";
import { AccessibilityTools } from "../components/accessibility-tools";
import { FeatureGate } from "../components/feature-gate";
import { AnnouncementBar } from "../components/announcement-bar";
import { useAppearanceSync } from "../hooks/use-appearance-sync";
import { usePushSync } from "../hooks/use-push-sync";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { APPEARANCE_INIT_SCRIPT, initAppearance } from "../lib/appearance";
import { DESIGN_INIT_SCRIPT, useSiteDesign } from "../lib/site-design";
import { LANG_INIT_SCRIPT, initI18n } from "../lib/i18n";
import { listenAppLinks } from "@/lib/native";
import { BackToTop } from "@/components/back-to-top";
import { useTr } from "@/components/settings-ui";

function NotFoundComponent() {
  const tr = useTr();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          {tr([
            "Página não encontrada",
            "Page not found",
            "Página no encontrada",
            "Page introuvable",
          ])}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {tr([
            "A página que você procura não existe ou mudou de endereço.",
            "The page you're looking for doesn't exist or has been moved.",
            "La página que buscas no existe o cambió de dirección.",
            "La page que vous cherchez n'existe pas ou a été déplacée.",
          ])}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {tr(["Voltar ao início", "Go home", "Volver al inicio", "Retour à l'accueil"])}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  const tr = useTr();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {tr([
            "Esta página não carregou",
            "This page didn't load",
            "Esta página no cargó",
            "Cette page ne s'est pas chargée",
          ])}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {tr([
            "Algo deu errado do nosso lado. Tente de novo ou volte ao início.",
            "Something went wrong on our end. You can try again or head back home.",
            "Algo salió mal de nuestro lado. Inténtalo de nuevo o vuelve al inicio.",
            "Un problème est survenu de notre côté. Réessayez ou revenez à l'accueil.",
          ])}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {tr(["Tentar de novo", "Try again", "Intentar de nuevo", "Réessayer"])}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {tr(["Voltar ao início", "Go home", "Volver al inicio", "Retour à l'accueil"])}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "NutriConnect — Uma rede social sobre alimentação" },
      {
        name: "description",
        content:
          "Uma rede social para descobrir receitas, compartilhar experiências, participar de comunidades e construir hábitos alimentares junto com outras pessoas.",
      },
      {
        property: "og:title",
        content: "NutriConnect — Uma rede social sobre alimentação",
      },
      {
        property: "og:description",
        content:
          "Descubra receitas, participe de comunidades e desafios, e compartilhe sua jornada alimentar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      // App instalável (PWA).
      { name: "theme-color", content: "#555f36" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "NutriConnect" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Playfair+Display:wght@400;700;900&family=Nunito:wght@400;600;700&family=Lora:wght@400;500;600;700&family=Merriweather:wght@400;700&family=Poppins:wght@400;500;600;700&family=Lexend:wght@400;500;600;700&family=UnifrakturCook:wght@700&family=Old+Standard+TT:ital,wght@0,400;0,700;1,400&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
    ],
    // Aplica o tema e o idioma salvos antes da primeira pintura, para não piscar o padrão.
    scripts: [
      { children: DESIGN_INIT_SCRIPT },
      { children: APPEARANCE_INIT_SCRIPT },
      { children: LANG_INIT_SCRIPT },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    // O tema e o idioma salvos são aplicados por script antes da hidratação (ver head.scripts).
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/** Aplica o design do site escolhido pelo admin; precisa ficar dentro do QueryClientProvider. */
function SiteDesignSync() {
  useSiteDesign();
  useEffect(() => {
    document.documentElement.setAttribute("data-hydrated", "");
  }, []);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => initAppearance(), []);
  useEffect(() => installTilt(), []);
  // App Android: um link do site que abriu o app leva para a página certa (A4).
  useEffect(() => listenAppLinks((path) => void router.history.push(path)), [router]);
  useEffect(() => initI18n(), []);
  useAppearanceSync();
  useAppSounds();
  usePushSync();

  return (
    <QueryClientProvider client={queryClient}>
      <SiteDesignSync />
      <FeatureGate>
        <Outlet />
      </FeatureGate>
      <ConsentGate />
      <HeroCinematic />
      <AccessibilityTools />
      <AnnouncementBar />
      <Toaster position="top-right" richColors />
      <BackToTop />
    </QueryClientProvider>
  );
}
