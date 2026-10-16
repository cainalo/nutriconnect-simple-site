// Tocador das cenas de filme (cutscenes) da história e das conquistas: faixas de cinema, cenário com
// névoa, câmera que se move, a turma em 3D andando pelo palco, inimigos, falas com efeito de máquina
// de escrever, cartões de título, efeitos (clarão, golpe, raios, confete) e música por clima.
// Toque, Enter ou espaço avançam a fala; "Pular" ou Esc encerram. Respeita "reduzir movimento" e as
// escolhas de som. Montado uma vez no __root; as telas pedem cenas por lib/cinematic.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronRight, X } from "lucide-react";
import type { CharacterAction } from "@/components/character-live";
import { CutsceneBackdrop } from "@/components/cutscene-backdrop";
import { EmojiIcon } from "@/components/emoji-icon";
import { Mascot } from "@/components/mascots";
import { NinaLive } from "@/components/nina-live";
import { StoryEnemy } from "@/components/story-enemy";
import { useTr } from "@/components/settings-ui";
import type { Names } from "@/lib/appearance-data";
import { CINEMATIC_EVENT } from "@/lib/cinematic";
import { fireConfetti, GOLD_COLORS } from "@/lib/confetti";
import { playScore, type ScoreHandle } from "@/lib/cutscene-music";
import { setSpotlight } from "@/lib/characters/spotlight";
import { CHARACTERS, type CharacterId } from "@/lib/trail-types";
import type { Camera, Cutscene, Mood, Shot, Slot, Txt } from "@/lib/trail-story";

const SLOT_X: Record<Slot, number> = {
  "far-left": 9,
  left: 27,
  center: 50,
  right: 73,
  "far-right": 91,
};

/** Cor do nome de quem fala. */
const VOICE: Record<CharacterId, string> = {
  nina: "#f2a65a",
  lipe: "#86c46a",
  mila: "#f2697a",
  tito: "#5fbf6f",
  cadu: "#f59e42",
};

const CAMERA: Record<Camera, Keyframe[]> = {
  wide: [{ transform: "scale(1.04)" }, { transform: "scale(1)" }],
  push: [{ transform: "scale(1)" }, { transform: "scale(1.12)" }],
  pull: [{ transform: "scale(1.16)" }, { transform: "scale(1)" }],
  "pan-left": [
    { transform: "scale(1.12) translateX(3%)" },
    { transform: "scale(1.12) translateX(-3%)" },
  ],
  "pan-right": [
    { transform: "scale(1.12) translateX(-3%)" },
    { transform: "scale(1.12) translateX(3%)" },
  ],
  enemy: [
    { transform: "scale(1.02)", transformOrigin: "74% 72%" },
    { transform: "scale(1.22)", transformOrigin: "74% 72%" },
  ],
  heroes: [
    { transform: "scale(1.02)", transformOrigin: "40% 72%" },
    { transform: "scale(1.14)", transformOrigin: "40% 72%" },
  ],
};

