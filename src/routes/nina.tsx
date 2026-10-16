import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  HeartHandshake,
  Loader2,
  MessageCircle,
  Mic,
  Refrigerator,
  Send,
  Square,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { AuthGateLoading, SiteHeader } from "@/components/site-chrome";
import { Mascot } from "@/components/mascots";
import { useRequireAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { supabase } from "@/integrations/supabase/client";
import { NINA_DAILY_LIMIT, askNutriAssistant } from "@/lib/nutri-assistant.functions";
import { NINA_TOPICS } from "@/components/rail-cards";
import { useTr } from "@/components/settings-ui";
import { useLinks } from "@/lib/clinical/queries";
import {
  dismissPrompt,
  isPromptDismissed,
  useNinaCareAllowed,
  useSetNinaCare,
} from "@/lib/nina-care";
import {
  canListen,
  canSpeak,
  speak,
  stopSpeaking,
  useAutoSpeak,
  useSpeechInput,
  type ListenError,
} from "@/lib/voice";

export const Route = createFileRoute("/nina")({
  head: () => ({
    meta: [
      { title: "Nina — NutriConnect" },
      {
        name: "description",
        content: "Converse com a Nina, a assistente de educação alimentar do NutriConnect.",
      },
    ],
  }),
  component: NinaPage,
});

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function NinaPage() {
  const { user, hydrated } = useRequireAuth();
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const historyKey = ["nina-history", user?.id];
  const [draft, setDraft] = useState("");

  // As perguntas prontas dos cards laterais preenchem o campo de texto.
  useEffect(() => {
    const onPrompt = (e: Event) => setDraft(String((e as CustomEvent<string>).detail ?? ""));
    window.addEventListener("nina:prompt", onPrompt);
    return () => window.removeEventListener("nina:prompt", onPrompt);
  }, []);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [used, setUsed] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const tr = useTr();
  // Nina por voz (N11): só aparece onde o navegador sabe ouvir/falar.
  const [voice, setVoice] = useState({ listen: false, speak: false });
  useEffect(() => setVoice({ listen: canListen(), speak: canSpeak() }), []);
  const [autoSpeak, setAutoSpeak] = useAutoSpeak();
  const [speaking, setSpeaking] = useState(false);
  const sendRef = useRef<(text: string) => void>(() => {});
  const listenErrors: Record<ListenError, [string, string, string, string]> = {
    negado: [
      "Libere o microfone para o site nas configurações do navegador.",
      "Allow the microphone for this site in your browser settings.",
      "Permite el micrófono para este sitio en la configuración del navegador.",
      "Autorisez le micro pour ce site dans les réglages du navigateur.",
    ],
    "sem-fala": [
      "Não ouvi nada. Toque no microfone e fale de novo.",
      "I didn't hear anything. Tap the mic and speak again.",
      "No escuché nada. Toca el micrófono y habla de nuevo.",
      "Je n'ai rien entendu. Touchez le micro et reparlez.",
    ],
    falhou: [
      "Não consegui ouvir agora. Tente de novo ou escreva.",
      "I couldn't listen right now. Try again or type.",
      "No pude escuchar ahora. Inténtalo de nuevo o escribe.",
      "Je n'ai pas pu écouter. Réessayez ou écrivez.",
    ],
  };
  const mic = useSpeechInput(
    locale,
    (text) => sendRef.current(text),
    (err) => toast.error(tr(listenErrors[err])),
  );
  const say = (text: string) => {
    setSpeaking(true);
    speak(text, locale, () => setSpeaking(false));
  };
  // Acompanhamento ativo: a Nina pode usar o plano e as metas, se a pessoa autorizar (M2).
  const links = useLinks("patient");
  const activeLink = (links.data ?? [])
    .filter((l) => l.status === "ativo")
    .sort((a, b) =>
      (b.responded_at ?? b.created_at).localeCompare(a.responded_at ?? a.created_at),
    )[0];
  const careAllowed = useNinaCareAllowed(user?.id);
  const setCare = useSetNinaCare(user?.id);
  const [promptHidden, setPromptHidden] = useState(true);
  useEffect(() => {
    if (user) setPromptHidden(isPromptDismissed(user.id));
  }, [user]);

  const history = useQuery({
    queryKey: historyKey,
    enabled: !!user,
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error: err } = await supabase
        .from("nina_messages")
        .select("id, role, content")
        .order("created_at", { ascending: false })
        .limit(100);
      if (err) throw err;
      return (data ?? []).reverse() as ChatMessage[];
    },
  });

  useEffect(() => {
    if (!user) return;
    supabase.rpc("ai_usage_today", { p_kind: "nina" }).then(({ data }) => setUsed(data ?? 0));
  }, [user]);

  const messages = history.data ?? [];
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, pending, sending]);

  if (!hydrated || !user) return <AuthGateLoading />;

  const send = (e: FormEvent) => {
    e.preventDefault();
    void sendText(draft.trim());
  };

  const sendText = async (text: string) => {
    if (!text || sending) return;
    setDraft("");
    setError(null);
    setPending(text);
    setSending(true);
    try {
      const res = await askNutriAssistant({ data: { message: text } });
      if (res.used !== undefined) setUsed(res.used);
      if ("error" in res) {
        setError(res.error);
        setDraft(text);
      } else {
        await queryClient.invalidateQueries({ queryKey: historyKey });
        if (autoSpeak && voice.speak) say(res.answer);
      }
    } catch (err) {
      console.error("nina", err);
      // Em desenvolvimento, mostra o motivo real para facilitar o diagnóstico.
      const detail = import.meta.env.DEV && err instanceof Error ? ` (${err.message})` : "";
      setError(t("nina.error") + detail);
      setDraft(text);
    } finally {
      setPending(null);
      setSending(false);
    }
  };

  sendRef.current = (text) => void sendText(text);

  const clear = async () => {
    if (!window.confirm(t("nina.clearConfirm"))) return;
    await supabase.from("nina_messages").delete().eq("user_id", user.id);
    await queryClient.invalidateQueries({ queryKey: historyKey });
  };

  const toggleCare = (on: boolean) =>
    setCare.mutate(on, {
      onSuccess: () => {
        if (!on) return;
        toast.success(
          tr([
            "Pronto! A Nina vai usar o seu plano e as suas metas para responder.",
            "Done! Nina will use your plan and goals to answer.",
            "¡Listo! Nina usará tu plan y tus metas para responder.",
            "C'est fait ! Nina utilisera votre plan et vos objectifs pour répondre.",
          ]),
        );
      },
      onError: (err) => toast.error((err as Error).message),
    });

  const takeToNutri = (question: string) =>
    activeLink && (
      <Link
        to="/acompanhamento/mensagens"
        search={{ com: activeLink.professional_id, texto: question }}
        className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        {tr([
          "Levar esta dúvida para a minha nutri",
          "Take this question to my dietitian",
          "Llevar esta duda a mi nutri",
          "Poser cette question à mon/ma diététicien(ne)",
        ])}
      </Link>
    );

  const bubble = (
    m: { role: "user" | "assistant"; content: string },
    key: string,
    question?: string,
  ) => (
    <div key={key} className={m.role === "user" ? "flex justify-end" : "flex flex-col items-start"}>
      <p
        className={
          m.role === "user"
            ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm text-accent-foreground"
            : "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-secondary px-4 py-2.5 text-sm text-foreground"
        }
      >
        {m.content}
      </p>
      {m.role === "assistant" && voice.speak && (
        <button
          type="button"
          onClick={() => say(m.content)}
          className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
        >
          <Volume2 className="h-3.5 w-3.5" />
          {tr(["Ouvir", "Listen", "Escuchar", "Écouter"])}
        </button>
      )}
      {m.role === "assistant" && question && takeToNutri(question)}
    </div>
  );

  return (
    // Altura da tela: a página não rola; só a conversa rola por dentro.
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 pb-24 pt-6 sm:px-6 lg:pb-6">
        <div className="mb-4 flex shrink-0 items-center gap-4">
          <Mascot id="nina" mood={sending || speaking ? "talk" : "idle"} size={72} />
          <div className="min-w-0 flex-1">
            <h1 className="sr-only">{t("nina.title")}</h1>
            <Link
              to="/geladeira"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary"
            >
              <Refrigerator className="h-4 w-4 text-accent" />
              {tr([
                "O que tem na geladeira?",
                "What's in the fridge?",
                "¿Qué hay en la nevera?",
                "Qu'y a-t-il dans le frigo ?",
              ])}
            </Link>
          </div>
          {voice.speak && (
            <button
              type="button"
              onClick={() => setAutoSpeak(!autoSpeak)}
              aria-pressed={autoSpeak}
              title={tr([
                "A Nina lê as respostas em voz alta",
                "Nina reads her answers aloud",
                "Nina lee las respuestas en voz alta",
                "Nina lit ses réponses à voix haute",
              ])}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                autoSpeak
                  ? "border-accent bg-accent-soft text-foreground"
                  : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {autoSpeak ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
              {tr(["Voz", "Voice", "Voz", "Voix"])}
            </button>
          )}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" /> {t("nina.clear")}
            </button>
          )}
        </div>

        {/* Só desta página: perguntas para começar a conversa (tocar envia para a Nina). */}
        <div className="no-scrollbar mb-3 flex shrink-0 gap-2 overflow-x-auto pb-1">
          {NINA_TOPICS.map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() =>
                window.dispatchEvent(new CustomEvent("nina:prompt", { detail: tr(q) }))
              }
              className="shrink-0 cursor-pointer rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground transition hover:bg-secondary"
            >
              {tr(q)}
            </button>
          ))}
        </div>

        {activeLink && careAllowed.data === false && !promptHidden && (
          <div className="mb-3 shrink-0 rounded-2xl border border-accent/30 bg-accent-soft/40 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <HeartHandshake className="h-4 w-4 text-accent" />
              {tr([
                "Posso usar o seu plano e as suas metas para responder melhor?",
                "May I use your plan and goals to answer better?",
                "¿Puedo usar tu plan y tus metas para responder mejor?",
                "Puis-je utiliser votre plan et vos objectifs pour mieux répondre ?",
              ])}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {tr([
                "Vejo o plano alimentar, metas, água, plano de cuidado, diário recente e restrições. Nunca mudo o que a sua nutri combinou, e nossas conversas continuam só entre nós. Você pode desligar quando quiser.",
                "I'd see your meal plan, goals, water, care plan, recent diary and restrictions. I never change what your dietitian set, and our chats stay between us. You can turn it off anytime.",
                "Veré el plan alimentario, metas, agua, plan de cuidado, diario reciente y restricciones. Nunca cambio lo que tu nutri acordó y nuestras conversaciones siguen privadas. Puedes desactivarlo cuando quieras.",
                "Je verrais votre plan alimentaire, objectifs, eau, plan de soins, journal récent et restrictions. Je ne change jamais ce que votre diététicien(ne) a prévu, et nos échanges restent privés. Vous pouvez désactiver à tout moment.",
              ])}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => toggleCare(true)}
                disabled={setCare.isPending}
                className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {tr(["Permitir", "Allow", "Permitir", "Autoriser"])}
              </button>
              <button
                type="button"
                onClick={() => {
                  dismissPrompt(user.id);
                  setPromptHidden(true);
                }}
                className="rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {tr(["Agora não", "Not now", "Ahora no", "Pas maintenant"])}
              </button>
            </div>
          </div>
        )}
        {activeLink && careAllowed.data === true && (
          <p className="mb-2 flex shrink-0 flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">
              <HeartHandshake className="h-3.5 w-3.5" />
              {tr([
                "Usando seu acompanhamento",
                "Using your care plan",
                "Usando tu seguimiento",
                "Utilise votre suivi",
              ])}
            </span>
            <button
              type="button"
              onClick={() => toggleCare(false)}
              disabled={setCare.isPending}
              className="font-semibold underline-offset-2 hover:text-foreground hover:underline"
            >
              {tr(["Desligar", "Turn off", "Desactivar", "Désactiver"])}
            </button>
          </p>
        )}
        {activeLink && careAllowed.data === false && promptHidden && (
          <button
            type="button"
            onClick={() => toggleCare(true)}
            disabled={setCare.isPending}
            className="mb-2 shrink-0 self-start text-[11px] font-semibold text-accent hover:underline"
          >
            {tr([
              "Deixar a Nina usar o meu acompanhamento",
              "Let Nina use my care plan",
              "Dejar que Nina use mi seguimiento",
              "Laisser Nina utiliser mon suivi",
            ])}
          </button>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain rounded-2xl border border-border/70 bg-card p-4">
          {history.isLoading && (
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          )}
          {!history.isLoading && messages.length === 0 && !pending && (
            <p className="m-auto max-w-sm text-center text-sm text-muted-foreground">
              {t("nina.empty")}
            </p>
          )}
          {messages.map((m, i) => {
            // A dúvida levada à nutri é a pergunta que veio antes desta resposta.
            const prev = messages[i - 1];
            return bubble(m, m.id, prev?.role === "user" ? prev.content : undefined);
          })}
          {pending && bubble({ role: "user", content: pending }, "pending")}
          {sending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <form onSubmit={send} className="mt-3 flex shrink-0 items-end gap-2">
          {voice.listen && (
            <button
              type="button"
              onClick={() => (mic.listening ? mic.stop() : mic.start())}
              disabled={sending}
              aria-pressed={mic.listening}
              aria-label={
                mic.listening
                  ? tr([
                      "Parar de ouvir",
                      "Stop listening",
                      "Dejar de escuchar",
                      "Arrêter l'écoute",
                    ])
                  : tr(["Falar com a Nina", "Talk to Nina", "Hablar con Nina", "Parler à Nina"])
              }
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border transition disabled:opacity-50 ${
                mic.listening
                  ? "animate-pulse border-destructive bg-destructive text-white"
                  : "border-border bg-card text-foreground hover:bg-secondary"
              }`}
            >
              {mic.listening ? <Square className="h-4 w-4" /> : <Mic className="h-5 w-5" />}
            </button>
          )}
          <textarea
            value={mic.listening ? mic.interim : draft}
            readOnly={mic.listening}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            rows={2}
            maxLength={2000}
            placeholder={
              mic.listening
                ? tr([
                    "Pode falar…",
                    "Go ahead, I'm listening…",
                    "Habla, te escucho…",
                    "Parlez, j'écoute…",
                  ])
                : t("nina.placeholder")
            }
            className="min-h-[3rem] flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            aria-label={t("nina.send")}
            className="grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-foreground shadow-soft transition hover:bg-accent/90 disabled:pointer-events-none disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>

        <p className="mt-3 shrink-0 text-xs text-muted-foreground">
          {used !== null && (
            <span className="mr-2 font-semibold">
              {used}/{NINA_DAILY_LIMIT} {t("nina.usage")}
            </span>
          )}
          {t("nina.disclaimer")}
        </p>
      </main>
    </div>
  );
}
