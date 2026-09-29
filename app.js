/* IRON DARK — interacciones y animaciones */
(() => {
  const D = window.__ID__ || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const clp = (n) => "$" + Math.round(n).toLocaleString("es-CL").replace(/,/g, ".");
  const fmt = (n) => Math.round(n).toLocaleString("es-CL").replace(/,/g, ".");
  const ease = (t) => 1 - Math.pow(1 - t, 4);

  // Interpolación simple sin dependencias
  function tween(dur, fn, done) {
    const h = { stop: false };
    if (reduce) { fn(1); done && done(); return h; }
    const t0 = performance.now();
    const step = (now) => {
      if (h.stop) return;
      const p = Math.min(1, (now - t0) / dur);
      fn(ease(p));
      p < 1 ? requestAnimationFrame(step) : done && done();
    };
    requestAnimationFrame(step);
    return h;
  }
  function countTo(el, to, dur = 1200, from = 0) {
    tween(dur, (p) => (el.textContent = fmt(from + (to - from) * p)));
  }

  /* ---------- Carga ---------- */
  const loader = $(".loader");
  const seen = (() => { try { return sessionStorage.getItem("id_seen"); } catch { return null; } })();
  function intro() {
    heroIn();
  }
  if (loader) {
    const n = $(".loader__n", loader);
    const dur = seen || reduce ? 300 : 1200;
    tween(dur, (p) => {
      n.textContent = String(Math.round(p * 100)).padStart(3, "0");
    }, () => {
      try { sessionStorage.setItem("id_seen", "1"); } catch {}
      loader.classList.add("is-done");
      loader.animate([{ clipPath: "inset(0 0 0 0)" }, { clipPath: "inset(0 0 100% 0)" }], { duration: reduce ? 1 : 900, easing: "cubic-bezier(.7,0,.2,1)", fill: "forwards" })
        .finished.then(() => loader.remove());
      setTimeout(intro, reduce ? 0 : 250);
    });
  } else intro();

  /* ---------- Portada ---------- */
  function heroIn() {
    const lines = $$(".hero__title .chrome");
    lines.forEach((l, i) => l.animate(
      [{ transform: "translateY(60%) skewY(6deg)", opacity: 0, filter: "blur(12px)" }, { transform: "none", opacity: 1, filter: "blur(0)" }],
      { duration: reduce ? 1 : 1200, delay: reduce ? 0 : 120 + i * 140, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }
    ));
    $$(".hero__q, .hero__sub, .hero__cta, .eyebrow, .hero__foot").forEach((el, i) => el.animate(
      [{ opacity: 0, transform: "translateY(20px)" }, { opacity: 1, transform: "none" }],
      { duration: reduce ? 1 : 900, delay: reduce ? 0 : 500 + i * 90, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }
    ));
    const st = $(".strike");
    if (st) { st.style.setProperty("--st", 0); setTimeout(() => tween(700, (p) => st.style.setProperty("--st", p)), 1300); }
    $$("[data-scramble]").forEach(scramble);
  }

  function scramble(el) {
    const final = el.textContent, chars = "!<>-_\\/[]{}=+*^?#ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    if (reduce) return;
    let f = 0; const total = 34;
    const run = () => {
      el.textContent = final.split("").map((c, i) => (c === " " || i < (f / total) * final.length ? c : chars[(Math.random() * chars.length) | 0])).join("");
      if (++f <= total) requestAnimationFrame(run); else el.textContent = final;
    };
    run();
  }

  // Brillo del cromo que sigue al mouse
  const hero = $(".hero");
  if (hero && fine && !reduce) {
    const chromes = $$(".hero__title .chrome");
    hero.addEventListener("pointermove", (e) => {
      const y = e.clientY / innerHeight;
      chromes.forEach((c) => c.style.setProperty("--sheen", `${20 + y * 70}%`));
    });
  }

  /* ---------- Revelado, contadores ---------- */
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add("is-in");
    $$("[data-count]", e.target).forEach((c) => countTo(c, +c.dataset.count, 1400));
    io.unobserve(e.target);
  }), { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
  $$("[data-reveal]").forEach((el) => io.observe(el));


  // Cierre: palabras que suben
  const ft = $(".final__t");
  if (ft) new IntersectionObserver(([e], o) => {
    if (!e.isIntersecting) return; o.disconnect();
    $$(".w > span", ft).forEach((s, i) => s.animate([{ transform: "translateY(105%)" }, { transform: "none" }], { duration: reduce ? 1 : 1000, delay: i * 90, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }));
  }, { threshold: 0.3 }).observe(ft);

  /* ---------- Luz que sigue al mouse en las tarjetas ---------- */
  if (fine) {
    $$(".spot").forEach((el) => el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    }));

  }

  /* ---------- Navegación ---------- */
  const nav = $(".nav"), burger = $(".nav__burger"), drawer = $(".drawer");
  let lastY = scrollY;
  addEventListener("scroll", () => {
    const y = scrollY;
    nav.classList.toggle("is-hidden", y > lastY && y > 300 && !drawer.classList.contains("is-open"));
    lastY = y;
  }, { passive: true });
  const toggle = (open) => {
    drawer.classList.toggle("is-open", open);
    drawer.setAttribute("aria-hidden", !open);
    burger.setAttribute("aria-expanded", open);
    burger.querySelector("use").setAttribute("href", open ? "#i-x" : "#i-menu");
    document.body.style.overflow = open ? "hidden" : "";
  };
  burger.addEventListener("click", () => toggle(!drawer.classList.contains("is-open")));
  $$("a", drawer).forEach((a) => a.addEventListener("click", () => toggle(false)));
  const links = $$(".nav__links a");
  const secIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) links.forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === "#" + e.target.id));
  }), { rootMargin: "-45% 0px -50% 0px" });
  links.forEach((l) => { const s = $(l.getAttribute("href")); s && secIO.observe(s); });

  /* ---------- Promos grupales ---------- */
  const seg = $(".seg");
  if (seg && D.grupos?.length) {
    const people = $(".calc__people"), each = $("[data-g-each]"), btns = $$(".seg__b", seg);
    const ind = document.createElement("span"); ind.className = "seg__ind"; seg.prepend(ind);
    let shown = 0, anim = null, sel = -1;
    const place = (i) => { const b = btns[i]; ind.style.width = b.offsetWidth + "px"; ind.style.transform = `translateX(${b.offsetLeft - 6}px)`; };
    const show = (i) => {
      if (i === sel) return; sel = i;
      const g = D.grupos[i], per = g.total / g.personas;
      btns.forEach((b, k) => { b.classList.toggle("is-on", k === i); b.setAttribute("aria-pressed", k === i); });
      place(i);
      // Íconos: solo se animan los que se agregan
      const have = people.children.length;
      for (let k = have; k < g.personas; k++) {
        people.insertAdjacentHTML("beforeend", '<svg class="i"><use href="#i-user"/></svg>');
        people.lastChild.animate([{ opacity: 0, transform: "translateY(8px) scale(.85)" }, { opacity: 1, transform: "none" }], { duration: 260, delay: (k - have) * 40, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });
      }
      while (people.children.length > g.personas) people.lastChild.remove();
      $("[data-g-name]").textContent = `${g.nombre} · ${g.personas} personas`;
      $("[data-g-total]").textContent = clp(g.total);
      const save = Math.max(0, D.base * g.personas - g.total);
      $("[data-g-save]").textContent = clp(save);
      $(".calc__save").style.display = save ? "" : "none";
      // El número parte desde donde va (aunque se cambie rápido) y nunca hay dos animaciones a la vez
      if (anim) anim.stop = true;
      const from = shown;
      anim = tween(320, (p) => { shown = from + (per - from) * p; each.textContent = fmt(shown); });
    };
    seg.addEventListener("pointerdown", (e) => { const b = e.target.closest(".seg__b"); b && show(+b.dataset.i); });
    seg.addEventListener("click", (e) => { const b = e.target.closest(".seg__b"); b && show(+b.dataset.i); });
    addEventListener("resize", () => sel >= 0 && place(sel));
    show(0);
  }

  /* ---------- Entrenador personal ---------- */
  const range = $("[data-s-range]");
  if (range && D.sesiones?.length) {
    const S = D.sesiones, first = S[0].total / S[0].cantidad;
    let prevTotal = 0;
    const upd = () => {
      const i = +range.value, s = S[i], per = s.total / s.cantidad;
      range.style.setProperty("--p", `${(i / (S.length - 1)) * 100}%`);
      $("[data-s-n]").textContent = s.cantidad;
      const tot = $("[data-s-total]");
      tween(500, (p) => (tot.textContent = clp(prevTotal + (s.total - prevTotal) * p)));
      prevTotal = s.total;
      $("[data-s-each]").textContent = clp(per);
      const pct = Math.round((1 - per / first) * 100);
      $("[data-s-save]").textContent = pct > 0 ? `${pct}%` : "—";
    };
    range.addEventListener("input", upd); upd();
  }

  /* ---------- Abierto / cerrado (hora de Chile) ---------- */
  function nowChile() {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Santiago", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const day = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday"));
    return { day, min: (+get("hour") % 24) * 60 + +get("minute") };
  }
  const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const inRange = (b, d) => (b.desde <= b.hasta ? d >= b.desde && d <= b.hasta : d >= b.desde || d <= b.hasta);
  function status() {
    const { day, min } = nowChile(), B = D.bloques || [];
    const today = B.find((b) => inRange(b, day));
    const open = today && min >= toMin(today.abre) && min < toMin(today.cierra);
    let label, text;
    if (open) {
      const left = toMin(today.cierra) - min;
      label = "Abierto ahora";
      text = `Estamos <b>abiertos</b>. Cerramos a las <b>${today.cierra}</b>${left <= 90 ? ` (quedan ${left} min)` : ""}.`;
    } else {
      let next = null;
      for (let k = 0; k < 8 && !next; k++) {
        const d = (day + k) % 7, b = B.find((x) => inRange(x, d));
        if (b && (k > 0 || min < toMin(b.abre))) next = { k, b };
      }
      label = "Cerrado";
      const dn = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
      text = next ? `Ahora estamos <b>cerrados</b>. Abrimos ${next.k === 0 ? "hoy" : next.k === 1 ? "mañana" : "el " + dn[(day + next.k) % 7]} a las <b>${next.b.abre}</b>.` : "Revisa nuestro horario.";
    }
    $$("[data-status]").forEach((s) => { s.classList.toggle("is-open", !!open); s.classList.toggle("is-closed", !open); s.querySelector("span").textContent = label; });
    const st = $("[data-status-text]"); if (st) st.innerHTML = text;
    $$(".wk__row").forEach((r) => {
      const is = +r.dataset.day === day;
      r.classList.toggle("is-today", is);
      if (is) r.querySelector(".wk__now").style.left = `${(min / 1440) * 100}%`;
    });
  }
  status(); setInterval(status, 60000);

  // Barras de la semana crecen al aparecer
  const wk = $(".wk");
  if (wk && !reduce) new IntersectionObserver(([e], o) => {
    if (!e.isIntersecting) return; o.disconnect();
    $$(".wk__bar i", wk).forEach((b, k) => b.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 900, delay: k * 80, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }));
  }, { threshold: 0.4 }).observe(wk);

  /* ---------- Scroll suave (Lenis + GSAP) ---------- */
  addEventListener("load", () => {
    const G = window.gsap, ST = window.ScrollTrigger;
    let lenis = null;
    if (window.Lenis && !reduce) {
      lenis = window.__lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
      if (G && ST) { lenis.on("scroll", ST.update); G.ticker.add((t) => lenis.raf(t * 1000)); G.ticker.lagSmoothing(0); }
      else (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
      $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
        const t = $(a.getAttribute("href")); if (!t) return;
        e.preventDefault(); lenis.scrollTo(t, { offset: a.getAttribute("href") === "#top" ? 0 : -20, duration: 1.4 });
      }));
    }
    if (!G || !ST) return;
    G.registerPlugin(ST);

    // La portada se desvanece al bajar
    if (!reduce) {
      G.to(".hero__content", { yPercent: 25, opacity: 0, ease: "none", scrollTrigger: { trigger: ".hero", start: "40% top", end: "bottom top", scrub: true } });
      G.fromTo(".band", { xPercent: 2 }, { xPercent: -4, ease: "none", scrollTrigger: { trigger: ".band", start: "top bottom", end: "bottom top", scrub: true } });
    }
  });
})();
