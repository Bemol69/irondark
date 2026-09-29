// Arma el sitio final en dist/ a partir de index.html + data/*.json
// Uso: node scripts/build.mjs   (Vercel lo ejecuta en cada commit, incluidos los del panel /admin)
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const DIST = path.join(ROOT, "dist");
const cfg = readJSON("sitio.config.json");
const SITE = (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : cfg.site_url).replace(/\/$/, "");

function readJSON(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
  } catch (e) {
    throw new Error(`No se pudo leer ${rel}: ${e.message}`);
  }
}
const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const clp = (n) => "$" + Math.round(Number(n) || 0).toLocaleString("es-CL").replace(/,/g, ".");
const num = (n) => Math.round(Number(n) || 0).toLocaleString("es-CL").replace(/,/g, ".");
const icon = (n, cls = "i") => `<svg class="${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

const aj = readJSON("data/ajustes.json");
const pr = readJSON("data/precios.json");
const ho = readJSON("data/horario.json");
const ga = readJSON("data/galeria.json");

// ---------- validaciones básicas (errores claros en el log de Vercel) ----------
if (aj.whatsapp && !/^56\d{9}$/.test(aj.whatsapp)) throw new Error(`WhatsApp inválido "${aj.whatsapp}": usa 569XXXXXXXX (11 dígitos)`);
const planes = (pr.planes || []).filter((p) => p.visible !== false && p.nombre);
if (!planes.length) throw new Error("No hay planes visibles en data/precios.json");
const grupos = (pr.grupos || []).filter((g) => g.personas && g.total).sort((a, b) => a.personas - b.personas);
const sesiones = (pr.sesiones || []).filter((s) => s.cantidad && s.total).sort((a, b) => a.cantidad - b.cantidad);
const fotos = (ga.fotos || []).filter((f) => f.foto).map((f) => ({ ...f, foto: f.foto.replace(/^\//, "") }));
for (const f of fotos) if (!fs.existsSync(path.join(ROOT, f.foto))) console.warn(`Aviso: falta la foto ${f.foto}`);

const IG = `https://www.instagram.com/${aj.instagram}/`;
const IG_DM = `https://ig.me/m/${aj.instagram}`;
const base = planes.find((p) => p.icono === "infinito") || planes[0];

// ---------- bloques de HTML ----------
const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const DIAS_C = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const planesHTML = planes
  .map(
    (p, i) => `
      <article class="plan spot${p.destacado ? " plan--hot" : ""}" data-reveal style="--d:${i * 0.06}s">
        <div class="plan__top">
          <span class="plan__ico">${icon(p.icono || "pesa")}</span>
          ${p.destacado ? `<span class="tag">Más elegido</span>` : `<span class="plan__n">0${i + 1}</span>`}
        </div>
        <h3 class="plan__name">${esc(p.nombre)}</h3>
        <p class="plan__det">${esc(p.detalle)}</p>
        <p class="plan__price"><span class="cur">$</span><span data-count="${p.precio}">${num(p.precio)}</span><small>/${esc(p.periodo || "mes")}</small></p>
        ${p.condicion ? `<p class="plan__cond">${icon("check")}${esc(p.condicion)}</p>` : ""}
        ${p.destacado ? `<a class="btn btn--light" href="${IG_DM}" target="_blank" rel="noopener">Inscribirme ${icon("arrow-up-right")}</a>` : ""}
      </article>`
  )
  .join("");

const gruposBtns = grupos
  .map((g, i) => `<button type="button" class="seg__b${i === 0 ? " is-on" : ""}" data-i="${i}" aria-pressed="${i === 0}">${g.personas}<small>personas</small></button>`)
  .join("");

const sesionesTicks = sesiones.map((s) => `<span>${s.cantidad}</span>`).join("");

const horarioHTML = (ho.bloques || [])
  .map(
    (b) => `
        <div class="hrow" data-reveal>
          <div class="hrow__d">${icon("calendar")}<span>${esc(b.dias)}</span></div>
          <div class="hrow__t"><b>${esc(b.abre)}</b><i></i><b>${esc(b.cierra)}</b></div>
        </div>`
  )
  .join("");

