// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  // Sitio 100% estático: todo el HTML se pre-renderiza en build
  output: "static",
  // Respeta el puerto asignado por el entorno (si no, 4321)
  server: { port: Number(process.env.PORT) || 4321 },
  build: {
    inlineStylesheets: "auto",
  },
  // La barra flotante de Astro estorba sobre una experiencia a pantalla completa
  devToolbar: { enabled: false },
  // Three.js y GSAP quedan en un chunk aparte gracias al import dinámico
  // de src/scripts/scene.ts: se descargan en paralelo con la pantalla de intro.
});
