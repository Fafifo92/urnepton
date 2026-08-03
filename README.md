# URNEPTON — Sistema sonoro 🪐

Sitio web inmersivo 3D para la disquera/estudio **URNEPTON**: un sistema espacial
navegado con scroll donde la **producción musical** (planeta **ÚRIGEN**, "donde el
sonido nace") y la **postproducción de audio** (planeta **NÉPTORA**, "donde el
sonido madura") son dos planetas, y cada subservicio es una **luna** con forma,
tamaño y textura propios.

Construido con **Astro** + **TypeScript** + **Three.js**.

## Cómo correrlo

```bash
npm install
```

```bash
npm run dev
```

Abre `http://localhost:4321`. Para la versión de producción: `npm run build`
(sale en `dist/`, listo para cualquier hosting estático) y `npm run preview`.
`npm run check` valida los tipos.

## Por qué Astro

El sitio es contenido estático con **una** isla interactiva grande (la escena 3D):

- **Cero JavaScript de framework** — Astro pre-renderiza todo el HTML en build.
- Las **48 fichas del catálogo se renderizan en el servidor** desde `src/data/`;
  el cliente solo filtra visibilidad, no construye DOM.
- **Three.js y GSAP viven en un chunk aparte** que se descarga en paralelo con la
  pantalla de intro (`import()` dinámico de `scene.ts`). El bundle inicial son
  ~18 KB gzip; el motor 3D llega después sin bloquear el primer pintado.
- **Fuentes autoalojadas** (`@fontsource`): sin peticiones a Google Fonts.

## Estructura

```
src/
├── data/          Contenido editable, tipado
│   ├── types.ts     Tipos (Planet, Service, CatalogItem…)
│   ├── site.ts      Copy general (hero, beats, manifiesto, contacto)
│   └── planets.ts   Los 2 planetas, 16 servicios/lunas y el catálogo
├── components/    Secciones de la página (.astro)
├── layouts/       Base.astro — head, fuentes, metadatos
├── pages/         index.astro
├── scripts/
│   ├── scene.ts     Escena Three.js: planetas y lunas procedurales, cámara
│   ├── audio.ts     WebAudio: drone ambiental, SFX, reproductor generativo
│   ├── ui.ts        Catálogo, visor de proyectos, panel de servicios
│   └── main.ts      Scroll ↔ cámara, modo órbita, navegación
└── styles/global.css
```

## Experiencia

1. **Intro** — elige entrar con o sin sonido (el ambiente es WebAudio generativo).
   Mientras tanto se descarga el motor 3D.
2. **Viaje narrativo** — el scroll conduce la cámara: silencio → big bang sonoro
   (REC) → flyby de ÚRIGEN → flyby de NÉPTORA.
3. **Elige tu órbita** — etiquetas proyectadas en tiempo real sobre los planetas 3D.
4. **Modo órbita** — lunas-servicio interactivas, panel con descripción,
   entregables y bitácora de proyectos.
5. **Catálogo "Constelaciones"** — filtros; "Expandir" revela las 48 piezas.
   Videos con facade lazy de YouTube (el iframe solo se crea al hacer clic y se
   destruye al cerrar), audios reproducibles sintetizados en vivo, casos con métricas.
6. **Manifiesto y contacto** — la cámara se retira sobre el plano orbital.

## Decisiones de UX

- **Scroll por sección**: el storytelling usa `scroll-snap` nativo — cada beat
  ocupa una pantalla y se encuadra solo, nunca queda a medias. El **catálogo es la
  excepción**: al ser un área de snap más alta que el viewport, se recorre libre.
- **Navegación por pasos**: breadcrumbs `Sistema › Planeta › Luna`, indicador
  "Paso N de 3", «Volver» retrocede un paso a la vez, flechas ‹ › (y ← →) entre lunas.
- **Formación de presentación**: en órbita las lunas se despliegan en un anillo
  frente a la cámara, dimensionado según fov/aspecto, para que todas queden
  visibles y clicables sin taparse. Al salir vuelven a sus órbitas reales.
- **Encuadre con panel**: `camera.setViewOffset` corre la vista cuando el panel
  lateral está abierto — la luna enfocada nunca queda debajo del panel.
- **Tooltip de lunas**: hover muestra `NN · Servicio`.

## Responsive

El móvil no es el escritorio encogido — cambia la mecánica de interacción:

| | Escritorio | Móvil vertical | Móvil apaisado |
|---|---|---|---|
| Elegir planeta | Etiquetas proyectadas sobre el planeta 3D | Tarjetas reales (`.planet-picker`) | Tarjetas en fila |
| Ficha de servicio | Panel lateral 460px | Hoja inferior 62svh | Hoja lateral 58vw |
| Volver | Migas + «Volver» | «← Lunas» en la hoja + migas | Ídem, migas limitadas a 46vw |
| Encuadre | Cámara corrida en X | Cámara corrida en Y | Corrida en X |

En vertical los dos planetas no caben de lado a lado, así que la selección pasa a
tarjetas táctiles y la hoja deja el planeta y sus lunas siempre a la vista.

Detalles que importan: las secciones usan `svh` (no `dvh`) para que la barra del
navegador móvil no altere las alturas de encuadre; `body` usa `overflow-x: clip`
(con `hidden` el body se vuelve su propio contenedor de scroll y rompe el snap);
y la escena mide render, raycast y proyección contra el **canvas** vía
`ResizeObserver`, no contra `window`.

## Reemplazar los mocks por contenido real

Todo vive en `src/data/planets.ts` y `src/data/site.ts`:

- **Videos / tráilers**: cambia el `youtubeId` (hoy usa cortos CC de Blender Studio).
- **Canciones**: cada ítem `audio` tiene un `track` generativo (`bpm`, `root`,
  `scale`, `mood`, `seed`). Para audio real, añade la URL y ajusta
  `buildAudioPlayer` en `src/scripts/ui.ts` para usar un `<audio>`.
- **Servicios / lunas**: cada servicio define su luna (`kind`, `size`, `orbit`,
  colores). Kinds: `ink, pulse, vinyl, pearl, ringed, duotone, chrome, jade,
  storm, neon, ice, asteroid, terracotta`.
- **Correo y textos**: `SITE` en `src/data/site.ts`.

## Rendimiento y accesibilidad

- Texturas 100% procedurales (canvas + ruido fBM) — sin assets externos.
- `pixelRatio` limitado, menos estrellas en móvil, raycast solo cuando el puntero
  se mueve, render pausado con la pestaña oculta.
- Scroll nativo (sin scroll-jacking); `prefers-reduced-motion` desactiva el snap
  y las animaciones.
- Planetas y lunas navegables por teclado (etiquetas y chips son `<button>` reales).