// Mapa de la semana: cada día muestra su franja abierta en una barra de 24 h
const semana = DIAS.map((d, di) => {
  const b = (ho.bloques || []).find((x) => {
    const a = DIAS.indexOf(x.desde), z = DIAS.indexOf(x.hasta);
    return a <= z ? di >= a && di <= z : di >= a || di <= z;
  });
  const h = (t) => { const [H, M] = t.split(":").map(Number); return H + M / 60; };
  const l = b ? (h(b.abre) / 24) * 100 : 0, w = b ? ((h(b.cierra) - h(b.abre)) / 24) * 100 : 0;
  return `<div class="wk__row" data-day="${di}"><span>${DIAS_C[di]}</span><div class="wk__bar">${b ? `<i style="left:${l}%;width:${w}%"></i>` : ""}<em class="wk__now"></em></div><small>${b ? `${b.abre}–${b.cierra}` : "Cerrado"}</small></div>`;
}).join("");

// Galería: dos filas que avanzan solas (cada fila va duplicada para que el loop no tenga cortes)
const shot = (f, i) => `<figure class="shot"><img src="${esc(f.foto)}" alt="${esc(f.texto || aj.nombre)}" decoding="async" width="900" height="1600"></figure>`;
const mitad = Math.ceil(fotos.length / 2);
const filaA = fotos.slice(0, mitad), filaB = fotos.slice(mitad).length ? fotos.slice(mitad) : fotos;
const loopRow = (arr) => [...arr, ...arr].map((f, i) => (i >= arr.length ? shot(f, 99).replace("<figure", '<figure aria-hidden="true"') : shot(f, i))).join("");

const valores = (aj.valores || ["Fuerza", "Disciplina", "Constancia"]).filter(Boolean);
const marquee = Array(4)
  .fill(valores.map((v) => `<span>${esc(v)}</span><svg class="star" aria-hidden="true"><use href="#i-star"/></svg>`).join(""))
  .join("");

const aviso = ho.aviso_activo && ho.aviso_texto ? `<div class="notice">${icon("alert")}<p>${esc(ho.aviso_texto)}</p></div>` : "";

const wa = aj.whatsapp
  ? `<a class="btn btn--ghost" href="https://api.whatsapp.com/send?phone=${aj.whatsapp}&text=${encodeURIComponent("Hola Iron Dark, quiero información para inscribirme.")}" target="_blank" rel="noopener">${icon("message")} WhatsApp</a>`
  : "";

// Datos para las partes interactivas (app.js)
const clientData = {
  grupos, sesiones, base: base.precio,
  bloques: (ho.bloques || []).map((b) => ({ desde: DIAS.indexOf(b.desde), hasta: DIAS.indexOf(b.hasta), abre: b.abre, cierra: b.cierra })),
};

// ---------- SEO: datos estructurados ----------
const openingHours = (ho.bloques || []).map((b) => {
  const a = DIAS.indexOf(b.desde), z = DIAS.indexOf(b.hasta);
  const names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const days = [];
  for (let d = a; ; d = (d + 1) % 7) { days.push(names[d]); if (d === z) break; }
  return { "@type": "OpeningHoursSpecification", dayOfWeek: days, opens: b.abre, closes: b.cierra };
});
const ld = {
  "@context": "https://schema.org",
  "@type": "ExerciseGym",
  name: aj.nombre,
  url: SITE + "/",
  image: SITE + "/img/og.jpg",
  logo: SITE + "/img/logo.jpg",
  address: { "@type": "PostalAddress", streetAddress: aj.direccion, addressLocality: aj.comuna, addressRegion: aj.region, addressCountry: "CL" },
  geo: { "@type": "GeoCoordinates", latitude: -33.4078015, longitude: -70.6964877 },
  openingHoursSpecification: openingHours,
  priceRange: `${clp(Math.min(...planes.map((p) => p.precio)))} - ${clp(Math.max(...planes.map((p) => p.precio)))}`,
  sameAs: [IG],
  makesOffer: planes.map((p) => ({ "@type": "Offer", name: p.nombre, price: p.precio, priceCurrency: "CLP" })),
};

