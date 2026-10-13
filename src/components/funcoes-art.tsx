// Desenhos animados dos cards da página Funções: cada card tem a sua cena (onda de água, troféu
// brilhando, relógio girando, leitor de código de barras...). São decoração (aria-hidden), ficam no
// canto do card e reagem quando o mouse passa (group-hover). "Reduzir movimento" para tudo.
import type { CSSProperties, ReactNode } from "react";
import {
  Apple,
  Award,
  Backpack,
  CalendarDays,
  Carrot,
  ChefHat,
  Dices,
  Droplet,
  Frown,
  HeartHandshake,
  HeartPulse,
  Laugh,
  Leaf,
  Lightbulb,
  Meh,
  MessageCircle,
  NotebookPen,
  Refrigerator,
  Scale,
  Search,
  ShoppingBasket,
  Smile,
  Snowflake,
  Sparkles,
  Star,
  Stethoscope,
  Target,
  Users,
} from "lucide-react";

export type ArtId =
  | "water"
  | "habits"
  | "mood"
  | "breath"
  | "trophy"
  | "theme"
  | "target"
  | "quiz"
  | "chat"
  | "people"
  | "search"
  | "bulb"
  | "basket"
  | "fridge"
  | "calendar"
  | "carrot"
  | "backpack"
  | "chef"
  | "dice"
  | "plate"
  | "timer"
  | "scale"
  | "stetho"
  | "hearts"
  | "pulse"
  | "notebook"
  | "barcode"
  | "sparkles";

/** Dados reais que alguns desenhos mostram (ex.: altura da água, hábitos marcados, humor). */
export interface ArtData {
  /** 0–1: quanto do dia já foi feito (água, compromisso). */
  fill?: number;
  /** Quantos de 4 hábitos foram marcados hoje. */
  habits?: number;
  /** Humor de hoje (0 ótima … 3 pesada). */
  mood?: number | null;
}

const corner = "pointer-events-none absolute";

function Big({
  children,
  className = "",
  style,
}: {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span aria-hidden="true" className={`${corner} ${className}`} style={style}>
      {children}
    </span>
  );
}

