// Inimigos da história da trilha (lib/trail-story), desenhados em SVG: fantasma, gosma, golem, serpente,
// espinhento, redemoinho, mímico e o mago (os vilões). Cada um tem cor própria, carrega um símbolo e
// muda de cara e de movimento conforme o estado: surgir, provocar, levar golpe, ser derrotado ou fugir.
import { useId, type CSSProperties, type ReactNode } from "react";
import type { EnemyDef, EnemyState } from "@/lib/trail-story";

const STATE_CLASS: Record<EnemyState, string> = {
  appear: "nc-enemy-appear",
  idle: "nc-enemy-idle",
  taunt: "nc-enemy-taunt",
  hurt: "nc-enemy-hurt",
  defeated: "nc-enemy-defeated",
  flee: "nc-enemy-flee",
};

type Face = "angry" | "hurt" | "out";

function Eyes({
  x1,
  x2,
  y,
  face,
  r = 13,
}: {
  x1: number;
  x2: number;
  y: number;
  face: Face;
  r?: number;
}) {
  if (face === "out") {
    // Olhos em X: derrotado.
    const cross = (cx: number) => (
      <g stroke="#1b1020" strokeWidth={5} strokeLinecap="round">
        <line x1={cx - 8} y1={y - 8} x2={cx + 8} y2={y + 8} />
        <line x1={cx + 8} y1={y - 8} x2={cx - 8} y2={y + 8} />
      </g>
    );
    return (
      <>
        {cross(x1)}
        {cross(x2)}
      </>
    );
  }
  if (face === "hurt") {
    // Olhos apertados (> <): levou um golpe.
    return (
      <g stroke="#1b1020" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <polyline points={`${x1 - 8},${y - 7} ${x1 + 6},${y} ${x1 - 8},${y + 7}`} />
        <polyline points={`${x2 + 8},${y - 7} ${x2 - 6},${y} ${x2 + 8},${y + 7}`} />
      </g>
    );
  }
  const eye = (cx: number, flip: number) => (
    <g>
      <ellipse cx={cx} cy={y} rx={r} ry={r * 1.08} fill="#fff" />
      <circle
        className="nc-enemy-pupil"
        cx={cx + 3 * flip}
        cy={y + 2}
        r={r * 0.48}
        fill="#1b1020"
      />
      <circle cx={cx + 3 * flip - 2} cy={y - 1} r={r * 0.15} fill="#fff" />
      {/* Sobrancelha brava */}
      <line
        x1={cx - r * 1.1 * flip}
        y1={y - r * 1.55}
        x2={cx + r * 0.9 * flip}
        y2={y - r * 0.8}
        stroke="#1b1020"
        strokeWidth={5.5}
        strokeLinecap="round"
      />
    </g>
  );
  return (
    <>
      {eye(x1, 1)}
      {eye(x2, -1)}
    </>
  );
}

function Mouth({ x, y, w, face }: { x: number; y: number; w: number; face: Face }) {
  if (face === "out")
    return (
      <path
        d={`M${x - w / 2} ${y + 6} q${w / 4} -10 ${w / 2} 0 t${w / 2} 0`}
        stroke="#1b1020"
        strokeWidth={5}
        fill="none"
        strokeLinecap="round"
      />
    );
  if (face === "hurt")
    return <ellipse cx={x} cy={y + 4} rx={w * 0.22} ry={w * 0.16} fill="#1b1020" />;
  // Sorriso maldoso com dentinhos.
  const teeth = 5;
  const tw = w / teeth;
  return (
    <g>
      <path d={`M${x - w / 2} ${y} Q${x} ${y + w * 0.55} ${x + w / 2} ${y} Z`} fill="#1b1020" />
      {Array.from({ length: teeth }, (_, i) => (
        <path
          key={i}
          d={`M${x - w / 2 + i * tw + 2} ${y + 0.5} l${tw / 2 - 2} ${tw * 0.75} l${tw / 2 - 2} ${-tw * 0.75} Z`}
          fill="#fff"
        />
      ))}
    </g>
  );
}

