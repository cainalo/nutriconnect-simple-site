// Página pública (quem não entrou) em cada design do site. Mesmo conteúdo e mesmas ações da versão
// Natural (landing.tsx), mas com outra composição: Vibrante (tiles coloridos e blocos grandes),
// Editorial (primeira página de revista, em colunas e filetes) e Aurora (vidro, brilho e bento).
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ChevronDown,
  Lock,
  Presentation,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { AndroidDownloadButton } from "@/components/android-app";
import { COPY, FAQ, FEATURES, PROFESSIONS, STEPS } from "@/components/landing-data";
import { Mascot } from "@/components/mascots";
import { useTr } from "@/components/settings-ui";
import { SiteFooter } from "@/components/site-footer";
import { useI18n } from "@/hooks/use-i18n";
import { LOCALES, isLocale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

// ───────────────────────── Peças comuns ─────────────────────────

function LangSelect({ show = "min-[360px]:block" }: { show?: string }) {
  const tr = useTr();
  const { locale, setLocale } = useI18n();
  return (
    <select
      value={locale}
      onChange={(e) => isLocale(e.target.value) && setLocale(e.target.value)}
      aria-label={tr(["Idioma", "Language", "Idioma", "Langue"])}
      className={`hidden h-9 shrink-0 cursor-pointer rounded-full border border-border bg-card px-2 text-xs font-semibold ${show}`}
    >
      {LOCALES.map((l) => (
        <option key={l.id} value={l.id}>
          {l.id === "pt-BR" ? "PT" : l.id.toUpperCase()}
        </option>
      ))}
    </select>
  );
}

function Faq({ className, itemClass }: { className?: string; itemClass?: string }) {
  const tr = useTr();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className={className}>
      {FAQ.map((f, i) => (
        <div key={f.q[0]} className={itemClass}>
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
            className="flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left font-semibold"
          >
            <span className="flex-1">{tr(f.q)}</span>
            <ChevronDown
              className={cn("h-4 w-4 shrink-0 transition", open === i && "rotate-180")}
            />
          </button>
          {open === i && (
            <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{tr(f.a)}</p>
          )}
        </div>
      ))}
    </div>
  );
}

const TILE_COLORS = ["#f08a4b", "#6aa6e6", "#e8b13b", "#8a5fb0", "#2fb48c", "#d6456b"];

function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-logo-serif font-bold leading-none tracking-tight", className)}>
      Nutri<span className="text-accent">Connect</span>
    </span>
  );
}

function SecurityItems(): { icon: LucideIcon; title: string; text: string }[] {
  const tr = useTr();
  return [
    {
      icon: ShieldCheck,
      title: tr(["Conteúdo conferido", "Content checked", "Contenido revisado", "Contenu vérifié"]),
      text: tr([
        "Cada post passa por análise antes de ir ao ar.",
        "Every post is reviewed before going live.",
        "Cada publicación se revisa antes de salir.",
        "Chaque publication est vérifiée avant sa mise en ligne.",
      ]),
    },
    {
      icon: Lock,
      title: tr([
        "Chamadas criptografadas",
        "Encrypted calls",
        "Llamadas cifradas",
        "Appels chiffrés",
      ]),
      text: tr([
        "Sem gravação e só com quem participa da consulta.",
        "Never recorded, only with the people in the visit.",
        "Sin grabación y solo con quienes participan.",
        "Jamais enregistrés, seulement entre participants.",
      ]),
    },
    {
      icon: ShieldCheck,
      title: tr([
        "Seus dados de saúde são seus",
        "Your health data is yours",
        "Tus datos de salud son tuyos",
        "Vos données de santé vous appartiennent",
      ]),
      text: tr([
        "Usados só com seu consentimento, conforme a LGPD.",
        "Used only with your consent, under Brazil's LGPD.",
        "Usados solo con tu consentimiento, según la LGPD.",
        "Utilisées uniquement avec votre accord, selon la LGPD.",
      ]),
    },
  ];
}

// ───────────────────────── Vibrante ─────────────────────────

