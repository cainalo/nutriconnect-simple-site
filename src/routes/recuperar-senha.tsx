import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthLayout, Field, PasswordInput } from "./login";
import { PasswordRules } from "./cadastro";
import { useTr } from "@/components/settings-ui";
import { useI18n } from "@/hooks/use-i18n";
import { supabase } from "@/integrations/supabase/client";
import { requestPasswordReset, setNewPassword, signOut, verifyRecoveryCode } from "@/lib/auth";
import { Mail, CheckCircle2, ArrowRight, Check } from "lucide-react";

export const Route = createFileRoute("/recuperar-senha")({
  // ?email= vem do link "Esqueceu a senha?" do login, já com o e-mail digitado.
  validateSearch: (search: Record<string, unknown>): { email?: string } => ({
    email: typeof search.email === "string" ? search.email.slice(0, 200) : undefined,
  }),
  head: () => ({ meta: [{ title: "Recuperar senha — NutriConnect" }] }),
  component: Recuperar,
});

function Recuperar() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const tr = useTr();
  const search = Route.useSearch();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState(search.email ?? "");
  const [code, setCode] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [conf, setConf] = useState("");
  const [loading, setLoading] = useState(false);

  // Quem chega pelo link do e-mail já vem com a sessão de recuperação.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStep(3);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("reset.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error(t("reset.enterEmail"));
    void run(async () => {
      await requestPasswordReset(email);
      toast.success(t("reset.codeSent") + " " + email);
      setStep(2);
    });
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) return toast.error(t("reset.enterCode"));
    void run(async () => {
      await verifyRecoveryCode(email, code);
      toast.success(t("reset.codeOk"));
      setStep(3);
    });
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha !== conf) return toast.error(t("signup.mismatch"));
    if (novaSenha.length < 6) return toast.error(t("reset.minLength"));
    void run(async () => {
      await setNewPassword(novaSenha);
      await signOut();
      toast.success(t("reset.done"));
      setStep(4);
    });
  };

  return (
    <AuthLayout
      title={t("reset.title")}
      subtitle={
        step === 1
          ? t("reset.sub1")
          : step === 2
            ? `${t("reset.sub2")} ${email}`
            : step === 3
              ? t("reset.sub3")
              : t("reset.sub4")
      }
    >
      {/* INDICADOR DE PASSOS: no celular só o passo atual mostra o nome. */}
      <ol className="mb-6 flex items-center justify-between gap-2 border-b pb-4">
        {[1, 2, 3].map((s) => (
          <li
            key={s}
            className="flex items-center gap-2"
            aria-current={step === s ? "step" : undefined}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : step > s
                    ? "bg-primary/15 text-primary"
                    : "bg-secondary text-muted-foreground"
              }`}
            >
              {step > s ? <Check className="h-4 w-4" aria-hidden /> : s}
            </span>
            <span className={`text-xs font-medium ${step === s ? "inline" : "hidden sm:inline"}`}>
              {s === 1
                ? t("reset.step.email")
                : s === 2
                  ? t("reset.step.code")
                  : t("reset.step.password")}
            </span>
          </li>
        ))}
      </ol>

      {step === 1 && (
        <form onSubmit={handleSendEmail} className="space-y-4">
          <Field label={t("reset.registeredEmail")}>
            <div className="relative">
              <input
                type="email"
                required
                autoComplete="email"
                className="input"
                style={{ paddingLeft: "2.5rem" }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
              />
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
            </div>
          </Field>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary-hover transition disabled:opacity-50"
          >
            {loading ? t("reset.sending") : t("reset.sendCode")}
          </button>
          <p className="text-center text-xs text-muted-foreground">
            {t("reset.remembered")}{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              {t("reset.backToLogin")}
            </Link>
          </p>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <Field label={t("reset.code6")}>
            <input
              type="text"
              required
              maxLength={6}
              className="input tracking-[0.5em] text-center text-xl font-bold uppercase"
              value={code}
              inputMode="numeric"
              autoComplete="one-time-code"
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
            />
          </Field>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary-hover transition disabled:opacity-50"
          >
            {loading ? t("reset.verifying") : t("reset.verify")}
          </button>
          <div className="flex justify-between items-center text-xs">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="min-h-10 text-muted-foreground hover:text-foreground"
            >
              {t("reset.changeEmail")}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                void run(async () => {
                  await requestPasswordReset(email);
                  toast.success(
                    tr([
                      "Enviamos um novo código.",
                      "We sent you a new code.",
                      "Te enviamos un código nuevo.",
                      "Nous vous avons envoyé un nouveau code.",
                    ]),
                  );
                })
              }
              className="min-h-10 text-primary font-semibold hover:underline"
            >
              {t("reset.resend")}
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <Field label={t("reset.newPassword")}>
            <PasswordInput
              required
              minLength={6}
              autoComplete="new-password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
          <Field label={t("reset.confirmNew")}>
            <PasswordInput
              required
              autoComplete="new-password"
              value={conf}
              onChange={(e) => setConf(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
          <PasswordRules password={novaSenha} confirm={conf} />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary-hover transition disabled:opacity-50"
          >
            {loading ? t("reset.saving") : t("reset.submit")}
          </button>
        </form>
      )}

      {step === 4 && (
        <div className="py-6 text-center space-y-4">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="font-display text-xl font-bold">{t("reset.successTitle")}</h3>
          <p className="text-xs text-muted-foreground">{t("reset.successText")}</p>
          <button
            onClick={() => navigate({ to: "/login" })}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            {t("reset.goLogin")} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </AuthLayout>
  );
}
