// Trilha das cenas de conquista: uma fanfarra heroica de ~7 s (rufar de tímpanos, metais, acordes,
// prato e um brilho final), sintetizada no aparelho com a Web Audio API, como os outros sons do
// site. Segue as escolhas de Sons (conquistas ligadas, volume e horário de silêncio).
import { audioContext, soundVolume } from "@/lib/sounds";

export interface FanfareHandle {
  stop: () => void;
}

const NOTE: Record<string, number> = {
  C2: 65.41,
  F2: 87.31,
  G2: 98.0,
  C3: 130.81,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  G4: 392.0,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  C6: 1046.5,
  E6: 1318.5,
  G6: 1568.0,
  C7: 2093.0,
};

/**
 * Toca a fanfarra. `epic` (subir de nível, fechar capítulo) começa com o rufar de tímpanos;
 * as conquistas menores entram direto no tema. Devolve como parar (ao pular a cena).
 */
export function playFanfare(epic = true): FanfareHandle | null {
  const volume = soundVolume("achievement");
  if (volume <= 0) return null;
  const ac = audioContext();
  if (!ac) return null;

  const master = ac.createGain();
  master.gain.value = 0.55 * volume;
  // Um pouco de compressão para os acordes não estourarem no alto-falante do celular.
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 4;
  master.connect(comp).connect(ac.destination);

  const start = ac.currentTime + 0.06;
  const shift = epic ? 0 : -0.85;
  const at = (t: number) => start + Math.max(0, t + shift);

  const noise = (() => {
    const len = ac.sampleRate * 1.5;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  })();

  const brass = (note: string, t: number, dur: number, vel = 1) => {
    const f = NOTE[note];
    const g = ac.createGain();
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 1.2;
    lp.frequency.setValueAtTime(700, t);
    lp.frequency.linearRampToValueAtTime(2800, t + 0.06);
    lp.frequency.exponentialRampToValueAtTime(1300, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16 * vel, t + 0.035);
    g.gain.setValueAtTime(0.12 * vel, t + Math.max(0.05, dur - 0.08));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.14);
    for (const cents of [-7, 7]) {
      const o = ac.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      o.detune.value = cents;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.2);
    }
    lp.connect(g).connect(master);
  };

  const pad = (notes: string[], t: number, dur: number) => {
    for (const n of notes) {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = "triangle";
      o.frequency.value = NOTE[n];
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.25);
      g.gain.setValueAtTime(0.05, t + dur - 0.1);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.5);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + dur + 0.6);
    }
  };

  const timpani = (note: string, t: number, vel = 1) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(NOTE[note] * 1.6, t);
    o.frequency.exponentialRampToValueAtTime(NOTE[note], t + 0.07);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5 * vel, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 1);
  };

  const cymbal = (t: number, dur = 1.6, vel = 1) => {
    const src = ac.createBufferSource();
    src.buffer = noise;
    const hp = ac.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 5500;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.13 * vel, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(hp).connect(g).connect(master);
    src.start(t);
    src.stop(t + dur);
  };

  const bell = (note: string, t: number) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "sine";
    o.frequency.value = NOTE[note];
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 1);
  };

  // Rufar crescendo (só na versão épica).
  if (epic) for (let i = 0; i < 16; i++) timpani("G2", at(i * 0.06), 0.25 + (i / 16) * 0.6);

  // Abertura: prato, tímpano e acorde.
  cymbal(at(1.0), 1.8);
  timpani("C2", at(1.0), 1);
  for (const n of ["C4", "E4", "G4"]) brass(n, at(1.0), 0.22, 0.6);

  // Tema: tercina, salto de quarta e a nota longa.
  brass("G4", at(1.2), 0.15);
  brass("G4", at(1.38), 0.15);
  brass("G4", at(1.56), 0.15);
  brass("C5", at(1.75), 0.55, 1.1);
  pad(["C3", "E3", "G3"], at(1.75), 1.2);
  brass("G4", at(2.4), 0.22);
  brass("C5", at(2.7), 0.22);
  brass("E5", at(3.0), 0.8, 1.1);
  timpani("F2", at(3.0), 0.8);
  pad(["F3", "A3", "C4"], at(3.0), 0.9);

  // Subida e o acorde final.
  timpani("G2", at(3.9), 0.8);
  pad(["G3", "B3", "D4"], at(3.9), 0.9);
  brass("D5", at(3.9), 0.22);
  brass("E5", at(4.2), 0.22);
  brass("F5", at(4.5), 0.22);
  brass("G5", at(4.8), 1.5, 1.2);
  for (const n of ["C4", "E4", "G4"]) brass(n, at(4.8), 1.5, 0.55);
  timpani("C2", at(4.8), 1);
  cymbal(at(4.8), 2.4, 1.1);
  pad(["C3", "G3", "C4", "E4"], at(4.8), 2.0);

  // Brilho mágico.
  ["C6", "E6", "G6", "C7", "G6", "C7"].forEach((n, i) => bell(n, at(5.3 + i * 0.12)));

  return {
    stop: () => {
      const now = ac.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + 0.35);
      window.setTimeout(() => master.disconnect(), 500);
    },
  };
}
