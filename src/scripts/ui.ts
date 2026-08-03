/* ============================================================
   URNEPTON — capa de UI (DOM)
   Las fichas del catálogo llegan pre-renderizadas desde Astro:
   aquí solo se filtran, se revelan y se abren en el visor.
   ============================================================ */

import { PLANETS, allCatalogItems } from "../data/planets";
import { TYPE_LABEL, type PlanetId, type ResolvedCatalogItem } from "../data/types";
import { audio } from "./audio";

const $ = <T extends HTMLElement = HTMLElement>(sel: string) =>
  document.querySelector(sel) as T;

/* Índice uid → proyecto, para resolver los clics de las fichas del HTML */
const ITEMS = new Map<string, ResolvedCatalogItem>(
  allCatalogItems().map((i) => [i.uid, i])
);

let catalogExpanded = false;
let activeFilter = "all";
let inlineCard: { el: HTMLElement } | null = null;
let preconnected = false;

/* pseudo-RNG corto para visuales deterministas */
function rng(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const fmtTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

const trackDuration = (track: { bpm?: number }) => (16 * 4 * 60) / (track.bpm || 90);

function preconnectYouTube() {
  if (preconnected) return;
  preconnected = true;
  for (const href of ["https://www.youtube-nocookie.com", "https://i.ytimg.com"]) {
    const l = document.createElement("link");
    l.rel = "preconnect";
    l.href = href;
    document.head.appendChild(l);
  }
}

/* ---------- reveals ---------- */

export function initReveals() {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.2 }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
}

/* ---------- catálogo ---------- */

let cardIO: IntersectionObserver | null = null;

function observeCards() {
  if (!cardIO) {
    cardIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e, i) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).style.transitionDelay = `${(i % 6) * 60}ms`;
            e.target.classList.add("in");
            cardIO!.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08 }
    );
  }
  document
    .querySelectorAll<HTMLElement>(".cat-card:not(.in):not([hidden])")
    .forEach((el) => cardIO!.observe(el));
}

function matchesFilter(card: HTMLElement): boolean {
  const planet = card.dataset.planet!;
  const type = card.dataset.type!;
  if (activeFilter === "all") return true;
  if (activeFilter === "production" || activeFilter === "post") return planet === activeFilter;
  if (activeFilter === "av") return type === "video" || type === "trailer";
  return type === activeFilter;
}

function applyCatalogState() {
  stopInline();
  let visible = 0;
  document.querySelectorAll<HTMLElement>(".cat-card").forEach((card) => {
    if (card.classList.contains("skeleton")) return;
    const allowed = (catalogExpanded || card.dataset.featured === "1") && matchesFilter(card);
    card.hidden = !allowed;
    if (allowed) visible++;
  });
  $("#catalog-empty").hidden = visible > 0;
  observeCards();
}

export function initCatalog() {
  const grid = $("#catalog-grid");

  /* Filtros */
  $("#catalog-filters").addEventListener("click", (ev) => {
    const chip = (ev.target as HTMLElement).closest<HTMLElement>(".chip");
    if (!chip) return;
    activeFilter = chip.dataset.filter!;
    document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    applyCatalogState();
  });

  /* Delegación de clics de las fichas */
  const openFromCard = (card: HTMLElement, target: HTMLElement) => {
    const item = ITEMS.get(card.dataset.uid!);
    if (!item) return;
    // El botón de play de las fichas de audio reproduce sin abrir el visor
    if (item.type === "audio" && target.closest(".cc-play")) {
      toggleInlinePlay(card, item);
      return;
    }
    openModal(item);
  };
  grid.addEventListener("click", (ev) => {
    const card = (ev.target as HTMLElement).closest<HTMLElement>(".cat-card");
    if (card) openFromCard(card, ev.target as HTMLElement);
  });
  grid.addEventListener("keydown", (ev) => {
    const e = ev as KeyboardEvent;
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = (e.target as HTMLElement).closest<HTMLElement>(".cat-card");
    if (!card) return;
    e.preventDefault();
    const item = ITEMS.get(card.dataset.uid!);
    if (item) openModal(item);
  });
  grid.addEventListener("pointerover", (ev) => {
    const card = (ev.target as HTMLElement).closest<HTMLElement>(".cat-card");
    if (card && (card.dataset.type === "video" || card.dataset.type === "trailer")) {
      preconnectYouTube();
    }
  });

  /* Expandir: skeletons y luego el catálogo completo */
  const expandBtn = $<HTMLButtonElement>("#catalog-expand");
  expandBtn.addEventListener("click", () => {
    if (catalogExpanded) return;
    const skeletons: HTMLElement[] = [];
    for (let i = 0; i < 6; i++) {
      const sk = document.createElement("article");
      sk.className = "cat-card skeleton in";
      sk.innerHTML = `
        <div class="cc-media"></div>
        <div class="cc-body">
          <div class="sk-line w80"></div>
          <div class="sk-line w60"></div>
          <div class="sk-line w40"></div>
        </div>`;
      skeletons.push(sk);
      grid.appendChild(sk);
    }
    expandBtn.disabled = true;
    expandBtn.style.opacity = "0.5";
    setTimeout(() => {
      skeletons.forEach((s) => s.remove());
      catalogExpanded = true;
      applyCatalogState();
      expandBtn.style.display = "none";
      $("#catalog-note").hidden = false;
    }, 900);
  });

  applyCatalogState();
}

