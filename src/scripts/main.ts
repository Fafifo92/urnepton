/* ============================================================
   URNEPTON — orquestador principal
   Une la escena 3D, el audio, la UI y el scroll-storytelling.

   El bundle de Three.js se carga en paralelo con la pantalla de
   intro (import dinámico), así el primer pintado no lo espera.
   ============================================================ */

import { PLANETS } from "../data/planets";
import type { PlanetId } from "../data/types";
import { audio } from "./audio";
import type { Cosmos, PickTarget } from "./scene";
import {
  initReveals, initCatalog, initModal,
  closeModal, isModalOpen,
  fillOrbitHeader, openServicePanel, closeServicePanel,
} from "./ui";

const $ = <T extends HTMLElement = HTMLElement>(sel: string) =>
  document.querySelector(sel) as T;
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- UI que no depende del 3D ---------- */

initCatalog();
initModal();
initReveals();

let cosmos: Cosmos | null = null;
let savedScrollY = 0;
let chooseActive = false;
let orbitOpen = false;
let currentPlanet: PlanetId | null = null;

const moonTip = $("#moon-tip");
const tagEls: Record<PlanetId, HTMLElement> = {
  production: $("#tag-production"),
  post: $("#tag-post"),
};

/* ---------- anclas de cámara ---------- */

function computeAnchors() {
  if (!cosmos) return;
  const vh = innerHeight;
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
  const centerP = (el: HTMLElement) =>
    Math.min(1, Math.max(0, (el.offsetTop + el.offsetHeight / 2 - vh / 2) / maxScroll));

  const beats = [...document.querySelectorAll<HTMLElement>("#journey .beat")];
  const anchors = [
    { p: 0, pose: "hero" },
    { p: centerP(beats[0]), pose: "beat0" },
    { p: centerP(beats[1]), pose: "beat1" },
    { p: centerP(beats[2]), pose: "beat2" },
    { p: centerP(beats[3]), pose: "beat3" },
    { p: centerP($("#choose")), pose: "choose" },
    { p: centerP($("#catalogo")), pose: "catalog" },
    { p: centerP($("#manifiesto")), pose: "manifest" },
    { p: 1, pose: "contact" },
  ];
  // Garantizar orden estrictamente creciente
  for (let i = 1; i < anchors.length; i++) {
    if (anchors[i].p <= anchors[i - 1].p) anchors[i].p = anchors[i - 1].p + 0.001;
  }
  cosmos.setTrack(anchors);
}

/* ---------- carga del motor 3D ---------- */

const introBar = $("#intro-bar");
let barPct = 0;
const barTimer = setInterval(() => {
  barPct = Math.min(92, barPct + 6 + Math.random() * 10);
  introBar.style.width = `${barPct}%`;
}, 130);

import("./scene")
  .then(({ Cosmos }) => {
    cosmos = new Cosmos($<HTMLCanvasElement>("#cosmos"), PLANETS);
    cosmos.onHoverChange = onHoverChange;
    computeAnchors();
    if (document.fonts) document.fonts.ready.then(computeAnchors);
    startLoop();
  })
  .catch((err) => {
    console.error("No se pudo iniciar la escena 3D", err);
  })
  .finally(() => {
    clearInterval(barTimer);
    introBar.style.width = "100%";
    $(".intro-actions").hidden = false;
    $<HTMLElement>(".intro-progress").style.opacity = "0.25";
  });

/* ---------- loop de render ---------- */

let rafId = 0;
let lastT = performance.now();

function frame(now: number) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  if (cosmos) {
    if (!orbitOpen) {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      cosmos.setProgress(scrollY / maxScroll);
    }
    cosmos.update(REDUCED ? Math.min(dt, 0.016) : dt);

    // Etiquetas proyectadas sobre los planetas (coords relativas a la sección)
    if (chooseActive && !orbitOpen) {
      const rect = $("#choose").getBoundingClientRect();
      for (const id of ["production", "post"] as PlanetId[]) {
        const pr = cosmos.projectPlanet(id);
        const el = tagEls[id];
        if (pr.visible) {
          el.style.left = `${pr.x! - rect.left}px`;
          el.style.top = `${pr.y! - rect.top}px`;
          el.classList.add("visible");
        } else {
          el.classList.remove("visible");
        }
      }
    } else {
      tagEls.production.classList.remove("visible");
      tagEls.post.classList.remove("visible");
    }
  }

  rafId = requestAnimationFrame(frame);
}

function startLoop() {
  if (rafId) return;
  lastT = performance.now();
  rafId = requestAnimationFrame(frame);
}
function stopLoop() {
  cancelAnimationFrame(rafId);
  rafId = 0;
}
/* En segundo plano no se gasta GPU */
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopLoop();
  else if (cosmos) startLoop();
});

let resizeTimer: ReturnType<typeof setTimeout>;
addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(computeAnchors, 180);
});

/* ---------- intro ---------- */

const intro = $("#intro");