export function TileArt({ id, color, data }: { id: ArtId; color: string; data: ArtData }) {
  const soft = { color: `color-mix(in srgb, ${color} 32%, transparent)` };
  const strong = { color };
  switch (id) {
    case "water": {
      const level = Math.max(0.08, Math.min(1, data.fill ?? 0));
      return (
        <span aria-hidden="true" className={`${corner} inset-0 overflow-hidden rounded-[inherit]`}>
          <span
            className="absolute inset-x-0 bottom-0 transition-[height] duration-1000 ease-out"
            style={{ height: `${level * 100}%` }}
          >
            <span
              className="nc-water absolute -top-3 left-0 h-6 w-[200%] rounded-[45%]"
              style={{ background: `color-mix(in srgb, ${color} 30%, transparent)` }}
            />
            <span
              className="absolute inset-0 top-1"
              style={{ background: `color-mix(in srgb, ${color} 24%, transparent)` }}
            />
          </span>
          <Droplet
            className="nc-bob absolute bottom-6 right-6 h-9 w-9"
            style={strong}
            fill="currentColor"
            fillOpacity={0.25}
          />
        </span>
      );
    }
    case "habits":
      return (
        <Big className="bottom-3 right-3 flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-3 w-3 rounded-full transition ${i < (data.habits ?? 0) ? "nc-pop" : ""}`}
              style={{
                background:
                  i < (data.habits ?? 0) ? color : `color-mix(in srgb, ${color} 18%, transparent)`,
                animationDelay: `${i * 0.12}s`,
              }}
            />
          ))}
        </Big>
      );
    case "mood": {
      const Face = [Laugh, Smile, Meh, Frown][data.mood ?? 1] ?? Smile;
      return (
        <Big className="-bottom-3 -right-3">
          <Face className="nc-wobble h-24 w-24" style={soft} strokeWidth={1.6} />
        </Big>
      );
    }
    case "breath":
      return (
        <Big className="bottom-2 right-2 grid h-20 w-20 place-items-center">
          <span
            className="nc-breathe absolute inset-0 rounded-full"
            style={{ background: `color-mix(in srgb, ${color} 18%, transparent)` }}
          />
          <span
            className="nc-breathe absolute inset-3 rounded-full"
            style={{
              background: `color-mix(in srgb, ${color} 22%, transparent)`,
              animationDelay: "-2s",
            }}
          />
        </Big>
      );
    case "trophy":
      return (
        <>
          <Big className="-bottom-4 -right-4">
            <Award
              className="h-32 w-32 transition duration-500 group-hover:-rotate-6 group-hover:scale-110"
              style={soft}
              strokeWidth={1.4}
            />
          </Big>
          <Big className="nc-gold-shine inset-0 rounded-[inherit] opacity-60" />
          {[
            { top: "18%", left: "62%", d: "0s" },
            { top: "40%", left: "82%", d: "-0.8s" },
            { top: "8%", left: "84%", d: "-1.6s" },
          ].map((s, i) => (
            <Big
              key={i}
              className="nc-twinkle"
              style={{ top: s.top, left: s.left, animationDelay: s.d }}
            >
              <Star className="h-3.5 w-3.5" style={strong} fill="currentColor" />
            </Big>
          ))}
        </>
      );
    case "theme":
      return (
        <>
          <Big className="-bottom-3 -right-2">
            <CalendarDays className="h-24 w-24 -rotate-6" style={soft} strokeWidth={1.4} />
          </Big>
          <Big className="nc-floaty right-16 top-3">
            <Leaf className="h-5 w-5" style={strong} />
          </Big>
        </>
      );
    case "target":
      return (
        <Big className="bottom-3 right-3 grid h-16 w-16 place-items-center">
          <span
            className="nc-ring absolute inset-0 rounded-full border-2"
            style={{ borderColor: color }}
          />
          <span
            className="nc-ring absolute inset-0 rounded-full border-2"
            style={{ borderColor: color, animationDelay: "-0.9s" }}
          />
          <Target className="h-9 w-9" style={strong} />
        </Big>
      );
    case "quiz":
      return (
        <>
          {[
            { r: "12px", b: "10px", s: "2.6rem", d: "0s" },
            { r: "46px", b: "40px", s: "1.6rem", d: "-1.2s" },
            { r: "18px", b: "62px", s: "1.2rem", d: "-2.1s" },
          ].map((q, i) => (
            <Big
              key={i}
              className="nc-floaty font-display font-black"
              style={{ right: q.r, bottom: q.b, fontSize: q.s, animationDelay: q.d, ...soft }}
            >
              ?
            </Big>
          ))}
        </>
      );
    case "chat":
      return (
        <>
          <Big className="nc-bob bottom-6 right-10">
            <MessageCircle className="h-10 w-10" style={soft} fill="currentColor" />
          </Big>
          <Big className="nc-bob bottom-2 right-2" style={{ animationDelay: "-1.2s" }}>
            <MessageCircle
              className="h-8 w-8 -scale-x-100"
              style={strong}
              fill="currentColor"
              fillOpacity={0.3}
            />
          </Big>
        </>
      );
    case "people":
      return (
        <>
          <Big className="-bottom-2 -right-1">
            <Users className="h-20 w-20" style={soft} strokeWidth={1.5} />
          </Big>
          <Big className="right-4 top-4">
            <Dices className="nc-wobble h-6 w-6 group-hover:animate-spin" style={strong} />
          </Big>
        </>
      );
    case "search":
      return (
        <Big className="nc-drift-x bottom-3 right-4">
          <Search className="h-14 w-14" style={soft} strokeWidth={2.2} />
        </Big>
      );
    case "bulb":
      return (
        <Big className="bottom-2 right-3 grid place-items-center">
          <span
            className="nc-breathe absolute h-20 w-20 rounded-full blur-md"
            style={{ background: `color-mix(in srgb, ${color} 35%, transparent)` }}
          />
          <Lightbulb className="relative h-14 w-14" style={strong} strokeWidth={1.6} />
        </Big>
      );
    case "basket":
      return (
        <>
          <Big className="-bottom-2 -right-1">
            <ShoppingBasket className="h-20 w-20" style={soft} strokeWidth={1.5} />
          </Big>
          <Big className="nc-bob right-12 top-4">
            <Apple className="h-5 w-5" style={strong} />
          </Big>
          <Big className="nc-bob right-5 top-8" style={{ animationDelay: "-1s" }}>
            <Carrot className="h-5 w-5" style={strong} />
          </Big>
        </>
      );
    case "fridge":
      return (
        <>
          <Big className="-bottom-3 right-2 [perspective:400px]">
            <Refrigerator
              className="h-28 w-28 origin-left transition duration-500 group-hover:[transform:rotateY(-25deg)]"
              style={soft}
              strokeWidth={1.3}
            />
          </Big>
          {[
            { t: "14%", l: "70%", d: "0s" },
            { t: "34%", l: "88%", d: "-1s" },
          ].map((s, i) => (
            <Big
              key={i}
              className="nc-twinkle"
              style={{ top: s.t, left: s.l, animationDelay: s.d }}
            >
              <Snowflake className="h-4 w-4" style={strong} />
            </Big>
          ))}
        </>
      );
    case "calendar":
      return (
        <Big className="bottom-3 right-3 grid grid-cols-4 gap-1">
          {Array.from({ length: 8 }, (_, i) => (
            <span
              key={i}
              className="nc-pop h-3.5 w-3.5 rounded-[4px]"
              style={{
                background: i % 3 === 0 ? color : `color-mix(in srgb, ${color} 22%, transparent)`,
                animationDelay: `${0.3 + i * 0.06}s`,
              }}
            />
          ))}
        </Big>
      );
    case "carrot":
      return (
        <>
          <Big className="nc-sway -bottom-1 right-3 origin-bottom">
            <Carrot className="h-16 w-16 rotate-12" style={strong} strokeWidth={1.6} />
          </Big>
          <Big className="nc-floaty right-16 top-4" style={{ animationDelay: "-1.5s" }}>
            <Leaf className="h-5 w-5" style={soft} />
          </Big>
        </>
      );
    case "backpack":
      return (
        <Big className="nc-bob -bottom-1 right-2">
          <Backpack className="h-20 w-20 -rotate-6" style={soft} strokeWidth={1.5} />
        </Big>
      );
    case "chef":
      return (
        <>
          <Big className="-bottom-2 right-2">
            <ChefHat className="nc-wobble h-20 w-20" style={soft} strokeWidth={1.5} />
          </Big>
          {[0, 1, 2].map((i) => (
            <Big
              key={i}
              className="nc-steam h-5 w-1.5 rounded-full"
              style={{
                right: `${30 + i * 14}px`,
                bottom: "72px",
                background: `color-mix(in srgb, ${color} 40%, transparent)`,
                animationDelay: `${-i * 0.7}s`,
              }}
            />
          ))}
        </>
      );
    case "dice":
      return (
        <Big className="bottom-3 right-3">
          <Dices
            className="nc-wobble h-14 w-14 transition duration-700 group-hover:rotate-[360deg]"
            style={strong}
            strokeWidth={1.6}
          />
        </Big>
      );
    case "plate":
      return (
        <Big
          className="nc-spin bottom-3 right-3 h-16 w-16 rounded-full border-4 border-white/70 shadow-inner [animation-duration:18s]"
          style={{
            background: `conic-gradient(#4f8a4b 0 50%, #d9692a 50% 75%, #c58a12 75% 100%)`,
          }}
        />
      );
    case "timer":
      return (
        <Big
          className="bottom-3 right-3 grid h-16 w-16 place-items-center rounded-full border-[3px]"
          style={{ borderColor: color }}
        >
          <span
            className="nc-spin absolute left-1/2 top-1/2 h-6 w-[3px] -translate-x-1/2 origin-top rounded-full [animation-duration:6s]"
            style={{ background: color }}
          />
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        </Big>
      );
    case "scale":
      return (
        <Big className="nc-swing bottom-2 right-3 origin-bottom">
          <Scale className="h-16 w-16" style={soft} strokeWidth={1.5} />
        </Big>
      );
    case "stetho":
      return (
        <>
          <Big className="-bottom-2 -right-1">
            <Stethoscope className="h-20 w-20" style={soft} strokeWidth={1.5} />
          </Big>
          <Big className="right-3 top-4 h-6 w-16 overflow-hidden">
            <svg viewBox="0 0 64 24" className="h-full w-full">
              <path
                d="M0 12h16l4-8 6 16 5-12 3 4h30"
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="nc-draw"
                style={{ strokeDasharray: 120, strokeDashoffset: 0 }}
              />
            </svg>
          </Big>
        </>
      );
    case "hearts":
      return (
        <>
          <Big className="-bottom-2 -right-1">
            <HeartHandshake className="h-20 w-20" style={soft} strokeWidth={1.5} />
          </Big>
          <Big className="nc-floaty right-14 top-3">
            <HeartPulse className="h-5 w-5" style={strong} />
          </Big>
        </>
      );
    case "pulse":
      return (
        <Big className="bottom-3 right-3">
          <HeartPulse className="nc-heartbeat h-14 w-14" style={strong} strokeWidth={1.6} />
        </Big>
      );
    case "notebook":
      return (
        <Big className="-bottom-2 right-2">
          <NotebookPen className="nc-wobble h-20 w-20" style={soft} strokeWidth={1.5} />
        </Big>
      );
    case "barcode":
      return (
        <Big className="bottom-4 right-4 flex h-12 items-stretch gap-[3px] overflow-hidden">
          {[3, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2].map((w, i) => (
            <span
              key={i}
              className="rounded-[1px]"
              style={{ width: w, background: `color-mix(in srgb, ${color} 55%, transparent)` }}
            />
          ))}
          <span className="nc-scan absolute inset-x-[-4px] top-1/2 h-[2px] bg-red-500 shadow-[0_0_8px_2px_rgb(239_68_68/0.6)]" />
        </Big>
      );
    case "sparkles":
      return (
        <>
          {[
            { r: "14px", b: "14px", s: 36, d: "0s" },
            { r: "52px", b: "34px", s: 20, d: "-0.7s" },
            { r: "22px", b: "62px", s: 16, d: "-1.4s" },
          ].map((p, i) => (
            <Big
              key={i}
              className="nc-twinkle"
              style={{ right: p.r, bottom: p.b, animationDelay: p.d }}
            >
              <Sparkles style={{ ...strong, width: p.s, height: p.s }} />
            </Big>
          ))}
        </>
      );
  }
}