const vars = {
  SITE,
  NOMBRE: esc(aj.nombre),
  SEO_TITULO: esc(`Gimnasio en ${aj.comuna} | ${aj.nombre}`),
  SEO_DESC: esc(`Gimnasio en ${aj.direccion}, ${aj.comuna}. Pase libre ${clp(base.precio)}/mes, planes para estudiantes, madrugadores, parejas y grupos, entrenador personal y pase gratis con tu cédula.`),
  IG, IG_DM,
  IG_USER: esc(aj.instagram),
  DIRECCION: esc(aj.direccion),
  COMUNA: esc(aj.comuna),
  REGION: esc(aj.region),
  MAPS_URL: esc(aj.maps_url),
  // "Cómo llegar": abre la ruta desde la ubicación del visitante hasta el gimnasio
  RUTA_URL: esc(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`Gimnasio ${aj.nombre.replace(/ gym$/i, "")}, ${aj.direccion}, ${aj.comuna}`)}`),
  MAPS_EMBED: esc(`https://www.google.com/maps?q=${encodeURIComponent(`${aj.nombre} ${aj.direccion} ${aj.comuna}`)}&z=16&output=embed`),
  HERO_PREGUNTA: heroPregunta(aj.hero_pregunta),
  HERO_BAJADA: esc(aj.hero_bajada),
  LEMA: esc(aj.lema),
  LEMA_WORDS: esc(aj.lema).split(" ").map((w) => `<span class="w"><span>${w}</span></span>`).join(" "),
  VALORES: valores.map(esc).join(" · "),
  BASE_PRECIO: num(base.precio),
  PLANES: planesHTML,
  GRUPOS_BTNS: gruposBtns,
  GRUPOS_COND: esc(pr.grupos_condicion),
  AMIGO_TITULO: esc(pr.amigo_titulo),
  AMIGO_TEXTO: esc(pr.amigo_texto),
  SESIONES_MAX: sesiones.length - 1,
  SESIONES_TICKS: sesionesTicks,
  PASE_TEXTO: esc(pr.pase_gratis_texto),
  HORARIO: horarioHTML,
  SEMANA: semana,
  GALERIA_A: loopRow(filaA),
  GALERIA_B: loopRow(filaB),
  MARQUEE: marquee,
  AVISO: aviso,
  WHATSAPP_BTN: wa,
  DATA: JSON.stringify(clientData).replace(/</g, "\\u003c"),
  LD: JSON.stringify(ld).replace(/</g, "\\u003c"),
  YEAR: String(new Date().getFullYear()),
  ICONS: fs.readFileSync(path.join(ROOT, "icons.svg"), "utf8"),
};

// "excusas" sale tachado en la portada: la primera palabra "excusas" se envuelve
function heroPregunta(t) {
  return esc(t).replace(/(excusas)/i, '<s class="strike">$1</s>').replace(/(cambios)/i, '<em class="glow">$1</em>');
}

let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
// Bloques opcionales <!-- SI:X -->...<!-- /SI:X -->
const cond = { PASE: pr.pase_gratis_activo !== false, GRUPOS: grupos.length > 0, SESIONES: sesiones.length > 0, GALERIA: fotos.length > 0 };
html = html.replace(/<!-- SI:(\w+) -->([\s\S]*?)<!-- \/SI:\1 -->/g, (_, k, body) => (cond[k] ? body : ""));
html = html.replace(/%%(\w+)%%/g, (m, k) => {
  if (!(k in vars)) throw new Error(`Falta el valor ${k} en build.mjs`);
  return vars[k];
});

// ---------- escribir dist ----------
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
const copy = (rel) => fs.cpSync(path.join(ROOT, rel), path.join(DIST, rel), { recursive: true });
["img", "styles.css", "app.js", "data"].forEach(copy);
fs.mkdirSync(path.join(DIST, "admin"));
fs.copyFileSync(path.join(ROOT, "admin/index.html"), path.join(DIST, "admin/index.html"));
fs.writeFileSync(
  path.join(DIST, "admin/config.yml"),
  fs.readFileSync(path.join(ROOT, "admin/config.yml"), "utf8").replace(/%%GITHUB_REPO%%/g, cfg.github_repo).replace(/%%SITE_URL%%/g, SITE)
);
fs.writeFileSync(path.join(DIST, "index.html"), html);
fs.writeFileSync(path.join(DIST, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${SITE}/sitemap.xml\n`);
fs.writeFileSync(
  path.join(DIST, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE}/</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url></urlset>\n`
);
console.log(`Listo: dist/ · ${planes.length} planes · ${grupos.length} promos · ${sesiones.length} paquetes · ${fotos.length} fotos · ${SITE}`);
