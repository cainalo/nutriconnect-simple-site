// Cenários das cenas da história (cutscenes): paisagens em SVG que preenchem a tela, com luz, partículas
// e uma névoa que se desfaz conforme a história avança. Decoração pura (aria-hidden).
import { useMemo, type ReactNode } from "react";
import type { Backdrop } from "@/lib/trail-story";

interface Look {
  sky: [string, string, string];
  particle: string;
  /** Partículas sobem (brasas, vagalumes) ou caem (folhas, pólen). */
  rise: boolean;
  art: ReactNode;
}

const W = 1600;
const H = 900;

/** Morros: uma faixa ondulada que vai até o chão. */
const hills = (y: number, amp: number, waves: number, color: string, phase = 0) => {
  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const x = (i / 40) * W;
    const yy = y + Math.sin((i / 40) * Math.PI * waves + phase) * amp;
    pts.push(`${x.toFixed(0)},${yy.toFixed(0)}`);
  }
  return <polygon points={`0,${H} ${pts.join(" ")} ${W},${H}`} fill={color} />;
};

const tree = (x: number, y: number, s: number, trunk: string, leaf: string, fruit?: string) => (
  <g key={`${x}-${y}`}>
    <rect x={x - 6 * s} y={y - 40 * s} width={12 * s} height={44 * s} rx={4 * s} fill={trunk} />
    <circle cx={x} cy={y - 62 * s} r={34 * s} fill={leaf} />
    <circle cx={x - 24 * s} cy={y - 48 * s} r={22 * s} fill={leaf} />
    <circle cx={x + 24 * s} cy={y - 48 * s} r={22 * s} fill={leaf} />
    {fruit &&
      [
        [-14, -70],
        [12, -56],
        [-26, -44],
        [22, -76],
        [0, -46],
      ].map(([dx, dy], i) => (
        <circle key={i} cx={x + dx * s} cy={y + dy * s} r={5 * s} fill={fruit} />
      ))}
  </g>
);

const stars = (count: number, seed: number) =>
  Array.from({ length: count }, (_, i) => {
    const r = Math.sin(seed + i * 12.9898) * 43758.5453;
    const x = (r - Math.floor(r)) * W;
    const r2 = Math.sin(seed + i * 78.233) * 12345.678;
    const y = (r2 - Math.floor(r2)) * H * 0.45;
    return (
      <circle
        key={i}
        cx={x}
        cy={y}
        r={i % 5 === 0 ? 2.4 : 1.3}
        fill="#fff"
        opacity={0.5 + (i % 3) * 0.2}
      />
    );
  });

