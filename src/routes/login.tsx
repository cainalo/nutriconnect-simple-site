import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Leaf,
  Users,
  ChefHat,
  Award,
  Stethoscope,
  Presentation,
  ArrowRight,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import { useState } from "react";
import { loginUser, requestLoginEmail, verifyLoginCode } from "@/lib/auth";
import { useTr } from "@/components/settings-ui";
import { toast } from "sonner";
import { useI18n } from "@/hooks/use-i18n";
import type { DictKey } from "@/lib/i18n";

/** Aceita só caminhos internos (evita redirecionar para outro site). */
export function safeRedirect(value: unknown): string | undefined {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : undefined;
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: safeRedirect(search.redirect),
  }),
  head: () => ({ meta: [{ title: "Entrar — NutriConnect" }] }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  // Entrar sem senha: "pedir" mostra o campo do código depois de mandar o e-mail.
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const tr = useTr();

  const sendLink = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) return toast.error(t("auth.fillEmail"));
    setSubmitting(true);
    try {
      await requestLoginEmail(cleanEmail, redirect ?? "/espaco");
      setCodeSent(true);
      toast.success(
        tr([
          "Enviamos um link e um código para o seu e-mail.",
          "We sent a link and a code to your e-mail.",
          "Enviamos un enlace y un código a tu correo.",
          "Nous avons envoyé un lien et un code à votre e-mail.",
        ]),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.loginError"));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmCode = async () => {
    if (code.trim().length < 6) return toast.error(t("reset.enterCode"));
    setSubmitting(true);
    try {
      await verifyLoginCode(email.trim(), code);
      toast.success(t("auth.loginWelcome"));
      navigate({ to: (redirect ?? "/") as "/espaco" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.loginError"));
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) return toast.error(t("auth.fillEmail"));
    if (!password) return toast.error(t("auth.fillPassword"));

    setSubmitting(true);
    try {
      await loginUser(cleanEmail, password);
      toast.success(t("auth.loginWelcome"));
      navigate({ to: (redirect ?? "/") as "/espaco" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.loginError"));
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <AuthLayout
      title={t("auth.loginTitle")}
      subtitle={t("auth.loginSubtitle")}
      notice={redirect ? <RedirectNotice redirect={redirect} /> : undefined}
    >
      <form onSubmit={submit} className="space-y-5">
        <Field label={t("auth.email")}>
          <input
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
          />
        </Field>
        <Field label={t("auth.password")}>
          <PasswordInput
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        <button
          disabled={submitting}
          className="w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground shadow-soft transition hover:bg-accent/90 cursor-pointer disabled:opacity-60"
        >
          {t("auth.loginSubmit")}
        </button>
        <div className="relative text-center text-xs text-muted-foreground before:absolute before:inset-x-0 before:top-1/2 before:h-px before:bg-border">
          <span className="relative bg-card px-3">{tr(["ou", "or", "o", "ou"])}</span>
        </div>
        {codeSent ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {tr([
                "Abra o link do e-mail neste aparelho ou digite o código de 6 dígitos:",
                "Open the e-mail link on this device or type the 6-digit code:",
                "Abre el enlace del correo en este dispositivo o escribe el código de 6 dígitos:",
                "Ouvrez le lien de l'e-mail sur cet appareil ou saisissez le code à 6 chiffres :",
              ])}
            </p>
            <input
              className="input text-center font-mono text-lg tracking-[0.4em]"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              aria-label={t("reset.code6")}
              placeholder="000000"
            />
            <button
              type="button"
              disabled={submitting}
              onClick={confirmCode}
              className="w-full rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
            >
              {tr([
                "Entrar com o código",
                "Log in with the code",
                "Entrar con el código",
                "Se connecter avec le code",
              ])}
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={submitting}
            onClick={sendLink}
            className="w-full rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
          >
            <span className="block">
              {tr([
                "Entrar sem senha",
                "Log in without a password",
                "Entrar sin contraseña",
                "Se connecter sans mot de passe",
              ])}
            </span>
            <span className="block text-xs font-normal text-muted-foreground">
              {tr([
                "código ou link no e-mail",
                "code or link by e-mail",
                "código o enlace al correo",
                "code ou lien par e-mail",
              ])}
            </span>
          </button>
        )}
        <div className="flex items-center justify-between text-sm">
          <Link
            to="/recuperar-senha"
            search={{ email: email.trim() || undefined }}
            className="text-accent hover:underline"
          >
            {t("auth.forgot")}
          </Link>
          <Link to="/cadastro" className="text-muted-foreground hover:text-foreground">
            {t("auth.createAccount")}
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

const FEATURES: { icon: typeof Users; key: DictKey }[] = [
  { icon: Users, key: "auth.feature1" },
  { icon: ChefHat, key: "auth.feature2" },
  { icon: Award, key: "auth.feature3" },
  { icon: Stethoscope, key: "auth.feature4" },
];

/** Contexto para quem chegou por um link (convite, casa, consulta…): diz por que entrar. */
export function RedirectNotice({ redirect }: { redirect: string }) {
  const tr = useTr();
  const text = redirect.startsWith("/convite/")
    ? tr([
        "Um profissional convidou você para acompanhar sua alimentação. Entre ou crie sua conta: depois voltamos sozinhos para o convite.",
        "A professional invited you to follow up on your eating. Log in or create your account: we'll take you back to the invite.",
        "Un profesional te invitó a acompañar tu alimentación. Entra o crea tu cuenta: luego volvemos solos a la invitación.",
        "Un professionnel vous a invité à suivre votre alimentation. Connectez-vous ou créez un compte : nous revenons ensuite à l'invitation.",
      ])
    : redirect.startsWith("/casa/")
      ? tr([
          "Alguém chamou você para uma casa no NutriConnect. Entre ou crie sua conta: depois voltamos sozinhos para o convite.",
          "Someone invited you to a household on NutriConnect. Log in or create your account: we'll take you back to the invite.",
          "Alguien te invitó a un hogar en NutriConnect. Entra o crea tu cuenta: luego volvemos solos a la invitación.",
          "Quelqu'un vous a invité dans un foyer sur NutriConnect. Connectez-vous ou créez un compte : nous revenons ensuite à l'invitation.",
        ])
      : tr([
          "Entre para continuar: depois voltamos sozinhos para a página que você abriu.",
          "Log in to continue: we'll take you back to the page you opened.",
          "Entra para continuar: luego volvemos solos a la página que abriste.",
          "Connectez-vous pour continuer : nous revenons ensuite à la page ouverte.",
        ]);
  return (
    <p className="mt-4 flex items-start gap-2 rounded-xl border border-accent/40 bg-accent-soft/60 p-3 text-left text-sm text-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
      <span>{text}</span>
    </p>
  );
}

/** Campo de senha com botão de mostrar/ocultar (funciona com gerenciadores de senha). */
export function PasswordInput(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const tr = useTr();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} className="input pr-12" />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-pressed={show}
        aria-label={
          show
            ? tr([
                "Ocultar senha",
                "Hide password",
                "Ocultar contraseña",
                "Masquer le mot de passe",
              ])
            : tr([
                "Mostrar senha",
                "Show password",
                "Mostrar contraseña",
                "Afficher le mot de passe",
              ])
        }
        className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function AuthLayout({
  title,
  subtitle,
  notice,
  children,
}: {
  title: string;
  subtitle?: string;
  notice?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const tr = useTr();
  return (
    <div className="flex min-h-screen bg-secondary/40">
      {/* Landing — apresentação da rede (metade esquerda) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary p-10 sm:p-14 text-primary-foreground lg:flex">
        <img
          src="/images/hero/hero-table.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary via-primary/95 to-primary" />
        <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-accent/25 blur-3xl" />
        <div className="absolute bottom-0 -left-10 h-56 w-56 rounded-full bg-chart-4/20 blur-3xl" />

        <Link
          to="/"
          className="relative z-10 flex items-center gap-2 text-lg font-bold font-logo-sans"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur">
            <Leaf className="h-5 w-5" />
          </span>
          NutriConnect
        </Link>

        <div className="relative z-10 space-y-7">
          <div>
            <p className="text-sm font-semibold text-white/80">{t("auth.tagline")}</p>
            <h2 className="mt-4 text-4xl font-extrabold leading-tight font-display text-primary-foreground">
              {t("auth.hero1")}
              <br />
              {t("auth.hero2")}
              <br />
              <span className="text-accent-soft">{t("auth.hero3")}</span>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/85">
              {t("auth.heroText")}
            </p>
          </div>

          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f.key} className="flex items-center gap-3 text-sm text-white/90">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 backdrop-blur">
                  <f.icon className="h-4 w-4" />
                </span>
                <span>{t(f.key)}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/70">
          © {new Date().getFullYear()} NutriConnect. {t("auth.footer")}
        </p>
      </div>

      {/* Cadastro / Login (metade direita) */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-foreground font-logo-sans lg:hidden">
            <Leaf className="h-4 w-4 text-primary" /> NutriConnect
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
          {notice}
          <div className="mt-8 rounded-2xl border bg-card p-6 shadow-card">{children}</div>
          <Link
            to="/apresentacao"
            className="group mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-accent/50 bg-accent-soft/60 p-4 transition hover:border-accent hover:bg-accent-soft"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
              <Presentation className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">
                {t("auth.discover")}
              </span>
              <span className="block text-xs text-muted-foreground">{t("auth.discoverHint")}</span>
            </span>
            <ArrowRight className="h-4 w-4 text-accent transition group-hover:translate-x-0.5" />
          </Link>
          <nav className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <Link to="/termos" className="hover:text-foreground hover:underline">
              {tr(["Termos de Uso", "Terms of Use", "Términos de Uso", "Conditions d'utilisation"])}
            </Link>
            <Link to="/privacidade" className="hover:text-foreground hover:underline">
              {tr(["Privacidade", "Privacy", "Privacidad", "Confidentialité"])}
            </Link>
            <Link to="/diretrizes" className="hover:text-foreground hover:underline">
              {tr(["Diretrizes", "Guidelines", "Normas", "Règles"])}
            </Link>
            <Link to="/contato" className="hover:text-foreground hover:underline">
              {tr(["Fale conosco", "Contact us", "Contáctanos", "Nous contacter"])}
            </Link>
          </nav>
        </div>
      </div>
      <style>{`.input{width:100%;border:1px solid var(--border);background:var(--background);border-radius:0.75rem;padding:0.65rem 0.9rem;font-size:0.875rem;outline:none;transition:all .15s} .input:focus{border-color:var(--primary);box-shadow:0 0 0 3px color-mix(in oklch, var(--primary) 20%, transparent)}`}</style>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
