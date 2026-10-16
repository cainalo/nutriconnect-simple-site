// Música das cenas da história (cutscenes): cada clima tem um tema em loop, sintetizado no aparelho com
// a Web Audio API, como os outros sons do site. "mystery" (névoa e vilões), "battle" (inimigos),
// "calm" (aberturas e conversas) e "fanfare" (vitórias, a fanfarra de lib/fanfare). Segue as escolhas
// de Sons (conquistas ligadas, volume e horário de silêncio).
import { playFanfare } from "@/lib/fanfare";
import { audioContext, soundVolume } from "@/lib/sounds";
import type { Mood } from "@/lib/trail-story";

export interface ScoreHandle {
  stop: () => void;
}

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

interface Theme {
  bpm: number;
  /** Passos por tempo (2 = colcheias, 4 = semicolcheias). */
  sub: number;
  /** Passos até o loop recomeçar. */
  length: number;
  play: (step: number, t: number, dur: number, k: Kit) => void;
}

interface Kit {
  pad: (notes: number[], t: number, dur: number, vol?: number) => void;
  pluck: (note: number, t: number, vol?: number) => void;
  bell: (note: number, t: number, vol?: number) => void;
  bass: (note: number, t: number, dur: number, vol?: number) => void;
  brass: (notes: number[], t: number, dur: number, vol?: number) => void;
  kick: (t: number, vol?: number) => void;
  snare: (t: number, vol?: number) => void;
  hat: (t: number, vol?: number) => void;
}

// Acordes em MIDI (C4 = 60).
const C = [48, 52, 55];
const F = [53, 57, 60];
const Am = [57, 60, 64];
const G = [55, 59, 62];
const Dm = [50, 53, 57];
const E = [52, 56, 59];
const Bb = [46, 50, 53];

const THEMES: Record<Exclude<Mood, "fanfare" | "victory">, Theme> = {
  calm: {
    bpm: 84,
    sub: 2,
    length: 32,
    play(step, t, dur, k) {
      const chord = [C, F, Am, G][Math.floor(step / 8) % 4];
      if (step % 8 === 0) {
        k.pad(chord, t, dur * 8, 0.035);
        k.bass(chord[0] - 12, t, dur * 7, 0.07);
      }
      const arp = [0, 1, 2, 1, 2, 0, 1, 2];
      k.pluck(chord[arp[step % 8]] + 12, t, step % 4 === 0 ? 0.06 : 0.04);
      if (step % 16 === 14) k.bell(chord[2] + 24, t, 0.03);
    },
  },
  mystery: {
    bpm: 66,
    sub: 2,
    length: 32,
    play(step, t, dur, k) {
      const chord = [Am, F, Dm, E][Math.floor(step / 8) % 4];
      if (step % 8 === 0) {
        k.pad(
          chord.map((m) => m - 12),
          t,
          dur * 8,
          0.045,
        );
        k.bass(45 - 12, t, dur * 8, 0.06);
      }
      if (step % 3 === 0) k.bell(chord[((step / 3) % 3) | 0] + 12, t, 0.035);
      if (step % 8 === 6) k.pluck(chord[1] + 24, t, 0.02);
    },
  },
  battle: {
    bpm: 132,
    sub: 4,
    length: 64,
    play(step, t, dur, k) {
      const bar = Math.floor(step / 16) % 4;
      const chord = [Dm, Bb, C, [45, 49, 52]][bar];
      const s = step % 16;
      if (s === 0 || s === 6 || s === 8 || s === 11) k.kick(t, 0.5);
      if (s === 4 || s === 12) k.snare(t, 0.16);
      if (s % 2 === 0) k.hat(t, s % 4 === 0 ? 0.05 : 0.03);
      const riff = [0, 0, 12, 0, 7, 0, 10, 0];
      if (s % 2 === 0) k.bass(chord[0] - 12 + riff[(s / 2) % 8], t, dur * 1.8, 0.075);
      if (s === 0)
        k.brass(
          chord.map((m) => m + 12),
          t,
          dur * 3,
          0.5,
        );
      if (s === 8 && bar % 2 === 1)
        k.brass(
          chord.map((m) => m + 12),
          t,
          dur * 2,
          0.35,
        );
    },
  },
};