function stopInline() {
  if (inlineCard) {
    inlineCard.el.classList.remove("playing");
    const bar = inlineCard.el.querySelector<HTMLElement>(".cc-progress span");
    if (bar) bar.style.width = "0%";
    inlineCard = null;
  }
  audio.stopTrack();
}

function toggleInlinePlay(el: HTMLElement, item: ResolvedCatalogItem) {
  if (inlineCard && inlineCard.el === el) {
    stopInline();
    return;
  }
  stopInline();
  audio.ensure();
  el.classList.add("playing");
  const bar = el.querySelector<HTMLElement>(".cc-progress span");
  inlineCard = { el };
  audio.playTrack(item.track!, {
    onProgress: (p) => {
      if (bar) bar.style.width = `${p * 100}%`;
    },
    onEnd: () => {
      if (inlineCard?.el === el) stopInline();
    },
  });
}

/* ---------- visor de proyecto ---------- */

let modalCleanup: (() => void) | null = null;

export function isModalOpen() {
  return !$("#project-modal").hidden;
}

export function openModal(item: ResolvedCatalogItem) {
  stopInline();
  const modal = $("#project-modal");
  $("#pm-kicker").textContent = `${item.planetName} · ${item.serviceName} · ${TYPE_LABEL[item.type]}`;
  $("#pm-title").textContent = item.title;
  $("#pm-client").textContent = `${item.client}${item.year ? " · " + item.year : ""}`;
  $("#pm-desc").textContent = item.description;

  const media = $("#pm-media");
  media.innerHTML = "";
  modalCleanup?.();
  modalCleanup = null;

  if (item.type === "video" || item.type === "trailer") media.appendChild(buildFacade(item));
  else if (item.type === "audio") media.appendChild(buildAudioPlayer(item));
  else media.appendChild(buildCaseBlock(item));

  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

export function closeModal() {
  const modal = $("#project-modal");
  if (modal.hidden) return;
  modal.hidden = true;
  // Destruir iframes y detener audio: nada queda sonando en segundo plano
  $("#pm-media").innerHTML = "";
  modalCleanup?.();
  modalCleanup = null;
  audio.stopTrack();
  audio.duck(false);
  if (document.body.dataset.state !== "orbit") document.body.style.overflow = "";
}

function buildFacade(item: ResolvedCatalogItem) {
  preconnectYouTube();
  const wrap = document.createElement("button");
  wrap.className = "yt-facade";
  wrap.type = "button";
  wrap.innerHTML = `
    <img src="https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg" alt="${item.title}" />
    <span class="yt-btn"></span>
    <span class="yt-note">Video demo · clic para reproducir</span>`;
  const img = wrap.querySelector("img")!;
  // Intentar máxima resolución, con fallback garantizado
  const hi = new Image();
  hi.onload = () => {
    if (hi.width > 200) img.src = hi.src;
  };
  hi.src = `https://i.ytimg.com/vi/${item.youtubeId}/maxresdefault.jpg`;

  wrap.addEventListener(
    "click",
    () => {
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube-nocookie.com/embed/${item.youtubeId}?autoplay=1&rel=0`;
      iframe.title = item.title;
      iframe.allow = "autoplay; encrypted-media; picture-in-picture";
      iframe.allowFullscreen = true;
      wrap.replaceWith(iframe);
      audio.duck(true);
      modalCleanup = () => audio.duck(false);
    },
    { once: true }
  );
  return wrap;
}

function buildAudioPlayer(item: ResolvedCatalogItem) {
  const track = item.track!;
  const dur = trackDuration(track);
  const wrap = document.createElement("div");
  wrap.className = "audio-player";
  wrap.dataset.planet = item.planetId;

  const r = rng(track.seed ?? 5);
  const N = 44;
  const heights = Array.from({ length: N }, () => 15 + Math.round(r() * 85));

  wrap.innerHTML = `
    <button class="ap-btn" aria-label="Reproducir">▶</button>
    <div class="ap-body">
      <div class="ap-wave">${heights.map((h) => `<i style="height:${h}%"></i>`).join("")}</div>
      <div class="ap-time">
        <span class="ap-cur">0:00</span>
        <span class="ap-note">Demo generativo · ${track.bpm} BPM</span>
        <span class="ap-total">${fmtTime(dur)}</span>
      </div>
    </div>`;

  const btn = wrap.querySelector<HTMLButtonElement>(".ap-btn")!;
  const bars = [...wrap.querySelectorAll<HTMLElement>(".ap-wave i")];
  const cur = wrap.querySelector<HTMLElement>(".ap-cur")!;
  let playing = false;

  const stop = () => {
    playing = false;
    btn.textContent = "▶";
    audio.stopTrack();
  };

  btn.addEventListener("click", () => {
    if (playing) {
      stop();
      return;
    }
    audio.ensure();
    playing = true;
    btn.textContent = "❚❚";
    audio.playTrack(track, {
      onProgress: (p) => {
        const lit = Math.floor(p * N);
        bars.forEach((b, i) => b.classList.toggle("lit", i <= lit));
        cur.textContent = fmtTime(p * dur);
      },
      onEnd: () => {
        playing = false;
        btn.textContent = "▶";
        bars.forEach((b) => b.classList.remove("lit"));
        cur.textContent = "0:00";
      },
    });
  });

  modalCleanup = stop;
  return wrap;
}

function buildCaseBlock(item: ResolvedCatalogItem) {
  const wrap = document.createElement("div");
  wrap.className = "case-block";
  const stats = item.stats || [["★", "proyecto"], ["✓", "entregado"], ["∞", "réplicas"]];
  wrap.innerHTML = `
    <div class="case-stat">
      ${stats.map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join("")}
    </div>`;
  return wrap;
}

export function initModal() {
  $("#project-modal").addEventListener("click", (ev) => {
    if ((ev.target as HTMLElement).closest("[data-close]")) closeModal();
  });
}

/* ---------- panel de servicio (modo órbita) ---------- */

export function fillOrbitHeader(planetId: PlanetId) {
  const p = PLANETS[planetId];
  $("#orbit-ui").dataset.planet = planetId;
  $("#orbit-kicker").textContent = p.role;
  $("#orbit-name").textContent = p.name;
  $("#orbit-desc").textContent = p.description;

  const nav = $("#moon-nav");
  nav.innerHTML = "";
  p.services.forEach((svc, i) => {
    const b = document.createElement("button");
    b.className = "moon-chip";
    b.dataset.service = svc.id;
    b.style.setProperty("--dot", svc.moon.colorB);
    b.innerHTML = `<span class="mc-idx">${String(i + 1).padStart(2, "0")}</span><span class="mc-dot"></span>${svc.name}`;
    nav.appendChild(b);
  });
}

function spThumbHTML(item: ResolvedCatalogItem) {
  if (item.type === "video" || item.type === "trailer") {
    return `<img loading="lazy" src="https://i.ytimg.com/vi/${item.youtubeId}/mqdefault.jpg" alt="" />`;
  }
  if (item.type === "audio") {
    const r = rng(item.track?.seed ?? 4);
    const bars = Array.from(
      { length: 9 },
      () => `<i style="height:${20 + Math.round(r() * 80)}%"></i>`
    ).join("");
    const color = item.planetId === "production" ? "var(--prod)" : "var(--post)";
    return `<span class="mini-wave" style="color:${color}">${bars}</span>`;
  }
  return `<span style="font-size:1.2rem;opacity:.7">✦</span>`;
}

export function openServicePanel(planetId: PlanetId, serviceId: string) {
  const planet = PLANETS[planetId];
  const idx = planet.services.findIndex((s) => s.id === serviceId);
  const svc = planet.services[idx];
  if (!svc) return;

  $("#sp-count").textContent = `Luna ${idx + 1} de ${planet.services.length}`;
  $("#sp-kicker").textContent = `Luna de ${planet.name}`;
  $("#sp-name").textContent = svc.name;
  $("#sp-tagline").textContent = svc.tagline;
  $("#sp-desc").textContent = svc.description;
  $("#sp-deliv").innerHTML = svc.deliverables.map((d) => `<span>${d}</span>`).join("");

  const cat = $("#sp-catalog");
  cat.innerHTML = "";
  svc.catalog.forEach((raw, i) => {
    const item: ResolvedCatalogItem = {
      ...raw,
      uid: `${planetId}-${svc.id}-${i}`,
      planetId,
      planetName: planet.name,
      serviceId: svc.id,
      serviceName: svc.name,
    };
    const b = document.createElement("button");
    b.className = "sp-item";
    b.innerHTML = `
      <span class="sp-thumb">${spThumbHTML(item)}</span>
      <span class="sp-meta">
        <span class="sp-item-title">${item.title}</span>
        <span class="sp-item-client">${item.client}</span>
        <span class="sp-item-type">${TYPE_LABEL[item.type]} · ${item.year || ""}</span>
      </span>`;
    b.addEventListener("click", () => openModal(item));
    cat.appendChild(b);
  });

  const panel = $("#service-panel");
  panel.hidden = false;
  requestAnimationFrame(() => panel.classList.add("open"));

  document
    .querySelectorAll<HTMLElement>(".moon-chip")
    .forEach((c) => c.classList.toggle("active", c.dataset.service === serviceId));
  $("#orbit-hint").style.display = "none";
}

export function closeServicePanel() {
  const panel = $("#service-panel");
  panel.classList.remove("open");
  setTimeout(() => {
    panel.hidden = true;
  }, 700);
  document.querySelectorAll(".moon-chip").forEach((c) => c.classList.remove("active"));
}