const LOOKS: Record<Backdrop, Look> = {
  castle: {
    sky: ["#1b1838", "#5c3470", "#f0a868"],
    particle: "#ffd27a",
    rise: true,
    art: (
      <>
        {stars(40, 1)}
        <circle cx={1180} cy={300} r={90} fill="#ffd9a0" opacity={0.85} />
        {hills(560, 40, 3, "#3a2c5a")}
        {/* Castelo no alto do morro */}
        <g fill="#241a3a">
          <polygon points="700,520 980,520 1020,600 660,600" />
          <rect x={720} y={380} width={240} height={160} />
          <rect x={690} y={300} width={60} height={240} />
          <rect x={930} y={300} width={60} height={240} />
          <rect x={815} y={250} width={50} height={140} />
          <polygon points="690,300 720,240 750,300" />
          <polygon points="930,300 960,240 990,300" />
          <polygon points="815,250 840,190 865,250" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={720 + i * 40} y={366} width={22} height={16} />
          ))}
          <path d="M840 190 l0 -40 l34 12 l-34 12" />
        </g>
        <g fill="#ffd27a" className="nc-cine-windows">
          <rect x={705} y={340} width={14} height={22} rx={7} />
          <rect x={945} y={340} width={14} height={22} rx={7} />
          <rect x={833} y={290} width={14} height={22} rx={7} />
          <rect x={780} y={440} width={18} height={26} rx={9} />
          <rect x={880} y={440} width={18} height={26} rx={9} />
        </g>
        {hills(660, 30, 2.4, "#2c3d48", 1)}
        {hills(760, 26, 3.6, "#22332b", 2)}
      </>
    ),
  },
  village: {
    sky: ["#7cc8ff", "#bfe6ff", "#fff1c1"],
    particle: "#ffffff",
    rise: false,
    art: (
      <>
        {["#ef4444", "#f97316", "#facc15", "#22c55e", "#3b82f6", "#8b5cf6"].map((c, i) => {
          const r = 560 - i * 24;
          return (
            <path
              key={c}
              d={`M${800 - r} 640 A${r} ${r * 0.72} 0 0 1 ${800 + r} 640`}
              stroke={c}
              strokeWidth={24}
              fill="none"
              opacity={0.55}
            />
          );
        })}
        <circle cx={1360} cy={150} r={70} fill="#fff6b0" />
        {hills(600, 30, 2.5, "#9ad97a")}
        {[
          [260, "#f87171", "#b91c1c"],
          [430, "#60a5fa", "#1d4ed8"],
          [1120, "#facc15", "#b45309"],
          [1290, "#c084fc", "#7e22ce"],
        ].map(([x, wall, roof]) => (
          <g key={String(x)}>
            <rect x={Number(x) - 70} y={560} width={140} height={120} rx={8} fill={String(wall)} />
            <polygon
              points={`${Number(x) - 90},565 ${x},470 ${Number(x) + 90},565`}
              fill={String(roof)}
            />
            <rect x={Number(x) - 20} y={620} width={40} height={60} rx={14} fill="#7c4a24" />
            <rect x={Number(x) - 55} y={590} width={26} height={22} rx={4} fill="#fff7d6" />
          </g>
        ))}
        {tree(620, 680, 1.4, "#8b5a2b", "#4ade80", "#ef4444")}
        {tree(980, 680, 1.2, "#8b5a2b", "#22c55e", "#f59e0b")}
        {hills(740, 22, 3, "#6cc152", 1.4)}
      </>
    ),
  },
  meadow: {
    sky: ["#8ccfff", "#cdeeff", "#effae6"],
    particle: "#fff7c2",
    rise: false,
    art: (
      <>
        <circle cx={300} cy={180} r={80} fill="#fff3a6" className="nc-breathe" />
        {hills(520, 50, 2.2, "#9cc9b4")}
        {hills(610, 40, 3, "#6fb780", 0.8)}
        {/* As três fontes */}
        {[
          [520, "#f59e0b"],
          [800, "#22c55e"],
          [1080, "#38bdf8"],
        ].map(([x, c]) => (
          <g key={String(x)}>
            <ellipse cx={Number(x)} cy={668} rx={70} ry={16} fill="#5b6b75" />
            <rect x={Number(x) - 16} y={590} width={32} height={78} rx={6} fill="#8a9aa4" />
            <circle
              cx={Number(x)}
              cy={580}
              r={22}
              fill={String(c)}
              opacity={0.9}
              className="nc-breathe"
            />
            <circle
              cx={Number(x)}
              cy={580}
              r={48}
              fill={String(c)}
              opacity={0.18}
              className="nc-breathe"
            />
          </g>
        ))}
        {hills(740, 26, 3.5, "#4a9a5c", 2)}
        {Array.from({ length: 26 }, (_, i) => (
          <circle
            key={i}
            cx={40 + i * 61}
            cy={800 + (i % 3) * 22}
            r={6}
            fill={["#f472b6", "#fde047", "#ffffff"][i % 3]}
          />
        ))}
      </>
    ),
  },
  market: {
    sky: ["#ffc98a", "#ffe2b0", "#fff6e2"],
    particle: "#f59e0b",
    rise: false,
    art: (
      <>
        <circle cx={1300} cy={220} r={90} fill="#fff1c9" />
        {hills(560, 30, 2, "#d8b06a")}
        {[120, 330, 1240, 1460].map((x, i) =>
          tree(
            x,
            600,
            1.3,
            "#7a4b22",
            i % 2 ? "#5b9a3c" : "#76ad44",
            i % 2 ? "#f97316" : "#ef4444",
          ),
        )}
        {/* Barracas com toldos listrados */}
        {[
          [560, "#dc2626"],
          [800, "#16a34a"],
          [1040, "#2563eb"],
        ].map(([x, c]) => {
          const cx = Number(x);
          return (
            <g key={cx}>
              <rect x={cx - 100} y={560} width={10} height={150} fill="#6b4423" />
              <rect x={cx + 90} y={560} width={10} height={150} fill="#6b4423" />
              <rect x={cx - 110} y={640} width={220} height={70} rx={6} fill="#a8713f" />
              {Array.from({ length: 6 }, (_, i) => (
                <path
                  key={i}
                  d={`M${cx - 120 + i * 40} 520 h40 v50 q-20 18 -40 0 z`}
                  fill={i % 2 ? "#fff7ed" : String(c)}
                />
              ))}
              {/* Embalagens mascaradas */}
              {[-70, -20, 30, 75].map((dx, i) => (
                <g key={dx}>
                  <rect
                    x={cx + dx - 16}
                    y={604}
                    width={32}
                    height={40}
                    rx={4}
                    fill={["#f9a8d4", "#fde68a", "#a5f3fc", "#c4b5fd"][i]}
                  />
                  <ellipse cx={cx + dx} cy={618} rx={12} ry={6} fill="#1f1530" opacity={0.75} />
                </g>
              ))}
            </g>
          );
        })}
        {hills(760, 12, 4, "#c99b62", 1)}
        {Array.from({ length: 22 }, (_, i) => (
          <ellipse
            key={i}
            cx={30 + i * 75}
            cy={820 + (i % 2) * 24}
            rx={30}
            ry={9}
            fill="#b88a55"
            opacity={0.6}
          />
        ))}
      </>
    ),
  },
  kitchen: {
    sky: ["#3a2620", "#4d3127", "#5e3c2d"],
    particle: "#ffb45e",
    rise: true,
    art: (
      <>
        {/* Parede de pedra */}
        {Array.from({ length: 9 }, (_, r) =>
          Array.from({ length: 12 }, (_, c) => (
            <rect
              key={`${r}-${c}`}
              x={c * 140 - (r % 2) * 70}
              y={r * 80}
              width={136}
              height={76}
              rx={10}
              fill="#5a3a2c"
              stroke="#3a241b"
              strokeWidth={4}
            />
          )),
        )}
        {/* Janela em arco com o céu */}
        <path
          d="M1060 520 v-240 a120 120 0 0 1 240 0 v240 z"
          fill="#9fd3ff"
          stroke="#2c1a13"
          strokeWidth={14}
        />
        <circle cx={1220} cy={300} r={36} fill="#fff6c8" />
        <path d="M1180 520 v-360 M1060 380 h240" stroke="#2c1a13" strokeWidth={10} />
        {/* Lareira com fogo */}
        <path
          d="M120 760 v-300 a170 140 0 0 1 340 0 v300 z"
          fill="#2a1712"
          stroke="#1d0f0b"
          strokeWidth={12}
        />
        <ellipse
          cx={290}
          cy={720}
          rx={130}
          ry={60}
          fill="#ff8a3d"
          opacity={0.55}
          className="nc-cine-flicker"
        />
        <path
          className="nc-cine-flicker"
          d="M230 740 q20 -90 60 -130 q-6 60 30 70 q10 -40 40 -60 q0 90 -40 120 z"
          fill="#ffb34d"
        />
        <path
          className="nc-cine-flicker"
          style={{ animationDelay: "-0.3s" }}
          d="M260 742 q14 -50 34 -70 q0 34 20 44 q8 -20 20 -30 q0 50 -30 56 z"
          fill="#ffe08a"
        />
        {/* Panelas penduradas */}
        {[560, 680, 800].map((x, i) => (
          <g
            key={x}
            className="nc-sway"
            style={{ transformOrigin: `${x}px 120px`, animationDelay: `${-i}s` }}
          >
            <line x1={x} y1={120} x2={x} y2={250 + i * 20} stroke="#2c1a13" strokeWidth={5} />
            <circle
              cx={x}
              cy={290 + i * 20}
              r={40 + i * 6}
              fill="#8b5e3c"
              stroke="#5a3a24"
              strokeWidth={6}
            />
          </g>
        ))}
        {/* Prateleira com potes de tempero */}
        <rect x={540} y={430} width={420} height={16} rx={4} fill="#6b4423" />
        {["#16a34a", "#dc2626", "#f59e0b", "#a16207", "#65a30d", "#ea580c"].map((c, i) => (
          <g key={c}>
            <rect
              x={556 + i * 66}
              y={372}
              width={44}
              height={58}
              rx={8}
              fill="#fde7c7"
              opacity={0.9}
            />
            <rect x={556 + i * 66} y={392} width={44} height={38} rx={6} fill={c} opacity={0.8} />
          </g>
        ))}
        {/* Mesa */}
        <rect x={0} y={770} width={W} height={130} fill="#6b3f22" />
        <rect x={0} y={760} width={W} height={20} fill="#8a5530" />
      </>
    ),
  },
  lake: {
    sky: ["#0d1733", "#2e3f78", "#b77aa0"],
    particle: "#d9f99d",
    rise: true,
    art: (
      <>
        {stars(70, 7)}
        <circle cx={1150} cy={210} r={70} fill="#fdf6d8" />
        {hills(470, 70, 2.6, "#1d2850")}
        {hills(520, 40, 4, "#24315e", 1)}
        <rect x={0} y={560} width={W} height={340} fill="#203a6b" />
        {/* Reflexo da lua */}
        {Array.from({ length: 8 }, (_, i) => (
          <rect
            key={i}
            className="nc-cine-shimmer"
            x={1150 - 90 + (i % 3) * 30}
            y={580 + i * 26}
            width={180 - i * 14}
            height={6}
            rx={3}
            fill="#fdf6d8"
            opacity={0.5 - i * 0.05}
            style={{ animationDelay: `${-i * 0.4}s` }}
          />
        ))}
        {hills(780, 18, 3, "#152a22", 0.5)}
        {Array.from({ length: 30 }, (_, i) => (
          <path
            key={i}
            d={`M${i * 55 + 10} 800 q8 -70 4 -110`}
            stroke="#0f1f19"
            strokeWidth={6}
            fill="none"
          />
        ))}
      </>
    ),
  },
  camp: {
    sky: ["#070b1f", "#1a2348", "#3b3466"],
    particle: "#ffae5e",
    rise: true,
    art: (
      <>
        {stars(90, 3)}
        <circle cx={260} cy={170} r={50} fill="#f6f1d5" />
        {hills(560, 40, 3, "#141c3a")}
        {Array.from({ length: 16 }, (_, i) => (
          <polygon
            key={i}
            points={`${i * 105 - 20},640 ${i * 105 + 30},${470 - (i % 3) * 40} ${i * 105 + 80},640`}
            fill="#0e1630"
          />
        ))}
        {hills(700, 16, 2, "#1b2a22", 1)}
        <polygon points="1100,720 1220,560 1340,720" fill="#c2410c" />
        <polygon points="1200,720 1220,600 1240,720" fill="#7c2d12" />
        <ellipse
          cx={800}
          cy={760}
          rx={170}
          ry={50}
          fill="#ff8a3d"
          opacity={0.45}
          className="nc-cine-flicker"
        />
        <path
          className="nc-cine-flicker"
          d="M760 770 q16 -90 46 -120 q-4 56 26 66 q8 -36 30 -52 q2 80 -36 106 z"
          fill="#ffb34d"
        />
        <path
          d="M730 780 l140 -20 M740 760 l130 26"
          stroke="#5a3a24"
          strokeWidth={14}
          strokeLinecap="round"
        />
      </>
    ),
  },
  dawn: {
    sky: ["#9fd5ff", "#ffe7c2", "#ffc58f"],
    particle: "#fff2b3",
    rise: true,
    art: (
      <>
        <circle cx={800} cy={600} r={150} fill="#fff1b8" />
        <circle cx={800} cy={600} r={240} fill="#fff1b8" opacity={0.3} className="nc-breathe" />
        {hills(600, 40, 2, "#8fc4a5")}
        {hills(680, 30, 3, "#6aac7f", 1)}
        {hills(770, 22, 3.6, "#4f9465", 2)}
      </>
    ),
  },
  orchard: {
    sky: ["#ffd39a", "#ffe9c4", "#fff8e6"],
    particle: "#fb923c",
    rise: false,
    art: (
      <>
        <circle cx={1280} cy={190} r={80} fill="#fff4c7" />
        {hills(560, 36, 2.4, "#a7cf7a")}
        {[160, 420, 680, 940, 1200, 1460].map((x, i) =>
          tree(
            x,
            640 + (i % 2) * 30,
            1.5 - (i % 2) * 0.2,
            "#7a4b22",
            i % 2 ? "#4f9a3a" : "#6cb84a",
            ["#ef4444", "#f97316", "#facc15"][i % 3],
          ),
        )}
        {hills(760, 20, 3, "#86c25c", 1)}
      </>
    ),
  },
};

