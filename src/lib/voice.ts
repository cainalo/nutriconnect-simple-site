// Nina por voz (N11): falar com a Nina (reconhecimento de fala do navegador) e ouvir as respostas
// (síntese de fala do navegador). Nada é gravado: o navegador transforma a fala em texto e o texto
// segue pelo mesmo caminho da conversa escrita. Onde o navegador não oferece, os botões somem.
import { useCallback, useEffect, useRef, useState } from "react";

const LANGS: Record<string, string> = {
  "pt-BR": "pt-BR",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
};
const langOf = (locale: string) => LANGS[locale] ?? "pt-BR";

// Tipos mínimos da Web Speech API (ainda fora do lib.dom de alguns TypeScript).
interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const canListen = () => !!recognitionCtor();
export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

export type ListenError = "negado" | "sem-fala" | "falhou";

/**
 * Ouve uma frase e devolve o texto. `onFinal` recebe a frase quando a pessoa termina de falar;
 * `interim` mostra o que está sendo entendido enquanto ela fala.
 */
export function useSpeechInput(
  locale: string,
  onFinal: (text: string) => void,
  onError?: (e: ListenError) => void,
) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const rec = useRef<Recognition | null>(null);
  const finalRef = useRef(onFinal);
  const errorRef = useRef(onError);
  finalRef.current = onFinal;
  errorRef.current = onError;

  useEffect(() => () => rec.current?.abort(), []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor || listening) return;
    stopSpeaking();
    const r = new Ctor();
    r.lang = langOf(locale);
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    let text = "";
    r.onresult = (e) => {
      let partial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) text += res[0].transcript;
        else partial += res[0].transcript;
      }
      setInterim((text + partial).trim());
    };
    r.onerror = (e) => {
      const kind: ListenError =
        e.error === "not-allowed" || e.error === "service-not-allowed"
          ? "negado"
          : e.error === "no-speech"
            ? "sem-fala"
            : e.error === "aborted"
              ? "sem-fala"
              : "falhou";
      if (e.error !== "aborted") errorRef.current?.(kind);
    };
    r.onend = () => {
      setListening(false);
      setInterim("");
      rec.current = null;
      if (text.trim()) finalRef.current(text.trim());
    };
    rec.current = r;
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
      rec.current = null;
      errorRef.current?.("falhou");
    }
  }, [locale, listening]);

  const stop = useCallback(() => rec.current?.stop(), []);

  return { listening, interim, start, stop };
}

/** Tira a marcação (negrito, listas, links) para a leitura soar natural. */
export function speakableText(text: string) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`#>]+/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const base = lang.slice(0, 2);
  const same = voices.filter((v) => v.lang.replace("_", "-") === lang);
  const near = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
  // Prefere vozes naturais/online e femininas (a Nina), quando o aparelho informa.
  const nice = (list: SpeechSynthesisVoice[]) =>
    list.find(
      (v) =>
        /natural|neural|online|google/i.test(v.name) &&
        /female|femin|luciana|francisca|maria|helena|vit[oó]ria|camila/i.test(v.name),
    ) ??
    list.find((v) => /natural|neural|online|google/i.test(v.name)) ??
    list.find((v) =>
      /female|femin|luciana|francisca|maria|helena|vit[oó]ria|camila/i.test(v.name),
    ) ??
    list[0];
  return nice(same) ?? nice(near);
}

/** Lê o texto em voz alta (interrompe o que estiver falando). */
export function speak(text: string, locale: string, onEnd?: () => void) {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const lang = langOf(locale);
  const utter = new SpeechSynthesisUtterance(speakableText(text).slice(0, 4000));
  utter.lang = lang;
  utter.rate = 1;
  utter.pitch = 1.05;
  const voice = pickVoice(lang);
  if (voice) utter.voice = voice;
  if (onEnd) {
    utter.onend = onEnd;
    utter.onerror = onEnd;
  }
  synth.speak(utter);
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}

const AUTO_KEY = "nc_nina_voz";

/** "A Nina fala as respostas": preferência deste aparelho. */
export function useAutoSpeak() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    try {
      setOn(window.localStorage.getItem(AUTO_KEY) === "1");
    } catch {
      /* sem armazenamento */
    }
    // Algumas vozes só aparecem depois deste evento.
    if (canSpeak()) window.speechSynthesis.getVoices();
    return () => stopSpeaking();
  }, []);
  const set = (value: boolean) => {
    setOn(value);
    if (!value) stopSpeaking();
    try {
      window.localStorage.setItem(AUTO_KEY, value ? "1" : "0");
    } catch {
      /* sem armazenamento */
    }
  };
  return [on, set] as const;
}
