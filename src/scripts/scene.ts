/* ============================================================
   URNEPTON — escena 3D (Three.js)
   Sistema espacial: núcleo, dos planetas con lunas-servicio,
   cámara cinematográfica atada al scroll y modo órbita.
   Todo procedural: cero texturas externas.
   ============================================================ */

import * as THREE from "three";
import gsap from "gsap";
import type { Planet, PlanetId, MoonDef, PlanetTheme } from "../data/types";

const IS_COARSE = matchMedia("(pointer: coarse)").matches;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

export type PickTarget =
  | { type: "planet"; id: PlanetId }
  | { type: "moon"; id: string; planetId: PlanetId };

interface MoonHandle {
  id: string;
  def: MoonDef;
  pivot: THREE.Group;
  body: THREE.Mesh<THREE.BufferGeometry, any>;
  orbitLine: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  sats: THREE.Mesh[];
  orbitR: number;
  angle: number;
  baseEmissive: number;
}

interface PlanetHandle {
  id: PlanetId;
  def: Planet;
  group: THREE.Group;
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  atmo: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  ring: THREE.Mesh | null;
  moons: MoonHandle[];
  radius: number;
  position: THREE.Vector3;
}

type Mode = "travel" | "transition" | "orbit" | "moon";

/* ---------- texturas procedurales ---------- */

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")!];
}