function Body({ def, face, gid }: { def: EnemyDef; face: Face; gid: string }) {
  const fill = `url(#${gid})`;
  const ink = "rgb(20 10 30 / 0.28)";
  switch (def.shape) {
    case "ghost":
      return (
        <g>
          <path
            className="nc-enemy-wave"
            d="M42 196 Q38 62 100 38 Q162 62 158 196 L143 182 L128 198 L114 182 L100 198 L86 182 L72 198 L57 182 Z"
            fill={fill}
            stroke={ink}
            strokeWidth={3}
          />
          <path
            d="M60 120 q-26 6 -30 28"
            stroke={fill}
            strokeWidth={14}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M140 120 q26 6 30 28"
            stroke={fill}
            strokeWidth={14}
            strokeLinecap="round"
            fill="none"
          />
          <Eyes x1={80} x2={120} y={100} face={face} />
          <Mouth x={100} y={134} w={40} face={face} />
        </g>
      );
    case "blob":
      return (
        <g>
          <path
            d="M28 192 C16 140 36 66 100 58 C164 66 184 140 172 192 C150 202 50 202 28 192 Z"
            fill={fill}
            stroke={ink}
            strokeWidth={3}
          />
          <path d="M58 190 q4 14 0 18 q-4 -4 0 -18" fill={fill} />
          <path d="M138 190 q5 12 0 16 q-5 -4 0 -16" fill={fill} />
          <ellipse
            cx={74}
            cy={84}
            rx={16}
            ry={8}
            fill="#fff"
            opacity={0.35}
            transform="rotate(-25 74 84)"
          />
          <Eyes x1={78} x2={122} y={118} face={face} r={14} />
          <Mouth x={100} y={152} w={46} face={face} />
        </g>
      );
    case "golem":
      return (
        <g>
          <rect
            x={22}
            y={104}
            width={30}
            height={64}
            rx={10}
            fill={fill}
            stroke={ink}
            strokeWidth={3}
          />
          <rect
            x={148}
            y={104}
            width={30}
            height={64}
            rx={10}
            fill={fill}
            stroke={ink}
            strokeWidth={3}
          />
          <rect
            x={46}
            y={86}
            width={108}
            height={110}
            rx={18}
            fill={fill}
            stroke={ink}
            strokeWidth={3}
          />
          <rect
            x={64}
            y={34}
            width={72}
            height={64}
            rx={14}
            fill={fill}
            stroke={ink}
            strokeWidth={3}
          />
          <path
            d="M78 150 l14 10 l-6 14 M120 120 l10 8 l12 -4"
            stroke={ink}
            strokeWidth={3}
            fill="none"
          />
          <Eyes x1={86} x2={114} y={62} face={face} r={9} />
          <Mouth x={100} y={80} w={30} face={face} />
        </g>
      );
    case "serpent":
      return (
        <g>
          <path
            d="M40 190 C40 150 160 170 150 130 C140 96 60 120 70 84"
            stroke={fill}
            strokeWidth={34}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M40 190 C40 150 160 170 150 130 C140 96 60 120 70 84"
            stroke={ink}
            strokeWidth={2}
            strokeDasharray="4 10"
            fill="none"
          />
          <ellipse cx={86} cy={64} rx={44} ry={34} fill={fill} stroke={ink} strokeWidth={3} />
          <path
            className="nc-enemy-tongue"
            d="M128 74 l18 -2 l6 -6 m-6 6 l6 6"
            stroke="#e11d48"
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
          />
          <Eyes x1={72} x2={104} y={56} face={face} r={11} />
          <Mouth x={92} y={78} w={30} face={face} />
        </g>
      );
    case "spiky": {
      const spikes = 16;
      const pts = Array.from({ length: spikes * 2 }, (_, i) => {
        const a = (i / (spikes * 2)) * Math.PI * 2;
        const r = i % 2 ? 62 : 84;
        return `${100 + Math.cos(a) * r},${118 + Math.sin(a) * r}`;
      }).join(" ");
      return (
        <g>
          <polygon
            className="nc-enemy-spin-slow"
            style={{ transformOrigin: "100px 118px" }}
            points={pts}
            fill={fill}
            stroke={ink}
            strokeWidth={3}
          />
          <circle cx={100} cy={118} r={60} fill={fill} />
          <Eyes x1={80} x2={120} y={108} face={face} />
          <Mouth x={100} y={140} w={42} face={face} />
        </g>
      );
    }
    case "whirl":
      return (
        <g>
          <path
            className="nc-enemy-spin-slow"
            style={{ transformOrigin: "100px 120px" }}
            d="M100 120 m-70 0 a70 70 0 1 0 140 0 a70 70 0 1 0 -140 0"
            fill={fill}
            stroke={ink}
            strokeWidth={3}
          />
          <path
            className="nc-enemy-spin"
            style={{ transformOrigin: "100px 120px" }}
            d="M100 120 m0 -52 a52 52 0 0 1 0 104 a38 38 0 0 1 0 -76 a24 24 0 0 1 0 48"
            stroke="rgb(255 255 255 / 0.35)"
            strokeWidth={6}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M70 186 q30 22 60 0"
            stroke={fill}
            strokeWidth={12}
            strokeLinecap="round"
            fill="none"
          />
          <Eyes x1={80} x2={120} y={108} face={face} />
          <Mouth x={100} y={140} w={40} face={face} />
        </g>
      );
    case "mimic":
      return (
        <g>
          <rect
            x={30}
            y={110}
            width={140}
            height={86}
            rx={12}
            fill={fill}
            stroke={ink}
            strokeWidth={3}
          />
          <g className="nc-enemy-lid" style={{ transformOrigin: "30px 110px" }}>
            <path
              d="M30 110 L30 70 Q100 30 170 70 L170 110 Z"
              fill={fill}
              stroke={ink}
              strokeWidth={3}
            />
            {Array.from({ length: 7 }, (_, i) => (
              <path
                key={i}
                d={`M${38 + i * 19} 110 l9 14 l9 -14 Z`}
                fill="#fff"
                stroke={ink}
                strokeWidth={1.5}
              />
            ))}
          </g>
          {Array.from({ length: 7 }, (_, i) => (
            <path
              key={i}
              d={`M${38 + i * 19} 112 l9 -12 l9 12 Z`}
              fill="#fff"
              stroke={ink}
              strokeWidth={1.5}
            />
          ))}
          <rect x={30} y={150} width={140} height={10} fill={ink} />
          <Eyes x1={80} x2={120} y={84} face={face} r={11} />
        </g>
      );
    case "wizard":
      return (
        <g>
          {/* Capa */}
          <path
            className="nc-enemy-wave"
            d="M100 70 L26 198 L174 198 Z"
            fill={fill}
            stroke={ink}
            strokeWidth={3}
          />
          <path d="M100 70 L60 198 M100 70 L140 198" stroke="rgb(0 0 0 / 0.18)" strokeWidth={4} />
          {/* Cabeça e cartola */}
          <circle cx={100} cy={78} r={34} fill="#f3d9c6" stroke={ink} strokeWidth={3} />
          <rect x={70} y={22} width={60} height={34} rx={4} fill="#1f1530" />
          <rect x={58} y={52} width={84} height={9} rx={4} fill="#1f1530" />
          <rect x={70} y={44} width={60} height={7} fill={def.color2} />
          {/* Bigode enrolado */}
          <path
            d="M100 92 q-14 -4 -22 4 q-6 6 -12 0 M100 92 q14 -4 22 4 q6 6 12 0"
            stroke="#3b2316"
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
          />
          <Eyes x1={88} x2={112} y={76} face={face} r={8} />
          {face !== "angry" && <Mouth x={100} y={100} w={18} face={face} />}
        </g>
      );
  }
}