/** Toca o tema do clima em loop até `stop()`. A fanfarra toca uma vez. */
export function playScore(mood: Mood): ScoreHandle | null {
  if (mood === "fanfare" || mood === "victory") return playFanfare(true);
  const volume = soundVolume("achievement");
  if (volume <= 0) return null;
  const ac = audioContext();
  if (!ac) return null;
  const theme = THEMES[mood];

  const master = ac.createGain();
  master.gain.setValueAtTime(0.0001, ac.currentTime);
  master.gain.exponentialRampToValueAtTime(0.5 * volume, ac.currentTime + 1.2);
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 4;
  master.connect(comp).connect(ac.destination);

  const noise = (() => {
    const len = ac.sampleRate * 0.4;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  })();

  const env = (g: GainNode, t: number, peak: number, attack: number, release: number) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  };
  const osc = (
    type: OscillatorType,
    f: number,
    t: number,
    end: number,
    out: AudioNode,
    detune = 0,
  ) => {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detune;
    o.connect(out);
    o.start(t);
    o.stop(end);
    return o;
  };

  const kit: Kit = {
    pad(notes, t, dur, vol = 0.04) {
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1400;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.8, dur / 3));
      g.gain.setValueAtTime(vol, t + dur * 0.8);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6);
      lp.connect(g).connect(master);
      for (const m of notes) {
        osc("triangle", hz(m), t, t + dur + 0.7, lp, -5);
        osc("sine", hz(m), t, t + dur + 0.7, lp, 5);
      }
    },
    pluck(note, t, vol = 0.05) {
      const g = ac.createGain();
      env(g, t, vol, 0.008, 0.45);
      g.connect(master);
      osc("triangle", hz(note), t, t + 0.5, g);
    },
    bell(note, t, vol = 0.04) {
      const g = ac.createGain();
      env(g, t, vol, 0.01, 1.6);
      g.connect(master);
      osc("sine", hz(note), t, t + 1.7, g);
      const g2 = ac.createGain();
      env(g2, t, vol * 0.3, 0.01, 0.6);
      g2.connect(master);
      osc("sine", hz(note) * 2.76, t, t + 0.7, g2);
    },
    bass(note, t, dur, vol = 0.07) {
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 420;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.1);
      lp.connect(g).connect(master);
      osc("sawtooth", hz(note), t, t + dur + 0.15, lp);
    },
    brass(notes, t, dur, vol = 0.4) {
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(600, t);
      lp.frequency.linearRampToValueAtTime(2400, t + 0.06);
      lp.frequency.exponentialRampToValueAtTime(1100, t + dur);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09 * vol, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
      lp.connect(g).connect(master);
      for (const m of notes)
        for (const d of [-8, 8]) osc("sawtooth", hz(m), t, t + dur + 0.2, lp, d);
    },
    kick(t, vol = 0.5) {
      const g = ac.createGain();
      env(g, t, vol, 0.005, 0.32);
      g.connect(master);
      const o = osc("sine", 130, t, t + 0.4, g);
      o.frequency.setValueAtTime(130, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    },
    snare(t, vol = 0.15) {
      const src = ac.createBufferSource();
      src.buffer = noise;
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1800;
      const g = ac.createGain();
      env(g, t, vol, 0.004, 0.18);
      src.connect(bp).connect(g).connect(master);
      src.start(t);
      src.stop(t + 0.25);
    },
    hat(t, vol = 0.04) {
      const src = ac.createBufferSource();
      src.buffer = noise;
      const hp = ac.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 7000;
      const g = ac.createGain();
      env(g, t, vol, 0.002, 0.05);
      src.connect(hp).connect(g).connect(master);
      src.start(t);
      src.stop(t + 0.08);
    },
  };

  // Agenda as notas um pouco à frente do relógio (o loop não depende do tempo de cada quadro).
  const stepDur = 60 / theme.bpm / theme.sub;
  let step = 0;
  let next = ac.currentTime + 0.08;
  const tick = () => {
    while (next < ac.currentTime + 0.35) {
      theme.play(step % theme.length, next, stepDur, kit);
      step += 1;
      next += stepDur;
    }
  };
  tick();
  const timer = window.setInterval(tick, 120);

  return {
    stop: () => {
      window.clearInterval(timer);
      const now = ac.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      window.setTimeout(() => master.disconnect(), 800);
    },
  };
}