function softDotTexture(inner = "rgba(255,255,255,1)", outer = "rgba(255,255,255,0)") {
  const [c, ctx] = makeCanvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, inner);
  g.addColorStop(0.35, inner.replace(/,1\)$/, ",0.6)"));
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function glowTexture(hex: string, size = 256) {
  const [c, ctx] = makeCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, hex + "ff");
  g.addColorStop(0.25, hex + "66");
  g.addColorStop(0.6, hex + "1a");
  g.addColorStop(1, hex + "00");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function nebulaTexture(hex: string) {
  const size = 256;
  const [c, ctx] = makeCanvas(size, size);
  for (let i = 0; i < 26; i++) {
    const x = size / 2 + (Math.random() - 0.5) * size * 0.55;
    const y = size / 2 + (Math.random() - 0.5) * size * 0.55;
    const r = 24 + Math.random() * 78;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hex + "30");
    g.addColorStop(1, hex + "00");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- ruido 3D (value noise) para superficies planetarias ---------- */
function makeNoise3(seed: number) {
  const P = 61; // periodo de la retícula
  const vals = new Float32Array(P * P * P);
  let s = (seed >>> 0) || 1;
  for (let i = 0; i < vals.length; i++) {
    s = (s * 16807) % 2147483647;
    vals[i] = s / 2147483647;
  }
  const at = (x: number, y: number, z: number) =>
    vals[(((x % P) + P) % P) + (((y % P) + P) % P) * P + (((z % P) + P) % P) * P * P];
  return (x: number, y: number, z: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    let xf = x - xi, yf = y - yi, zf = z - zi;
    xf = xf * xf * (3 - 2 * xf);
    yf = yf * yf * (3 - 2 * yf);
    zf = zf * zf * (3 - 2 * zf);
    const c000 = at(xi, yi, zi), c100 = at(xi + 1, yi, zi);
    const c010 = at(xi, yi + 1, zi), c110 = at(xi + 1, yi + 1, zi);
    const c001 = at(xi, yi, zi + 1), c101 = at(xi + 1, yi, zi + 1);
    const c011 = at(xi, yi + 1, zi + 1), c111 = at(xi + 1, yi + 1, zi + 1);
    const x00 = c000 + (c100 - c000) * xf;
    const x10 = c010 + (c110 - c010) * xf;
    const x01 = c001 + (c101 - c001) * xf;
    const x11 = c011 + (c111 - c011) * xf;
    const y0 = x00 + (x10 - x00) * yf;
    const y1 = x01 + (x11 - x01) * yf;
    return y0 + (y1 - y0) * zf;
  };
}

type Noise3 = (x: number, y: number, z: number) => number;

function fbm3(n: Noise3, x: number, y: number, z: number, oct: number) {
  let a = 0, amp = 0.5, f = 1;
  for (let o = 0; o < oct; o++) {
    a += amp * n(x * f, y * f, z * f);
    amp *= 0.5;
    f *= 2.03;
  }
  return a;
}

/* Textura de planeta: gigante gaseoso con bandas fluidas (fBM + domain warp).
   Se muestrea sobre un cilindro (cos/sen) para que no haya costura horizontal. */
function planetTexture(theme: PlanetTheme, kind: "hot" | "cold") {
  const W = IS_COARSE ? 768 : 1024;
  const H = W / 2;
  const [c, ctx] = makeCanvas(W, H);
  const img = ctx.createImageData(W, H);
  const d = img.data;
  const noise = makeNoise3(kind === "hot" ? 421 : 887);

  // Paleta expandida a 12 franjas con variación determinista
  const hex = (h: string): number[] => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };
  const cols = theme.bands.map(hex);
  const base = hex(theme.base), dark = hex(theme.dark);
  const NS = 12;
  const stops: number[][] = [];
  let s = kind === "hot" ? 3 : 11;
  const rr = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < NS; i++) {
    const src = cols[Math.floor(rr() * cols.length)];
    const mixTo = i % 2 ? base : dark;
    const k = rr() * 0.45;
    stops.push([
      src[0] + (mixTo[0] - src[0]) * k,
      src[1] + (mixTo[1] - src[1]) * k,
      src[2] + (mixTo[2] - src[2]) * k,
    ]);
  }
  const out = [0, 0, 0];
  const sample = (t: number) => {
    t = Math.min(0.9999, Math.max(0, t));
    const f = t * (NS - 1);
    const i = Math.floor(f);
    let fr = f - i;
    fr = fr * fr * (3 - 2 * fr);
    const a = stops[i], b = stops[i + 1];
    out[0] = a[0] + (b[0] - a[0]) * fr;
    out[1] = a[1] + (b[1] - a[1]) * fr;
    out[2] = a[2] + (b[2] - a[2]) * fr;
    return out;
  };

  // Tormentas ovaladas (gran mancha cálida / mancha oscura fría)
  const spots = kind === "hot"
    ? [
        { th: 1.3, v: 0.63, rth: 0.55, rv: 0.085, c: [1.0, 0.86, 0.64], strength: 0.85 },
        { th: 4.4, v: 0.34, rth: 0.32, rv: 0.055, c: [0.28, 0.1, 0.04], strength: 0.6 },
      ]
    : [
        { th: 2.2, v: 0.42, rth: 0.5, rv: 0.09, c: [0.02, 0.05, 0.2], strength: 0.8 },
        { th: 2.75, v: 0.55, rth: 0.16, rv: 0.04, c: [0.85, 0.95, 1.0], strength: 0.7 },
      ];

  const warpAmt = kind === "hot" ? 0.16 : 0.11;
  let idx = 0;
  for (let y = 0; y < H; y++) {
    const v = y / H;
    const polar = Math.sin(v * Math.PI);
    const capK = 0.42 + 0.62 * Math.pow(polar, 0.65);
    for (let x = 0; x < W; x++) {
      const th = (x / W) * Math.PI * 2;
      const cx = Math.cos(th), cz = Math.sin(th);

      // Bandas deformadas por el flujo (domain warp en dos escalas)
      const w1 = fbm3(noise, cx * 1.6 + 9, v * 3.2, cz * 1.6 + 9, 4) - 0.5;
      const w2 = fbm3(noise, cx * 3.4 + 31, v * 7.5 + 13, cz * 3.4 + 31, 3) - 0.5;
      const t = v + w1 * warpAmt + w2 * 0.05;
      const col = sample(t);
      let r = col[0], g = col[1], b = col[2];

      // Turbulencia fina (nubes)
      const det = fbm3(noise, cx * 5.2 + 57, v * 15 + 3, cz * 5.2 + 57, 3);
      const shade = 0.8 + det * 0.4;
      r *= shade; g *= shade; b *= shade;

      // NÉPTORA: estrías finas y frías a lo largo de las bandas
      if (kind !== "hot") {
        const streak = Math.sin((t * 46 + w2 * 5) * Math.PI) * 0.5 + 0.5;
        const k = 1 + streak * streak * 0.09;
        r *= k * 0.99; g *= k * 1.015; b *= k * 1.05;
      }

      // Tormentas
      for (let si = 0; si < spots.length; si++) {
        const sp = spots[si];
        let dth = Math.abs(th - sp.th);
        if (dth > Math.PI) dth = Math.PI * 2 - dth;
        const a2 = dth / sp.rth, b2 = (v - sp.v) / sp.rv;
        const dist = a2 * a2 + b2 * b2;
        if (dist < 1) {
          const m = (1 - dist) * (1 - dist) * sp.strength;
          const swirl = 0.82 + 0.34 * Math.sin(dist * 9 + w1 * 12);
          r += (sp.c[0] * swirl - r) * m;
          g += (sp.c[1] * swirl - g) * m;
          b += (sp.c[2] * swirl - b) * m;
        }
      }

      // Oscurecer polos
      r *= capK; g *= capK; b *= capK;

      d[idx++] = Math.min(255, r * 255);
      d[idx++] = Math.min(255, g * 255);
      d[idx++] = Math.min(255, b * 255);
      d[idx++] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* Textura de luna según su "kind" */
function moonTexture(kind: string, colorA: string, colorB: string, seed = 1) {
  const W = 256, H = 128;
  const [c, ctx] = makeCanvas(W, H);
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };

  const base = (a: string, b: string, vertical = true) => {
    const g = vertical
      ? ctx.createLinearGradient(0, 0, 0, H)
      : ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  const speckle = (col: string, n: number, rMax = 2.4) => {
    ctx.fillStyle = col;
    for (let i = 0; i < n; i++) {
      ctx.globalAlpha = 0.1 + rnd() * 0.3;
      ctx.beginPath();
      ctx.arc(rnd() * W, rnd() * H, 0.5 + rnd() * rMax, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  const craters = (n: number, col = "rgba(0,0,0,0.35)", hi = "rgba(255,255,255,0.12)") => {
    for (let i = 0; i < n; i++) {
      const x = rnd() * W, y = rnd() * H, r = 2 + rnd() * 9;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = hi;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y - 0.8, r, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    }
  };
  const veins = (col: string, n: number, wMax = 2) => {
    ctx.strokeStyle = col;
    for (let i = 0; i < n; i++) {
      ctx.globalAlpha = 0.4 + rnd() * 0.5;
      ctx.lineWidth = 0.6 + rnd() * wMax;
      ctx.beginPath();
      let x = rnd() * W, y = rnd() * H;
      ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += (rnd() - 0.5) * 60; y += (rnd() - 0.5) * 40;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };
  const lines = (col: string, n: number) => {
    ctx.strokeStyle = col;
    for (let i = 0; i < n; i++) {
      const y = (i / n) * H + rnd() * 3;
      ctx.globalAlpha = 0.12 + rnd() * 0.25;
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  switch (kind) {
    case "ink":
      base(colorA, "#0c1440");
      speckle("#26379e", 60, 4);
      veins(colorB, 8, 1.4);
      speckle(colorB, 24, 1);
      break;
    case "pulse":
      base("#191021", colorA);
      craters(12, "rgba(0,0,0,0.5)");
      veins(colorB, 5, 1.2);
      speckle(colorB, 30, 1.6);
      break;
    case "vinyl":
      base(colorA, colorB);
      lines("#000000", 34);
      lines("#ffffff", 18);
      speckle("rgba(255,255,255,0.5)", 14, 1);
      break;
    case "pearl":
      base(colorA, colorB);
      speckle("#ffffff", 50, 2);
      speckle(colorB, 26, 3);
      break;
    case "ringed":
      base(colorA, colorB);
      speckle("#ffffff", 26, 1.6);
      craters(6);
      break;
    case "duotone": {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, colorA);
      g.addColorStop(0.44, colorA);
      g.addColorStop(0.56, colorB);
      g.addColorStop(1, colorB);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      speckle("rgba(255,255,255,0.4)", 30, 1.4);
      break;
    }
    case "chrome":
      base("#c8d4ee", colorB);
      lines("rgba(255,255,255,0.55)", 14);
      lines("rgba(20,30,60,0.5)", 8);
      speckle("#ffffff", 16, 1.2);
      break;
    case "jade":
      base(colorA, colorB);
      speckle("#7ee8b1", 40, 2.6);
      veins("rgba(6,40,26,0.6)", 6, 2);
      break;
    case "storm":
      base(colorB, colorA);
      for (let i = 0; i < 8; i++) {
        const x = rnd() * W, y = rnd() * H, r = 8 + rnd() * 22;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, "rgba(230,210,255,0.5)");
        g.addColorStop(1, "rgba(230,210,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(x, y, r * 1.9, r * 0.8, rnd() - 0.5, 0, Math.PI * 2); ctx.fill();
      }
      veins("#e9d8ff", 4, 1);
      break;
    case "neon":
      base("#0a2e30", colorA);
      craters(8, "rgba(0,0,0,0.4)");
      veins(colorB, 7, 1.6);
      break;
    case "ice":
      base("#eaf6ff", colorA);
      veins("rgba(255,255,255,0.9)", 9, 1.2);
      veins(colorB, 6, 1);
      speckle("#ffffff", 30, 1.4);
      break;
    case "asteroid":
      base(colorA, colorB);
      craters(22, "rgba(0,0,0,0.45)");
      speckle("rgba(0,0,0,0.5)", 60, 2);
      break;
    case "terracotta":
      base(colorA, colorB);
      speckle("rgba(255,220,180,0.5)", 36, 2);
      speckle("rgba(60,20,5,0.4)", 24, 2);
      break;
    default:
      base(colorA, colorB);
      speckle("#ffffff", 30, 2);
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function ringTexture(hex: string) {
  const W = 256, H = 16;
  const [c, ctx] = makeCanvas(W, H);
  for (let x = 0; x < W; x++) {
    const t = x / W;
    const band = Math.sin(t * 40) * 0.5 + 0.5;
    const fade = Math.sin(t * Math.PI);
    const a = Math.floor((0.15 + band * 0.5) * fade * 255);
    ctx.fillStyle = hex + a.toString(16).padStart(2, "0");
    ctx.fillRect(x, 0, 1, H);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* Shader de atmósfera (halo fresnel) */
function atmosphereMaterial(hexColor: string) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(hexColor) },
      uIntensity: { value: 1.0 },
    },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec3 vNormal;
      void main() {
        float glow = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.4) * uIntensity;
        gl_FragColor = vec4(uColor * glow, glow);
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}

/* ============================================================ */

export class Cosmos {
  canvas: HTMLCanvasElement;
  data: Record<PlanetId, Planet>;
  mode: Mode;
  progress: number;
  targetProgress: number;
  anchors: { p: number; pos: THREE.Vector3; look: THREE.Vector3 }[];
  pointer: THREE.Vector2;
  pointerDirty: boolean;
  parallax: THREE.Vector2;
  hovered: PickTarget | null;
  activePlanet: PlanetId | null;
  activeMoon: string | null;
  interactive: boolean;
  onHoverChange: ((pick: PickTarget | null) => void) | null;
  elapsed: number;
  orbitAngle = 0;

  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  camState: { px: number; py: number; pz: number; lx: number; ly: number; lz: number };
  raycaster: THREE.Raycaster;
  planets: Record<string, PlanetHandle>;

  sunLight!: THREE.PointLight;
  camLight!: THREE.PointLight;
  starLayers!: THREE.Points[];
  nebulae!: THREE.Sprite[];
  core!: THREE.Group;
  coreGlow!: THREE.Sprite;
  recLight!: THREE.Sprite;

  /* Formación de presentación de las lunas */
  formBlend: number;
  formTarget: number;
  formSpin: number;
  private _formDir: THREE.Vector3;
  private _formRight: THREE.Vector3;
  private _formUp: THREE.Vector3;
  private _formWorld: THREE.Vector3;
  private _orbWorld: THREE.Vector3;
  private _nomCam: THREE.Vector3;
  private _shiftTarget: number;
  private _shiftCur: number;
  private _tmpV!: THREE.Vector3;
  private _tmpV2!: THREE.Vector3;

  constructor(canvas: HTMLCanvasElement, planetsData: Record<PlanetId, Planet>) {
    this.canvas = canvas;
    this.data = planetsData;
    this.mode = "travel"; // travel | transition | orbit | moon
    this.progress = 0;
    this.targetProgress = 0;
    this.anchors = [];
    this.pointer = new THREE.Vector2(-10, -10);
    this.pointerDirty = false;
    this.parallax = new THREE.Vector2();
    this.hovered = null;
    this.activePlanet = null;
    this.activeMoon = null;
    this.interactive = false;
    this.onHoverChange = null;
    this.elapsed = 0;

    const dpr = Math.min(window.devicePixelRatio || 1, IS_COARSE ? 1.5 : 2);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: dpr < 2,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setClearColor(0x05060f, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      Cosmos.fovFor(innerWidth / innerHeight), innerWidth / innerHeight, 0.5, 900
    );
    this._shiftTarget = 0; // corrimiento horizontal (px) cuando hay panel abierto
    this._shiftCur = 0;
    this.camState = {
      px: 0, py: 4, pz: 84,
      lx: 0, ly: 0, lz: 0,
    };
    this.raycaster = new THREE.Raycaster();

    // Formación de presentación: en órbita las lunas se despliegan en un
    // anillo frente a la cámara para que ninguna se tape ni salga de cuadro
    this.formBlend = 0;
    this.formTarget = 0;
    this.formSpin = 0;
    this._formDir = new THREE.Vector3(0, 0, 1);
    this._formRight = new THREE.Vector3(1, 0, 0);
    this._formUp = new THREE.Vector3(0, 1, 0);
    this._formWorld = new THREE.Vector3();
    this._orbWorld = new THREE.Vector3();
    this._nomCam = new THREE.Vector3();

    this.planets = {};
    this._buildLights();
    this._buildStars();
    this._buildNebula();
    this._buildCore();
    this._buildPlanet("production", new THREE.Vector3(-24, -2, -10), 3.0);
    this._buildPlanet("post", new THREE.Vector3(26, 3, -26), 3.4);

    this._tmpV = new THREE.Vector3();
    this._tmpV2 = new THREE.Vector3();

    addEventListener("resize", () => this._resize());
  }

  /* ---------- construcción ---------- */

  _buildLights() {
    this.scene.add(new THREE.AmbientLight(0x2b3768, 1.15));
    this.sunLight = new THREE.PointLight(0xcfe8ff, 2600, 0, 1.9);
    this.sunLight.position.set(0, 0, 0);
    this.scene.add(this.sunLight);
    // Relleno suave direccional para que las caras oscuras no mueran
    const fill = new THREE.DirectionalLight(0x334477, 0.6);
    fill.position.set(0.5, 1, 0.8);
    this.scene.add(fill);
    // "Linterna" que sigue a la cámara: mantiene legible el lado nocturno
    this.camLight = new THREE.PointLight(0xbfd4ff, 0, 0, 2.0);
    this.scene.add(this.camLight);
  }

  _buildStars() {
    const dot = softDotTexture();
    this.starLayers = [];
    const layers = IS_COARSE
      ? [[2200, 190, 1.6], [1400, 260, 1.1]]
      : [[4200, 180, 1.7], [2600, 250, 1.2], [1600, 330, 0.9]];
    const palette = [
      new THREE.Color("#ffffff"), new THREE.Color("#bcd6ff"),
      new THREE.Color("#ffe0c2"), new THREE.Color("#c9a2ff"),
    ];
    for (const [count, radius, size] of layers) {
      const pos = new Float32Array(count * 3);
      const col = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const v = new THREE.Vector3().randomDirection().multiplyScalar(radius * (0.75 + Math.random() * 0.45));
        pos.set([v.x, v.y, v.z], i * 3);
        const c = palette[Math.floor(Math.random() * palette.length)];
        const dim = 0.55 + Math.random() * 0.45;
        col.set([c.r * dim, c.g * dim, c.b * dim], i * 3);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const mat = new THREE.PointsMaterial({
        size, map: dot, vertexColors: true, transparent: true,
        depthWrite: false, blending: THREE.AdditiveBlending,
        sizeAttenuation: true, opacity: 0.9,
      });
      const pts = new THREE.Points(geo, mat);
      pts.frustumCulled = false;
      this.scene.add(pts);
      this.starLayers.push(pts);
    }
  }

  _buildNebula() {
    this.nebulae = [];
    const defs: [string, [number, number, number], number][] = [
      ["#5b2fa8", [-60, 18, -120], 150],
      ["#14486e", [70, -12, -140], 170],
      ["#7a2d55", [-30, -26, -90], 110],
      ["#1d2f7a", [30, 30, -110], 130],
      ["#3b1f66", [0, -8, -160], 200],
      ["#0e5f66", [90, 20, -100], 100],
    ];
    for (const [hex, [x, y, z], scale] of defs) {
      const mat = new THREE.SpriteMaterial({
        map: nebulaTexture(hex),
        transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0.55,
      });
      const s = new THREE.Sprite(mat);
      s.position.set(x, y, z);
      s.scale.setScalar(scale);
      s.userData.baseScale = scale;
      s.userData.phase = Math.random() * Math.PI * 2;
      this.scene.add(s);
      this.nebulae.push(s);
    }
  }

  _buildCore() {
    this.core = new THREE.Group();

    const geo = new THREE.SphereGeometry(1.15, 48, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0xeaf6ff });
    this.core.add(new THREE.Mesh(geo, mat));

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture("#7de0ff"), transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: 0.95,
    }));
    glow.scale.setScalar(16);
    this.core.add(glow);
    this.coreGlow = glow;

    // Luz REC: la estrella roja que late como metrónomo
    const rec = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture("#ff3b3b"), transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: 0.9,
    }));
    rec.position.set(2.4, 1.4, 0.6);
    rec.scale.setScalar(1.6);
    this.core.add(rec);
    this.recLight = rec;

    // Anillo de "surco de vinilo" alrededor del núcleo
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x9aa3c7, transparent: true, opacity: 0.14 });
    for (const r of [26.2, 37.1]) {
      const pts = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      }
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), orbitMat);
      line.position.y = -1;
      this.core.add(line);
    }

    this.scene.add(this.core);
  }

  _buildPlanet(id: PlanetId, position: THREE.Vector3, radius: number) {
    const def = this.data[id];
    const group = new THREE.Group();
    group.position.copy(position);

    const geo = new THREE.SphereGeometry(1, 64, 48);
    const mat = new THREE.MeshStandardMaterial({
      map: planetTexture(def.theme, id === "production" ? "hot" : "cold"),
      roughness: 0.92,
      metalness: 0.05,
      emissive: new THREE.Color(def.theme.glow),
      emissiveIntensity: id === "production" ? 0.14 : 0.08,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.setScalar(radius);
    mesh.userData = { pick: { type: "planet", id } };
    group.add(mesh);

    const atmo = new THREE.Mesh(geo, atmosphereMaterial(def.theme.glow));
    atmo.scale.setScalar(radius * 1.22);
    group.add(atmo);

    let ring = null;
    if (def.hasRing) {
      const rGeo = new THREE.RingGeometry(radius * 1.45, radius * 2.3, 128, 1);
      // Re-mapear UVs para que la textura sea radial
      const uv = rGeo.attributes.uv;
      const pos = rGeo.attributes.position;
      const v = new THREE.Vector3();
      for (let i = 0; i < uv.count; i++) {
        v.fromBufferAttribute(pos, i);
        const d = (v.length() - radius * 1.45) / (radius * 2.3 - radius * 1.45);
        uv.setXY(i, d, 0.5);
      }
      const rMat = new THREE.MeshBasicMaterial({
        map: ringTexture(def.ringColor || "#ffffff"),
        transparent: true, side: THREE.DoubleSide, depthWrite: false,
      });
      ring = new THREE.Mesh(rGeo, rMat);
      ring.rotation.x = -1.15;
      ring.rotation.y = 0.2;
      group.add(ring);
    }

    // Lunas
    const moons: MoonHandle[] = [];
    const moonGeo = new THREE.SphereGeometry(1, 32, 24);
    def.services.forEach((svc, i) => {
      const m = svc.moon;
      // Comprimir el rango de órbitas para que ninguna luna se aleje de cuadro
      const orbitR = 4.4 + (m.orbit - 5.2) * 0.42;
      const pivot = new THREE.Group();
      pivot.rotation.x = m.tilt;
      pivot.rotation.z = m.tilt * 0.6;
      group.add(pivot);

      let bodyGeo: THREE.BufferGeometry = moonGeo;
      let flat = false;
      if (m.kind === "asteroid") {
        bodyGeo = new THREE.IcosahedronGeometry(1, 2);
        const p = bodyGeo.attributes.position;
        let s = 7 + i;
        const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        const vv = new THREE.Vector3();
        for (let k = 0; k < p.count; k++) {
          vv.fromBufferAttribute(p, k);
          vv.multiplyScalar(0.8 + rnd() * 0.45);
          p.setXYZ(k, vv.x, vv.y, vv.z);
        }
        bodyGeo.computeVertexNormals();
        flat = true;
      }

      const isChrome = m.kind === "chrome";
      const bodyMat = isChrome
        ? new THREE.MeshPhongMaterial({
            map: moonTexture(m.kind, m.colorA, m.colorB, 13 + i),
            shininess: 200, specular: new THREE.Color("#dfeaff"),
            emissive: new THREE.Color("#26324d"), emissiveIntensity: 0.12,
          })
        : new THREE.MeshStandardMaterial({
            map: moonTexture(m.kind, m.colorA, m.colorB, 13 + i),
            roughness: m.kind === "pearl" ? 0.55 : m.kind === "ice" ? 0.35 : 0.85,
            metalness: m.kind === "pearl" ? 0.1 : 0.05,
            flatShading: flat,
            emissive: new THREE.Color(m.colorB),
            emissiveIntensity: ["pulse", "neon", "storm", "jade"].includes(m.kind) ? 0.3 : 0.02,
          });

      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.scale.setScalar(m.size);
      body.userData = { pick: { type: "moon", id: svc.id, planetId: id } };

      // Proxy de hit invisible más grande, para que el click no exija precisión
      const proxy = new THREE.Mesh(
        moonGeo,
        new THREE.MeshBasicMaterial({ visible: false })
      );
      proxy.scale.setScalar(Math.max(1.6, m.size * 2.0) / m.size);
      proxy.userData = body.userData;
      body.add(proxy);

      // Halo opcional
      if (m.halo) {
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({
          map: glowTexture(m.colorA), transparent: true, depthWrite: false,
          blending: THREE.AdditiveBlending, opacity: 0.32,
        }));
        halo.scale.setScalar(m.size * 4 / m.size);
        body.add(halo);
      }

      // Anillo propio de la luna
      if (m.kind === "ringed") {
        const rg = new THREE.RingGeometry(1.5, 2.4, 64);
        const uv = rg.attributes.uv, pp = rg.attributes.position;
        const v = new THREE.Vector3();
        for (let k = 0; k < uv.count; k++) {
          v.fromBufferAttribute(pp, k);
          uv.setXY(k, (v.length() - 1.5) / 0.9, 0.5);
        }
        const rm = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({
          map: ringTexture(m.ringColor || "#ffffff"),
          transparent: true, side: THREE.DoubleSide, depthWrite: false,
        }));
        rm.rotation.x = -1.2;
        body.add(rm);
      }

      // Mini satélites (desarrollo de artistas)
      const sats: THREE.Mesh[] = [];
      if (m.satellites) {
        for (let k = 0; k < m.satellites; k++) {
          const sat = new THREE.Mesh(moonGeo, new THREE.MeshStandardMaterial({
            color: 0xcfe8d8, roughness: 0.8,
          }));
          sat.scale.setScalar(0.16);
          body.add(sat);
          sats.push(sat);
        }
      }

      pivot.add(body);

      // Línea de órbita
      const pts = [];
      for (let k = 0; k <= 96; k++) {
        const a = (k / 96) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * orbitR, 0, Math.sin(a) * orbitR));
      }
      const oLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({
          color: new THREE.Color(def.accent), transparent: true, opacity: 0.10,
        })
      );
      pivot.add(oLine);

      moons.push({
        id: svc.id, def: m, pivot, body, orbitLine: oLine, sats, orbitR,
        angle: (i / def.services.length) * Math.PI * 2,
        baseEmissive: bodyMat.emissiveIntensity ?? 0,
      });
    });

    this.scene.add(group);
    this.planets[id] = { id, def, group, mesh, atmo, ring, moons, radius, position } as PlanetHandle;
  }

  /* Campo de visión según proporción: ventanas angostas ven más ancho */
  static fovFor(aspect: number) {
    if (aspect < 0.8) return 74;
    if (aspect < 1.2) return 66;
    if (aspect < 1.6) return 60;
    return 55;
  }

  /* Corrimiento del encuadre (px) para dejar sitio a un panel lateral */
  setPanelShift(px: number) {
    this._shiftTarget = px;
  }

  /* ---------- track de cámara ---------- */

  /* poses nombradas del viaje */
  static POSES: Record<string, { p: [number, number, number]; l: [number, number, number] }> = {
    hero:    { p: [0, 5, 86],      l: [0, 0, -10] },
    beat0:   { p: [7, 3, 60],      l: [0, 0, -6] },
    beat1:   { p: [3, 1.5, 24],    l: [0, 0.5, 0] },
    beat2:   { p: [-13.5, 0.5, 3], l: [-24, -2, -10] },
    beat3:   { p: [14, 4.5, -8],   l: [26, 3, -26] },
    choose:  { p: [1, 8.5, 35],    l: [1, 4.6, -18] },
    catalog: { p: [0, 30, 38],     l: [0, 0, -18] },
    manifest:{ p: [-8, 34, 46],    l: [0, 4, -20] },
    contact: { p: [0, 16, 60],     l: [0, 1, -14] },
  };

  setTrack(anchors: { p: number; pose: string }[]) {
    // anchors: [{p: 0..1, pose: 'hero'}, ...] ordenados
    this.anchors = anchors.map((a) => ({
      p: a.p,
      pos: new THREE.Vector3(...Cosmos.POSES[a.pose].p),
      look: new THREE.Vector3(...Cosmos.POSES[a.pose].l),
    }));
  }

  setProgress(p: number) {
    this.targetProgress = clamp01(p);
  }

  _trackPose(p: number, outPos: THREE.Vector3, outLook: THREE.Vector3) {
    const a = this.anchors;
    if (!a.length) return;
    if (p <= a[0].p) { outPos.copy(a[0].pos); outLook.copy(a[0].look); return; }
    if (p >= a[a.length - 1].p) {
      outPos.copy(a[a.length - 1].pos); outLook.copy(a[a.length - 1].look); return;
    }
    for (let i = 0; i < a.length - 1; i++) {
      if (p >= a[i].p && p <= a[i + 1].p) {
        const t = smooth((p - a[i].p) / (a[i + 1].p - a[i].p));
        outPos.lerpVectors(a[i].pos, a[i + 1].pos, t);
        outLook.lerpVectors(a[i].look, a[i + 1].look, t);
        return;
      }
    }
  }

  /* ---------- interacción ---------- */

  setPointer(clientX: number, clientY: number) {
    this.pointer.set(
      (clientX / innerWidth) * 2 - 1,
      -(clientY / innerHeight) * 2 + 1
    );
    this.parallax.set(this.pointer.x, this.pointer.y);
    this.pointerDirty = true;
  }

  _pickables() {
    if (this.mode === "orbit" || this.mode === "moon") {
      const pl = this.planets[this.activePlanet];
      return pl ? pl.moons.map((m) => m.body) : [];
    }
    if (this.interactive) {
      return [this.planets.production.mesh, this.planets.post.mesh];
    }
    return [];
  }

  _raycast() {
    const list = this._pickables();
    if (!list.length) {
      if (this.hovered) { this._setHover(null); }
      return;
    }
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(list, true);
    let pick: PickTarget | null = null;
    for (const h of hits) {
      const p = h.object.userData?.pick || h.object.parent?.userData?.pick;
      if (p) { pick = p; break; }
    }
    const same = pick && this.hovered &&
      pick.type === this.hovered.type && pick.id === this.hovered.id;
    if (!same) this._setHover(pick);
  }

  _setHover(pick: PickTarget | null) {
    // Restaurar el anterior
    if (this.hovered) {
      if (this.hovered.type === "planet") {
        const pl = this.planets[this.hovered.id];
        gsap.to(pl.mesh.scale, { x: pl.radius, y: pl.radius, z: pl.radius, duration: 0.6, ease: "power2.out", overwrite: "auto" });
        gsap.to(pl.atmo.material.uniforms.uIntensity, { value: 1.0, duration: 0.6, overwrite: "auto" });
      } else {
        const moon = this._findMoon(this.hovered.id);
        if (moon) {
          const s = moon.def.size;
          gsap.to(moon.body.scale, { x: s, y: s, z: s, duration: 0.5, ease: "power2.out", overwrite: "auto" });
        }
      }
    }
    this.hovered = pick;
    if (pick) {
      if (pick.type === "planet") {
        const pl = this.planets[pick.id];
        const s = pl.radius * 1.05;
        gsap.to(pl.mesh.scale, { x: s, y: s, z: s, duration: 0.6, ease: "power2.out", overwrite: "auto" });
        gsap.to(pl.atmo.material.uniforms.uIntensity, { value: 1.9, duration: 0.6, overwrite: "auto" });
      } else {
        const moon = this._findMoon(pick.id);
        if (moon && this.activeMoon !== pick.id) {
          const s = moon.def.size * 1.3;
          gsap.to(moon.body.scale, { x: s, y: s, z: s, duration: 0.5, ease: "back.out(2)", overwrite: "auto" });
        }
      }
    }
    if (this.onHoverChange) this.onHoverChange(pick);
  }

  _findMoon(id: string | null): MoonHandle | null {
    const pl = this.activePlanet ? this.planets[this.activePlanet] : null;
    return pl ? pl.moons.find((m) => m.id === id) ?? null : null;
  }

  pickAtPointer() {
    this._raycast();
    return this.hovered;
  }

  /* ---------- transiciones de modo ---------- */

  enterOrbit(planetId: PlanetId, onDone?: () => void) {
    const pl = this.planets[planetId];
    if (!pl) return;
    this.activePlanet = planetId;
    this.mode = "transition";
    this.formTarget = 1;
    this._setHover(null);
    this.orbitAngle = Math.PI * 0.3;

    const r = pl.radius * 4.6;
    const target = {
      px: pl.position.x + Math.cos(this.orbitAngle) * r,
      py: pl.position.y + pl.radius * 1.3,
      pz: pl.position.z + Math.sin(this.orbitAngle) * r,
      lx: pl.position.x, ly: pl.position.y, lz: pl.position.z,
    };
    gsap.to(this.camState, {
      ...target,
      duration: 2.0,
      ease: "power3.inOut",
      overwrite: "auto",
      onComplete: () => {
        this.mode = "orbit";
        if (onDone) onDone();
      },
    });
  }

  exitOrbit(onDone?: () => void) {
    this.mode = "transition";
    this.activeMoon = null;
    this.formTarget = 0;
    this._setHover(null);
    const pos = this._tmpV, look = this._tmpV2;
    this._trackPose(this.progress, pos, look);
    gsap.to(this.camState, {
      px: pos.x, py: pos.y, pz: pos.z,
      lx: look.x, ly: look.y, lz: look.z,
      duration: 1.6,
      ease: "power3.inOut",
      overwrite: "auto",
      onComplete: () => {
        this.mode = "travel";
        this.activePlanet = null;
        if (onDone) onDone();
      },
    });
  }

  focusMoon(moonId: string) {
    const moon = this._findMoon(moonId);
    if (!moon) return;
    // Restaurar escala de la luna previa
    if (this.activeMoon && this.activeMoon !== moonId) {
      const prev = this._findMoon(this.activeMoon);
      if (prev) {
        const s = prev.def.size;
        gsap.to(prev.body.scale, { x: s, y: s, z: s, duration: 0.5, overwrite: "auto" });
      }
    }
    this.activeMoon = moonId;
    this.mode = "moon";
    const s = moon.def.size * 1.15;
    gsap.to(moon.body.scale, { x: s, y: s, z: s, duration: 0.5, overwrite: "auto" });
  }

  clearMoonFocus() {
    if (this.activeMoon) {
      const prev = this._findMoon(this.activeMoon);
      if (prev) {
        const s = prev.def.size;
        gsap.to(prev.body.scale, { x: s, y: s, z: s, duration: 0.5, overwrite: "auto" });
      }
    }
    this.activeMoon = null;
    if (this.mode === "moon") this.mode = "orbit";
  }

  /* Proyección 3D → pantalla para las etiquetas de planetas */
  projectPlanet(planetId: PlanetId): { visible: boolean; x?: number; y?: number } {
    const pl = this.planets[planetId];
    if (!pl) return { visible: false };
    this._tmpV.copy(pl.position);
    this._tmpV.y += pl.radius * 2.1;
    this._tmpV.project(this.camera);
    const visible = this._tmpV.z < 1;
    return {
      visible,
      x: (this._tmpV.x * 0.5 + 0.5) * innerWidth,
      y: (-this._tmpV.y * 0.5 + 0.5) * innerHeight,
    };
  }

  moonWorldPos(moonId: string, out?: THREE.Vector3) {
    const moon = this._findMoon(moonId);
    if (!moon) return null;
    return moon.body.getWorldPosition(out || this._tmpV);
  }

  /* ---------- loop ---------- */

  update(dt: number) {
    this.elapsed += dt;
    const t = this.elapsed;

    // Suavizado del progreso de scroll (inercia cinematográfica)
    this.progress = THREE.MathUtils.damp(this.progress, this.targetProgress, 3.2, dt);

    // Fondo vivo
    for (let i = 0; i < this.starLayers.length; i++) {
      this.starLayers[i].rotation.y = t * 0.004 * (i + 1);
      this.starLayers[i].rotation.x = Math.sin(t * 0.01 * (i + 1)) * 0.02;
    }
    for (const n of this.nebulae) {
      n.scale.setScalar(n.userData.baseScale * (1 + Math.sin(t * 0.07 + n.userData.phase) * 0.06));
      n.material.rotation = t * 0.008 + n.userData.phase;
    }

    // Núcleo: latido a 60 BPM + luz REC
    const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * 0.5)), 6);
    this.coreGlow.scale.setScalar(16 + beat * 3);
    const rec = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * 1.0 - 1)), 8);
    this.recLight.material.opacity = 0.25 + rec * 0.75;
    this.recLight.scale.setScalar(1.3 + rec * 0.8);
    this.sunLight.intensity = 2600 + beat * 500;

    // Mezcla hacia la formación de presentación
    this.formBlend = THREE.MathUtils.damp(this.formBlend, this.formTarget, 2.5, dt);
    if (this.formTarget > 0) this.formSpin += dt * 0.05;

    // Planetas y lunas
    for (const key of ["production", "post"]) {
      const pl = this.planets[key];
      pl.mesh.rotation.y = t * (key === "production" ? 0.05 : 0.035);
      if (pl.ring) pl.ring.rotation.z = t * 0.02;
      pl.group.position.y = pl.position.y + Math.sin(t * 0.18 + (key === "post" ? 2 : 0)) * 0.35;

      const isActive = this.activePlanet === key;
      const orbitFactor = isActive && this.mode !== "travel" ? 0.45 : 1;

      // Anillo de formación frente a la cámara nominal, dimensionado al viewport
      let doForm = false, rx = 0, ry = 0;
      if (isActive && (this.formBlend > 0.003 || this.formTarget > 0)) {
        const R = pl.radius * 4.6;
        this._nomCam.set(
          pl.position.x + Math.cos(this.orbitAngle) * R,
          pl.position.y + pl.radius * 1.3,
          pl.position.z + Math.sin(this.orbitAngle) * R
        );
        this._formDir.copy(this._nomCam).sub(pl.group.position).normalize();
        this._formRight.set(0, 1, 0).cross(this._formDir).normalize();
        this._formUp.crossVectors(this._formDir, this._formRight).normalize();

        const halfV = THREE.MathUtils.degToRad(this.camera.fov) / 2;
        const halfH = Math.atan(Math.tan(halfV) * this.camera.aspect);
        const panelFrac = Math.min(0.4, (this._shiftCur * 2) / Math.max(1, innerWidth));
        ry = Math.max(pl.radius * 1.38, Math.min(pl.radius * 2.15, Math.tan(halfV) * R * 0.56 - 1.4));
        rx = Math.max(pl.radius * 1.5, Math.min(pl.radius * 2.75, Math.tan(halfH) * R * (0.63 - panelFrac * 0.5) - 1.4));
        pl.group.updateMatrixWorld(true);
        doForm = true;
      }

      const N = pl.moons.length;
      for (let i = 0; i < N; i++) {
        const m = pl.moons[i];
        m.angle += dt * m.def.speed * 0.22 * orbitFactor;
        m.body.position.set(
          Math.cos(m.angle) * m.orbitR,
          0,
          Math.sin(m.angle) * m.orbitR
        );
        if (doForm && this.formBlend > 0.003) {
          // Posición en el anillo, en orden de servicio (01 arriba, en sentido horario)
          const phi = Math.PI / 2 - (i / N) * Math.PI * 2 + this.formSpin;
          this._formWorld.copy(pl.group.position)
            .addScaledVector(this._formRight, Math.cos(phi) * rx)
            .addScaledVector(this._formUp, Math.sin(phi) * ry)
            .addScaledVector(this._formDir, pl.radius * 0.35);
          this._orbWorld.copy(m.body.position);
          m.pivot.localToWorld(this._orbWorld);
          this._orbWorld.lerp(this._formWorld, this.formBlend);
          m.body.position.copy(m.pivot.worldToLocal(this._orbWorld));
        }
        m.body.rotation.y += dt * 0.3;

        // Las líneas de órbita se desvanecen mientras dura la formación
        m.orbitLine.material.opacity = 0.1 * (1 - (isActive ? this.formBlend : 0));

        const em = m.body.material.emissiveIntensity;
        if (m.def.kind === "pulse") {
          m.body.material.emissiveIntensity = 0.12 + Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * 0.9)), 4) * 0.3;
        } else if (m.def.kind === "neon") {
          m.body.material.emissiveIntensity = 0.25 + Math.pow(Math.max(0, Math.sin(t * 2.4 + 1)), 2) * 0.35;
        } else if (m.def.kind === "storm") {
          const flick = Math.random() < 0.012 ? 1.2 : 0;
          m.body.material.emissiveIntensity = Math.max(0.22, em * 0.92 + flick * 0.4);
        }
        for (let k = 0; k < m.sats.length; k++) {
          const sat = m.sats[k];
          const a = t * (0.8 + k * 0.5) + k * Math.PI;
          sat.position.set(Math.cos(a) * 1.9, Math.sin(a * 0.7) * 0.5, Math.sin(a) * 1.9);
        }
      }
    }

    // Raycast bajo demanda
    if (this.pointerDirty && this.mode !== "transition") {
      this._raycast();
      this.pointerDirty = false;
    }

    // Cámara según modo
    const cs = this.camState;
    if (this.mode === "travel") {
      this._trackPose(this.progress, this._tmpV, this._tmpV2);
      cs.px = this._tmpV.x; cs.py = this._tmpV.y; cs.pz = this._tmpV.z;
      cs.lx = this._tmpV2.x; cs.ly = this._tmpV2.y; cs.lz = this._tmpV2.z;
    } else if (this.mode === "orbit") {
      const pl = this.planets[this.activePlanet];
      this.orbitAngle += dt * 0.045;
      const r = pl.radius * 4.6;
      cs.px = pl.position.x + Math.cos(this.orbitAngle) * r;
      cs.py = pl.position.y + pl.radius * 1.3 + Math.sin(t * 0.14) * 0.4;
      cs.pz = pl.position.z + Math.sin(this.orbitAngle) * r;
      cs.lx = pl.position.x; cs.ly = pl.position.y; cs.lz = pl.position.z;
    } else if (this.mode === "moon") {
      const moon = this._findMoon(this.activeMoon);
      const pl = this.planets[this.activePlanet];
      if (moon && pl) {
        const wp = moon.body.getWorldPosition(this._tmpV);
        // Acercarse por la normal del anillo, corriéndose hacia afuera del
        // planeta para que su limbo no domine el encuadre
        const away = this._tmpV2.copy(wp).sub(pl.group.position).normalize();
        const dist = Math.max(4.4, moon.def.size * 6.2);
        const out = moon.def.size * 2.2;
        const px = wp.x + this._formDir.x * dist + away.x * out;
        const py = wp.y + this._formDir.y * dist + away.y * out + moon.def.size * 0.7;
        const pz = wp.z + this._formDir.z * dist + away.z * out;
        const k = 1 - Math.exp(-3.0 * dt);
        cs.px += (px - cs.px) * k;
        cs.py += (py - cs.py) * k;
        cs.pz += (pz - cs.pz) * k;
        // El corrimiento por panel lo maneja setViewOffset; aquí solo miramos la luna
        cs.lx += (wp.x - cs.lx) * k;
        cs.ly += (wp.y - cs.ly) * k;
        cs.lz += (wp.z - cs.lz) * k;
      }
    }
    // (en modo transition, GSAP escribe camState directamente)

    // Parallax sutil del puntero
    const par = IS_COARSE ? 0 : 0.7;
    this.camera.position.set(
      cs.px + this.parallax.x * par,
      cs.py + this.parallax.y * par * 0.6,
      cs.pz
    );
    this.camera.lookAt(cs.lx, cs.ly, cs.lz);

    // La linterna solo actúa en modo órbita / luna
    const wantLamp = this.mode === "orbit" || this.mode === "moon" || this.mode === "transition";
    this.camLight.intensity += ((wantLamp ? 150 : 0) - this.camLight.intensity) * Math.min(1, dt * 3);
    this.camLight.position.copy(this.camera.position);

    // Corrimiento suave del encuadre cuando hay panel lateral abierto
    this._shiftCur += (this._shiftTarget - this._shiftCur) * Math.min(1, dt * 4);
    if (Math.abs(this._shiftCur) > 0.5) {
      this.camera.setViewOffset(innerWidth, innerHeight, this._shiftCur, 0, innerWidth, innerHeight);
    } else if (this.camera.view && this.camera.view.enabled) {
      this.camera.clearViewOffset();
    }

    this.renderer.render(this.scene, this.camera);
  }

  _resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.fov = Cosmos.fovFor(this.camera.aspect);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, IS_COARSE ? 1.5 : 2));
  }
}
