// Prévias fiéis de cada rede social no editor do estúdio: o post aparece dentro de um celular (ou do
// card da rede), com o layout de verdade de Instagram (feed, Stories, Reels), TikTok, Facebook,
// LinkedIn, X e YouTube. É interativo: carrossel arrastável, curtir, "mais" na legenda, stories por toque.
import { useRef, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Globe,
  Heart,
  Loader2,
  MessageCircle,
  Music2,
  Plus,
  Repeat2,
  Send,
  Share2,
  ThumbsUp,
  BarChart3,
  Camera,
  CircleUserRound,
  Clapperboard,
  HandHeart,
  House,
  Play,
  Search,
  SquarePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { composeCaption, type Draft, type PreviewMode } from "@/components/admin/social/use-art";

const NAME = "NutriConnect";

/** Texto com #hashtags e @menções destacados. */
function Rich({ text, tagClass }: { text: string; tagClass: string }) {
  const parts = text.split(/([#@][\p{L}\p{N}_]+)/u);
  return (
    <>
      {parts.map((p, i) =>
        /^[#@][\p{L}\p{N}_]+$/u.test(p) ? (
          <span key={i} className={tagClass}>
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function Avatar({
  size = 32,
  ring = false,
  dark = false,
}: {
  size?: number;
  ring?: boolean;
  dark?: boolean;
}) {
  const inner = (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-display font-bold text-white",
        dark ? "bg-[#3f4727]" : "bg-[#555f36]",
      )}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      N
    </span>
  );
  if (!ring) return inner;
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-[conic-gradient(from_200deg,#f9ce34,#ee2a7b,#6228d7,#f9ce34)] p-[2px]"
      style={{ width: size + 6, height: size + 6 }}
    >
      <span className="grid place-items-center rounded-full bg-white p-[2px]">{inner}</span>
    </span>
  );
}

/** Moldura de celular. */
function Phone({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <div className="st-phone relative mx-auto w-[300px] rounded-[2.75rem] bg-neutral-900 p-[10px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)]">
      <div
        className={cn(
          "relative flex h-[610px] flex-col overflow-hidden rounded-[2.2rem]",
          dark ? "bg-black text-white" : "bg-white text-neutral-900",
        )}
      >
        <div className="pointer-events-none absolute left-1/2 top-2 z-30 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
        <div
          className={cn(
            "relative z-20 flex h-9 shrink-0 items-center justify-between px-6 pt-1 text-[11px] font-semibold",
            dark ? "text-white" : "text-neutral-900",
          )}
        >
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <span className="flex h-2.5 items-end gap-[1.5px]">
              {[3, 5, 7, 9].map((h) => (
                <span key={h} className="w-[2.5px] rounded-sm bg-current" style={{ height: h }} />
              ))}
            </span>
            <span className="ml-1 h-2.5 w-5 rounded-[3px] border border-current p-[1px]">
              <span className="block h-full w-3/4 rounded-[1px] bg-current" />
            </span>
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Carrossel arrastável (feed). */
function Carousel({
  images,
  aspect,
  dark = false,
  onIndex,
}: {
  images: string[];
  aspect: string;
  dark?: boolean;
  onIndex?: (i: number) => void;
}) {
  const [i, setIdx] = useState(0);
  const setI = (f: (x: number) => number) => {
    const next = f(i);
    setIdx(next);
    onIndex?.(next);
  };
  const start = useRef<number | null>(null);
  const n = Math.max(images.length, 1);
  const go = (d: number) => setI((x) => Math.min(n - 1, Math.max(0, x + d)));
  return (
    <div
      className="group relative w-full select-none overflow-hidden"
      style={{ aspectRatio: aspect }}
    >
      <div
        className="flex h-full transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)]"
        style={{ transform: `translateX(-${Math.min(i, n - 1) * 100}%)` }}
        onPointerDown={(e) => (start.current = e.clientX)}
        onPointerUp={(e) => {
          if (start.current === null) return;
          const dx = e.clientX - start.current;
          if (Math.abs(dx) > 30) go(dx < 0 ? 1 : -1);
          start.current = null;
        }}
      >
        {images.length ? (
          images.map((src, k) => (
            <img
              key={k}
              src={src}
              alt=""
              draggable={false}
              className="h-full w-full shrink-0 object-cover"
            />
          ))
        ) : (
          <div
            className={cn("h-full w-full shrink-0", dark ? "bg-neutral-800" : "bg-neutral-100")}
          />
        )}
      </div>
      {n > 1 && (
        <>
          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
            {i + 1}/{n}
          </span>
          {i > 0 && (
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-neutral-800 opacity-0 shadow transition group-hover:opacity-100"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {i < n - 1 && (
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-neutral-800 opacity-0 shadow transition group-hover:opacity-100"
              aria-label="Próxima"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Dots({ n, active = 0 }: { n: number; active?: number }) {
  if (n < 2) return null;
  return (
    <div className="flex justify-center gap-1">
      {Array.from({ length: Math.min(n, 10) }, (_, k) => (
        <span
          key={k}
          className={cn("h-1.5 w-1.5 rounded-full", k === active ? "bg-sky-500" : "bg-neutral-300")}
        />
      ))}
    </div>
  );
}

/** Curtir com animação. */
function LikeButton({
  className,
  size = 22,
  filledClass = "fill-red-500 text-red-500",
}: {
  className?: string;
  size?: number;
  filledClass?: string;
}) {
  const [on, setOn] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOn((v) => !v)}
      className={cn("transition active:scale-90", className)}
      aria-pressed={on}
      aria-label="Curtir"
    >
      <Heart
        className={cn(on ? cn(filledClass, "st-pop") : "")}
        style={{ width: size, height: size }}
      />
    </button>
  );
}

/** Legenda com "mais". */
function Caption({
  text,
  lines = 2,
  className,
  tagClass,
  prefix,
}: {
  text: string;
  lines?: number;
  className?: string;
  tagClass: string;
  prefix?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const long = text.length > 110 || text.split("\n").length > lines;
  return (
    <div className={cn("whitespace-pre-line break-words", className)}>
      <div
        className={cn(
          !open &&
            long &&
            (lines === 1 ? "line-clamp-1" : lines === 3 ? "line-clamp-3" : "line-clamp-2"),
        )}
      >
        {prefix}
        <Rich text={text} tagClass={tagClass} />
      </div>
      {long && !open && (
        <button type="button" onClick={() => setOpen(true)} className="opacity-60">
          mais
        </button>
      )}
    </div>
  );
}

// ───────────────────────────── Instagram ─────────────────────────────

function InstagramFeed({ d, images, handle }: { d: Draft; images: string[]; handle: string }) {
  const [slide, setSlide] = useState(0);
  return (
    <Phone>
      <div className="flex shrink-0 items-center justify-between px-3 pb-2">
        <span className="font-display text-xl italic">Instagram</span>
        <span className="flex gap-4">
          <Heart className="h-5 w-5" />
          <Send className="h-5 w-5" />
        </span>
      </div>
      <div className="st-scroll st-fade flex-1 overflow-y-auto">
        <div className="flex items-center gap-2 px-3 py-2">
          <Avatar size={28} ring />
          <span className="flex-1 text-[13px] font-semibold">{handle}</span>
          <Ellipsis className="h-4 w-4" />
        </div>
        <Carousel images={images} aspect="4 / 5" onIndex={setSlide} />
        <div className="flex items-center gap-4 px-3 pt-2.5">
          <LikeButton />
          <MessageCircle className="h-[22px] w-[22px] -scale-x-100" />
          <Send className="h-[21px] w-[21px]" />
          <span className="flex-1">
            <Dots n={images.length} active={slide} />
          </span>
          <Bookmark className="h-[22px] w-[22px]" />
        </div>
        <p className="px-3 pt-2 text-[13px] font-semibold">1.284 curtidas</p>
        <Caption
          text={composeCaption(d)}
          className="px-3 pt-1 text-[13px] leading-snug"
          tagClass="text-[#00376b]"
          prefix={<span className="mr-1 font-semibold">{handle}</span>}
        />
        <p className="px-3 pt-1 text-[13px] text-neutral-500">Ver todos os 36 comentários</p>
        <p className="px-3 pb-6 pt-1 text-[10px] uppercase tracking-wide text-neutral-400">agora</p>
      </div>
      <IgTabBar />
    </Phone>
  );
}

function IgTabBar() {
  return (
    <div className="flex h-11 shrink-0 items-center justify-around border-t border-neutral-200 px-4">
      {[House, Search, SquarePlus, Clapperboard, CircleUserRound].map((Icon, k) => (
        <Icon key={k} className="h-5 w-5 text-neutral-800" strokeWidth={1.8} />
      ))}
    </div>
  );
}

function InstagramStory({ d, images, handle }: { d: Draft; images: string[]; handle: string }) {
  const [i, setI] = useState(0);
  const n = Math.max(images.length, 1);
  return (
    <Phone dark>
      <div className="absolute inset-0 top-0">
        {images[i] ? (
          <img src={images[i]} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-neutral-800" />
        )}
        <button
          type="button"
          className="absolute inset-y-0 left-0 w-1/3"
          onClick={() => setI((x) => Math.max(0, x - 1))}
          aria-label="Anterior"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 w-2/3"
          onClick={() => setI((x) => Math.min(n - 1, x + 1))}
          aria-label="Próximo"
        />
      </div>
      <div className="relative z-10 flex gap-1 px-2 pt-1">
        {Array.from({ length: n }, (_, k) => (
          <span key={k} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/40">
            <span
              className={cn(
                "block h-full bg-white",
                k < i ? "w-full" : k === i ? "st-progress" : "w-0",
              )}
            />
          </span>
        ))}
      </div>
      <div className="relative z-10 flex items-center gap-2 px-3 pt-2.5">
        <Avatar size={30} />
        <span className="text-[13px] font-semibold">{handle}</span>
        <span className="text-[12px] text-white/70">agora</span>
      </div>
      <div className="flex-1" />
      <div className="relative z-10 flex items-center gap-3 px-3 pb-5">
        <span className="flex-1 rounded-full border border-white/70 px-4 py-2 text-[12px] text-white/90">
          Enviar mensagem
        </span>
        <LikeButton className="text-white" size={24} />
        <Send className="h-6 w-6" />
      </div>
    </Phone>
  );
}

function SideAction({ icon, label }: { icon: ReactNode; label?: string }) {
  return (
    <span className="flex flex-col items-center gap-1 text-[11px] font-semibold drop-shadow">
      {icon}
      {label}
    </span>
  );
}

function InstagramReels({ d, images, handle }: { d: Draft; images: string[]; handle: string }) {
  return (
    <Phone dark>
      <div className="absolute inset-0">
        {images[0] ? (
          <img src={images[0]} alt="" className="st-kenburns h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-neutral-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
      </div>
      <div className="relative z-10 flex items-center justify-between px-4 pt-1">
        <span className="text-lg font-bold">Reels</span>
        <Camera className="h-5 w-5" />
      </div>
      <div className="flex-1" />
      <div className="relative z-10 flex items-end gap-3 px-3 pb-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Avatar size={30} />
            <span className="text-[13px] font-semibold">{handle}</span>
            <span className="rounded-md border border-white/80 px-2 py-0.5 text-[11px] font-semibold">
              Seguir
            </span>
          </div>
          <Caption
            text={composeCaption(d)}
            lines={1}
            className="mt-2 text-[12px] leading-snug"
            tagClass="font-semibold"
          />
          <p className="mt-2 flex items-center gap-1.5 text-[11px]">
            <Music2 className="h-3 w-3" />
            <span className="st-marquee inline-block max-w-[150px] overflow-hidden whitespace-nowrap">
              Áudio original · {NAME}
            </span>
          </p>
        </div>
        <div className="flex flex-col items-center gap-4">
          <SideAction icon={<LikeButton className="text-white" size={26} />} label="8.312" />
          <SideAction icon={<MessageCircle className="h-6 w-6 -scale-x-100" />} label="214" />
          <SideAction icon={<Send className="h-6 w-6" />} label="1.024" />
          <SideAction icon={<Ellipsis className="h-6 w-6" />} />
          <span className="h-7 w-7 rounded-md border-2 border-white bg-[#555f36]" />
        </div>
      </div>
    </Phone>
  );
}

// ───────────────────────────── TikTok ─────────────────────────────

function TikTok({ d, images, handle }: { d: Draft; images: string[]; handle: string }) {
  return (
    <Phone dark>
      <div className="absolute inset-0">
        {images[0] ? (
          <img src={images[0]} alt="" className="st-kenburns h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-neutral-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/75" />
      </div>
      <div className="relative z-10 flex justify-center gap-4 pt-1 text-[14px] font-semibold">
        <span className="text-white/60">Seguindo</span>
        <span className="border-b-2 border-white pb-1">Para você</span>
      </div>
      <div className="flex-1" />
      <div className="relative z-10 flex items-end gap-3 px-3 pb-4">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold">@{handle}</p>
          <Caption
            text={composeCaption(d)}
            lines={2}
            className="mt-1 text-[12px] leading-snug"
            tagClass="font-bold"
          />
          <p className="mt-2 flex items-center gap-1.5 text-[11px]">
            <Music2 className="h-3 w-3" />
            <span className="st-marquee inline-block max-w-[150px] overflow-hidden whitespace-nowrap">
              som original - {NAME}
            </span>
          </p>
        </div>
        <div className="flex flex-col items-center gap-4">
          <span className="relative">
            <Avatar size={40} />
            <span className="absolute -bottom-2 left-1/2 grid h-5 w-5 -translate-x-1/2 place-items-center rounded-full bg-[#fe2c55]">
              <Plus className="h-3.5 w-3.5" />
            </span>
          </span>
          <SideAction
            icon={
              <LikeButton
                className="text-white"
                size={30}
                filledClass="fill-[#fe2c55] text-[#fe2c55]"
              />
            }
            label="24,5 mil"
          />
          <SideAction icon={<MessageCircle className="h-7 w-7 fill-white" />} label="482" />
          <SideAction icon={<Bookmark className="h-7 w-7 fill-white" />} label="3.106" />
          <SideAction icon={<Share2 className="h-7 w-7" />} label="912" />
          <span className="st-spin grid h-9 w-9 place-items-center rounded-full bg-[conic-gradient(#222,#555,#222)] ring-4 ring-neutral-800">
            <Avatar size={18} />
          </span>
        </div>
      </div>
    </Phone>
  );
}

// ───────────────────────────── Facebook ─────────────────────────────

function Facebook({ d, images, handle }: { d: Draft; images: string[]; handle: string }) {
  return (
    <Phone>
      <div className="flex shrink-0 items-center justify-between px-3 pb-2">
        <span className="text-[22px] font-extrabold tracking-tight text-[#1877f2]">facebook</span>
        <span className="flex gap-2">
          <span className="h-7 w-7 rounded-full bg-neutral-100" />
          <span className="h-7 w-7 rounded-full bg-neutral-100" />
        </span>
      </div>
      <div className="st-scroll st-fade flex-1 overflow-y-auto bg-neutral-100">
        <div className="mt-2 bg-white">
          <div className="flex items-center gap-2 px-3 pt-3">
            <Avatar size={36} />
            <div className="flex-1 leading-tight">
              <p className="text-[13px] font-semibold">{NAME}</p>
              <p className="flex items-center gap-1 text-[11px] text-neutral-500">
                Agora · <Globe className="h-3 w-3" />
              </p>
            </div>
            <Ellipsis className="h-4 w-4 text-neutral-500" />
          </div>
          <Caption
            text={composeCaption(d)}
            lines={3}
            className="px-3 py-2 text-[13px] leading-snug"
            tagClass="text-[#1877f2]"
          />
          <Carousel images={images} aspect="4 / 5" />
          <div className="flex items-center justify-between gap-2 whitespace-nowrap px-3 py-2 text-[11px] text-neutral-500">
            <span className="flex shrink-0 items-center gap-1">
              <span className="grid h-4 w-4 place-items-center rounded-full bg-[#1877f2] text-white ring-2 ring-white">
                <ThumbsUp className="h-2.5 w-2.5 fill-current" />
              </span>
              <span className="-ml-1.5 grid h-4 w-4 place-items-center rounded-full bg-red-500 text-white ring-2 ring-white">
                <Heart className="h-2.5 w-2.5 fill-current" />
              </span>
              128
            </span>
            <span className="truncate">12 comentários · 4 compartilhamentos</span>
          </div>
          <div className="mx-3 flex justify-around border-t border-neutral-200 py-2 text-[12px] font-semibold text-neutral-600">
            <span className="flex items-center gap-1">
              <ThumbsUp className="h-4 w-4" /> Curtir
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" /> Comentar
            </span>
            <span className="flex items-center gap-1">
              <Share2 className="h-4 w-4" /> Compartilhar
            </span>
          </div>
        </div>
        <p className="px-3 py-3 text-center text-[11px] text-neutral-400">@{handle}</p>
      </div>
    </Phone>
  );
}

// ───────────────────────────── LinkedIn ─────────────────────────────

function LinkedIn({ d, images }: { d: Draft; images: string[] }) {
  return (
    <Phone>
      <div className="flex shrink-0 items-center gap-2 px-3 pb-2">
        <Avatar size={26} />
        <span className="flex-1 rounded-md bg-[#edf3f8] px-3 py-1.5 text-[11px] text-neutral-500">
          Pesquisar
        </span>
      </div>
      <div className="st-scroll st-fade flex-1 overflow-y-auto bg-[#f4f2ee]">
        <div className="mt-2 bg-white">
          <div className="flex items-start gap-2 px-3 pt-3">
            <span className="grid h-11 w-11 place-items-center rounded-md bg-[#555f36] font-display text-lg font-bold text-white">
              N
            </span>
            <div className="flex-1 leading-tight">
              <p className="text-[13px] font-semibold">{NAME}</p>
              <p className="text-[11px] text-neutral-500">12.480 seguidores</p>
              <p className="flex items-center gap-1 text-[11px] text-neutral-500">
                Agora · <Globe className="h-3 w-3" />
              </p>
            </div>
            <span className="text-[13px] font-semibold text-[#0a66c2]">+ Seguir</span>
          </div>
          <Caption
            text={composeCaption(d)}
            lines={3}
            className="px-3 py-2 text-[13px] leading-snug"
            tagClass="font-semibold text-[#0a66c2]"
          />
          {images.length > 0 && <Carousel images={images} aspect="1 / 1" />}
          <div className="flex items-center gap-1 px-3 py-2 text-[11px] text-neutral-500">
            <span className="grid h-4 w-4 place-items-center rounded-full bg-[#378fe9] text-white ring-2 ring-white">
              <ThumbsUp className="h-2.5 w-2.5 fill-current" />
            </span>
            <span className="-ml-1.5 grid h-4 w-4 place-items-center rounded-full bg-[#6dae4f] text-white ring-2 ring-white">
              <HandHeart className="h-2.5 w-2.5" />
            </span>
            <span className="-ml-1.5 grid h-4 w-4 place-items-center rounded-full bg-[#df704d] text-white ring-2 ring-white">
              <Heart className="h-2.5 w-2.5 fill-current" />
            </span>
            <span className="ml-1">342 · 28 comentários</span>
          </div>
          <div className="mx-3 flex justify-around border-t border-neutral-200 py-2 text-[11px] font-semibold text-neutral-600">
            {["Gostei", "Comentar", "Compartilhar", "Enviar"].map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
        </div>
      </div>
    </Phone>
  );
}

// ───────────────────────────── X ─────────────────────────────

function XPost({ d, images, handle }: { d: Draft; images: string[]; handle: string }) {
  const text = composeCaption(d);
  const over = text.length > 280;
  return (
    <Phone>
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-3 pb-2">
        <Avatar size={26} />
        <span className="text-xl font-black">𝕏</span>
        <span className="w-6" />
      </div>
      <div className="st-scroll st-fade flex-1 overflow-y-auto">
        <div className="flex gap-2 px-3 pt-3">
          <Avatar size={38} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-[13px]">
              <span className="font-bold">{NAME}</span>
              <BadgeCheck className="h-4 w-4 fill-sky-500 text-white" />
              <span className="truncate text-neutral-500">@{handle} · agora</span>
            </p>
            <p className="mt-1 whitespace-pre-line break-words text-[13px] leading-snug">
              <Rich text={over ? `${text.slice(0, 280)}` : text} tagClass="text-sky-500" />
              {over && <span className="bg-red-100 text-red-600">{text.slice(280)}</span>}
            </p>
            {images[0] && (
              <img
                src={images[0]}
                alt=""
                className="mt-2 w-full rounded-2xl border border-neutral-200"
              />
            )}
            <div className="mt-2 flex justify-between pr-4 text-neutral-500">
              <span className="flex items-center gap-1 text-[11px]">
                <MessageCircle className="h-4 w-4" /> 18
              </span>
              <span className="flex items-center gap-1 text-[11px]">
                <Repeat2 className="h-4 w-4" /> 42
              </span>
              <span className="flex items-center gap-1 text-[11px]">
                <LikeButton size={16} filledClass="fill-pink-600 text-pink-600" /> 310
              </span>
              <span className="flex items-center gap-1 text-[11px]">
                <BarChart3 className="h-4 w-4" /> 9,8 mil
              </span>
            </div>
          </div>
        </div>
        {over && (
          <p className="mx-3 mt-3 rounded-xl bg-red-50 p-2 text-[11px] text-red-600">
            Passou de 280 caracteres: o trecho marcado não cabe num post só (vire um fio).
          </p>
        )}
      </div>
    </Phone>
  );
}

// ───────────────────────────── YouTube ─────────────────────────────

function YouTube({ d, images }: { d: Draft; images: string[] }) {
  const shorts = d.format === "reels" || d.format === "story";
  if (shorts) {
    return (
      <Phone dark>
        <div className="absolute inset-0">
          {images[0] ? (
            <img src={images[0]} alt="" className="st-kenburns h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-neutral-800" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/75" />
        </div>
        <div className="relative z-10 px-4 pt-1 text-lg font-bold">Shorts</div>
        <div className="flex-1" />
        <div className="relative z-10 flex items-end gap-3 px-3 pb-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Avatar size={28} />
              <span className="text-[13px] font-semibold">@nutriconnect</span>
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-black">
                Inscrever-se
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-[13px]">{d.title || d.hook}</p>
          </div>
          <div className="flex flex-col items-center gap-4">
            <SideAction icon={<ThumbsUp className="h-6 w-6 fill-white" />} label="5,2 mil" />
            <SideAction icon={<MessageCircle className="h-6 w-6 fill-white" />} label="128" />
            <SideAction icon={<Share2 className="h-6 w-6" />} label="Compartilhar" />
          </div>
        </div>
      </Phone>
    );
  }
  return (
    <Phone>
      <div className="flex shrink-0 items-center gap-1 px-3 pb-2">
        <span className="grid h-5 w-7 place-items-center rounded-md bg-red-600 text-white">
          <Play className="h-2.5 w-2.5 fill-current" />
        </span>
        <span className="text-[15px] font-bold tracking-tight">YouTube</span>
      </div>
      <div className="st-scroll st-fade flex-1 overflow-y-auto">
        <div className="relative">
          {images[0] ? (
            <img src={images[0]} alt="" className="aspect-video w-full object-cover" />
          ) : (
            <div className="aspect-video w-full bg-neutral-200" />
          )}
          <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1 text-[10px] font-semibold text-white">
            8:42
          </span>
        </div>
        <div className="flex gap-3 px-3 py-3">
          <Avatar size={34} />
          <div className="min-w-0">
            <p className="line-clamp-2 text-[14px] font-semibold leading-snug">
              {d.title || d.hook || "Título do vídeo"}
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">{NAME} · 0 visualizações · agora</p>
          </div>
        </div>
        <Caption
          text={composeCaption(d)}
          lines={3}
          className="mx-3 mb-4 rounded-xl bg-neutral-100 p-3 text-[12px] leading-snug"
          tagClass="text-[#065fd4]"
        />
      </div>
    </Phone>
  );
}

/** Prévia escolhida. */
export function NetworkPreview({
  mode,
  draft,
  images,
  handle,
  busy,
}: {
  mode: PreviewMode;
  draft: Draft;
  images: string[];
  handle: string;
  busy?: boolean;
}) {
  const h = handle.replace(/^@/, "") || "nutriconnect";
  const body =
    mode === "ig-feed" ? (
      <InstagramFeed d={draft} images={images} handle={h} />
    ) : mode === "ig-story" ? (
      <InstagramStory d={draft} images={images} handle={h} />
    ) : mode === "ig-reels" ? (
      <InstagramReels d={draft} images={images} handle={h} />
    ) : mode === "tiktok" ? (
      <TikTok d={draft} images={images} handle={h} />
    ) : mode === "facebook" ? (
      <Facebook d={draft} images={images} handle={h} />
    ) : mode === "linkedin" ? (
      <LinkedIn d={draft} images={images} />
    ) : mode === "x" ? (
      <XPost d={draft} images={images} handle={h} />
    ) : (
      <YouTube d={draft} images={images} />
    );
  return (
    <div key={mode} className="relative animate-in fade-in zoom-in-95 duration-300">
      {body}
      {busy && (
        <span className="absolute right-3 top-3 z-40 grid h-7 w-7 place-items-center rounded-full bg-white/90 shadow">
          <Loader2 className="h-4 w-4 animate-spin text-neutral-600" />
        </span>
      )}
    </div>
  );
}
