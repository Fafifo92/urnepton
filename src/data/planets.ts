/* ============================================================
   URNEPTON — planetas, lunas (servicios) y catálogo
   Este archivo es el contenido editable del sitio.

   NOTA: los youtubeId son videos DEMO (cortos abiertos de Blender,
   licencia CC) — reemplázalos por los videos reales del estudio.
   ============================================================ */

import type { Planet, PlanetId, ResolvedCatalogItem } from "./types";

/* Videos demo (cortos CC de Blender Studio) usados como placeholders */
const YT = {
  sintel: "eRsGyueVLvQ",
  bunny: "aqz-KE-bpKQ",
  tears: "R6MlUcmOul8",
  spring: "WhWc3b3KhnY",
  cosmos: "Y-rmzh0PI3c",
  caminandes: "SkVqJ1SGeL0",
  agent: "mN0zPOpADL4",
} as const;

export const PLANETS: Record<PlanetId, Planet> = {
  production: {
    id: "production",
    name: "ÚRIGEN",
    role: "Producción Musical",
    tagline: "Donde el sonido nace",
    description:
      "El planeta caliente del sistema. Aquí las ideas todavía queman: llegan en notas de voz y salen convertidas en canciones con pulso propio.",
    accent: "#ffb45e",
    accentHot: "#ff7a45",
    theme: {
      base: "#c96a2e",
      dark: "#5c1f08",
      glow: "#ff9a4d",
      bands: ["#e8894a", "#a34413", "#f7b267", "#7a2d0b"],
    },
    hasRing: false,
    services: [
      {
        id: "composicion",
        name: "Composición y Songwriting",
        tagline: "Donde nace la chispa que enciende cada órbita",
        description:
          "Todo universo sonoro comienza con una idea. Trabajamos contigo en sesiones de co-escritura para convertir emociones en canciones con identidad propia. Desde la primera frase hasta la maqueta final, cuidamos que cada obra tenga alma y potencial.",
        deliverables: [
          "Letra y melodía finalizadas",
          "Maqueta producida",
          "Split sheet y registro de obra",
          "Co-escritura presencial o remota",
        ],
        moon: { kind: "ink", size: 0.55, orbit: 5.2, speed: 0.5, tilt: 0.12, colorA: "#1b2a6b", colorB: "#e8c76a" },
        catalog: [
          {
            type: "audio", title: "Bruma en la Terminal", client: "Valeria Cardona", year: "2025", featured: true,
            description: "Balada pop alternativa escrita en dos sesiones de co-writing; la maqueta original se convirtió en el sencillo debut de la artista.",
            track: { bpm: 82, root: 2, scale: "minor", mood: "warm", seed: 11 },
          },
          {
            type: "case", title: "Campamento de composición: EP «Meridiano»", client: "Los Ríos Neón", year: "2024",
            description: "Songwriting camp de cinco días que produjo las siete canciones del EP, con splits cerrados y demos aprobadas en tiempo récord.",
            stats: [["5", "días de camp"], ["7", "canciones"], ["12", "co-escritores"]],
          },
          {
            type: "video", title: "Última Marea", client: "Índigo Balboa", year: "2025",
            description: "Videoclip oficial de la canción nacida en nuestras sesiones de escritura; superó el millón de vistas en su primer mes.",
            youtubeId: YT.spring,
          },
        ],
      },
      {
        id: "beatmaking",
        name: "Beatmaking y Producción de Pistas",
        tagline: "El pulso gravitacional que mueve tu sonido",
        description:
          "Instrumentales a la medida que definen el ADN de tu proyecto: del trap y el dembow a la electrónica y las fusiones andinas. Cada beat se construye desde cero, con diseño sonoro exclusivo. Nada de plantillas: tu pista no se la vendemos a nadie más.",
        deliverables: [
          "Pista instrumental exclusiva",
          "Stems por instrumento",
          "Versiones performance y TV track",
          "Cesión o licencia de derechos",
        ],
        moon: { kind: "pulse", size: 0.8, orbit: 6.6, speed: 0.42, tilt: -0.2, colorA: "#141018", colorB: "#ff3fa4" },
        catalog: [
          {
            type: "audio", title: "Selva de Cromo", client: "Mawi", year: "2025", featured: true,
            description: "Fusión de dembow con sintetizadores modulares producida íntegramente en el estudio; sencillo líder de su segundo álbum.",
            track: { bpm: 108, root: 7, scale: "dorian", mood: "bright", seed: 23 },
          },
          {
            type: "audio", title: "Vértigo 404", client: "Kbron del Sur", year: "2024",
            description: "Beat de trap oscuro con sampleo de charango procesado; la pista definió la nueva era sonora del artista.",
            track: { bpm: 140, root: 4, scale: "minor", mood: "dark", seed: 37 },
          },
          {
            type: "case", title: "Banco de pistas «Órbita Baja»", client: "Catálogo interno URNEPTON", year: "2023",
            description: "Creación de un banco de 40 instrumentales exclusivos que abasteció los lanzamientos del sello durante un año.",
            stats: [["40", "beats exclusivos"], ["12", "meses de catálogo"], ["9", "artistas servidos"]],
          },
        ],
      },
      {
        id: "grabacion",
        name: "Grabación en Estudio",
        tagline: "Capturamos la señal en su punto de origen",
        description:
          "Salas con acústica de precisión, consola análoga y una colección de micrófonos clásicos y modernos. Grabamos desde una voz íntima hasta una banda completa en vivo, con ingenieros que saben que cada toma es irrepetible.",
        deliverables: [
          "Sesiones multipista en alta resolución",
          "Archivos crudos y comping",
          "Grabación de bandas en vivo",
          "Respaldo en la nube",
        ],
        moon: { kind: "vinyl", size: 1.05, orbit: 8.2, speed: 0.3, tilt: 0.08, colorA: "#b06a3a", colorB: "#3a1c0c" },
        catalog: [
          {
            type: "video", title: "En Vivo desde la Sala Neptuno", client: "La Franja", year: "2025", featured: true,
            description: "Sesión en vivo de cuatro cámaras grabada en una sola toma en nuestra sala principal; el video se volvió referencia del sonido del sello.",
            youtubeId: YT.tears,
          },
          {
            type: "audio", title: "Madrugada Análoga", client: "Tito Braga", year: "2024",
            description: "Tema grabado 100% en cinta y consola análoga, sin edición digital; ejercicio de captura pura que abrió su álbum de regreso.",
            track: { bpm: 74, root: 9, scale: "minor", mood: "warm", seed: 5, crackle: true },
          },
          {
            type: "case", title: "Sesión «Cuarto Creciente»: 12 músicos, 3 días", client: "Perla Andina", year: "2026",
            description: "Grabación simultánea de un ensamble folclórico completo, con microfonía de sala y aislamiento selectivo.",
            stats: [["12", "músicos en vivo"], ["3", "días de sesión"], ["48", "canales simultáneos"]],
          },
        ],
      },
      {
        id: "produccion-vocal",
        name: "Producción Vocal",
        tagline: "Tu voz, puesta en órbita perfecta",
        description:
          "La voz es el centro emocional de toda canción y la tratamos como tal. Dirigimos cada sesión para sacar tu mejor interpretación y esculpimos comping, afinación, armonías y texturas hasta lograr una vocal impecable pero humana.",
        deliverables: [
          "Dirección vocal en sesión",
          "Comping y afinación transparente",
          "Diseño de armonías y coros",
          "Stems vocales procesados",
        ],
        moon: { kind: "pearl", size: 0.6, orbit: 9.6, speed: 0.36, tilt: 0.3, colorA: "#f2c7d8", colorB: "#7de0ff", halo: true },
        catalog: [
          {
            type: "audio", title: "Doble Filo", client: "Nébula Díaz", year: "2025", featured: true,
            description: "Producción vocal con 24 pistas de armonías apiladas; el coro final se convirtió en la firma sonora de la artista.",
            track: { bpm: 96, root: 11, scale: "dorian", mood: "warm", seed: 42 },
          },
          {
            type: "case", title: "Reconstrucción vocal del álbum «Ceniza y Sal»", client: "Camila Osores", year: "2024",
            description: "Regrabación y producción vocal completa de un álbum cuyo material original llegó inutilizable de otro estudio.",
            stats: [["11", "canciones rescatadas"], ["300+", "tomas dirigidas"], ["4", "semanas de trabajo"]],
          },
          {
            type: "video", title: "Versión Acapella: «Doble Filo»", client: "Nébula Díaz", year: "2025",
            description: "Video performance de la versión a capela con las armonías en vivo; pieza viral que mostró la producción vocal al desnudo.",
            youtubeId: YT.caminandes,
          },
        ],
      },
      {
        id: "arreglos",
        name: "Arreglos y Orquestación",
        tagline: "Constelaciones de instrumentos alrededor de tu canción",
        description:
          "Transformamos demos sencillas en paisajes sonoros completos: cuerdas, metales, coros y sintetizadores que elevan la emoción de cada sección. Escribimos partituras, dirigimos músicos de sesión y programamos orquestaciones híbridas.",
        deliverables: [
          "Partituras y charts",
          "Arreglos de cuerdas, metales y coros",
          "Orquestación híbrida MIDI + músicos",
          "Dirección de ensambles",
        ],
        moon: { kind: "ringed", size: 0.85, orbit: 11.2, speed: 0.26, tilt: -0.14, colorA: "#8a7fae", colorB: "#4a3f66", ringColor: "#c9a2ff" },
        catalog: [
          {
            type: "audio", title: "Sinfonía del Malecón", client: "Río Manso", year: "2024",
            description: "Arreglo de cuerdas y metales para 16 músicos sobre una cumbia de autor; grabado en una sola jornada con partituras propias.",
            track: { bpm: 92, root: 0, scale: "major", mood: "bright", seed: 8 },
          },
          {
            type: "case", title: "De la demo a la orquesta: «Herencia»", client: "Selva Cromática", year: "2025",
            description: "El proceso completo: una maqueta de guitarra y voz convertida en una producción orquestal de siete minutos.",
            stats: [["1", "demo de origen"], ["26", "instrumentos"], ["7", "minutos de obra"]],
          },
          {
            type: "video", title: "Herencia (En Vivo con Orquesta)", client: "Selva Cromática", year: "2026", featured: true,
            description: "Videoclip de la interpretación en vivo con orquesta de cámara, filmado en el estudio con dirección de arte del sello.",
            youtubeId: YT.cosmos,
          },
        ],
      },
      {
        id: "mezcla",
        name: "Mezcla",
        tagline: "Equilibrio perfecto entre mareas sonoras",
        description:
          "Cientos de decisiones definen si una canción envuelve o se pierde. Balanceamos cada elemento con herramientas análogas y digitales, en estéreo y Dolby Atmos, hasta que la producción respira con claridad y potencia.",
        deliverables: [
          "Mezcla estéreo en alta resolución",
          "Mezcla inmersiva Dolby Atmos",
          "Versiones instrumental, acapella y TV",
          "Rondas de revisión incluidas",
        ],
        moon: { kind: "duotone", size: 0.8, orbit: 12.8, speed: 0.22, tilt: 0.18, colorA: "#2451c9", colorB: "#e8894a" },
        catalog: [
          {
            type: "audio", title: "Gravedad Cero (Mezcla Atmos)", client: "Mawi", year: "2025",
            description: "Primera mezcla inmersiva del sello en Dolby Atmos; el sencillo fue destacado en playlists editoriales de audio espacial.",
            track: { bpm: 100, root: 5, scale: "lydian", mood: "ambient", seed: 61 },
          },
          {
            type: "case", title: "Remezcla del catálogo «Primeras Lunas»", client: "Archivo URNEPTON", year: "2026",
            description: "Remezcla de los diez primeros lanzamientos del sello a partir de las multipistas originales, para su reedición aniversario.",
            stats: [["10", "lanzamientos"], ["120", "pistas por canción"], ["1", "aniversario"]],
          },
          {
            type: "audio", title: "Nadie Duerme en Enero", client: "La Franja", year: "2024",
            description: "Mezcla híbrida análogo-digital de una producción de 120 pistas; referencia interna de balance entre densidad y claridad.",
            track: { bpm: 120, root: 3, scale: "minor", mood: "bright", seed: 19 },
          },
        ],
      },
      {
        id: "mastering",
        name: "Mastering",
        tagline: "El pulido final antes del despegue",
        description:
          "La última frontera entre tu música y el mundo. Ajustamos tono, dinámica y volumen para que tu lanzamiento suene competitivo en cualquier plataforma, audífono o club, y preparamos los formatos para streaming, vinilo y CD.",
        deliverables: [
          "Máster optimizado para streaming",
          "Máster para vinilo y CD (DDP)",
          "Códigos ISRC y metadata",
          "Versiones por plataforma",
        ],
        moon: { kind: "chrome", size: 0.45, orbit: 14.2, speed: 0.34, tilt: -0.06, colorA: "#e8ecff", colorB: "#8fa3c9" },
        catalog: [
          {
            type: "audio", title: "Perihelio (Máster de álbum)", client: "Los Ríos Neón", year: "2025",
            description: "Mastering de las diez canciones del álbum con curva de loudness unificada; coherencia sonora de principio a fin.",
            track: { bpm: 112, root: 6, scale: "major", mood: "bright", seed: 77 },
          },
          {
            type: "case", title: "Del archivo digital al vinilo: «Madrugada Análoga»", client: "Tito Braga", year: "2024",
            description: "Mastering específico para corte de vinilo de 180 gramos, con ajustes de fase y graves para el formato físico.",
            stats: [["180g", "vinilo"], ["2", "caras cortadas"], ["-14", "LUFS streaming"]],
          },
          {
            type: "trailer", title: "Tráiler del álbum «Perihelio»", client: "Los Ríos Neón", year: "2025",
            description: "Pieza audiovisual de 60 segundos con fragmentos masterizados del álbum, usada como campaña de pre-lanzamiento.",
            youtubeId: YT.agent,
          },
        ],
      },
      {
        id: "desarrollo",
        name: "Desarrollo de Artistas",
        tagline: "Trayectorias que escapan de la gravedad",
        description:
          "Más que un servicio, una alianza: diseñamos contigo tu identidad sonora y visual, tu plan de lanzamientos y tu estrategia de crecimiento. URNEPTON no lanza canciones sueltas: lanza artistas en órbita.",
        deliverables: [
          "Plan de carrera y calendario",
          "Identidad sonora y dirección creativa",
          "EPK y press kit profesional",
          "Pitching a playlists y medios",
        ],
        moon: { kind: "jade", size: 1.1, orbit: 16.0, speed: 0.17, tilt: 0.22, colorA: "#2e9e6b", colorB: "#0c3d2a", satellites: 2 },
        catalog: [
          {
            type: "case", title: "Lanzamiento 360: el despegue de Nébula Díaz", client: "Nébula Díaz", year: "2026", featured: true,
            description: "18 meses de desarrollo integral: de demos caseras a un EP con gira regional y medio millón de oyentes mensuales.",
            stats: [["18", "meses de desarrollo"], ["500K", "oyentes mensuales"], ["1", "gira regional"]],
          },
          {
            type: "video", title: "Documental «Señal de Origen»", client: "Kbron del Sur", year: "2025",
            description: "Mini documental de tres episodios sobre el proceso de redefinición artística del proyecto junto al equipo del sello.",
            youtubeId: YT.sintel,
          },
          {
            type: "trailer", title: "EPK Audiovisual: Perla Andina", client: "Perla Andina", year: "2024",
            description: "Press kit electrónico en video producido para la campaña internacional de la artista, usado en festivales y showcases.",
            youtubeId: YT.bunny,
          },
        ],
      },
    ],
  },

  post: {
    id: "post",
    name: "NÉPTORA",
    role: "Postproducción de Audio",
    tagline: "Donde el sonido madura",
    description:
      "El planeta profundo del sistema. Océanos que ondulan como un analizador de espectro: aquí cada detalle encuentra su lugar y lo bueno se vuelve inevitable.",
    accent: "#7de0ff",
    accentHot: "#5e7bff",
    theme: {
      base: "#1d4fd7",
      dark: "#071233",
      glow: "#7de0ff",
      bands: ["#2e6bff", "#123a9e", "#57c8f2", "#0b1f66"],
    },
    hasRing: true,
    ringColor: "#9fd8ef",
    services: [
      {
        id: "diseno-sonoro",
        name: "Diseño Sonoro",
        tagline: "Donde nace el trueno de cada mundo",
        description:
          "Creamos desde cero el universo sonoro de tu historia: atmósferas, efectos y texturas que no existen en ninguna librería. Del susurro más íntimo al colapso de una ciudad, lo construimos todo, capa por capa.",
        deliverables: [
          "Sesiones organizadas por capas",
          "Stems SFX / BG / Design",
          "Librería exclusiva del proyecto",
          "Entrega AAF/OMF para mezcla",
        ],
        moon: { kind: "storm", size: 1.1, orbit: 5.4, speed: 0.46, tilt: 0.16, colorA: "#4a2a8a", colorB: "#b17aff" },
        catalog: [
          {
            type: "trailer", title: "Teaser oficial — «La Grieta»", client: "Estudios Caimán", year: "2025", featured: true,
            description: "Diseño sonoro integral del teaser de terror: subgraves tectónicos, criaturas vocalizadas con procesamiento granular y silencios quirúrgicos.",
            youtubeId: YT.sintel,
          },
          {
            type: "case", title: "Serie «Malasangre» — Temporada 2", client: "Bruma Producciones", year: "2024",
            description: "Ocho episodios con identidad sonora propia: más de 3.000 efectos diseñados a medida para el thriller más visto de la plataforma en la región.",
            stats: [["8", "episodios"], ["3.000+", "efectos a medida"], ["#1", "en la plataforma"]],
          },
          {
            type: "audio", title: "Paisaje sonoro — «Desierto Rojo»", client: "Cine Andino Films", year: "2025",
            description: "Ambiente extendido creado para el largometraje: viento sintetizado, resonancias minerales y fauna imaginaria grabada en foley orgánico.",
            track: { bpm: 60, root: 1, scale: "minor", mood: "ambient", seed: 84 },
          },
        ],
      },
      {
        id: "foley",
        name: "Foley y Efectos de Sala",
        tagline: "Cada paso deja su huella en el polvo lunar",
        description:
          "En nuestro foso de foley grabamos pasos, ropa, objetos y texturas con la precisión de un relojero y el instinto de un actor. Es el detalle invisible que hace creíble cada escena.",
        deliverables: [
          "Pasos, ropa y props sincronizados",
          "Grabación 96 kHz / 24 bit",
          "Stems por personaje y superficie",
          "Cue sheets para distribución",
        ],
        moon: { kind: "asteroid", size: 0.5, orbit: 6.9, speed: 0.55, tilt: -0.26, colorA: "#8d8676", colorB: "#3c372c" },
        catalog: [
          {
            type: "video", title: "Dentro de la sala: foley de «El Botánico»", client: "Panal Animation", year: "2025",
            description: "El proceso de foley del film animado: hojas de maíz como alas de insecto, gelatina como savia y 40 pares de zapatos para un solo personaje.",
            youtubeId: YT.caminandes,
          },
          {
            type: "case", title: "Largometraje «Vientre de Sal»", client: "Cine Andino Films", year: "2024",
            description: "Más de 1.200 pistas de foley para un drama rodado en salares: caminatas sobre costras minerales recreadas con sal industrial y cuero curtido.",
            stats: [["1.200+", "pistas de foley"], ["96kHz", "captura"], ["6", "semanas de sala"]],
          },
          {
            type: "audio", title: "Librería de texturas «Selva»", client: "Ludo Andes Games", year: "2025",
            description: "Colección exclusiva de pasos, follaje y lodo grabada en sala para el motor de audio del estudio: 800 assets listos para implementación.",
            track: { bpm: 90, root: 8, scale: "dorian", mood: "dark", seed: 29 },
          },
        ],
      },
      {
        id: "adr-dialogo",
        name: "ADR, Doblaje y Diálogo",
        tagline: "Voces que orbitan en sincronía perfecta",
        description:
          "Rescatamos, reemplazamos y perfeccionamos cada palabra. Dirigimos sesiones de ADR con actores en sala o remotos, y producimos doblajes en español latino con sincronía labial impecable.",
        deliverables: [
          "Diálogo conformado a picture lock",
          "Sesiones de ADR dirigidas",
          "Doblaje LATAM con control de calidad",
          "Stems por personaje",
        ],
        moon: { kind: "duotone", size: 0.8, orbit: 8.5, speed: 0.38, tilt: 0.1, colorA: "#e8e0cf", colorB: "#20315e" },
        catalog: [
          {
            type: "case", title: "Doblaje LATAM — «Northern Lights»", client: "Aurora Distribución", year: "2024",
            description: "Adaptación y doblaje al español neutro de una serie nórdica de diez episodios: casting de 42 voces, dirección artística y mezcla final.",
            stats: [["42", "voces en casting"], ["10", "episodios"], ["5", "países de emisión"]],
          },
          {
            type: "video", title: "Detrás de cámaras: ADR de «Malasangre»", client: "Bruma Producciones", year: "2025", featured: true,
            description: "Cómo se reconstruyeron 30 minutos de diálogo rodado bajo lluvia real: dirección de actores, sincronía y match con la locación original.",
            youtubeId: YT.tears,
          },
          {
            type: "audio", title: "Demo de voces — Campaña «Banco Meridiano»", client: "Banco Meridiano", year: "2025",
            description: "Selección de locuciones institucionales grabadas y editadas en nuestros estudios para la campaña regional de la marca en cinco países.",
            track: { bpm: 70, root: 10, scale: "major", mood: "warm", seed: 52 },
          },
        ],
      },
      {
        id: "mezcla-inmersiva",
        name: "Mezcla 5.1 y Dolby Atmos",
        tagline: "Una atmósfera propia que te envuelve por completo",
        description:
          "Nuestra sala certificada lleva tu proyecto del estéreo al espacio tridimensional. Mezclamos para cine, TV y streaming cuidando que la historia se escuche igual de poderosa en una sala THX que en un teléfono.",
        deliverables: [
          "Mezcla Dolby Atmos (ADM BWF)",
          "Downmixes 7.1 / 5.1 / binaural",
          "Stems DX/MX/FX internacionales",
          "Reportes de loudness",
        ],
        moon: { kind: "ringed", size: 1.05, orbit: 10.4, speed: 0.28, tilt: -0.12, colorA: "#1d3fae", colorB: "#0a1c52", ringColor: "#e8c76a" },
        catalog: [
          {
            type: "trailer", title: "Tráiler Atmos — «Órbita Baja»", client: "Estudios Caimán", year: "2025", featured: true,
            description: "Mezcla inmersiva del tráiler de ciencia ficción: objetos sonoros que sobrevuelan la sala y un silencio orbital calibrado al decibel.",
            youtubeId: YT.cosmos,
          },
          {
            type: "case", title: "Documental «Los Últimos Glaciares» en 5.1", client: "Fundación Documenta Sur", year: "2024",
            description: "Mezcla 5.1 para estreno en festivales y versión streaming: hielo que cruje alrededor del público y narración siempre inteligible.",
            stats: [["5.1", "canales de sala"], ["3", "festivales de estreno"], ["-24", "LKFS broadcast"]],
          },
          {
            type: "video", title: "Comparativa: estéreo vs. Atmos", client: "Cine Andino Films", year: "2025",
            description: "Demostración lado a lado de la misma escena en ambos formatos, usada por la productora para defender la mezcla inmersiva.",
            youtubeId: YT.bunny,
          },
        ],
      },
      {
        id: "musica-original",
        name: "Música Original para Medios",
        tagline: "Melodías que encienden constelaciones",
        description:
          "Componemos, producimos y grabamos la música que tu historia necesita: desde un tema principal orquestal hasta la identidad sonora de una marca, con demos rápidos y músicos en vivo.",
        deliverables: [
          "Score sincronizado a imagen",
          "Stems por familia instrumental",
          "Sonic branding y jingles",
          "Cue sheets y derechos",
        ],
        moon: { kind: "vinyl", size: 0.85, orbit: 12.2, speed: 0.24, tilt: 0.2, colorA: "#d9a13e", colorB: "#5c3a0a", halo: true },
        catalog: [
          {
            type: "audio", title: "Suite orquestal — «La Grieta»", client: "Estudios Caimán", year: "2025", featured: true,
            description: "Suite con orquesta de 48 músicos grabada en sala: el tema del abismo construido sobre cuerdas preparadas y coros procesados.",
            track: { bpm: 70, root: 2, scale: "minor", mood: "dark", seed: 93 },
          },
          {
            type: "case", title: "Score completo — Serie «Malasangre»", client: "Bruma Producciones", year: "2024",
            description: "Dos temporadas de música original híbrida con leitmotivs por personaje y más de 190 minutos de score entregado.",
            stats: [["190+", "minutos de score"], ["2", "temporadas"], ["14", "leitmotivs"]],
          },
          {
            type: "audio", title: "Sonic branding — «Café Tundra»", client: "Café Tundra", year: "2025",
            description: "Identidad sonora de la marca: logo audible de 3 segundos, jingle adaptable y paleta musical para toda la comunicación.",
            track: { bpm: 95, root: 7, scale: "lydian", mood: "bright", seed: 14 },
          },
        ],
      },
      {
        id: "audio-videojuegos",
        name: "Audio para Videojuegos",
        tagline: "Sonido interactivo en gravedad variable",
        description:
          "Audio que responde al jugador: sistemas adaptativos, música dinámica y efectos implementados directamente en el motor. Dominamos Wwise, FMOD, Unity y Unreal, del prototipo a la certificación.",
        deliverables: [
          "Assets optimizados por plataforma",
          "Música adaptativa por estados",
          "Implementación Wwise / FMOD",
          "QA y certificación de consolas",
        ],
        moon: { kind: "neon", size: 0.85, orbit: 14.0, speed: 0.32, tilt: -0.18, colorA: "#0e4f52", colorB: "#ff3fa4" },
        catalog: [
          {
            type: "trailer", title: "Tráiler de lanzamiento — «Raíces del Abismo»", client: "Ludo Andes Games", year: "2025",
            description: "Audio completo del tráiler del metroidvania andino: diseño de criaturas, tema principal con instrumentos autóctonos procesados.",
            youtubeId: YT.agent,
          },
          {
            type: "case", title: "Sistema adaptativo — «Ciudad Neón»", client: "Selva Pixel Studios", year: "2024",
            description: "Implementación en Wwise para un mundo abierto: música que reacciona a persecuciones, clima sonoro dinámico y 5.400 assets integrados.",
            stats: [["5.400", "assets integrados"], ["3", "capas de música"], ["60fps", "sin caídas"]],
          },
          {
            type: "audio", title: "Bocetos de criaturas — «Raíces del Abismo»", client: "Ludo Andes Games", year: "2024",
            description: "Primeras exploraciones vocales y orgánicas de las criaturas del juego: del gruñido crudo grabado en sala al monstruo final.",
            track: { bpm: 50, root: 0, scale: "minor", mood: "dark", seed: 66 },
          },
        ],
      },
      {
        id: "restauracion",
        name: "Restauración de Audio",
        tagline: "Rescatamos señales perdidas en el espacio profundo",
        description:
          "Devolvemos la vida a grabaciones dañadas, ruidosas o degradadas por el tiempo: archivos fílmicos, cintas históricas, diálogos irrecuperables. Lo que parecía perdido, vuelve a escucharse claro.",
        deliverables: [
          "Reducción de ruido, clicks y hum",
          "Comparativas antes / después",
          "Digitalización de cintas y DAT",
          "Masters de preservación",
        ],
        moon: { kind: "ice", size: 0.55, orbit: 15.6, speed: 0.4, tilt: 0.26, colorA: "#cfe8f7", colorB: "#5a86b8" },
        catalog: [
          {
            type: "case", title: "Restauración de «Crónicas del Puerto» (1968)", client: "Cinemateca del Sur", year: "2024",
            description: "Recuperación completa de la banda óptica de un clásico regional: eliminación de soplido, distorsión y cortes para su reestreno.",
            stats: [["1968", "año original"], ["94", "minutos restaurados"], ["1", "reestreno en festival"]],
          },
          {
            type: "audio", title: "Antes/después: entrevista histórica de 1979", client: "Archivo Sonoro Continental", year: "2025",
            description: "Fragmento comparativo de una cinta de carrete abierto rescatada: de casi inaudible bajo el hum eléctrico a voz clara y publicable.",
            track: { bpm: 65, root: 5, scale: "minor", mood: "warm", seed: 31, crackle: true },
          },
          {
            type: "video", title: "El proceso: restaurando «Crónicas del Puerto»", client: "Cinemateca del Sur", year: "2025",
            description: "Mini documental sobre el flujo de trabajo espectral utilizado en la restauración, presentado en la muestra de cine recuperado.",
            youtubeId: YT.spring,
          },
        ],
      },
      {
        id: "podcasts",
        name: "Podcasts y Ficción Sonora",
        tagline: "Historias que viajan a la velocidad de la voz",
        description:
          "Audio narrativo de principio a fin: grabación, edición, diseño sonoro, música y masterización para todas las plataformas. Del podcast conversacional impecable a ficciones binaurales que te ponen dentro de la escena.",
        deliverables: [
          "Episodios masterizados por plataforma",
          "Grabación en estudio o remota",
          "Diseño sonoro y música original",
          "Versiones binaurales",
        ],
        moon: { kind: "terracotta", size: 0.5, orbit: 17.2, speed: 0.48, tilt: -0.08, colorA: "#d97b4a", colorB: "#7a3618", halo: true },
        catalog: [
          {
            type: "audio", title: "Podcast «Frecuencia Nocturna» — T3", client: "Red Altavoz", year: "2025", featured: true,
            description: "Doce episodios de crónica narrativa con diseño sonoro inmersivo y música original: el más escuchado del catálogo de la red.",
            track: { bpm: 84, root: 4, scale: "dorian", mood: "dark", seed: 48 },
          },
          {
            type: "case", title: "Audiolibro — «El Jardín de Vidrio»", client: "Editorial Faro Austral", year: "2024",
            description: "Producción integral de once horas de narración: dirección de la narradora, control de calidad capítulo a capítulo y máster para Audible.",
            stats: [["11", "horas narradas"], ["38", "capítulos"], ["-18", "LUFS Audible"]],
          },
          {
            type: "audio", title: "Ficción binaural — «Estación Delta»", client: "Red Altavoz", year: "2025",
            description: "Serie de suspenso en audio 3D grabada con cabeza binaural: seis episodios donde el oyente habita una estación aislada.",
            track: { bpm: 72, root: 9, scale: "minor", mood: "ambient", seed: 57 },
          },
        ],
      },
    ],
  },
};

/** Aplana todo el catálogo con su procedencia (planeta + servicio) */
export function allCatalogItems(): ResolvedCatalogItem[] {
  const items: ResolvedCatalogItem[] = [];
  for (const pk of ["production", "post"] as PlanetId[]) {
    const planet = PLANETS[pk];
    for (const svc of planet.services) {
      svc.catalog.forEach((item, i) => {
        items.push({
          ...item,
          uid: `${pk}-${svc.id}-${i}`,
          planetId: pk,
          planetName: planet.name,
          serviceId: svc.id,
          serviceName: svc.name,
        });
      });
    }
  }
  return items;
}