function enterSite(withSound: boolean) {
  intro.classList.add("leaving");
  document.body.dataset.state = "site";
  if (withSound) {
    audio.ensure();
    audio.startAmbient();
    setAudioButton(true);
  }
  setTimeout(() => intro.remove(), 1000);
}
$("#enter-sound").addEventListener("click", () => enterSite(true));
$("#enter-silent").addEventListener("click", () => enterSite(false));

/* ---------- header, riel y scroll ---------- */

const header = $("#site-header");
const railLinks = [...document.querySelectorAll<HTMLAnchorElement>("#side-rail a")];

function updateRail() {
  const y = scrollY + innerHeight * 0.45;
  let active = railLinks[0];
  for (const a of railLinks) {
    const el = document.querySelector<HTMLElement>(a.getAttribute("href")!);
    if (el && el.offsetTop <= y) active = a;
  }
  railLinks.forEach((a) => a.classList.toggle("active", a === active));
}

let ticking = false;
addEventListener(
  "scroll",
  () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      header.classList.toggle("scrolled", scrollY > 40);
      updateRail();
      ticking = false;
    });
  },
  { passive: true }
);
updateRail();

/* El catálogo es la única zona de scroll libre: al cruzar el centro
   de la pantalla se desactiva el encuadre por sección. */
new IntersectionObserver(
  ([entry]) => {
    document.documentElement.classList.toggle("free-scroll", entry.isIntersecting);
  },
  { rootMargin: "-45% 0px -45% 0px" }
).observe($("#catalogo"));

/* Navegación interna */
function goTo(hash: string) {
  document.querySelector(hash)?.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth" });
}
[...document.querySelectorAll<HTMLAnchorElement>("[data-nav]"), ...railLinks].forEach((a) => {
  a.addEventListener("click", (ev) => {
    ev.preventDefault();
    const hash = a.getAttribute("href")!;
    if (orbitOpen) exitOrbitFlow(() => goTo(hash));
    else goTo(hash);
  });
});

/* ---------- audio ---------- */

function setAudioButton(on: boolean) {
  $("#audio-toggle").setAttribute("aria-pressed", String(on));
}
$("#audio-toggle").addEventListener("click", () => {
  audio.ensure();
  if (audio.ambientOn) {
    audio.stopAmbient();
    setAudioButton(false);
  } else {
    audio.startAmbient();
    setAudioButton(true);
  }
});

/* ---------- sección "elige tu planeta" ---------- */

new IntersectionObserver(
  ([e]) => {
    chooseActive = e.isIntersecting;
    if (cosmos) cosmos.interactive = chooseActive && !orbitOpen;
  },
  { threshold: 0.25 }
).observe($("#choose"));

/* ---------- puntero e interacción 3D ---------- */

let pointerX = 0;
let pointerY = 0;

function positionTip() {
  const flip = pointerX > innerWidth - 260;
  moonTip.style.left = `${pointerX}px`;
  moonTip.style.top = `${pointerY}px`;
  moonTip.style.transform = flip
    ? "translate(calc(-100% - 14px), -50%)"
    : "translate(14px, -50%)";
}

addEventListener("pointermove", (ev) => {
  pointerX = ev.clientX;
  pointerY = ev.clientY;
  cosmos?.setPointer(ev.clientX, ev.clientY);
  if (!moonTip.hidden) positionTip();
});

function hideTip() {
  moonTip.classList.remove("on");
  moonTip.hidden = true;
}

/* Tooltip con el nombre del servicio al pasar sobre su luna */
function onHoverChange(pick: PickTarget | null) {
  document.body.style.cursor = pick ? "pointer" : "";
  if (pick) audio.tick();
  if (pick?.type === "moon" && currentPlanet) {
    const svcs = PLANETS[currentPlanet].services;
    const idx = svcs.findIndex((s) => s.id === pick.id);
    if (idx >= 0) {
      moonTip.querySelector(".mt-idx")!.textContent = String(idx + 1).padStart(2, "0");
      moonTip.querySelector(".mt-name")!.textContent = svcs[idx].name;
      moonTip.hidden = false;
      positionTip();
      requestAnimationFrame(() => moonTip.classList.add("on"));
      return;
    }
  }
  hideTip();
}

document.addEventListener("click", (ev) => {
  if (!cosmos) return;
  const target = ev.target as HTMLElement;
  // Los clics sobre UI real no tocan la escena
  if (target.closest("button, a, input, .modal-card, .service-panel, #site-header, .cat-card")) return;
  if (isModalOpen()) return;

  cosmos.setPointer(ev.clientX, ev.clientY);
  const pick = cosmos.pickAtPointer();
  if (!pick) {
    // Clic al vacío en modo órbita: un paso atrás (cerrar panel)
    if (orbitOpen && !$("#service-panel").hidden) closePanelFlow();
    return;
  }
  if (pick.type === "planet" && chooseActive && !orbitOpen) enterOrbitFlow(pick.id);
  else if (pick.type === "moon" && orbitOpen) focusMoonFlow(pick.id);
});

/* Etiquetas de planetas (accesibles con teclado) */
(["production", "post"] as PlanetId[]).forEach((id) => {
  tagEls[id].addEventListener("click", () => enterOrbitFlow(id));
});