export function CutsceneBackdrop({ bg, fog = 0 }: { bg: Backdrop; fog?: number }) {
  const look = LOOKS[bg];
  // Partículas sorteadas uma vez por cenário.
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, () => ({
        left: Math.random() * 100,
        size: 3 + Math.random() * 5,
        delay: -Math.random() * 10,
        duration: 7 + Math.random() * 7,
      })),
    [],
  );
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${look.sky[0]} 0%, ${look.sky[1]} 55%, ${look.sky[2]} 100%)`,
        }}
      />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 h-full w-full"
      >
        {look.art}
      </svg>
      {particles.map((p, i) => (
        <span
          key={i}
          className={`absolute rounded-full ${look.rise ? "nc-cine-ember bottom-[-12px]" : "nc-cine-drift top-[-12px]"}`}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: look.particle,
            boxShadow: `0 0 ${p.size * 2}px ${look.particle}`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            opacity: 0.8,
          }}
        />
      ))}
      {/* Névoa dos mitos: some conforme a história avança */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-[1800ms] ease-out"
        style={{ opacity: fog }}
      >
        <div className="absolute inset-0 bg-[#2b2342]/45" />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="nc-cine-fog absolute -inset-x-1/2 rounded-[50%] blur-3xl"
            style={{
              top: `${20 + i * 22}%`,
              height: "45%",
              background:
                "radial-gradient(ellipse at center, rgb(196 186 222 / 0.75), transparent 70%)",
              animationDuration: `${26 + i * 9}s`,
              animationDelay: `${-i * 7}s`,
              animationDirection: i % 2 ? "reverse" : "normal",
            }}
          />
        ))}
      </div>
    </div>
  );
}
