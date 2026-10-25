import { Children, isValidElement, type ReactNode } from "react";
import { SiteHeader } from "@/components/site-chrome";
import { useI18n } from "@/hooks/use-i18n";
import { SiteFooter } from "@/components/site-footer";
import { LEGAL_UPDATED_AT } from "@/lib/legal";
import { useTr } from "@/components/settings-ui";

/** Moldura das páginas jurídicas (Termos, Privacidade, Diretrizes). */
export function LegalLayout({
  title,
  intro,
  summary,
  children,
}: {
  title: string;
  intro?: string;
  /** Resumo nos outros idiomas (o texto jurídico vale em português, pela lei brasileira). */
  summary?: { en: string[]; es: string[]; fr: string[] };
  children: ReactNode;
}) {
  const { locale } = useI18n();
  const tr = useTr();
  const lines = locale === "pt-BR" ? undefined : summary?.[locale as "en" | "es" | "fr"];
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-xs text-muted-foreground">
            {tr([
              "Última atualização",
              "Last updated",
              "Última actualización",
              "Dernière mise à jour",
            ])}
            : {LEGAL_UPDATED_AT}
          </p>
          {lines && (
            <aside
              lang={locale}
              className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm text-foreground"
            >
              <p className="font-semibold">{SUMMARY_HEAD[locale as "en" | "es" | "fr"]}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </aside>
          )}
          {intro && <p className="mt-6 leading-relaxed text-muted-foreground">{intro}</p>}
          <LegalIndex>{children}</LegalIndex>
          <div className="mt-8 space-y-8">{children}</div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

const SUMMARY_HEAD = {
  en: "Summary in English. The legally binding text below is in Portuguese (Brazilian law).",
  es: "Resumen en español. El texto válido, abajo, está en portugués (ley brasileña).",
  fr: "Résumé en français. Le texte qui fait foi, ci-dessous, est en portugais (droit brésilien).",
};

type SectionProps = { id?: string; title: string; children: ReactNode };

/** Índice das seções (as que têm id), para pular direto num texto longo. */
function LegalIndex({ children }: { children: ReactNode }) {
  const tr = useTr();
  const items = Children.toArray(children).flatMap((child) =>
    isValidElement<SectionProps>(child) && child.type === LegalSection && child.props.id
      ? [{ id: child.props.id, title: child.props.title }]
      : [],
  );
  if (items.length < 4) return null;
  return (
    <nav
      aria-label={tr(["Índice", "Contents", "Índice", "Sommaire"])}
      className="mt-8 rounded-2xl border border-border/70 bg-card p-4 shadow-xs sm:p-5"
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {tr(["Nesta página", "On this page", "En esta página", "Sur cette page"])}
      </p>
      {/* Duas colunas que se leem de cima para baixo (1–7 na primeira, 8–13 na segunda). */}
      <ol className="mt-3 gap-x-4 space-y-1 sm:columns-2">
        {items.map(({ id, title }) => {
          const m = /^(\d+)\.\s*(.*)$/.exec(title);
          return (
            <li key={id} className="break-inside-avoid">
              <a
                href={`#${id}`}
                className="flex min-h-10 items-center gap-2.5 rounded-xl px-2 text-sm text-foreground transition hover:bg-secondary"
              >
                {m && (
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    {m[1]}
                  </span>
                )}
                <span className="leading-snug">{m ? m[2] : title}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="font-display text-xl font-bold text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