/* ---------- modo órbita ---------- */

/* Migas de pan + indicador de paso: siempre se sabe dónde estás y cómo volver */
function updateOrbitCrumbs(serviceId: string | null) {
  const p = currentPlanet ? PLANETS[currentPlanet] : null;
  if (!p) return;
  $("#crumb-planet").textContent = p.name;
  const moonBtn = $("#crumb-moon");
  const sep = $("#crumb-moon-sep");
  if (serviceId) {
    const svc = p.services.find((s) => s.id === serviceId);
    moonBtn.textContent = svc?.name || "";
    moonBtn.hidden = false;
    sep.hidden = false;
    $("#orbit-step").textContent = "Paso 3 de 3 — Explora el servicio";
  } else {
    moonBtn.hidden = true;
    sep.hidden = true;
    $("#orbit-step").textContent = "Paso 2 de 3 — Toca una luna";
  }
}

function enterOrbitFlow(planetId: PlanetId) {
  if (orbitOpen || !cosmos) return;
  orbitOpen = true;
  currentPlanet = planetId;
  savedScrollY = scrollY;
  cosmos.interactive = false;

  audio.ensure();
  audio.whoosh(1);

  fillOrbitHeader(planetId);
  updateOrbitCrumbs(null);
  document.body.dataset.state = "orbit";

  const ui = $("#orbit-ui");
  ui.hidden = false;
  // El fundido lo hace CSS: así GSAP no entra en el bundle inicial
  requestAnimationFrame(() => ui.classList.add("shown"));
  $<HTMLElement>("#orbit-hint").style.display = "";

  cosmos.enterOrbit(planetId);
}

function focusMoonFlow(serviceId: string) {
  if (!cosmos) return;
  audio.tick();
  cosmos.focusMoon(serviceId);
  openServicePanel(cosmos.activePlanet!, serviceId);
  updateOrbitCrumbs(serviceId);
  $("#orbit-ui").classList.add("panel-open");
  hideTip();
  // Correr el encuadre para que la luna no quede debajo del panel
  cosmos.setPanelShift(innerWidth > 860 ? Math.min(460, innerWidth * 0.36) / 2 : 0);
}

/* Un paso atrás: del servicio a las lunas */
function closePanelFlow() {
  closeServicePanel();
  cosmos?.clearMoonFocus();
  cosmos?.setPanelShift(0);
  updateOrbitCrumbs(null);
  $("#orbit-ui").classList.remove("panel-open");
  $<HTMLElement>("#orbit-hint").style.display = "";
}

function exitOrbitFlow(after?: () => void) {
  if (!orbitOpen || !cosmos) return;
  closeModal();
  closeServicePanel();
  cosmos.setPanelShift(0);
  $("#orbit-ui").classList.remove("panel-open");
  hideTip();
  audio.whoosh(-1);

  const ui = $("#orbit-ui");
  ui.classList.remove("shown");
  setTimeout(() => {
    if (!orbitOpen) ui.hidden = true;
  }, 600);

  cosmos.exitOrbit(() => {
    orbitOpen = false;
    currentPlanet = null;
    document.body.dataset.state = "site";
    document.body.style.overflow = "";
    scrollTo(0, savedScrollY);
    if (cosmos) cosmos.interactive = chooseActive;
    if (after) after();
  });
}

/* Navegar entre lunas (botones ‹ › y flechas del teclado) */
function stepMoon(dir: number) {
  if (!orbitOpen || !currentPlanet || !cosmos) return;
  const svcs = PLANETS[currentPlanet].services;
  const cur = svcs.findIndex((s) => s.id === cosmos!.activeMoon);
  const next = svcs[(cur + dir + svcs.length) % svcs.length];
  focusMoonFlow(next.id);
}

/* "Volver" inteligente: retrocede un paso cada vez */
$("#orbit-back").addEventListener("click", () => {
  if (!$("#service-panel").hidden) closePanelFlow();
  else exitOrbitFlow();
});
$("#crumb-system").addEventListener("click", () => exitOrbitFlow());
$("#crumb-planet").addEventListener("click", () => {
  if (!$("#service-panel").hidden) closePanelFlow();
});
$("#sp-prev").addEventListener("click", () => stepMoon(-1));
$("#sp-next").addEventListener("click", () => stepMoon(1));

$("#moon-nav").addEventListener("click", (ev) => {
  const chip = (ev.target as HTMLElement).closest<HTMLElement>(".moon-chip");
  if (chip) focusMoonFlow(chip.dataset.service!);
});

$("#service-close").addEventListener("click", closePanelFlow);

/* ---------- teclado ---------- */

addEventListener("keydown", (ev) => {
  if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
    if (orbitOpen && !isModalOpen()) {
      ev.preventDefault();
      stepMoon(ev.key === "ArrowRight" ? 1 : -1);
    }
    return;
  }
  if (ev.key !== "Escape") return;
  if (isModalOpen()) {
    closeModal();
    return;
  }
  if (orbitOpen && !$("#service-panel").hidden) {
    closePanelFlow();
    return;
  }
  if (orbitOpen) exitOrbitFlow();
});
