// Página pública (quem não entrou): explica o NutriConnect e leva ao cadastro ou ao login.
// Não dá acesso a nada do site em si — feed, perfis e profissionais ficam para quem tem conta.
import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  Award,
  BadgeCheck,
  Brain,
  CalendarCheck,
  ChevronDown,
  Dumbbell,
  HeartPulse,
  Lock,
  MapIcon,
  MessageCircle,
  Presentation,
  ShieldCheck,
  Stethoscope,
  Apple,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import { Mascot } from "@/components/mascots";
import { SiteFooter } from "@/components/site-footer";
import { useTr } from "@/components/settings-ui";
import { useI18n } from "@/hooks/use-i18n";
import type { Names } from "@/lib/appearance-data";
import { LOCALES, isLocale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";
import { AndroidDownloadButton } from "@/components/android-app";
import { FAQ, FEATURES, PROFESSIONS, STEPS } from "@/components/landing-data";
import { LandingAurora, LandingEditorial, LandingVibrante } from "@/components/landing-designs";
import { useDesignId } from "@/lib/site-design";

export function Section({
  id,
  children,
  className,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn("mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20", className)}
    >
      {children}
    </section>
  );
}

function LandingNatural() {
  const tr = useTr();
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-background text-foreground [&_p]:text-left">
      {/* Topo */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
          <span className="font-logo-serif text-lg font-bold tracking-tight sm:text-xl">
            Nutri<span className="text-accent">Connect</span>
          </span>
          <nav className="ml-6 hidden items-center gap-5 text-sm text-muted-foreground md:flex">
            <a href="#recursos" className="hover:text-foreground">
              {tr(["Recursos", "Features", "Recursos", "Fonctionnalités"])}
            </a>
            <a href="#profissionais" className="hover:text-foreground">
              {tr([
                "Para profissionais",
                "For professionals",
                "Para profesionales",
                "Pour les pros",
              ])}
            </a>
            <a href="#duvidas" className="hover:text-foreground">
              {tr(["Dúvidas", "FAQ", "Preguntas", "FAQ"])}
            </a>
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <select
              value={locale}
              onChange={(e) => isLocale(e.target.value) && setLocale(e.target.value)}
              aria-label={tr(["Idioma", "Language", "Idioma", "Langue"])}
              className="hidden h-9 cursor-pointer rounded-full border border-border bg-card px-1.5 text-xs font-semibold min-[360px]:block sm:px-2"
            >
              {LOCALES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.id === "pt-BR" ? "PT" : l.id.toUpperCase()}
                </option>
              ))}
            </select>
            <Link
              to="/login"
              className="inline-flex whitespace-nowrap rounded-full px-2 py-2 text-xs font-semibold hover:bg-secondary sm:px-4 sm:text-sm"
            >
              {tr(["Entrar", "Log in", "Entrar", "Se connecter"])}
            </Link>
            <Link
              to="/cadastro"
              className="inline-flex items-center whitespace-nowrap rounded-full bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground shadow-soft transition hover:bg-accent/90 sm:px-4 sm:text-sm"
            >
              {tr(["Criar conta", "Sign up", "Crear cuenta", "Créer un compte"])}
            </Link>
          </div>
        </div>
      </header>

      {/* Abertura */}
      <Section className="pt-10 lg:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="text-sm font-semibold text-accent">
              {tr([
                "Rede social de alimentação e saúde",
                "A food and health social network",
                "Red social de alimentación y salud",
                "Le réseau social de l'alimentation et de la santé",
              ])}
            </p>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
              {tr([
                "Comer melhor é mais fácil",
                "Eating better is easier",
                "Comer mejor es más fácil",
                "Mieux manger, c'est plus facile",
              ])}{" "}
              <span className="text-accent">{tr(["junto", "together", "juntos", "ensemble"])}</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {tr([
                "Aqui você troca receitas com quem cozinha de verdade, aprende sobre comida em lições curtas com a Nina e, quando precisar, marca uma consulta por vídeo com um profissional de registro conferido.",
                "Swap recipes with people who actually cook, learn about food in short lessons with Nina and, when you need it, book a video visit with a professional whose license we checked.",
                "Aquí intercambias recetas con quien cocina de verdad, aprendes sobre comida en lecciones cortas con Nina y, cuando lo necesites, agendas una consulta por video con un profesional de registro verificado.",
                "Ici, on échange des recettes avec des gens qui cuisinent vraiment, on apprend sur l'alimentation en courtes leçons avec Nina et, quand il le faut, on réserve une téléconsultation avec un professionnel dont l'inscription a été vérifiée.",
              ])}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/cadastro"
                className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-base font-semibold text-accent-foreground shadow-soft transition hover:bg-accent/90"
              >
                {tr([
                  "Começar grátis",
                  "Start for free",
                  "Empezar gratis",
                  "Commencer gratuitement",
                ])}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/apresentacao"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-base font-semibold transition hover:bg-secondary"
              >
                <Presentation className="h-4 w-4" />
                {tr([
                  "Ver a apresentação",
                  "See the presentation",
                  "Ver la presentación",
                  "Voir la présentation",
                ])}
              </Link>
            </div>
            <div className="mt-4">
              <AndroidDownloadButton />
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              {tr([
                "Gratuito para participar. Você só paga se marcar uma consulta.",
                "Free to join. You only pay if you book a visit.",
                "Gratis para participar. Solo pagas si agendas una consulta.",
                "Gratuit pour participer. Vous ne payez que pour une consultation.",
              ])}
            </p>
          </div>

          <div className="relative mx-auto h-[22rem] w-full max-w-md sm:h-[26rem]">
            <img
              src="/images/presentation/market.jpg"
              alt=""
              className="absolute left-0 top-4 h-52 w-44 -rotate-6 rounded-3xl object-cover shadow-xl ring-4 ring-card sm:h-60 sm:w-52"
            />
            <img
              src="/images/presentation/cooking-together.jpg"
              alt=""
              className="absolute right-0 top-0 h-44 w-40 rotate-6 rounded-3xl object-cover shadow-xl ring-4 ring-card sm:h-52 sm:w-48"
            />
            <img
              src="/images/presentation/meeting.jpg"
              alt=""
              className="absolute bottom-0 right-6 h-40 w-52 rotate-2 rounded-3xl object-cover shadow-xl ring-4 ring-card sm:h-44 sm:w-60"
            />
            <div className="absolute bottom-2 left-6">
              <div className="relative mb-2 max-w-[12rem] rounded-2xl bg-card px-3 py-2 text-xs font-semibold shadow-lg">
                {tr([
                  "Oi! Eu sou a Nina. Vamos juntos?",
                  "Hi! I'm Nina. Shall we go together?",
                  "¡Hola! Soy Nina. ¿Vamos juntos?",
                  "Salut ! Je suis Nina. On y va ensemble ?",
                ])}
              </div>
              <Mascot id="nina" mood="happy" size={130} />
            </div>
          </div>
        </div>
      </Section>

      {/* Recursos */}
      <Section id="recursos" className="pt-4">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">
          {tr([
            "O que tem aqui dentro",
            "What's inside",
            "Lo que hay aquí dentro",
            "Ce qu'on trouve ici",
          ])}
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article
              key={f.title[0]}
              className="rounded-3xl border border-border/70 bg-card p-6 shadow-xs"
            >
              <span className={cn("grid h-11 w-11 place-items-center rounded-2xl", f.tone)}>
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold">{tr(f.title)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{tr(f.text)}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* Como funciona */}
      <div className="bg-primary text-primary-foreground">
        <Section>
          <h2 className="font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
            {tr(["Como funciona", "How it works", "Cómo funciona", "Comment ça marche"])}
          </h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title[0]} className="rounded-3xl bg-white/10 p-6 backdrop-blur">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-accent font-bold text-accent-foreground">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-display text-lg font-bold text-primary-foreground">
                  {tr(s.title)}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-primary-foreground/80">
                  {tr(s.text)}
                </p>
              </li>
            ))}
          </ol>
        </Section>
      </div>

      {/* Profissionais */}
      <Section id="profissionais">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">
              {tr([
                "Para profissionais de saúde",
                "For health professionals",
                "Para profesionales de la salud",
                "Pour les professionnels de santé",
              ])}
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
              {tr([
                "Seu consultório on-line, junto de quem quer cuidar da saúde",
                "Your online practice, close to people who want to take care of themselves",
                "Tu consultorio en línea, cerca de quien quiere cuidarse",
                "Votre cabinet en ligne, au plus près de ceux qui veulent prendre soin d'eux",
              ])}
            </h2>
            <ul className="mt-6 space-y-3 text-sm">
              {(
                [
                  [
                    CalendarCheck,
                    [
                      "Agenda com pagamento seguro e repasse",
                      "Scheduling with secure payment and payouts",
                      "Agenda con pago seguro y transferencia",
                      "Agenda avec paiement sécurisé et reversement",
                    ],
                  ],
                  [
                    Video,
                    [
                      "Videoconsulta no site, com ferramentas para cada profissão",
                      "Video visits on the site, with tools for each profession",
                      "Videoconsulta en el sitio, con herramientas para cada profesión",
                      "Téléconsultation sur le site, avec des outils pour chaque métier",
                    ],
                  ],
                  [
                    HeartPulse,
                    [
                      "Prontuário, avaliações, planos e acompanhamento entre consultas",
                      "Records, assessments, plans and follow-up between visits",
                      "Historia clínica, evaluaciones, planes y seguimiento",
                      "Dossier, évaluations, plans et suivi entre les séances",
                    ],
                  ],
                  [
                    MessageCircle,
                    [
                      "Selo de verificado e comunidades para compartilhar conhecimento",
                      "Verified badge and communities to share knowledge",
                      "Sello verificado y comunidades para compartir conocimiento",
                      "Badge vérifié et communautés pour partager vos connaissances",
                    ],
                  ],
                ] as [LucideIcon, Names][]
              ).map(([Icon, text]) => (
                <li key={text[0]} className="flex items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="pt-1.5">{tr(text)}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/cadastro"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              {tr([
                "Criar conta e enviar meu registro",
                "Sign up and submit my registration",
                "Crear cuenta y enviar mi registro",
                "Créer un compte et envoyer mon inscription",
              ])}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PROFESSIONS.map(({ icon: Icon, label }) => (
              <div
                key={label[0]}
                className="flex flex-col items-center gap-2 rounded-3xl border border-border/70 bg-card p-5 text-center shadow-xs"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-sm font-semibold">{tr(label)}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Segurança */}
      <Section className="pt-0">
        <div className="grid gap-4 rounded-3xl border border-border/70 bg-card p-6 shadow-xs sm:grid-cols-3 sm:p-8">
          {(
            [
              [
                ShieldCheck,
                ["Conteúdo conferido", "Content checked", "Contenido revisado", "Contenu vérifié"],
                [
                  "Cada post passa por análise antes de ir ao ar.",
                  "Every post is reviewed before going live.",
                  "Cada publicación se revisa antes de salir.",
                  "Chaque publication est vérifiée avant sa mise en ligne.",
                ],
              ],
              [
                Lock,
                [
                  "Chamadas criptografadas",
                  "Encrypted calls",
                  "Llamadas cifradas",
                  "Appels chiffrés",
                ],
                [
                  "Sem gravação e só com quem participa da consulta.",
                  "Never recorded, only with the people in the visit.",
                  "Sin grabación y solo con quienes participan.",
                  "Jamais enregistrés, seulement entre participants.",
                ],
              ],
              [
                HeartPulse,
                [
                  "Seus dados de saúde são seus",
                  "Your health data is yours",
                  "Tus datos de salud son tuyos",
                  "Vos données de santé vous appartiennent",
                ],
                [
                  "Usados só com seu consentimento, conforme a LGPD.",
                  "Used only with your consent, under Brazil's LGPD.",
                  "Usados solo con tu consentimiento, según la LGPD.",
                  "Utilisées uniquement avec votre accord, selon la LGPD.",
                ],
              ],
            ] as [LucideIcon, Names, Names][]
          ).map(([Icon, title, text]) => (
            <div key={title[0]} className="flex gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-semibold">{tr(title)}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{tr(text)}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Dúvidas */}
      <Section id="duvidas" className="pt-0">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">
          {tr([
            "Perguntas frequentes",
            "Frequently asked questions",
            "Preguntas frecuentes",
            "Questions fréquentes",
          ])}
        </h2>
        <div className="mt-6 divide-y divide-border rounded-3xl border border-border/70 bg-card">
          {FAQ.map((f, i) => (
            <div key={f.q[0]}>
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
      </Section>

      {/* Chamada final */}
      <Section className="pt-0">
        <div className="flex flex-col items-center gap-5 rounded-3xl bg-accent-soft px-6 py-12 text-center">
          <Mascot id="nina" mood="cheer" size={110} />
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            {tr([
              "Comece pela próxima refeição",
              "Start with your next meal",
              "Empieza por la próxima comida",
              "Commencez par le prochain repas",
            ])}
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/cadastro"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-accent-foreground shadow-soft transition hover:bg-accent/90"
            >
              {tr([
                "Criar minha conta",
                "Create my account",
                "Crear mi cuenta",
                "Créer mon compte",
              ])}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center rounded-full border border-border bg-card px-6 py-3 font-semibold transition hover:bg-secondary"
            >
              {tr([
                "Já tenho conta",
                "I already have an account",
                "Ya tengo cuenta",
                "J'ai déjà un compte",
              ])}
            </Link>
          </div>
        </div>
      </Section>

      <SiteFooter />
    </div>
  );
}

/** Página pública do design escolhido pelo admin. */
export function Landing() {
  const design = useDesignId();
  if (design === "vibrante") return <LandingVibrante />;
  if (design === "editorial") return <LandingEditorial />;
  if (design === "aurora") return <LandingAurora />;
  return <LandingNatural />;
}
