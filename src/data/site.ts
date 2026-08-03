/* Copy general del sitio */

export const SITE = {
  name: "URNEPTON",
  title: "URNEPTON — Sistema sonoro",
  description:
    "URNEPTON: disquera y estudio de audio. Producción musical y postproducción de audio, dos planetas de un mismo sistema sonoro.",
  email: "hola@urnepton.studio",

  heroKicker: "Disquera · Estudio de audio",
  heroSub:
    "Tu sonido merece su propio sistema. Dos planetas — producción musical y postproducción de audio — donde tu música encuentra órbita, gravedad y destino.",

  beats: [
    {
      k: "Órbita 01 · El silencio previo",
      title: "Antes de la música, <em>el silencio</em>.",
      text: "Baja el volumen del mundo. En este rincón del espacio no hay ruido: solo la tensión de una idea a punto de sonar.",
    },
    {
      k: "Órbita 02 · Big bang sonoro",
      title: "Y entonces, alguien presionó <em>REC</em>.",
      text: "Una señal estalla en el vacío y el polvo estelar se organiza en ondas. Así nace un sistema: con una toma irrepetible.",
    },
    {
      k: "Órbita 03 · Planeta caliente",
      title: "ÚRIGEN, <em>donde el sonido nace</em>.",
      text: "Composición · Beats · Grabación · Producción vocal · Arreglos. Aquí las ideas llegan tarareadas, en notas de voz, a medio soñar — y salen convertidas en canciones con pulso propio.",
    },
    {
      k: "Órbita 04 · Planeta profundo",
      title: "NÉPTORA, <em>donde el sonido madura</em>.",
      text: "Diseño sonoro · Mezcla inmersiva · Cine y series · Videojuegos. Aquí cada detalle encuentra su lugar: lo que llega siendo bueno, se va sonando inevitable.",
    },
  ],

  chooseKicker: "Dos mundos, una misma gravedad",
  chooseTitle: "¿Hacia qué planeta viaja tu sonido?",
  chooseSub:
    "Si tu música está por nacer, viaja a ÚRIGEN. Si ya existe y quiere brillar, entra a la órbita de NÉPTORA.",

  catalogTitle: "Constelaciones",
  catalogSub:
    "Lo que ya dejamos sonando en el espacio. Cada proyecto es una estrella: acércate, todas siguen encendidas.",
  catalogNote:
    "Catálogo demo — cada pieza se reemplaza por los lanzamientos reales del sello.",

  manifest:
    "Nos obsesionan los gigantes que nadie mira: Urano y Neptuno, los que sostienen en silencio el equilibrio de todo el sistema. Así entendemos este oficio — <em>el trabajo profundo que no sale en la foto, pero se escucha en cada segundo</em>. Grabamos en la Tierra. Pensamos en años luz.",

  contactTitle: "La señal está abierta",
  contactSub:
    "Cuéntanos qué traes entre manos: una maqueta, un disco a medio mezclar, una película que aún no suena. No necesitas tenerlo claro — para eso trazamos órbitas.",
  contactMeta: ["Bogotá · Ciudad de México · Remoto", "Sesiones con cita previa"],
  footerTagline: "Grabado en la Tierra. Escuchado en todo el sistema.",
} as const;

export const CATALOG_FILTERS = [
  { key: "all", label: "Todo el sistema", extra: "" },
  { key: "production", label: "ÚRIGEN", extra: "chip-prod" },
  { key: "post", label: "NÉPTORA", extra: "chip-post" },
  { key: "audio", label: "Música y audio", extra: "" },
  { key: "av", label: "Video y tráilers", extra: "" },
  { key: "case", label: "Casos de estudio", extra: "" },
] as const;
