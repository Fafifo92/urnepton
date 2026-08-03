/* ============================================================
   URNEPTON — motor de audio (WebAudio)
   - Drone ambiental espacial (toggle global)
   - SFX de transición (whoosh al entrar/salir de órbita)
   - Reproductor generativo: cada pista mock del catálogo se
     sintetiza en vivo a partir de {bpm, root, scale, mood, seed},
     así el sitio "suena" sin depender de archivos externos.
   ============================================================ */

import type { TrackDef } from "../data/types";

const SCALES: Record<string, number[]> = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
};

/* PRNG determinista para que cada pista suene igual en cada visita */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

interface PlayerState {
  def: TrackDef;
  bus: GainNode;
  comp: DynamicsCompressorNode;
  sources: AudioScheduledSourceNode[];
  startAt: number;
  duration: number;
  nextStep: number;
  timer: ReturnType<typeof setTimeout> | null;
  onEnd?: () => void;
}

export class AudioEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  ambientBus: GainNode | null = null;
  musicBus: GainNode | null = null;
  sfxBus: GainNode | null = null;
  ambientNodes: any[] = [];
  ambientOn = false;
  player: PlayerState | null = null;
  noiseBuffer: AudioBuffer | null = null;

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);

      this.ambientBus = this.ctx.createGain();
      this.ambientBus.gain.value = 0;
      this.ambientBus.connect(this.master);

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.8;
      this.musicBus.connect(this.master);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.5;
      this.sfxBus.connect(this.master);

      // Ruido blanco reutilizable (hats, whoosh, crackle)
      const len = this.ctx.sampleRate * 2;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  /* ---------- Drone ambiental ---------- */

  startAmbient() {
    this.ensure();
    if (this.ambientOn) return;
    this.ambientOn = true;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 420;
    lp.Q.value = 0.4;

    const delayL = ctx.createDelay(2);
    delayL.delayTime.value = 0.83;
    const delayR = ctx.createDelay(2);
    delayR.delayTime.value = 1.19;
    const fb = ctx.createGain();
    fb.gain.value = 0.35;
    const panL = ctx.createStereoPanner(); panL.pan.value = -0.55;
    const panR = ctx.createStereoPanner(); panR.pan.value = 0.55;

    lp.connect(this.ambientBus);
    lp.connect(delayL); delayL.connect(panL); panL.connect(this.ambientBus);
    lp.connect(delayR); delayR.connect(panR); panR.connect(this.ambientBus);
    delayL.connect(fb); fb.connect(delayR);

    // Acorde abierto grave: A1 + E2 + A2 + C#3, respirando lento
    const notes = [55, 82.4, 110, 138.6];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 ? "triangle" : "sine";
      osc.frequency.value = freq;
      osc.detune.value = (i - 1.5) * 4;

      const g = ctx.createGain();
      g.gain.value = 0.0;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.04 + i * 0.023;
      const lfoAmt = ctx.createGain();
      lfoAmt.gain.value = 0.028;
      lfo.connect(lfoAmt); lfoAmt.connect(g.gain);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.05, t + 4 + i);

      osc.connect(g); g.connect(lp);
      osc.start(t); lfo.start(t);
      this.ambientNodes.push(osc, lfo, g, lp, delayL, delayR, fb);
    });

    this.ambientBus.gain.cancelScheduledValues(t);
    this.ambientBus.gain.setValueAtTime(0.0001, t);
    this.ambientBus.gain.exponentialRampToValueAtTime(1.0, t + 3);
  }

  stopAmbient() {
    if (!this.ambientOn || !this.ctx) return;
    this.ambientOn = false;
    const t = this.ctx.currentTime;
    this.ambientBus.gain.cancelScheduledValues(t);
    this.ambientBus.gain.setValueAtTime(this.ambientBus.gain.value, t);
    this.ambientBus.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    const nodes = this.ambientNodes;
    this.ambientNodes = [];
    setTimeout(() => {
      nodes.forEach((n) => { try { n.stop?.(); } catch {} try { n.disconnect(); } catch {} });
    }, 1800);
  }

  /* Baja el ambiente cuando suena música o un video (ducking) */
  duck(active: boolean) {
    if (!this.ctx || !this.ambientOn) return;
    const t = this.ctx.currentTime;
    this.ambientBus.gain.cancelScheduledValues(t);
    this.ambientBus.gain.setTargetAtTime(active ? 0.15 : 1.0, t, 0.6);
  }

  /* ---------- SFX ---------- */

  whoosh(dir: number = 1) {
    if (!this.ctx || this.ctx.state !== "running") return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    src.connect(bp); bp.connect(g); g.connect(this.sfxBus);
    const f0 = dir > 0 ? 180 : 1600;
    const f1 = dir > 0 ? 1600 : 180;
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(f1, t + 1.1);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    src.start(t); src.stop(t + 1.3);
  }

  tick() {
    if (!this.ctx || this.ctx.state !== "running") return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(700, t + 0.07);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    osc.connect(g); g.connect(this.sfxBus);
    osc.start(t); osc.stop(t + 0.1);
  }

  /* ---------- Reproductor generativo ---------- */

  playTrack(
    def: TrackDef,
    { onProgress, onEnd }: { onProgress?: (p: number) => void; onEnd?: () => void } = {}
  ) {
    this.ensure();
    this.stopTrack();

    const ctx = this.ctx;
    const rand = mulberry32(def.seed ?? 1);
    const scale = SCALES[def.scale] || SCALES.minor;
    const rootMidi = 45 + (def.root ?? 0); // A2 + offset
    const bpm = def.bpm ?? 90;
    const beat = 60 / bpm;
    const step = beat / 4; // semicorcheas
    const bars = 16;
    const duration = bars * 4 * beat;

    const bus = ctx.createGain();
    bus.gain.value = 0.0001;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    bus.connect(comp); comp.connect(this.musicBus);

    const t0 = ctx.currentTime + 0.08;
    bus.gain.setValueAtTime(0.0001, t0);
    bus.gain.exponentialRampToValueAtTime(0.9, t0 + 0.4);

    // Progresión de acordes por grados, 2 compases por acorde
    const degreesPool = [[0, 5, 3, 4], [0, 3, 4, 5], [0, 4, 5, 3], [5, 3, 0, 4]];
    const prog = degreesPool[Math.floor(rand() * degreesPool.length)];

    const mood = def.mood || "warm";
    const isAmbient = mood === "ambient";
    const isDark = mood === "dark";
    const padType = isDark ? "sawtooth" : "sine";
    const arpDensity = isAmbient ? 0.18 : mood === "bright" ? 0.6 : 0.4;
    const hatDensity = isAmbient ? 0 : mood === "bright" ? 0.75 : 0.5;
    const kickOn = !isAmbient;

    const sources: AudioScheduledSourceNode[] = [];
    const state: PlayerState = {
      def, bus, comp, sources,
      startAt: t0, duration,
      nextStep: 0,
      timer: null,
      onEnd,
    };
    this.player = state;

    const chordAt = (bar: number) => {
      const deg = prog[Math.floor(bar / 2) % prog.length];
      return [0, 2, 4].map((k) => {
        const idx = deg + k;
        const oct = Math.floor(idx / scale.length);
        return rootMidi + 12 + scale[idx % scale.length] + oct * 12;
      });
    };

    const note = (
      time: number, freq: number, dur: number, type: OscillatorType,
      vol: number, dest: AudioNode = bus, glideTo: number | null = null
    ) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);
      if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, time + dur);
      const g = ctx.createGain();
      const atk = Math.min(0.02, dur * 0.2);
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(vol, time + atk);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      osc.connect(g); g.connect(dest);
      osc.start(time); osc.stop(time + dur + 0.05);
      sources.push(osc);
    };

    const pad = (time: number, midis: number[], dur: number) => {
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = isDark ? 700 : 1400;
      lp.connect(bus);
      midis.forEach((m, i) => {
        const osc = ctx.createOscillator();
        osc.type = padType;
        osc.frequency.value = midiToFreq(m);
        osc.detune.value = (i - 1) * 6;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, time);
        g.gain.exponentialRampToValueAtTime(isDark ? 0.05 : 0.07, time + dur * 0.3);
        g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
        osc.connect(g); g.connect(lp);
        osc.start(time); osc.stop(time + dur + 0.1);
        sources.push(osc);
      });
    };

    const hat = (time: number, open: boolean) => {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 7000;
      const g = ctx.createGain();
      const dur = open ? 0.18 : 0.05;
      g.gain.setValueAtTime(0.06, time);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      src.connect(hp); hp.connect(g); g.connect(bus);
      src.start(time, rand() * 1.2); src.stop(time + dur + 0.02);
      sources.push(src);
    };

    const kick = (time: number) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(46, time + 0.12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.5, time);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.25);
      osc.connect(g); g.connect(bus);
      osc.start(time); osc.stop(time + 0.3);
      sources.push(osc);
    };

    // Crackle de vinilo para pistas "análogas" / restauradas
    if (def.crackle) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass"; hp.frequency.value = 2500;
      const shaper = ctx.createGain(); shaper.gain.value = 0.02;
      src.connect(hp); hp.connect(shaper); shaper.connect(bus);
      src.start(t0);
      sources.push(src);
    }

    const totalSteps = bars * 16;
    const scheduleStep = (s: number, time: number) => {
      const bar = Math.floor(s / 16);
      const pos = s % 16;
      const chord = chordAt(bar);

      if (pos === 0) pad(time, chord, beat * (isAmbient ? 8.2 : 4.2));

      if (pos % 8 === 0) {
        const bassMidi = chord[0] - 24;
        note(time, midiToFreq(bassMidi), beat * (isAmbient ? 3.6 : 1.6), "triangle", isDark ? 0.22 : 0.18);
      }

      if (kickOn && (pos === 0 || pos === 8 || (mood === "bright" && pos === 10 && rand() < 0.5))) kick(time);
      if (hatDensity > 0 && pos % 2 === 0 && rand() < hatDensity) hat(time, pos % 8 === 6 && rand() < 0.3);

      if (rand() < arpDensity && pos % 2 === 1) {
        const m = chord[Math.floor(rand() * chord.length)] + (rand() < 0.35 ? 12 : 0) + 12;
        note(time, midiToFreq(m), step * 2.6, isAmbient ? "sine" : "square", isAmbient ? 0.05 : 0.04);
      }
    };

    const lookahead = 0.15;
    const tickScheduler = () => {
      if (this.player !== state) return;
      while (state.nextStep < totalSteps) {
        const time = t0 + state.nextStep * step;
        if (time > ctx.currentTime + lookahead) break;
        scheduleStep(state.nextStep, time);
        state.nextStep++;
      }
      const elapsed = ctx.currentTime - t0;
      if (onProgress) onProgress(Math.min(1, Math.max(0, elapsed / duration)));
      if (elapsed >= duration) {
        this.stopTrack();
        if (onEnd) onEnd();
        return;
      }
      state.timer = setTimeout(tickScheduler, 40);
    };
    tickScheduler();
    this.duck(true);
    return state;
  }

  stopTrack() {
    const p = this.player;
    if (!p) return;
    this.player = null;
    clearTimeout(p.timer);
    const t = this.ctx.currentTime;
    try {
      p.bus.gain.cancelScheduledValues(t);
      p.bus.gain.setValueAtTime(Math.max(p.bus.gain.value, 0.0001), t);
      p.bus.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    } catch {}
    setTimeout(() => {
      p.sources.forEach((s) => { try { s.stop(); } catch {} try { s.disconnect(); } catch {} });
      try { p.bus.disconnect(); } catch {}
      try { p.comp.disconnect(); } catch {}
    }, 450);
    this.duck(false);
  }

  get isPlayingTrack() {
    return !!this.player;
  }
}

export const audio = new AudioEngine();