const reducedMotion = () =>
  typeof window !== "undefined" &&
  (document.documentElement.dataset.motion === "reduce" ||
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

let sceneCount = 0;

export function HeroCinematic() {
  const queue = useRef<Cutscene[]>([]);
  const [current, setCurrent] = useState<{ scene: Cutscene; n: number } | null>(null);
  const pull = useCallback(() => {
    const scene = queue.current.shift();
    return scene ? { scene, n: ++sceneCount } : null;
  }, []);

  // Cada pedido entra na fila; se nada estiver tocando, a cena começa na hora.
  useEffect(() => {
    const onPlay = (e: Event) => {
      const scene = (e as CustomEvent<Cutscene>).detail;
      if (!scene?.shots?.length) return;
      queue.current.push(scene);
      setCurrent((c) => c ?? pull());
    };
    window.addEventListener(CINEMATIC_EVENT, onPlay);
    return () => window.removeEventListener(CINEMATIC_EVENT, onPlay);
  }, [pull]);

  const done = useCallback(() => setCurrent(pull()), [pull]);
  if (!current) return null;
  // A `key` reinicia o tocador quando a fila emenda uma cena na outra.
  return <Player key={current.n} scene={current.scene} onDone={done} />;
}

function Player({ scene, onDone }: { scene: Cutscene; onDone: () => void }) {
  const trNames = useTr();
  const tr = useCallback(
    (t: Txt | undefined) => (t == null ? "" : typeof t === "string" ? t : trNames(t as Names)),
    [trNames],
  );
  const calm = useMemo(reducedMotion, []);
  const [shotIndex, setShotIndex] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  const [ended, setEnded] = useState(false);
  const shot = scene.shots[shotIndex];
  const line = shot.lines?.[lineIndex];
  const text = line ? tr(line.text) : "";
  const typing = !!line && typed < text.length;

  const rootRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const shakeRef = useRef<HTMLDivElement>(null);
  const music = useRef<{ mood: Mood; handle: ScoreHandle | null } | null>(null);

  const close = useCallback(() => {
    music.current?.handle?.stop();
    music.current = null;
    onDone();
  }, [onDone]);

  /** Próxima fala; no fim das falas, o próximo plano; no fim dos planos, a tela final. */
  const advance = useCallback(() => {
    if (typing) {
      setTyped(text.length);
      return;
    }
    if (shot.lines && lineIndex < shot.lines.length - 1) {
      setLineIndex((i) => i + 1);
      setTyped(0);
      return;
    }
    if (shotIndex < scene.shots.length - 1) {
      setShotIndex((i) => i + 1);
      setLineIndex(0);
      setTyped(0);
      return;
    }
    if (ended) close();
    else setEnded(true);
  }, [typing, text.length, shot.lines, lineIndex, shotIndex, scene.shots.length, ended, close]);

  // Máquina de escrever, pelo relógio: em aparelhos lentos a fala não fica para trás.
  useEffect(() => {
    if (!line) return;
    if (calm) {
      setTyped(text.length);
      return;
    }
    const start = performance.now();
    let timer = 0;
    const step = () => {
      const n = Math.min(text.length, Math.floor(((performance.now() - start) / 1000) * 55));
      setTyped((v) => Math.max(v, n));
      if (n < text.length) timer = window.setTimeout(step, 30);
    };
    step();
    return () => window.clearTimeout(timer);
  }, [line, text.length, calm]);

  // Avanço automático: tempo de leitura depois da fala completa, ou a duração do plano sem falas.
  useEffect(() => {
    if (ended) {
      const t = window.setTimeout(close, 7000);
      return () => window.clearTimeout(t);
    }
    if (typing) return;
    const wait = line ? Math.max(1900, text.length * 42) : (shot.hold ?? 2600);
    const t = window.setTimeout(advance, wait);
    return () => window.clearTimeout(t);
  }, [typing, line, text.length, shot.hold, advance, ended, close]);

  // A cada plano: câmera, música, efeitos.
  useEffect(() => {
    if (!calm && cameraRef.current) {
      const frames = CAMERA[shot.camera ?? "wide"];
      cameraRef.current.animate(frames, {
        duration: 9000,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      });
    }
    if (shot.music && music.current?.mood !== shot.music) {
      music.current?.handle?.stop();
      music.current = { mood: shot.music, handle: playScore(shot.music) };
    }
    const fx = shot.fx ?? [];
    const timers: number[] = [];
    if (fx.includes("impact") && !calm && shakeRef.current) {
      shakeRef.current.animate(
        [
          { transform: "translate(0,0)" },
          { transform: "translate(-14px, 8px)" },
          { transform: "translate(12px, -10px)" },
          { transform: "translate(-8px, 6px)" },
          { transform: "translate(5px, -3px)" },
          { transform: "translate(0,0)" },
        ],
        { duration: 520, easing: "ease-out", delay: 120 },
      );
    }
    if (fx.includes("confetti")) {
      timers.push(
        window.setTimeout(
          () =>
            fireConfetti({
              x: 0.5,
              y: 0.35,
              count: 110,
              spread: 360,
              power: 15,
              colors: GOLD_COLORS,
            }),
          700,
        ),
        window.setTimeout(() => {
          fireConfetti({
            x: 0.08,
            y: 0.85,
            angle: 300,
            spread: 55,
            count: 60,
            power: 20,
            colors: GOLD_COLORS,
          });
          fireConfetti({
            x: 0.92,
            y: 0.85,
            angle: 240,
            spread: 55,
            count: 60,
            power: 20,
            colors: GOLD_COLORS,
          });
        }, 2000),
      );
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shotIndex]);

  // Música para quando a cena fecha; teclado; foco.
  useEffect(() => {
    rootRef.current?.focus();
    // Só a turma da cena é desenhada enquanto ela estiver aberta.
    setSpotlight(rootRef.current);
    return () => {
      setSpotlight(null);
      music.current?.handle?.stop();
    };
  }, []);
  // O teclado é da cena enquanto ela estiver aberta (a lição por baixo não recebe o Enter).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") {
        if ((e.target as HTMLElement | null)?.tagName === "BUTTON" && e.key !== "ArrowRight")
          return;
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [advance, close]);

  // Quem aparece em algum plano fica no palco a cena toda (o 3D carrega uma vez só).
  const castIds = useMemo(() => {
    const ids: CharacterId[] = [];
    for (const s of scene.shots)
      for (const c of s.cast ?? []) if (!ids.includes(c.id)) ids.push(c.id);
    return ids;
  }, [scene]);
  const [entered, setEntered] = useState<Set<CharacterId>>(() => new Set());
  useEffect(() => {
    const fresh = (shot.cast ?? []).filter((c) => !entered.has(c.id)).map((c) => c.id);
    if (!fresh.length) return;
    // Primeiro quadro fora da tela; no seguinte, desliza até o lugar.
    const t = window.setTimeout(() => setEntered((prev) => new Set([...prev, ...fresh])), 60);
    return () => window.clearTimeout(t);
  }, [shot, entered]);

  const speaker = line && line.who !== "narrator" && line.who !== "enemy" ? line.who : null;
  const enemyTalking = line?.who === "enemy";
  const speakerName =
    line?.who === "narrator"
      ? ""
      : line?.who === "enemy"
        ? shot.enemy
          ? tr(shot.enemy.def.name)
          : ""
        : line
          ? CHARACTERS[line.who].name
          : "";
  const speakerColor = speaker ? VOICE[speaker] : (shot.enemy?.def.color2 ?? "#fff");
  const fx = shot.fx ?? [];

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={tr(scene.label)}
      className="fixed inset-0 z-[100] select-none overflow-hidden bg-black text-white outline-none"
      onClick={advance}
    >
      <div ref={shakeRef} className="absolute inset-0">
        <div ref={cameraRef} className="absolute inset-0 will-change-transform">
          <div key={shot.bg} className="nc-cine-fade absolute inset-0">
            <CutsceneBackdrop bg={shot.bg} fog={shot.fog ?? 0} />
          </div>

          {/* Raios de luz */}
          {fx.includes("rays") && (
            <div
              key={`rays-${shotIndex}`}
              aria-hidden="true"
              className="nc-cine-fade pointer-events-none absolute left-1/2 top-[38%] h-[160vmax] w-[160vmax]"
            >
              <div
                className="nc-cine-rays absolute inset-0"
                style={{
                  background:
                    "repeating-conic-gradient(from 0deg, rgb(255 230 150 / 0.28) 0deg 7deg, transparent 7deg 22deg)",
                  maskImage: "radial-gradient(circle, black 0%, transparent 55%)",
                  WebkitMaskImage: "radial-gradient(circle, black 0%, transparent 55%)",
                  transform: "translate(-50%, -50%)",
                }}
              />
            </div>
          )}

          {/* Palco: a turma e o inimigo, em pé no chão */}
          <div className="absolute inset-x-0 bottom-[12vh] top-[10vh]">
            {castIds.map((id) => {
              const member = shot.cast?.find((c) => c.id === id);
              const visible = !!member && entered.has(id);
              const off = member?.enter === "right" ? 118 : -18;
              const x = member ? (visible ? SLOT_X[member.at] : off) : off;
              const far = member?.at === "far-left" || member?.at === "far-right";
              const action: CharacterAction =
                speaker === id && typing ? "talk" : (member?.action ?? "idle");
              return (
                <div
                  key={id}
                  className={`absolute bottom-0 ${far ? "max-sm:hidden" : ""}`}
                  style={{
                    left: `${x}%`,
                    transform: "translateX(-50%)",
                    opacity: member ? 1 : 0,
                    transition: calm
                      ? "opacity 0.3s"
                      : "left 1.3s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.6s ease",
                    zIndex: member?.at === "center" ? 3 : far ? 1 : 2,
                  }}
                >
                  <Hero id={id} action={action} />
                </div>
              );
            })}
            {shot.enemy && (
              <div
                key={shot.enemy.def.id}
                className="absolute bottom-0 z-[2]"
                style={{
                  left: `${SLOT_X[shot.enemy.at ?? "right"]}%`,
                  transform: "translateX(-50%)",
                  transition: "left 1s ease",
                }}
              >
                <StoryEnemy
                  def={shot.enemy.def}
                  state={enemyTalking && shot.enemy.state === "idle" ? "taunt" : shot.enemy.state}
                  className={
                    shot.enemy.def.boss
                      ? "h-[min(46vh,30rem)] w-[min(42vh,27rem)] max-sm:h-[28vh] max-sm:w-[25vh]"
                      : "h-[min(38vh,25rem)] w-[min(35vh,23rem)] max-sm:h-[23vh] max-sm:w-[21vh]"
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Efeitos por cima de tudo */}
      {fx.includes("flash") && (
        <div
          key={`flash-${shotIndex}`}
          aria-hidden="true"
          className="nc-cine-flash pointer-events-none absolute inset-0 bg-white"
        />
      )}
      {fx.includes("slash") && (
        <div
          key={`slash-${shotIndex}`}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="nc-cine-slash absolute left-[55%] top-[20%] h-[3px] w-[60vw] origin-left bg-white shadow-[0_0_24px_8px_rgb(255_255_255/0.8)]" />
          <div
            className="nc-cine-slash absolute left-[60%] top-[30%] h-[2px] w-[50vw] origin-left bg-amber-200 shadow-[0_0_18px_6px_rgb(253_230_138/0.8)]"
            style={{ animationDelay: "0.18s" }}
          />
        </div>
      )}
      {fx.includes("impact") && (
        <svg
          key={`impact-${shotIndex}`}
          aria-hidden="true"
          viewBox="-100 -100 200 200"
          className="nc-cine-impact pointer-events-none absolute left-[73%] top-[55%] h-[60vmin] w-[60vmin]"
        >
          {Array.from({ length: 14 }, (_, i) => {
            const a = (i / 14) * Math.PI * 2;
            return (
              <line
                key={i}
                x1={Math.cos(a) * 30}
                y1={Math.sin(a) * 30}
                x2={Math.cos(a) * (70 + (i % 3) * 12)}
                y2={Math.sin(a) * (70 + (i % 3) * 12)}
                stroke="#fff7c2"
                strokeWidth={i % 2 ? 3 : 5}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
      )}
      {(fx.includes("sparkles") || fx.includes("clear")) && <Sparkles key={`sp-${shotIndex}`} />}

      {/* Cartão de título e emblema */}
      {(shot.title || shot.emblem) && (
        <div
          key={`title-${shotIndex}`}
          className="pointer-events-none absolute inset-x-0 top-[12vh] z-[5] flex flex-col items-center px-5 text-center"
        >
          {shot.emblem && (
            <div
              className="nc-cine-emblem relative mb-[3vh] h-[min(15vh,8.5rem)] w-[min(15vh,8.5rem)] shrink-0 rounded-full shadow-[0_0_70px_rgba(255,215,106,0.6)]"
              style={{ background: "linear-gradient(135deg, #fff3b0, #f6c343 45%, #c8851c)" }}
            >
              <div
                className="absolute inset-[7%] flex items-center justify-center rounded-full text-[#9a5b0f]"
                style={{ background: "radial-gradient(circle at 35% 30%, #fffdf3, #f3e3b4 70%)" }}
              >
                <EmojiIcon emoji={shot.emblem} className="h-1/2 w-1/2" strokeWidth={1.8} />
              </div>
            </div>
          )}
          {shot.title?.kicker && (
            <p className="nc-cine-up text-[11px] font-bold uppercase tracking-[0.35em] text-amber-200 sm:text-xs">
              {tr(shot.title.kicker)}
            </p>
          )}
          {shot.title && (
            <div className="mt-2" style={{ filter: "drop-shadow(0 4px 18px rgb(0 0 0 / 0.65))" }}>
              <h2
                className="nc-cine-title nc-cine-shine font-display text-[clamp(1.8rem,6vw,3.8rem)] font-bold leading-tight"
                style={{ color: "#fff4cf" }}
              >
                {tr(shot.title.text)}
              </h2>
            </div>
          )}
          {shot.title?.sub && (
            <p
              className="nc-cine-up mt-2 max-w-xl text-sm text-white/90 drop-shadow sm:text-base"
              style={{ animationDelay: "0.35s" }}
            >
              {tr(shot.title.sub)}
            </p>
          )}
          {!!shot.badges?.length && (
            <ul
              className="nc-cine-up mt-3 flex flex-wrap justify-center gap-2"
              style={{ animationDelay: "0.6s" }}
            >
              {shot.badges.map((b) => (
                <li
                  key={b.title}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/30 px-3 py-1 text-xs font-semibold backdrop-blur"
                >
                  <EmojiIcon emoji={b.icon} className="h-3.5 w-3.5 text-amber-200" />
                  {b.title}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Faixas de cinema */}
      <div className="nc-cine-bar-top absolute inset-x-0 top-0 z-10 flex h-[9vh] min-h-11 items-center justify-between bg-black px-4 sm:px-8">
        <span className="font-logo-serif text-sm font-bold tracking-wide text-white/80 sm:text-base">
          Nutri<span className="text-[#f2a65a]">Connect</span>
          <span className="ml-2 hidden text-[11px] font-normal uppercase tracking-[0.3em] text-white/50 sm:inline">
            {tr(["apresenta", "presents", "presenta", "présente"] as const)}
          </span>
        </span>
        <span
          className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1.5"
          aria-hidden="true"
        >
          {scene.shots.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${i === shotIndex ? "w-6 bg-amber-300" : i < shotIndex ? "w-1.5 bg-white/60" : "w-1.5 bg-white/20"}`}
            />
          ))}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            close();
          }}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10"
        >
          {tr(["Pular", "Skip", "Saltar", "Passer"] as const)}
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="nc-cine-bar-bottom absolute inset-x-0 bottom-0 z-10 h-[9vh] min-h-11 bg-black" />

      {/* Fala */}
      {line && (
        <div
          key={`line-${shotIndex}-${lineIndex}`}
          className="nc-cine-up absolute inset-x-0 bottom-3 z-20 flex justify-center px-3 sm:bottom-4 sm:px-6"
        >
          <div className="relative w-full max-w-3xl rounded-2xl border border-white/15 bg-black/70 px-4 pb-4 pt-3 shadow-2xl backdrop-blur-md sm:px-6 sm:pb-5">
            {speakerName && (
              <span
                className="absolute -top-3.5 left-4 rounded-full px-3 py-0.5 text-xs font-black uppercase tracking-wider text-black shadow-md sm:left-6"
                style={{ background: speakerColor }}
              >
                {speakerName}
              </span>
            )}
            <p
              className={`min-h-[3.2em] pt-1.5 text-[15px] leading-relaxed sm:text-lg ${line.who === "narrator" ? "font-serif italic text-white/90" : "font-medium"}`}
            >
              {text.slice(0, typed)}
              <span className="invisible">{text.slice(typed)}</span>
            </p>
            {!typing && (
              <ChevronRight
                className="nc-bob absolute bottom-2 right-3 h-5 w-5 text-white/70"
                aria-hidden="true"
              />
            )}
          </div>
          {/* Leitores de tela recebem a fala inteira de uma vez. */}
          <span className="sr-only" aria-live="polite">
            {speakerName ? `${speakerName}: ` : ""}
            {text}
          </span>
        </div>
      )}

      {ended && (
        <div className="absolute inset-x-0 bottom-[calc(9vh+1.5rem)] z-30 flex justify-center">
          <button
            type="button"
            autoFocus
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            className="nc-cine-up cursor-pointer rounded-full px-7 py-2.5 text-sm font-bold text-black shadow-lg transition hover:scale-105"
            style={{ background: "linear-gradient(135deg, #fff3b0, #f6c343 45%, #c8851c)" }}
          >
            {tr([
              "Continuar a jornada",
              "Continue the journey",
              "Seguir el viaje",
              "Continuer l'aventure",
            ] as const)}
          </button>
        </div>
      )}
    </div>
  );
}

/** Brilhos que sobem pela tela (vitória, névoa se desfazendo). */
function Sparkles() {
  const items = useMemo(
    () =>
      Array.from({ length: 26 }, () => ({
        left: Math.random() * 100,
        size: 3 + Math.random() * 6,
        delay: Math.random() * 1.5,
        duration: 3 + Math.random() * 3,
      })),
    [],
  );
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((p, i) => (
        <span
          key={i}
          className="nc-cine-ember absolute bottom-[8vh] rounded-full"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: i % 3 ? "#fff7c2" : "#ffffff",
            boxShadow: `0 0 ${p.size * 3}px #ffe28a`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            animationIterationCount: 1,
          }}
        />
      ))}
    </div>
  );
}

function Hero({ id, action }: { id: CharacterId; action: CharacterAction }) {
  // A turma fica do tamanho de "gente" na cena; no celular, um pouco menor.
  const sized =
    "h-[min(36vh,24rem)] w-[calc(min(36vh,24rem)*0.72)] max-sm:h-[min(30vh,64vw)] max-sm:w-[min(21.6vh,46vw)]";
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
