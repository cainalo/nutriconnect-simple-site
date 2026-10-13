// Cena de conquista em tela inteira: faixas de cinema, céu animado, raios de luz, o emblema da
// conquista e a turma (Nina, Lipe, Mila, Tito e Cadu) entrando como heróis da jornada, com a
// fanfarra. Dura ~9 s, pode ser pulada (botão, Esc ou toque em "Continuar") e respeita "reduzir
// movimento" e as escolhas de som. Montada uma vez no __root; as telas pedem cenas com
// playCinematic() (lib/cinematic).
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { X } from "lucide-react";
import type { CharacterAction } from "@/components/character-live";
import { Mascot } from "@/components/mascots";
import { NinaLive } from "@/components/nina-live";
import { useTr } from "@/components/settings-ui";
import {
  ALL_HEROES,
  CINEMATIC_EVENT,
  type CinematicKind,
  type CinematicSpec,
} from "@/lib/cinematic";
import { fireConfetti, GOLD_COLORS } from "@/lib/confetti";
import { playFanfare, type FanfareHandle } from "@/lib/fanfare";
import type { Names } from "@/lib/appearance-data";
import type { CharacterId } from "@/lib/trail-types";

/** Céu, brilho e tom do emblema de cada tipo de cena. */
const LOOK: Record<CinematicKind, { sky: string; glow: string; ring: string }> = {
  levelup: {
    sky: "linear-gradient(160deg, #120f2e 0%, #3b1d6e 45%, #b4529a 80%, #f4a259 100%)",
    glow: "#ffd76a",
    ring: "linear-gradient(135deg, #fff3b0, #f6c343 45%, #c8851c)",
  },
  chapter: {
    sky: "linear-gradient(160deg, #04140d 0%, #0f3d2a 40%, #2f7d4f 75%, #e8c66a 100%)",
    glow: "#c9f27a",
    ring: "linear-gradient(135deg, #fdf6c3, #e9c75a 45%, #9a6b12)",
  },
  achievement: {
    sky: "linear-gradient(160deg, #1d0b05 0%, #5a1f0c 40%, #c2531f 75%, #f7c873 100%)",
    glow: "#ffb86b",
    ring: "linear-gradient(135deg, #ffe8c2, #f2a65a 45%, #a4521c)",
  },
  challenge: {
    sky: "linear-gradient(160deg, #06121f 0%, #0d3a5c 45%, #1f8aa6 78%, #a6e3d6 100%)",
    glow: "#8ff0ff",
    ring: "linear-gradient(135deg, #e6fbff, #7fd3e6 45%, #2a7c93)",
  },
};

const KICKER: Record<CinematicKind, Names> = {
  levelup: ["Novo nível", "New level", "Nuevo nivel", "Nouveau niveau"],
  chapter: ["Capítulo concluído", "Chapter complete", "Capítulo completado", "Chapitre terminé"],
  achievement: [
    "Conquista desbloqueada",
    "Achievement unlocked",
    "Logro desbloqueado",
    "Succès débloqué",
  ],
  challenge: ["Desafio vencido", "Challenge won", "Desafío superado", "Défi relevé"],
};

/** Movimento de cada herói depois de entrar (o do centro comemora; os outros variam). */
const SIDE_MOVES: CharacterAction[] = ["dance", "jump", "spin", "cheer"];

/** Passos da cena (ms desde o início). */
const TIMELINE = [250, 900, 1700, 2300, 3300];
const AUTO_CLOSE_MS = 9500;

let sceneCount = 0;

export function HeroCinematic() {
  const queue = useRef<CinematicSpec[]>([]);
  const [current, setCurrent] = useState<{ spec: CinematicSpec; n: number } | null>(null);
  const pull = useCallback(() => {
    const spec = queue.current.shift();
    return spec ? { spec, n: ++sceneCount } : null;
  }, []);

  // Cada pedido entra na fila; se nada estiver tocando, a cena começa na hora.
  useEffect(() => {
    const onPlay = (e: Event) => {
      const spec = (e as CustomEvent<CinematicSpec>).detail;
      if (!spec) return;
      queue.current.push(spec);
      setCurrent((c) => c ?? pull());
    };
    window.addEventListener(CINEMATIC_EVENT, onPlay);
    return () => window.removeEventListener(CINEMATIC_EVENT, onPlay);
  }, [pull]);

  const done = useCallback(() => setCurrent(pull()), [pull]);
  if (!current) return null;
  // A `key` reinicia a cena quando a fila emenda uma na outra.
  return <Scene key={current.n} spec={current.spec} onDone={done} />;
}