/**
 * Um inimigo da história. `size` é a altura; o símbolo (`prop`) flutua ao lado. O chefão é maior e
 * tem uma aura.
 */
export function StoryEnemy({
  def,
  state = "idle",
  className = "",
  style,
  label,
}: {
  def: EnemyDef;
  state?: EnemyState;
  className?: string;
  style?: CSSProperties;
  label?: string;
}) {
  const gid = `enemy-${useId().replace(/:/g, "")}`;
  const face: Face = state === "defeated" ? "out" : state === "hurt" ? "hurt" : "angry";
  let aura: ReactNode = null;
  if (def.boss)
    aura = (
      <span
        aria-hidden="true"
        className="nc-breathe absolute inset-[-12%] rounded-full blur-2xl"
        style={{ background: `radial-gradient(circle, ${def.color2}aa, transparent 65%)` }}
      />
    );
  return (
    <div
      className={`relative ${STATE_CLASS[state]} ${className}`}
      style={style}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {aura}
      <svg viewBox="0 0 200 220" className="relative h-full w-full overflow-visible">
        <defs>
          <radialGradient id={gid} cx="38%" cy="30%" r="80%">
            <stop offset="0%" stopColor={def.color2} />
            <stop offset="70%" stopColor={def.color} />
          </radialGradient>
        </defs>
        <ellipse cx={100} cy={212} rx={62} ry={8} fill="#000" opacity={0.22} />
        <g className="nc-enemy-body">
          <Body def={def} face={face} gid={gid} />
        </g>
      </svg>
      <span
        className="nc-enemy-prop absolute right-[-4%] top-[16%] grid aspect-square w-[26%] place-items-center rounded-full border-2 bg-white shadow-lg"
        style={{ borderColor: def.color }}
      >
        <def.prop className="h-[58%] w-[58%]" style={{ color: def.color }} strokeWidth={2.2} />
      </span>
    </div>
  );
}
