/* Tipos del contenido de URNEPTON */

export type CatalogType = "video" | "audio" | "trailer" | "case";

export type MoonKind =
  | "ink" | "pulse" | "vinyl" | "pearl" | "ringed" | "duotone" | "chrome"
  | "jade" | "storm" | "neon" | "ice" | "asteroid" | "terracotta";

export interface TrackDef {
  bpm: number;
  root: number;
  scale: "minor" | "major" | "dorian" | "lydian";
  mood: "warm" | "bright" | "dark" | "ambient";
  seed: number;
  crackle?: boolean;
}

export interface CatalogItem {
  type: CatalogType;
  title: string;
  client: string;
  year?: string;
  featured?: boolean;
  description: string;
  /** Solo para type video | trailer */
  youtubeId?: string;
  /** Solo para type audio */
  track?: TrackDef;
  /** Solo para type case */
  stats?: [string, string][];
}

/** Ítem de catálogo resuelto con su planeta y servicio de origen */
export interface ResolvedCatalogItem extends CatalogItem {
  uid: string;
  planetId: PlanetId;
  planetName: string;
  serviceId: string;
  serviceName: string;
}

export interface MoonDef {
  kind: MoonKind;
  /** Radio del cuerpo */
  size: number;
  /** Radio orbital nominal */
  orbit: number;
  speed: number;
  tilt: number;
  colorA: string;
  colorB: string;
  halo?: boolean;
  ringColor?: string;
  satellites?: number;
}

export interface Service {
  id: string;
  name: string;
  tagline: string;
  description: string;
  deliverables: string[];
  moon: MoonDef;
  catalog: CatalogItem[];
}

export type PlanetId = "production" | "post";

export interface PlanetTheme {
  base: string;
  dark: string;
  glow: string;
  bands: string[];
}

export interface Planet {
  id: PlanetId;
  name: string;
  role: string;
  tagline: string;
  description: string;
  accent: string;
  accentHot: string;
  theme: PlanetTheme;
  hasRing: boolean;
  ringColor?: string;
  services: Service[];
}

export const TYPE_LABEL: Record<CatalogType, string> = {
  video: "Video",
  audio: "Audio",
  trailer: "Tráiler",
  case: "Caso de estudio",
};