function Scene({ spec, onDone }: { spec: CinematicSpec; onDone: () => void }) {
  const tr = useTr();
  const [step, setStep] = useState(0);
  const music = useRef<FanfareHandle | null>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const look = LOOK[spec.kind];
  const cast = (spec.cast?.length ? spec.cast : ALL_HEROES).slice(0, 5);

  const close = useCallback(() => {
    music.current?.stop();
    music.current = null;
    onDone();
  }, [onDone]);

  useEffect(() => {
    music.current = playFanfare(spec.kind === "levelup" || spec.kind === "chapter");
    const timers = TIMELINE.map((ms, i) => window.setTimeout(() => setStep(i + 1), ms));
    // Confete dourado quando o emblema chega e de novo no acorde final.
    timers.push(
      window.setTimeout(
        () =>
          fireConfetti({
            x: 0.5,
            y: 0.35,
            count: 120,
            spread: 360,
            power: 15,
            colors: GOLD_COLORS,
          }),
        TIMELINE[2] + 150,
      ),
      window.setTimeout(() => {
        fireConfetti({
          x: 0.1,
          y: 0.8,
          angle: 300,
          spread: 55,
          count: 70,
          power: 20,
          colors: GOLD_COLORS,
        });
        fireConfetti({
          x: 0.9,
          y: 0.8,
          angle: 240,
          spread: 55,
          count: 70,
          power: 20,
          colors: GOLD_COLORS,
        });
      }, 4900),
      window.setTimeout(close, AUTO_CLOSE_MS),
    );
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("keydown", onKey);
      music.current?.stop();
    };
  }, [spec, close]);

  useEffect(() => {
    if (step >= 5) continueRef.current?.focus();
  }, [step]);

  // Brasas e brilhos que sobem pela cena (posições sorteadas uma vez por cena).
  const embers = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        left: Math.random() * 100,
        size: 3 + Math.random() * 6,
        delay: -Math.random() * 8,
        duration: 6 + Math.random() * 6,
        star: i % 4 === 0,
      })),
    [],
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${spec.kicker ?? tr(KICKER[spec.kind])}: ${spec.title}`}
      className="fixed inset-0 z-[100] overflow-hidden text-white select-none"
    >
      {/* Céu */}
      <div
        className="nc-cine-fade nc-gradient-pan absolute inset-0"
        style={{ background: look.sky }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 38%, transparent 0%, rgb(0 0 0 / 0.55) 75%)",
        }}
      />

      {/* Raios de luz atrás do emblema */}
      {step >= 3 && (
        <div
          aria-hidden="true"
          className="nc-cine-rays pointer-events-none absolute left-1/2 top-[34%] h-[160vmax] w-[160vmax]"
          style={{
            transform: "translate(-50%, -50%)",
            background: `repeating-conic-gradient(from 0deg, color-mix(in srgb, ${look.glow} 28%, transparent) 0deg 7deg, transparent 7deg 22deg)`,
            maskImage: "radial-gradient(circle, black 0%, transparent 55%)",
            WebkitMaskImage: "radial-gradient(circle, black 0%, transparent 55%)",
          }}
        />
      )}

      {/* Brasas */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {embers.map((e, i) => (
          <span
            key={i}
            className="nc-cine-ember absolute bottom-[-12px] rounded-full"
            style={{
              left: `${e.left}%`,
              width: e.size,
              height: e.size,
              background: e.star ? "#fff" : look.glow,
              boxShadow: `0 0 ${e.size * 2}px ${look.glow}`,
              animationDelay: `${e.delay}s`,
              animationDuration: `${e.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Clarão quando o emblema chega */}
      {step >= 3 && (
        <div
          aria-hidden="true"
          className="nc-cine-flash pointer-events-none absolute inset-0 bg-white"
        />
      )}

      {/* Faixas de cinema */}
      <div className="nc-cine-bar-top absolute inset-x-0 top-0 z-10 flex h-[9vh] min-h-12 items-center justify-between bg-black px-4 sm:px-8">
        <span className="font-logo-serif text-sm font-bold tracking-wide text-white/80 sm:text-base">
          Nutri<span className="text-[#f2a65a]">Connect</span>
          <span className="ml-2 hidden text-[11px] font-normal uppercase tracking-[0.3em] text-white/50 sm:inline">
            {tr(["apresenta", "presents", "presenta", "présente"])}
          </span>
        </span>
        <button
          type="button"
          onClick={close}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10"
        >
          {tr(["Pular", "Skip", "Saltar", "Passer"])}
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="nc-cine-bar-bottom absolute inset-x-0 bottom-0 z-10 flex h-[9vh] min-h-12 items-center justify-center bg-black px-4">
        {step >= 5 && (
          <button
            ref={continueRef}
            type="button"
            onClick={close}
            className="nc-cine-up cursor-pointer rounded-full px-7 py-2.5 text-sm font-bold text-black shadow-lg transition hover:scale-105"
            style={{ background: look.ring }}
          >
            {tr([
              "Continuar a jornada",
              "Continue the journey",
              "Seguir el viaje",
              "Continuer l'aventure",
            ])}
          </button>
        )}
      </div>

      {/* Texto e emblema */}
      <div className="absolute inset-x-0 top-[9vh] z-[5] flex flex-col items-center px-5 pt-[3vh] text-center">
        {step >= 1 && (
          <p
            className="nc-cine-up text-[11px] font-bold uppercase tracking-[0.35em] sm:text-xs"
            style={{ color: look.glow }}
          >
            {spec.kicker ?? tr(KICKER[spec.kind])}
          </p>
        )}
        <div className="mt-[1.5vh] grid h-[min(14vh,9rem)] w-[min(14vh,9rem)] place-items-center sm:mt-[2vh] sm:h-[min(18vh,9rem)] sm:w-[min(18vh,9rem)]">
          {step >= 3 && (
            <div
              className="nc-cine-emblem grid h-full w-full place-items-center rounded-full p-[6%] shadow-[0_0_60px_rgba(255,215,106,0.55)]"
              style={{ background: look.ring }}
            >
              <div
                className="grid h-full w-full place-items-center rounded-full text-[min(7vh,4.5rem)] sm:text-[min(9vh,4.5rem)] leading-none"
                style={{ background: "radial-gradient(circle at 35% 30%, #fffdf3, #f3e3b4 70%)" }}
              >
                <span aria-hidden="true">{spec.emblem}</span>
              </div>
            </div>
          )}
        </div>
        {step >= 4 && (
          <>
            <div
              className="mt-[2.5vh]"
              style={{ filter: "drop-shadow(0 4px 18px rgb(0 0 0 / 0.5))" }}
            >
              <h2
                className="nc-cine-title nc-cine-shine font-display text-[clamp(1.9rem,6vw,3.6rem)] font-bold leading-tight"
                style={{ color: "#fff4cf" }}
              >
                {spec.title}
              </h2>
            </div>
            {spec.subtitle && (
              <p
                className="nc-cine-up mt-2 max-w-xl text-sm text-white/85 sm:text-base"
                style={{ animationDelay: "0.35s" }}
              >
                {spec.subtitle}
              </p>
            )}
          </>
        )}
        {step >= 5 && !!spec.extras?.length && (
          <ul className="nc-cine-up mt-3 flex flex-wrap justify-center gap-2">
            {spec.extras.map((x) => (
              <li
                key={x.title}
                className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur"
              >
                <span aria-hidden="true">{x.icon}</span> {x.title}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* A turma */}
      {step >= 2 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[9vh] z-[4] flex items-end justify-center">
          <Lineup cast={cast} celebrating={step >= 4} line={step >= 4 ? spec.line : undefined} />
        </div>
      )}
    </div>
  );
}

function Lineup({
  cast,
  celebrating,
  line,
}: {
  cast: CharacterId[];
  celebrating: boolean;
  line?: string;
}) {
  const [center, ...friends] = cast;
  // Ordem na tela: amigos alternando à esquerda e à direita do herói do centro.
  const left = friends.filter((_, i) => i % 2 === 0);
  const right = friends.filter((_, i) => i % 2 === 1);
  const hero = (id: CharacterId, side: "left" | "right", i: number) => (
    <div
      key={id}
      className={`${side === "left" ? "nc-cine-enter-left" : "nc-cine-enter-right"} ${i > 0 ? "hidden sm:block" : ""} -mx-[1.5vh]`}
      style={{ animationDelay: `${0.15 + i * 0.18}s` }}
    >
      <Hero
        id={id}
        size="side"
        action={celebrating ? SIDE_MOVES[(i * 2 + (side === "left" ? 0 : 1)) % 4] : "hop"}
      />
    </div>
  );
  return (
    <div className="flex items-end">
      <div className="flex flex-row-reverse items-end">
        {left.map((id, i) => hero(id, "left", i))}
      </div>
      <div className="nc-cine-rise-hero relative mx-[1vh]">
        {line && (
          <p className="nc-cine-up absolute -top-2 left-1/2 w-[min(70vw,18rem)] -translate-x-1/2 -translate-y-full rounded-2xl bg-white px-3 py-2 text-center text-xs font-semibold leading-snug text-neutral-800 shadow-xl sm:text-sm">
            {line}
            <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
          </p>
        )}
        <Hero id={center} size="center" action={celebrating ? "cheer" : "wave"} />
      </div>
      <div className="flex items-end">{right.map((id, i) => hero(id, "right", i))}</div>
    </div>
  );
}

function Hero({
  id,
  size,
  action,
}: {
  id: CharacterId;
  size: "center" | "side";
  action: CharacterAction;
}) {
  // Em telas largas a turma fica um pouco menor, para a fala não cobrir os selos de conquista.
  const sized =
    size === "center"
      ? "h-[min(31vh,22rem)] w-[calc(min(31vh,22rem)*0.72)] sm:h-[min(27vh,20rem)] sm:w-[calc(min(27vh,20rem)*0.72)]"
      : "h-[min(22vh,15rem)] w-[calc(min(22vh,15rem)*0.72)] sm:h-[min(20vh,14rem)] sm:w-[calc(min(20vh,14rem)*0.72)]";
  const style: CSSProperties = { filter: "drop-shadow(0 18px 24px rgb(0 0 0 / 0.45))" };
  if (id === "nina")
    return <NinaLive action={action} entrance={false} className={sized} style={style} />;
  // O Mascot calcula largura e altura pelo tamanho; aqui quem manda é a classe.
  return (
    <Mascot
      id={id}
      mood="cheer"
      action={action}
      className={sized}
      style={{ ...style, width: undefined, height: undefined }}
      size={160}
    />
  );
}
