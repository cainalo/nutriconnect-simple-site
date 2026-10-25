import { td } from "@/lib/i18n/data";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { registerUser } from "@/lib/auth";
import { JOURNEY_GOALS } from "@/lib/community";
import { AuthLayout, Field, PasswordInput, RedirectNotice, safeRedirect } from "./login";
import { Check } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import { useTr } from "@/components/settings-ui";
import { isAdult, MIN_AGE } from "@/lib/legal";

export const Route = createFileRoute("/cadastro")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: safeRedirect(search.redirect),
  }),
  head: () => ({ meta: [{ title: "Criar conta — NutriConnect" }] }),
  component: Cadastro,
});

function Cadastro() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { t } = useI18n();
  const tr = useTr();
  const [form, setForm] = useState({
    nome: "",
    cpf: "",
    nasc: "",
    tel: "",
    email: "",
    senha: "",
    conf: "",
  });
  const [selectedGoal, setSelectedGoal] = useState<string>(JOURNEY_GOALS[0]);

  const upd = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNome = form.nome.trim();
    const cleanEmail = form.email.trim();
    const cleanTel = form.tel.trim();
    const cleanSenha = form.senha;
    const cleanConf = form.conf;

    if (!cleanNome) return toast.error(t("signup.fillName"));
    if (!cleanEmail) return toast.error(t("auth.fillEmail"));
    if (!/\S+@\S+\.\S+/.test(cleanEmail)) return toast.error(t("signup.invalidEmail"));
    if (!form.nasc)
      return toast.error(
        tr([
          "Informe sua data de nascimento.",
          "Enter your date of birth.",
          "Indica tu fecha de nacimiento.",
          "Indiquez votre date de naissance.",
        ]),
      );
    if (!isAdult(form.nasc))
      return toast.error(
        tr([
          `O NutriConnect é para maiores de ${MIN_AGE} anos.`,
          `NutriConnect is for people aged ${MIN_AGE} and over.`,
          `NutriConnect es para mayores de ${MIN_AGE} años.`,
          `NutriConnect est réservé aux plus de ${MIN_AGE} ans.`,
        ]),
      );
    if (!accepted)
      return toast.error(
        tr([
          "Aceite os Termos de Uso e a Política de Privacidade.",
          "Accept the Terms of Use and the Privacy Policy.",
          "Acepta los Términos de Uso y la Política de Privacidad.",
          "Acceptez les Conditions d'utilisation et la Politique de confidentialité.",
        ]),
      );
    if (!cleanSenha) return toast.error(t("auth.fillPassword"));
    if (cleanSenha.length < 6) return toast.error(t("signup.shortPassword"));
    if (cleanSenha !== cleanConf) return toast.error(t("signup.mismatch"));

    setSubmitting(true);
    try {
      const { needsConfirmation } = await registerUser({
        name: cleanNome,
        email: cleanEmail,
        phone: cleanTel,
        cpf: form.cpf,
        birthDate: form.nasc,
        password: cleanSenha,
        goal: selectedGoal,
        journeyGoal: selectedGoal,
      });
      if (needsConfirmation) {
        toast.success(t("auth.checkEmail"), { duration: 8000 });
        navigate({ to: "/login", search: { redirect } });
        return;
      }
      toast.success(t("signup.success"));
      navigate({ to: (redirect ?? "/") as "/espaco" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("signup.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={t("signup.title")}
      subtitle={t("signup.subtitle")}
      notice={redirect ? <RedirectNotice redirect={redirect} /> : undefined}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label={t("signup.fullName")}>
          <input
            className="input"
            autoComplete="name"
            value={form.nome}
            onChange={upd("nome")}
            placeholder={t("signup.namePlaceholder")}
          />
        </Field>

        <div>
          <span className="mb-1.5 block text-xs font-semibold text-foreground">
            {t("signup.goalQuestion")}
          </span>
          {/* 9 focos numa grade 3 × 3: simétrica e curta também no celular. */}
          <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-border/80 bg-secondary/30 p-1">
            {JOURNEY_GOALS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGoal(g)}
                aria-pressed={selectedGoal === g}
                className={`grid min-h-11 place-items-center rounded-xl px-1.5 py-1.5 text-center text-[11px] font-medium leading-tight transition cursor-pointer ${
                  selectedGoal === g
                    ? "bg-accent text-accent-foreground font-semibold shadow-xs"
                    : "bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {td(g)}
              </button>
            ))}
          </div>
        </div>

        <Field label={t("signup.birthDate")}>
          <input type="date" className="input" value={form.nasc} onChange={upd("nasc")} />
        </Field>
        {/* CPF e telefone são opcionais e podem ficar para depois (Configurações → Conta). */}
        <details className="group rounded-xl border border-border/70 bg-secondary/30 px-3 py-2">
          <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-foreground">
            <span className="whitespace-nowrap">
              {tr([
                "Telefone e CPF",
                "Phone and tax ID",
                "Teléfono y documento",
                "Tél. et n° fiscal",
              ])}
            </span>
            <span className="whitespace-nowrap text-xs text-muted-foreground group-open:hidden">
              {tr([
                "opcional, depois",
                "optional, later",
                "opcional, después",
                "facultatif, plus tard",
              ])}
            </span>
          </summary>
          <div className="mt-2 grid grid-cols-1 gap-3 pb-1 sm:grid-cols-2">
            <Field label={t("signup.phone")}>
              <input
                className="input"
                type="tel"
                autoComplete="tel"
                value={form.tel}
                onChange={upd("tel")}
                placeholder="(11) 99999-9999"
              />
            </Field>
            <Field label={t("settings.account.cpf")}>
              <input
                className="input"
                value={form.cpf}
                onChange={upd("cpf")}
                placeholder="000.000.000-00"
              />
            </Field>
          </div>
        </details>
        <Field label={t("auth.email")}>
          <input
            type="email"
            autoComplete="email"
            className="input"
            value={form.email}
            onChange={upd("email")}
            placeholder="seu@email.com"
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t("auth.password")}>
            <PasswordInput
              autoComplete="new-password"
              value={form.senha}
              onChange={upd("senha")}
              placeholder={t("signup.passwordPlaceholder")}
            />
          </Field>
          <Field label={t("signup.confirmPassword")}>
            <PasswordInput
              autoComplete="new-password"
              value={form.conf}
              onChange={upd("conf")}
              placeholder={t("signup.confirmPlaceholder")}
            />
          </Field>
        </div>
        <PasswordRules password={form.senha} confirm={form.conf} />
        <label className="flex cursor-pointer items-start gap-2.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-primary)]"
          />
          <span>
            {tr([
              "Tenho {n} anos ou mais e li e aceito os",
              "I am {n} or older and have read and accept the",
              "Tengo {n} años o más y he leído y acepto los",
              "J'ai {n} ans ou plus et j'ai lu et j'accepte les",
            ]).replace("{n}", String(MIN_AGE))}{" "}
            <Link to="/termos" target="_blank" className="text-accent underline">
              {tr(["Termos de Uso", "Terms of Use", "Términos de Uso", "Conditions d'utilisation"])}
            </Link>{" "}
            {tr(["e a", "and the", "y la", "et la"])}{" "}
            <Link to="/privacidade" target="_blank" className="text-accent underline">
              {tr([
                "Política de Privacidade",
                "Privacy Policy",
                "Política de Privacidad",
                "Politique de confidentialité",
              ])}
            </Link>
            .
          </span>
        </label>
        <button
          disabled={submitting}
          className="w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground shadow-soft hover:bg-accent/90 transition disabled:opacity-60"
        >
          {t("signup.submit")}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          {t("signup.haveAccount")}{" "}
          <Link to="/login" className="text-accent hover:underline font-medium">
            {t("signup.signIn")}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

/** Regras da senha ao vivo: tamanho mínimo, força e se as duas senhas batem. */
export function PasswordRules({ password, confirm }: { password: string; confirm?: string }) {
  const tr = useTr();
  const long = password.length >= 6;
  const mixed = /[a-zA-Z]/.test(password) && /\d/.test(password);
  const strong = password.length >= 10 && mixed;
  const level = !password ? 0 : !long ? 1 : strong ? 3 : 2;
  const labels = [
    "",
    tr(["Curta demais", "Too short", "Demasiado corta", "Trop court"]),
    tr(["Boa", "Good", "Buena", "Bon"]),
    tr(["Forte", "Strong", "Fuerte", "Fort"]),
  ];
  const bar = ["bg-border", "bg-destructive", "bg-warning", "bg-primary"][level];
  const rules = [
    {
      ok: long,
      text: tr([
        "Pelo menos 6 caracteres",
        "At least 6 characters",
        "Al menos 6 caracteres",
        "Au moins 6 caractères",
      ]),
    },
    {
      ok: mixed,
      text: tr([
        "Letras e números (recomendado)",
        "Letters and numbers (recommended)",
        "Letras y números (recomendado)",
        "Lettres et chiffres (conseillé)",
      ]),
    },
    ...(confirm !== undefined
      ? [
          {
            ok: !!confirm && confirm === password,
            text: tr([
              "As duas senhas iguais",
              "Both passwords match",
              "Ambas contraseñas iguales",
              "Les deux mots de passe identiques",
            ]),
          },
        ]
      : []),
  ];
  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1" aria-hidden>
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i <= level ? bar : "bg-border"}`}
            />
          ))}
        </div>
        <span className="min-w-16 text-right text-xs font-medium text-muted-foreground">
          {labels[level]}
        </span>
      </div>
      <ul className="grid gap-1 text-xs">
        {rules.map((r) => (
          <li
            key={r.text}
            className={`flex items-center gap-1.5 ${r.ok ? "text-foreground" : "text-muted-foreground"}`}
          >
            <Check
              className={`h-3.5 w-3.5 shrink-0 ${r.ok ? "text-primary" : "opacity-30"}`}
              aria-hidden
            />
            {r.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
