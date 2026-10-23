import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Mail, MapPin, Send, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-chrome";
import { SiteFooter } from "@/components/site-footer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useTr } from "@/components/settings-ui";
import { supabase } from "@/integrations/supabase/client";
import { COMPANY } from "@/lib/legal";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Fale Conosco — NutriConnect" },
      {
        name: "description",
        content:
          "Dúvidas, suporte, denúncias de conteúdo e pedidos sobre seus dados pessoais (LGPD): fale com a equipe do NutriConnect.",
      },
      { property: "og:title", content: "Fale Conosco — NutriConnect" },
      {
        property: "og:description",
        content: "Estamos aqui para ajudar você a ter a melhor experiência.",
      },
    ],
  }),
  component: Contato,
});

function Contato() {
  const { t } = useI18n();
  const { user } = useAuth();
  const tr = useTr();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [subject, setSubject] = useState(() => t("contact.subject.general"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const subjects = [
    t("contact.subject.general"),
    t("contact.subject.account"),
    tr([
      "Privacidade e dados pessoais (LGPD)",
      "Privacy and personal data (LGPD)",
      "Privacidad y datos personales (LGPD)",
      "Confidentialité et données personnelles (LGPD)",
    ]),
    tr(["Denúncia de conteúdo", "Report content", "Denuncia de contenido", "Signaler un contenu"]),
    tr([
      "Pedir revisão de uma moderação",
      "Ask for a moderation review",
      "Pedir revisión de una moderación",
      "Demander la révision d'une modération",
    ]),
    t("contact.subject.partners"),
    t("contact.subject.press"),
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("contact_messages").insert({
      user_id: user?.id ?? null,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      subject,
      message: message.trim(),
    });
    setLoading(false);
    if (error) {
      toast.error(
        `Não foi possível enviar agora. Escreva para ${COMPANY.supportEmail} se o problema continuar.`,
      );
      return;
    }
    setSubmitted(true);
    setMessage("");
    toast.success(t("contact.received"));
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        <section className="bg-gradient-to-b from-secondary/60 to-background py-14">
          <div className="mx-auto max-w-5xl px-4 text-center">
            <p className="!text-center text-sm font-semibold text-primary">{t("contact.badge")}</p>
            <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              {t("contact.title")}
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">{t("contact.subtitle")}</p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
            <div className="space-y-4">
              <div className="flex items-start gap-4 rounded-3xl border bg-card p-5 shadow-card">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {t("contact.ch1.title")}
                  </div>
                  <a
                    href={`mailto:${COMPANY.supportEmail}`}
                    className="mt-0.5 block text-sm font-bold text-foreground hover:underline"
                  >
                    {COMPANY.supportEmail}
                  </a>
                </div>
              </div>

              {COMPANY.address && (
                <div className="flex items-start gap-4 rounded-3xl border bg-card p-5 shadow-card">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {t("contact.ch4.title")}
                    </div>
                    <div className="mt-0.5 text-sm font-bold text-foreground">
                      {COMPANY.address}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-4 rounded-3xl border bg-secondary/40 p-5">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="text-xs leading-relaxed text-muted-foreground">
                  <p className="text-sm font-bold text-foreground">
                    {tr([
                      "Seus dados e denúncias",
                      "Your data and reports",
                      "Tus datos y denuncias",
                      "Vos données et signalements",
                    ])}
                  </p>
                  <p className="mt-1">
                    {tr([
                      "Para pedidos da LGPD (acesso, correção, exclusão) escolha o assunto “Privacidade e dados pessoais”. Você também pode baixar seus dados e excluir a conta em Configurações. Para denunciar um conteúdo, use o botão de denúncia ou o assunto “Denúncia de conteúdo”. Veja as",
                      "For data requests (access, correction, deletion) choose the subject “Privacy and personal data”. You can also download your data and delete your account in Settings. To report content, use the report button or the subject “Report content”. See the",
                      "Para solicitudes de datos (acceso, corrección, eliminación) elige el asunto “Privacidad y datos personales”. También puedes descargar tus datos y eliminar la cuenta en Ajustes. Para denunciar un contenido, usa el botón de denuncia o el asunto “Denuncia de contenido”. Consulta las",
                      "Pour les demandes sur vos données (accès, rectification, suppression), choisissez le sujet « Confidentialité et données personnelles ». Vous pouvez aussi télécharger vos données et supprimer votre compte dans Paramètres. Pour signaler un contenu, utilisez le bouton de signalement ou le sujet « Signaler un contenu ». Consultez les",
                    ])}{" "}
                    <Link to="/diretrizes" className="underline">
                      {tr(["Diretrizes", "Guidelines", "Normas", "Règles"])}
                    </Link>{" "}
                    {tr(["e a", "and the", "y la", "et la"])}{" "}
                    <Link to="/privacidade" className="underline">
                      {tr([
                        "Política de Privacidade",
                        "Privacy Policy",
                        "Política de Privacidad",
                        "Politique de confidentialité",
                      ])}
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border bg-card p-8 shadow-xl">
              {submitted ? (
                <div className="space-y-4 py-12 text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="font-display text-2xl font-bold">{t("contact.received")}</h3>
                  <p className="mx-auto max-w-md text-sm text-muted-foreground">
                    {t("contact.receivedText")}
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-4 rounded-full border border-border bg-secondary px-6 py-2.5 text-xs font-semibold hover:bg-secondary/80"
                  >
                    {t("contact.sendAnother")}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h2 className="font-display text-2xl font-bold">{t("contact.formTitle")}</h2>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t("contact.fullName")}>
                      <Input
                        required
                        minLength={2}
                        maxLength={120}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t("contact.namePlaceholder")}
                      />
                    </Field>
                    <Field label={t("auth.email")}>
                      <Input
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={tr([
                          "voce@exemplo.com",
                          "you@example.com",
                          "tu@ejemplo.com",
                          "vous@exemple.com",
                        ])}
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t("contact.phone")}>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(11) 99999-9999"
                      />
                    </Field>
                    <Field label={t("contact.subject")}>
                      <select
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      >
                        {subjects.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <Field label={t("contact.message")}>
                    <Textarea
                      required
                      minLength={5}
                      maxLength={5000}
                      rows={5}
                      className="resize-none"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t("contact.messagePlaceholder")}
                    />
                  </Field>

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-md transition hover:bg-primary-hover disabled:opacity-50"
                  >
                    {loading ? (
                      <span>{t("contact.sending")}</span>
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> {t("contact.send")}
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}