export function LandingVibrante() {
  const tr = useTr();
  const security = SecurityItems();
  return (
    <div className="min-h-screen bg-background text-foreground [&_p]:text-left">
      <header className="sticky top-0 z-30 px-3 pt-3">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 rounded-3xl border bg-card/90 px-3 shadow-card backdrop-blur-md sm:px-4">
          <span className="hidden h-9 w-9 shrink-0 place-items-center rounded-2xl sm:grid bg-primary font-black text-primary-foreground">
            N
          </span>
          <Wordmark className="shrink-0 text-base sm:text-lg" />
          <nav className="ml-4 hidden items-center gap-1 text-sm font-bold md:flex">
            {[
              ["#recursos", COPY.navFeatures],
              ["#profissionais", COPY.navPros],
              ["#duvidas", COPY.navFaq],
            ].map(([href, label]) => (
              <a
                key={href as string}
                href={href as string}
                className="rounded-full px-3.5 py-1.5 text-muted-foreground transition hover:bg-primary-soft hover:text-primary"
              >
                {tr(label as never)}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <LangSelect show="min-[400px]:block" />
            <Link
              to="/login"
              className="whitespace-nowrap rounded-full px-2 py-2 text-sm font-bold hover:bg-secondary sm:px-3"
            >
              {tr(COPY.login)}
            </Link>
            <Link
              to="/cadastro"
              className="whitespace-nowrap rounded-full bg-primary px-3 py-2 text-sm font-extrabold sm:px-4 text-primary-foreground shadow-soft transition hover:brightness-110"
            >
              {tr(COPY.signup)}
            </Link>
          </div>
        </div>
      </header>

      {/* Abertura em bloco grande com degradê e tiles flutuando */}
      <section className="mx-auto mt-4 w-full max-w-6xl px-3">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-primary px-6 py-12 text-primary-foreground sm:px-12 sm:py-16">
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="text-sm font-extrabold text-primary-foreground">{tr(COPY.badge)}</p>
              <h1 className="mt-3 font-display text-4xl font-black leading-[1.05] text-primary-foreground sm:text-6xl">
                {tr(COPY.h1a)}{" "}
                <span className="underline decoration-primary-foreground/50 decoration-4 underline-offset-8">
                  {tr(COPY.h1b)}
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-primary-foreground sm:text-lg">
                {tr(COPY.lead)}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/cadastro"
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary-foreground px-6 py-3.5 font-extrabold text-primary shadow-xl transition hover:-translate-y-0.5"
                >
                  {tr(COPY.start)} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/apresentacao"
                  className="inline-flex items-center gap-2 rounded-2xl border-2 border-primary-foreground/60 px-6 py-3.5 font-extrabold text-primary-foreground transition hover:bg-primary-foreground/15"
                >
                  <Presentation className="h-4 w-4" /> {tr(COPY.presentation)}
                </Link>
              </div>
              <div className="mt-4">
                <AndroidDownloadButton />
              </div>
              <p className="mt-4 text-xs font-semibold text-primary-foreground">
                {tr(COPY.freeNote)}
              </p>
            </div>
            <div className="relative mx-auto grid w-full max-w-sm grid-cols-2 gap-3">
              {["market", "cooking-together", "meeting"].map((img, i) => (
                <img
                  key={img}
                  src={`/images/presentation/${img}.jpg`}
                  alt=""
                  className={cn(
                    "h-40 w-full rounded-3xl object-cover shadow-2xl ring-4 ring-white/70",
                    i === 2 && "col-span-2 h-36",
                    i === 0 && "-rotate-3",
                    i === 1 && "rotate-3",
                  )}
                />
              ))}
              <div className="absolute -bottom-6 -left-4 sm:-left-10">
                <Mascot id="nina" mood="happy" size={110} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recursos em tiles coloridos */}
      <section id="recursos" className="mx-auto w-full max-w-6xl px-3 py-16">
        <h2 className="px-2 font-display text-3xl font-black sm:text-4xl">
          {tr(COPY.featuresTitle)}
        </h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const color = TILE_COLORS[i % TILE_COLORS.length];
            return (
              <article
                key={f.title[0]}
                className="group relative overflow-hidden rounded-[2rem] p-6 text-white shadow-card transition hover:-translate-y-1"
                style={{
                  background: `linear-gradient(145deg, ${color}, color-mix(in srgb, ${color} 60%, #000))`,
                }}
              >
                <f.icon className="pointer-events-none absolute -bottom-4 -right-4 h-28 w-28 text-white/15 transition group-hover:scale-110" />
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/25">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-lg font-extrabold text-white">
                  {tr(f.title)}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/90">{tr(f.text)}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Como funciona: passos em cartões lado a lado */}
      <section className="mx-auto w-full max-w-6xl px-3 pb-16">
        <h2 className="px-2 font-display text-3xl font-black sm:text-4xl">{tr(COPY.howTitle)}</h2>
        <div className="mt-8 grid overflow-hidden rounded-[2rem] border bg-card shadow-card md:grid-cols-[1fr_1.4fr]">
          <img
            src="/images/presentation/cooking-together.jpg"
            alt=""
            className="h-56 w-full object-cover md:h-full"
          />
          <ul className="divide-y p-2 sm:p-4">
            {STEPS.map((s) => (
              <li key={s.title[0]} className="p-4">
                <h3 className="font-display text-lg font-extrabold">{tr(s.title)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{tr(s.text)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Profissionais */}
      <section id="profissionais" className="mx-auto w-full max-w-6xl px-3 pb-16">
        <div className="grid gap-6 rounded-[2.5rem] bg-primary-soft p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-primary">
              {tr(COPY.profBadge)}
            </span>
            <h2 className="mt-3 font-display text-3xl font-black">{tr(COPY.profTitle)}</h2>
            <Link
              to="/cadastro"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 font-extrabold text-primary-foreground shadow-soft transition hover:-translate-y-0.5"
            >
              {tr(COPY.profCta)} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PROFESSIONS.map(({ icon: Icon, label }, i) => (
              <div
                key={label[0]}
                className="flex flex-col items-center gap-2 rounded-3xl bg-card p-4 text-center shadow-card"
              >
                <span
                  className="grid h-12 w-12 place-items-center rounded-2xl text-white"
                  style={{ backgroundColor: TILE_COLORS[(i + 2) % TILE_COLORS.length] }}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-sm font-bold">{tr(label)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Segurança + dúvidas */}
      <section className="mx-auto grid w-full max-w-6xl gap-3 px-3 pb-16 md:grid-cols-3">
        {security.map((s) => (
          <div key={s.title} className="flex gap-3 rounded-3xl border bg-card p-5 shadow-card">
            <s.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-bold">{s.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{s.text}</p>
            </div>
          </div>
        ))}
      </section>
      <section id="duvidas" className="mx-auto w-full max-w-3xl px-3 pb-16">
        <h2 className="px-2 text-center font-display text-3xl font-black sm:text-4xl">
          {tr(COPY.faqTitle)}
        </h2>
        <Faq className="mt-6 space-y-2" itemClass="rounded-3xl border bg-card shadow-card" />
      </section>

      <section className="mx-auto w-full max-w-6xl px-3 pb-16">
        <div className="flex flex-col items-center gap-5 rounded-[2.5rem] bg-accent px-6 py-12 text-center text-accent-foreground">
          <Mascot id="nina" mood="cheer" size={100} />
          <h2 className="font-display text-3xl font-black text-accent-foreground sm:text-4xl">
            {tr(COPY.finalTitle)}
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/cadastro"
              className="inline-flex items-center gap-2 rounded-2xl bg-accent-foreground px-6 py-3.5 font-extrabold text-accent shadow-xl"
            >
              {tr(COPY.finalCreate)} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center rounded-2xl border-2 border-accent-foreground/60 px-6 py-3.5 font-extrabold"
            >
              {tr(COPY.haveAccount)}
            </Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

// ───────────────────────── Editorial ─────────────────────────

function Rule({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-foreground/30", className)} />;
}

export function LandingEditorial() {
  const tr = useTr();
  const { locale } = useI18n();
  const security = SecurityItems();
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
  const kicker = "text-[11px] font-bold uppercase tracking-[0.2em] text-accent";
  const edition = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 864e5,
  );
  return (
    <div data-landing className="min-h-screen bg-background text-foreground [&_p]:text-left">
      <header className="border-b-4 border-double border-foreground">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between border-b border-foreground/40 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="hidden sm:inline">
              {tr(["Ano I", "Year I", "Año I", "An I"])} · Nº {edition} ·{" "}
              {tr(["Preço: grátis", "Price: free", "Precio: gratis", "Prix : gratuit"])}
            </span>
            <span className="hidden md:inline">{today}</span>
            <span className="ml-auto flex items-center gap-4 text-foreground sm:ml-0">
              <LangSelect />
              <Link to="/login" className="font-bold hover:text-accent">
                {tr(COPY.login)}
              </Link>
              <Link to="/cadastro" className="font-bold text-accent hover:underline">
                {tr(COPY.signup)}
              </Link>
            </span>
          </div>
          {/* Título em letra gótica com "orelhas" nas laterais, como nos jornais antigos. */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-3 sm:py-5">
            <div className="hidden border-y-2 border-double border-foreground/70 py-1.5 text-center text-[10px] font-bold uppercase leading-snug tracking-[0.15em] md:block">
              {tr(COPY.badge)}
            </div>
            <p className="font-blackletter col-span-3 !text-center text-[3rem] leading-none sm:text-[5rem] md:col-span-1 md:col-start-2 lg:text-[6.5rem]">
              Nutri<span className="text-accent">Connect</span>
            </p>
            <div className="hidden border-y-2 border-double border-foreground/70 py-1.5 text-center text-[10px] font-bold uppercase leading-snug tracking-[0.15em] md:block">
              {tr([
                "Extra! Entrada gratuita",
                "Extra! Free entry",
                "¡Extra! Entrada libre",
                "Extra ! Entrée libre",
              ])}
            </div>
          </div>
          <nav className="flex justify-center gap-8 border-y-[5px] border-double border-foreground py-1.5 text-[11px] font-bold uppercase tracking-[0.16em]">
            <a href="#recursos" className="hover:text-accent">
              {tr(COPY.navFeatures)}
            </a>
            <a href="#profissionais" className="hover:text-accent">
              {tr(COPY.navPros)}
            </a>
            <a href="#duvidas" className="hover:text-accent">
              {tr(COPY.navFaq)}
            </a>
          </nav>
        </div>
      </header>

      {/* Manchete */}
      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[2fr_1px_1fr]">
        <div>
          <p className={kicker}>{tr(["Manchete", "Front page", "Portada", "À la une"])}</p>
          <h1 className="mt-3 font-display text-5xl font-black uppercase leading-[1.02] tracking-tight sm:text-7xl">
            {tr(COPY.h1a)} <em className="text-accent">{tr(COPY.h1b)}</em>
          </h1>
          <p className="mt-6 max-w-2xl border-y border-foreground/40 py-3 text-lg leading-relaxed text-muted-foreground">
            {tr(COPY.lead)}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              to="/cadastro"
              className="inline-flex items-center gap-2 bg-foreground px-6 py-3 text-sm font-bold uppercase tracking-widest text-background transition hover:bg-accent"
            >
              {tr(COPY.start)} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/apresentacao"
              className="text-sm font-bold uppercase tracking-widest underline underline-offset-8 hover:text-accent"
            >
              {tr(COPY.presentation)}
            </Link>
          </div>
          <div className="mt-4">
            <AndroidDownloadButton />
          </div>
          <p className="mt-4 text-xs italic text-muted-foreground">{tr(COPY.freeNote)}</p>
        </div>
        <span className="hidden bg-foreground/30 lg:block" aria-hidden="true" />
        <aside>
          <img
            src="/images/presentation/cooking-together.jpg"
            alt=""
            className="aspect-[4/3] w-full object-cover grayscale-[20%]"
          />
          <p className="mt-1.5 text-[11px] italic text-muted-foreground">
            {tr([
              "Cozinhar junto também é cuidado.",
              "Cooking together is care too.",
              "Cocinar juntos también es cuidado.",
              "Cuisiner ensemble, c'est aussi prendre soin.",
            ])}
          </p>
          <Rule className="my-5" />
          <p className={kicker}>
            {tr(["Nesta edição", "In this issue", "En esta edición", "Dans ce numéro"])}
          </p>
          <ol className="mt-3 space-y-2.5">
            {FEATURES.slice(0, 4).map((f, i) => (
              <li key={f.title[0]} className="flex gap-3 text-sm">
                <span className="font-display text-2xl font-bold leading-none text-accent">
                  {i + 1}
                </span>
                <span className="font-semibold leading-snug">{tr(f.title)}</span>
              </li>
            ))}
          </ol>
        </aside>
      </section>

      {/* Recursos em colunas de texto */}
      <section id="recursos" className="mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6">
        <Rule className="border-foreground" />
        <h2 className="py-4 text-center font-display text-3xl font-bold sm:text-4xl">
          {tr(COPY.featuresTitle)}
        </h2>
        <Rule />
        <div className="grid gap-x-8 gap-y-8 pt-8 sm:grid-cols-2 lg:grid-cols-3 [&>*:not(:nth-child(3n+1))]:lg:border-l [&>*:not(:nth-child(3n+1))]:lg:border-foreground/20 [&>*:not(:nth-child(3n+1))]:lg:pl-8">
          {FEATURES.map((f) => (
            <article key={f.title[0]}>
              <f.icon className="h-5 w-5 text-accent" />
              <h3 className="mt-2 font-display text-xl font-bold">{tr(f.title)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{tr(f.text)}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Como funciona: inverso */}
      <section className="bg-foreground text-background">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-background/75">
            {tr(COPY.howTitle)}
          </p>
          <ol className="mt-6 grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title[0]} className="border-t border-background/40 pt-4">
                <span className="font-display text-6xl font-bold text-accent">{i + 1}</span>
                <h3 className="mt-2 font-display text-xl font-bold text-background">
                  {tr(s.title)}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-background/75">{tr(s.text)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Profissionais: "classificados" */}
      <section id="profissionais" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <p className={kicker}>{tr(COPY.profBadge)}</p>
        <h2 className="mt-3 max-w-3xl font-display text-3xl font-bold sm:text-4xl">
          {tr(COPY.profTitle)}
        </h2>
        <div className="mt-8 grid grid-cols-2 border-l border-t border-foreground/40 sm:grid-cols-3 lg:grid-cols-6">
          {PROFESSIONS.map(({ icon: Icon, label }) => (
            <div
              key={label[0]}
              className="flex flex-col items-center gap-2 border-b border-r border-foreground/40 p-5 text-center"
            >
              <Icon className="h-6 w-6 text-accent" />
              <span className="text-xs font-bold uppercase tracking-widest">{tr(label)}</span>
            </div>
          ))}
        </div>
        <Link
          to="/cadastro"
          className="mt-7 inline-flex items-center gap-2 border-2 border-foreground px-6 py-3 text-sm font-bold uppercase tracking-widest transition hover:bg-foreground hover:text-background"
        >
          {tr(COPY.profCta)} <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 border-y border-foreground/30 px-4 py-8 sm:px-6 md:grid-cols-3">
        {security.map((s) => (
          <div key={s.title}>
            <p className="font-display text-lg font-bold">{s.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
          </div>
        ))}
      </section>

      <section id="duvidas" className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
        <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">
          {tr(COPY.faqTitle)}
        </h2>
        <Faq
          className="mt-6 border-t-2 border-foreground"
          itemClass="border-b border-foreground/30"
        />
      </section>

      <section className="border-t-2 border-foreground bg-secondary">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-5 px-4 py-14 text-center sm:px-6">
          <h2 className="font-display text-4xl font-bold sm:text-5xl">{tr(COPY.finalTitle)}</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/cadastro"
              className="inline-flex items-center gap-2 bg-foreground px-6 py-3 text-sm font-bold uppercase tracking-widest text-background hover:bg-accent"
            >
              {tr(COPY.finalCreate)} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center border-2 border-foreground px-6 py-3 text-sm font-bold uppercase tracking-widest hover:bg-foreground hover:text-background"
            >
              {tr(COPY.haveAccount)}
            </Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

// ───────────────────────── Aurora ─────────────────────────

function Glass({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[1.75rem] border border-foreground/10 bg-card/60 shadow-xl backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function LandingAurora() {
  const tr = useTr();
  const security = SecurityItems();
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground [&_p]:text-left">
      <header className="sticky top-0 z-30 px-3 pt-3">
        <Glass className="mx-auto flex h-14 max-w-4xl items-center gap-2 rounded-full px-3 sm:px-4">
          <span className="hidden h-8 w-8 shrink-0 place-items-center rounded-full bg-primary sm:grid text-sm font-black text-primary-foreground">
            N
          </span>
          <Wordmark className="text-base" />
          <nav className="ml-3 hidden items-center gap-4 text-sm font-medium text-muted-foreground md:flex">
            <a href="#recursos" className="hover:text-foreground">
              {tr(COPY.navFeatures)}
            </a>
            <a href="#profissionais" className="hover:text-foreground">
              {tr(COPY.navPros)}
            </a>
            <a href="#duvidas" className="hover:text-foreground">
              {tr(COPY.navFaq)}
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <LangSelect show="min-[400px]:block" />
            <Link
              to="/login"
              className="whitespace-nowrap rounded-full px-2 py-2 text-sm font-semibold hover:bg-secondary sm:px-3"
            >
              {tr(COPY.login)}
            </Link>
            <Link
              to="/cadastro"
              className="whitespace-nowrap rounded-full bg-primary px-3 py-2 text-sm font-semibold sm:px-4 text-primary-foreground shadow-lg transition hover:brightness-110"
            >
              {tr(COPY.signup)}
            </Link>
          </div>
        </Glass>
      </header>

      {/* Abertura em duas colunas: texto à esquerda, fotos à direita */}
      <section className="relative mx-auto grid w-full max-w-5xl items-center gap-10 px-4 pb-10 pt-12 sm:pt-20 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="text-sm font-medium text-accent">{tr(COPY.badge)}</p>
          <h1 className="mt-3 max-w-xl font-display text-4xl font-semibold leading-[1.08] sm:text-6xl">
            {tr(COPY.h1a)} <span className="text-accent">{tr(COPY.h1b)}</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {tr(COPY.lead)}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/cadastro"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 font-semibold text-primary-foreground shadow-xl transition hover:brightness-110"
            >
              {tr(COPY.start)} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/apresentacao"
              className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-card/60 px-7 py-3.5 font-semibold backdrop-blur transition hover:bg-card"
            >
              <Presentation className="h-4 w-4" /> {tr(COPY.presentation)}
            </Link>
          </div>
          <div className="mt-4">
            <AndroidDownloadButton />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{tr(COPY.freeNote)}</p>
        </div>

        <div className="relative grid grid-cols-[1.3fr_1fr] gap-3">
          <img
            src="/images/presentation/cooking-together.jpg"
            alt=""
            className="row-span-2 h-full min-h-72 w-full rounded-[1.75rem] object-cover ring-1 ring-foreground/10"
          />
          {["market", "meeting"].map((img) => (
            <img
              key={img}
              src={`/images/presentation/${img}.jpg`}
              alt=""
              className="h-36 w-full rounded-[1.75rem] object-cover ring-1 ring-foreground/10 sm:h-44"
            />
          ))}
        </div>
      </section>

      {/* Recursos em bento */}
      <section id="recursos" className="relative mx-auto w-full max-w-5xl px-4 py-16">
        <h2 className="font-display text-3xl font-semibold sm:text-4xl">
          {tr(COPY.featuresTitle)}
        </h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Glass
              key={f.title[0]}
              className={cn(
                "p-6 transition hover:-translate-y-1",
                i === 0 && "lg:col-span-2",
                i === 3 && "lg:col-span-2",
              )}
            >
              <h3 className="flex items-center gap-2.5 font-display text-lg font-semibold">
                <f.icon className="h-5 w-5 shrink-0 text-accent" />
                {tr(f.title)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tr(f.text)}</p>
            </Glass>
          ))}
        </div>
      </section>

      {/* Como funciona: linha do tempo */}
      <section className="relative mx-auto w-full max-w-3xl px-4 py-10">
        <h2 className="font-display text-3xl font-semibold sm:text-4xl">{tr(COPY.howTitle)}</h2>
        <Glass className="mt-8 divide-y divide-foreground/10">
          {STEPS.map((s) => (
            <div key={s.title[0]} className="p-5 sm:flex sm:gap-6">
              <h3 className="font-display text-lg font-semibold sm:w-56 sm:shrink-0">
                {tr(s.title)}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:mt-0.5">
                {tr(s.text)}
              </p>
            </div>
          ))}
        </Glass>
      </section>

      {/* Profissionais */}
      <section id="profissionais" className="relative mx-auto w-full max-w-5xl px-4 py-16">
        <Glass className="grid gap-8 p-6 sm:p-10 lg:grid-cols-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">
              {tr(COPY.profBadge)}
            </span>
            <h2 className="mt-3 font-display text-3xl font-semibold">{tr(COPY.profTitle)}</h2>
            <Link
              to="/cadastro"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg hover:brightness-110"
            >
              {tr(COPY.profCta)} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {PROFESSIONS.map(({ icon: Icon, label }) => (
              <div
                key={label[0]}
                className="flex flex-col items-center gap-2 rounded-2xl bg-background/50 p-3 text-center"
              >
                <Icon className="h-6 w-6 text-primary" />
                <span className="text-xs font-semibold">{tr(label)}</span>
              </div>
            ))}
          </div>
        </Glass>
      </section>

      <section className="relative mx-auto grid w-full max-w-5xl gap-3 px-4 pb-16 md:grid-cols-3">
        {security.map((s) => (
          <Glass key={s.title} className="flex gap-3 p-5">
            <s.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">{s.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{s.text}</p>
            </div>
          </Glass>
        ))}
      </section>

      <section id="duvidas" className="relative mx-auto w-full max-w-3xl px-4 pb-16">
        <h2 className="font-display text-3xl font-semibold sm:text-4xl">{tr(COPY.faqTitle)}</h2>
        <Faq
          className="mt-6 space-y-2"
          itemClass="rounded-3xl border border-foreground/10 bg-card/60 backdrop-blur-xl"
        />
      </section>

      <section className="relative mx-auto w-full max-w-4xl px-4 pb-16">
        <div className="flex flex-col items-center gap-5 rounded-[2.5rem] bg-primary px-6 py-12 text-center text-primary-foreground shadow-2xl">
          <Mascot id="nina" mood="cheer" size={100} />
          <h2 className="font-display text-3xl font-semibold text-primary-foreground sm:text-4xl">
            {tr(COPY.finalTitle)}
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/cadastro"
              className="inline-flex items-center gap-2 rounded-full bg-primary-foreground px-6 py-3 font-semibold text-primary shadow-xl"
            >
              {tr(COPY.finalCreate)} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center rounded-full border border-primary-foreground/60 px-6 py-3 font-semibold"
            >
              {tr(COPY.haveAccount)}
            </Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

// ───────────────────────── Pórtico: cartões-pôster e fundo limpo ───────────────────────────

export function LandingPortico() {
  const tr = useTr();
  const security = SecurityItems();
  const posterColors = ["#c8402a", "#245f7a", "#87580c", "#6b3a6e", "#346834", "#8f2f50"];
  return (
    <div data-landing className="min-h-screen bg-background text-foreground [&_p]:text-left">
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-3 px-4 py-2 sm:px-6">
          <span className="grid h-9 w-9 shrink-0 place-items-center" aria-hidden="true">
            <svg viewBox="0 0 40 40" width="36" height="36" fill="none">
              <path d="M7 15h26M10 15c0 8 4.5 13 10 13s10-5 10-13M12 32h16M20 6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
              <circle cx="20" cy="5" r="2" fill="#c8402a" /><circle cx="8" cy="32" r="2" fill="#6b3a6e" /><circle cx="32" cy="32" r="2" fill="#d4a017" />
            </svg>
          </span>
          <Wordmark className="text-lg sm:text-xl" />
          <nav className="ml-4 hidden items-center gap-5 text-sm font-semibold text-muted-foreground lg:flex">
            <a href="#recursos" className="hover:text-foreground">{tr(COPY.navFeatures)}</a>
            <a href="#profissionais" className="hover:text-foreground">{tr(COPY.navPros)}</a>
            <a href="#duvidas" className="hover:text-foreground">{tr(COPY.navFaq)}</a>
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <LangSelect />
            <Link to="/login" className="hidden min-h-10 items-center px-3 text-sm font-semibold hover:text-primary sm:inline-flex">{tr(COPY.login)}</Link>
            <Link to="/cadastro" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:brightness-95">{tr(COPY.signup)} <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </header>
      <main>
        <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="portico-poster flex min-w-0 flex-col justify-center p-6 text-white sm:p-9 lg:p-11" style={{ background: "#c8402a" }}>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-white/85">{tr(COPY.badge)}</p>
            <h1 className="font-display text-4xl font-semibold leading-[1.04] tracking-tight sm:text-5xl lg:text-6xl">{tr(COPY.h1a)} <span className="text-[#ffcf9f]">{tr(COPY.h1b)}</span></h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">{tr(COPY.lead)}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/cadastro" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-bold text-[#a43120] transition hover:brightness-95">{tr(COPY.start)} <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/apresentacao" className="inline-flex min-h-11 items-center rounded-md border border-white/60 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">{tr(COPY.presentation)}</Link>
            </div>
            <div className="mt-4"><AndroidDownloadButton /></div>
            <p className="mt-3 text-xs text-white/80">{tr(COPY.freeNote)}</p>
          </div>
          <div className="grid min-w-0 grid-rows-[minmax(15rem,1fr)_auto] gap-3">
            <div className="relative min-h-60 overflow-hidden rounded-[10px] border border-border bg-card">
              <img src="/images/presentation/cooking-together.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-[#0f4c5c] px-4 py-3 text-white"><span className="font-display text-xl font-semibold">{tr(["Uma mesa para todo mundo", "A table for everyone", "Una mesa para todos", "Une table pour tous"])}</span><span className="shrink-0 text-xs font-bold uppercase tracking-wider">NutriConnect</span></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="portico-poster min-h-28 p-4 text-white" style={{ background: "#245f7a" }}><span className="text-xs font-bold uppercase tracking-[0.12em] text-white/80">01</span><p className="mt-5 font-display text-xl font-semibold leading-tight">{tr(["Receitas reais", "Real recipes", "Recetas reales", "Recettes réelles"])}</p></div>
              <div className="portico-poster min-h-28 p-4 text-white" style={{ background: "#346834" }}><span className="text-xs font-bold uppercase tracking-[0.12em] text-white/80">02</span><p className="mt-5 font-display text-xl font-semibold leading-tight">{tr(["Hábitos em conjunto", "Habits together", "Hábitos juntos", "Des habitudes ensemble"])}</p></div>
            </div>
          </div>
        </section>
        <section id="recursos" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="mb-5"><p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-accent">{tr(COPY.featuresTitle)}</p><h2 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">{tr(["Um lugar para descobrir, trocar e cuidar", "A place to discover, share and care", "Un lugar para descubrir, compartir y cuidar", "Un lieu pour découvrir, échanger et prendre soin"])}</h2></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title[0]} className="portico-poster flex min-h-[14.5rem] flex-col p-5 text-white sm:p-6" style={{ background: posterColors[i % posterColors.length] }}>
                  <div className="flex items-start justify-between gap-3"><Icon className="h-7 w-7" strokeWidth={1.5} aria-hidden="true" /><span className="text-xs font-semibold tabular-nums text-white/80">{String(i + 1).padStart(2, "0")}</span></div>
                  <h3 className="mt-auto pt-8 font-display text-2xl font-semibold leading-tight">{tr(feature.title)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/90">{tr(feature.text)}</p>
                </article>
              );
            })}
          </div>
        </section>
        <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="mb-5 flex items-baseline gap-3"><h2 className="font-display text-3xl font-semibold sm:text-4xl">{tr(COPY.howTitle)}</h2><span className="h-px flex-1 bg-border" /></div>
          <div className="grid gap-3 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <article key={step.title[0]} className="relative rounded-[10px] border border-border bg-card p-5 sm:p-6">
                <span className="inline-grid h-9 w-9 place-items-center rounded-md text-sm font-bold text-white" style={{ background: posterColors[i] }}>{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-5 font-display text-2xl font-semibold leading-tight">{tr(step.title)}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tr(step.text)}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="profissionais" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="portico-poster grid gap-7 p-6 text-white sm:p-9 lg:grid-cols-[0.9fr_1.1fr] lg:items-center" style={{ background: "#0f4c5c" }}>
            <div><p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-white/80">{tr(COPY.profBadge)}</p><h2 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">{tr(COPY.profTitle)}</h2><p className="mt-4 text-sm leading-relaxed text-white/85">{tr(["Crie sua presença na comunidade, compartilhe conhecimento e ofereça acompanhamento quando fizer sentido.", "Build your presence in the community, share knowledge and offer follow-up when it makes sense.", "Crea tu presencia en la comunidad, comparte conocimiento y ofrece seguimiento cuando tenga sentido.", "Construisez votre présence dans la communauté, partagez votre savoir et proposez un suivi lorsque cela a du sens."])}</p><Link to="/cadastro" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-bold text-[#0f4c5c]">{tr(COPY.signup)} <ArrowRight className="h-4 w-4" /></Link></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PROFESSIONS.map((profession) => { const Icon = profession.icon; return <div key={profession.label[0]} className="flex min-h-20 items-center gap-2 rounded-md border border-white/25 px-3 py-3 text-sm font-semibold"><Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} aria-hidden="true" /><span>{tr(profession.label)}</span></div>; })}
            </div>
          </div>
        </section>
        <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="mb-5 flex items-baseline gap-3"><h2 className="font-display text-3xl font-semibold sm:text-4xl">{tr(["Cuidado com transparência", "Care, with transparency", "Cuidado con transparencia", "Prendre soin en toute transparence"])}</h2><span className="h-px flex-1 bg-border" /></div>
          <div className="grid gap-3 md:grid-cols-3">
            {security.map((item, i) => { const Icon = item.icon; return <article key={item.title} className="rounded-[10px] border border-border bg-card p-5 sm:p-6"><Icon className="h-6 w-6" style={{ color: posterColors[(i + 1) % posterColors.length] }} strokeWidth={1.5} aria-hidden="true" /><h3 className="mt-4 font-display text-xl font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p></article>; })}
          </div>
        </section>
        <section id="duvidas" className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="mb-5 flex items-baseline gap-3"><h2 className="font-display text-3xl font-semibold sm:text-4xl">{tr(COPY.navFaq)}</h2><span className="h-px flex-1 bg-border" /></div>
          <Faq className="divide-y divide-border border-y border-border" itemClass="border-border" />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
