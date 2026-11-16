(function () {
  "use strict";

  var cfg = window.SITE_CONFIG || {};
  var RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var digits = function (s) { return String(s || "").replace(/\D/g, ""); };
  var hasIO = "IntersectionObserver" in window;

  /* ---------------- Контакты из config.js ---------------- */
  var profiUrl = cfg.profiUrl || "https://profi.ru/profile/SultanOV/";
  var phoneDigits = digits(cfg.phone).replace(/^8(\d{10})$/, "7$1");
  var tel = phoneDigits.length >= 10 ? "tel:+" + phoneDigits : "";

  $$("[data-call]").forEach(function (a) {
    if (tel) {
      a.href = tel;
      a.setAttribute("aria-label", "Позвонить по номеру " + cfg.phone);
    } else { // номера ещё нет — ведём в профиль на Профи.ру
      a.href = profiUrl;
      a.target = "_blank";
      a.rel = "noopener";
      a.classList.add("is-profi");
      a.textContent = a.classList.contains("btn--sm") ? "Связаться" : "Связаться на Профи.ру";
    }
  });
  $$("[data-phone]").forEach(function (a) {
    if (!tel) return;
    a.href = tel; a.textContent = cfg.phone; a.hidden = false;
  });
  var wa = digits(cfg.whatsapp), tg = String(cfg.telegram || "").replace(/^@/, "").trim();
  $$('[data-contact="whatsapp"]').forEach(function (a) { if (wa) { a.href = "https://wa.me/" + wa; a.hidden = false; } });
  $$('[data-contact="telegram"]').forEach(function (a) { if (tg) { a.href = "https://t.me/" + tg; a.hidden = false; } });

  /* ---------------- Навигация ---------------- */
  var nav = $("#nav");
  var onNavScroll = function () { nav.classList.toggle("is-scrolled", window.scrollY > 8); };
  onNavScroll();
  window.addEventListener("scroll", onNavScroll, { passive: true });

  (function activeSection() { // подсветка раздела плавно переезжает между пунктами
    var pill = $(".nav__pill");
    var links = $$(".nav__links a");
    if (!pill || !links.length || !hasIO) return;
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var current = null;
    function move(a) {
      if (a === current) return;
      current = a;
      links.forEach(function (l) { l.classList.toggle("is-active", l === a); });
      if (!a) { pill.style.opacity = "0"; return; }
      pill.style.width = a.offsetWidth + "px";
      pill.style.transform = "translateX(" + a.offsetLeft + "px)";
      pill.style.opacity = "1";
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) move(byId[e.target.id] || null); });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(byId).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
    io.observe($("#hero"));
    io.observe($("#svyaz"));
    io.observe($("#o-sebe"));
  })();

  /* ---------------- Первый экран: Jolion въезжает, колёса крутятся по пройденному пути ---------------- */
  var hero = $("#hero");
  var showcase = $("#showcase");
  var mover = $("#mover");
  var carbody = $("#carbody");
  var carImg = $(".carbody__img");
  var spins = $$(".wheel__spin");
  var blurs = $$(".wheel__blur");

  function drive() {
    // путь: из-за правого края экрана, чуть из глубины, вдоль оси машины (она смотрит вперёд-влево)
    mover.style.transform = "none";
    var r = mover.getBoundingClientRect();
    var dx = window.innerWidth - r.left - r.width * 0.06;   // в начале виден только нос
    var dy = -dx * 0.094;                                   // ось кузова на фото наклонена на ~5°
    var S0 = 0.86;
    var wheelR = (91.5 / 1136) * r.width;                   // радиус переднего диска на экране
    var dist = Math.hypot(dx, dy);
    var turns = Math.max(1, Math.round(dist / (2 * Math.PI * wheelR)));
    var DUR = Math.min(4200, Math.max(2600, dist * 2.6));
    var ease = function (t) { return 1 - Math.pow(1 - t, 2.4); }; // ровное торможение до остановки

    var t0 = null, lastTs = null, lastX = null, lastV = 0, pitch = 0, pitchV = 0, lastRot = null, parked = false;

    function frame(ts) {
      if (t0 === null) { t0 = ts; lastTs = ts; }
      var dt = Math.max(1, Math.min(48, ts - lastTs)); lastTs = ts;
      var k = Math.min(1, (ts - t0) / DUR), p = ease(k);

      var x = dx * (1 - p), y = dy * (1 - p), s = S0 + (1 - S0) * p;
      // мелкая дрожь дороги, пока машина едет
      var speed = 1 - p;
      var bump = Math.sin(ts / 38) * 0.5 * speed + Math.sin(ts / 23) * 0.3 * speed;
      mover.style.transform = "translate3d(" + x.toFixed(2) + "px," + (y + bump).toFixed(2) + "px,0) scale(" + s.toFixed(4) + ")";

      // колёса: ровно столько оборотов, сколько машина проехала; в конце угол 0, как на фото
      var rot = turns * 360 * (1 - p);
      spins.forEach(function (el) { el.style.transform = "rotate(" + rot.toFixed(2) + "deg)"; });
      var w = lastRot === null ? 0 : Math.abs(rot - lastRot) / dt; // градусов за мс
      lastRot = rot;
      var bo = Math.max(0, Math.min(1, (w - 0.12) / 0.45));
      blurs.forEach(function (el) { el.style.opacity = bo.toFixed(3); });

      // кузов: клюёт носом при торможении и раскачивается на подвеске после остановки
      var v = lastX === null ? 0 : (x - lastX) / dt;
      var acc = (v - lastV) / dt;
      lastX = x; lastV = v;
      var target = Math.max(-1.4, Math.min(1.4, -acc * 1400));
      for (var sub = 0; sub < dt; sub += 4) {
        var h = Math.min(4, dt - sub);
        pitchV += (0.0011 * (target - pitch) - 0.03 * pitchV) * h;
        pitch += pitchV * h;
      }
      carbody.style.transform = "rotate(" + pitch.toFixed(3) + "deg)";

      if (k >= 1 && !parked) { parked = true; showcase.classList.add("is-parked"); }
      if (k < 1 || Math.abs(pitch) > 0.004 || Math.abs(pitchV) > 0.0004) requestAnimationFrame(frame);
      else { carbody.style.transform = ""; mover.style.transform = "none"; }
    }

    mover.style.transform = "translate3d(" + dx + "px," + dy + "px,0) scale(" + S0 + ")";
    spins.forEach(function (el) { el.style.transform = "rotate(" + (turns * 360) + "deg)"; });
    requestAnimationFrame(frame);
  }

  (function enter() {
    var root = document.documentElement;
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var imgs = [carImg].concat($$(".wheel img")).filter(Boolean);
    var imgReady = Promise.all(imgs.map(function (im) { return im.decode ? im.decode().catch(function () {}) : null; }));
    var started = false;
    var go = function () {
      if (started) return; started = true;
      root.classList.add("is-loaded");
      if (RM || !mover) { if (mover) mover.style.transform = "none"; showcase.classList.add("is-parked"); return; }
      setTimeout(drive, 250);
    };
    Promise.race([Promise.all([fontsReady, imgReady]), new Promise(function (r) { setTimeout(r, 2000); })]).then(function () {
      requestAnimationFrame(function () { requestAnimationFrame(go); });
    });
  })();

  /* ---------------- Строка проявляется слово за словом ---------------- */
  var statement = $("#statement");
  var words = [];
  if (statement && !RM) {
    var tokens = statement.textContent.trim().split(/([ \u00a0])/);
    statement.textContent = "";
    tokens.forEach(function (t) {
      if (t === " " || t === "\u00a0") { statement.appendChild(document.createTextNode(t)); return; }
      if (!t) return;
      var s = document.createElement("span");
      s.className = "w" + (/^\d/.test(t) ? " is-num" : "");
      s.textContent = t;
      statement.appendChild(s);
      words.push(s);
    });
  }

  /* ---------------- Рельс шагов заполняется ---------------- */
  var steps = $("#steps"), stepsFill = $("#stepsFill"), stepItems = $$(".step");

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var vh = window.innerHeight;
      if (words.length) {
        var r = statement.getBoundingClientRect();
        if (r.top < vh && r.bottom > 0) {
          var p = clamp((vh * 0.88 - r.top) / (r.height + vh * 0.42), 0, 1);
          var lit = Math.round(p * words.length * 1.04);
          words.forEach(function (w, i) { w.classList.toggle("is-lit", i < lit); });
        }
      }
      if (steps && stepsFill) {
        var sr = steps.getBoundingClientRect();
        var line = vh * 0.6;
        stepsFill.style.setProperty("--p", clamp((line - sr.top) / sr.height, 0, 1).toFixed(4));
        stepItems.forEach(function (li) { li.classList.toggle("is-passed", li.getBoundingClientRect().top < line); });
      }
    });
  }
  if (RM) {
    if (stepsFill) stepsFill.style.setProperty("--p", "1");
    stepItems.forEach(function (li) { li.classList.add("is-passed"); });
  } else {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
  }

  /* ---------------- Появление блоков ---------------- */
  if (!RM && hasIO) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); rio.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    $$("[data-reveal]").forEach(function (el) { rio.observe(el); });
  } else {
    $$("[data-reveal]").forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------------- Рычаги КПП, полосы оценок, счётчик ---------------- */
  function once(el, fn, threshold) {
    if (!el || !hasIO) return;
    var io = new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) { fn(); io.disconnect(); }
    }, { threshold: threshold || 0.4 });
    io.observe(el);
  }

  if (!RM) {
    once($("#cars"), function () { $("#cars").classList.add("is-seen"); }, 0.35);

    var bars = $("#bars");
    if (bars && hasIO) {
      bars.classList.add("is-wait");
      once(bars, function () { bars.classList.remove("is-wait"); }, 0.5);
    }

    var num = $("#scoreNum");
    if (num && hasIO) {
      num.textContent = "0,00";
      once(num, function () {
        var s = null;
        var step = function (ts) {
          if (s === null) s = ts;
          var k = clamp((ts - s) / 1500, 0, 1);
          var v = 4.95 * (1 - Math.pow(1 - k, 4));
          num.textContent = v.toFixed(2).replace(".", ",");
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }, 0.6);
    }
  }

  /* ---------------- Вопросы: плавное раскрытие ---------------- */
  $$(".faq details").forEach(function (d) {
    var summary = $("summary", d);
    var panel = $(".faq__body", d);
    var anim = null;
    if (d.open) d.classList.add("is-open");

    summary.addEventListener("click", function (e) {
      e.preventDefault();
      var opening = !d.classList.contains("is-open");
      var from = anim ? panel.offsetHeight : (opening ? 0 : panel.offsetHeight);
      if (anim) { anim.cancel(); anim = null; }

      if (opening) {
        d.open = true;
        d.classList.add("is-open");
        summary.setAttribute("aria-expanded", "true");
        if (RM || !panel.animate) return;
        var to = panel.scrollHeight;
        anim = panel.animate(
          [{ height: from + "px", opacity: 0 }, { height: to + "px", opacity: 1 }],
          { duration: 560, easing: "cubic-bezier(.2, .8, .2, 1)" }
        );
        anim.onfinish = function () { anim = null; };
      } else {
        d.classList.remove("is-open");
        summary.setAttribute("aria-expanded", "false");
        if (RM || !panel.animate) { d.open = false; return; }
        anim = panel.animate(
          [{ height: from + "px", opacity: 1 }, { height: "0px", opacity: 0 }],
          { duration: 420, easing: "cubic-bezier(.65, 0, .35, 1)" }
        );
        anim.onfinish = function () { anim = null; if (!d.classList.contains("is-open")) d.open = false; };
      }
    });
  });

  /* ---------------- Карусель: фото по центру, соседние меньше, по кругу ---------------- */
  (function carousel() {
    var track = $("#crTrack");
    if (!track) return;
    var originals = $$(".cr__slide", track);
    var n = originals.length;
    var cap = $("#crCap"), dotsBox = $("#crDots"), prev = $("#crPrev"), next = $("#crNext");

    // копии слева и справа: так по бокам всегда есть соседние фото, а листать можно без конца
    function cloneSet() {
      return originals.map(function (s) {
        var c = s.cloneNode(true);
        c.setAttribute("aria-hidden", "true");
        c.dataset.clone = "1";
        var a = c.firstElementChild; a.tabIndex = -1; a.dataset.clone = "1";
        return c;
      });
    }
    var before = cloneSet(), after = cloneSet();
    before.forEach(function (c) { track.insertBefore(c, originals[0]); });
    after.forEach(function (c) { track.appendChild(c); });
    var slides = $$(".cr__slide", track); // 3 набора: копии, оригиналы, копии
    track.style.paddingLeft = track.style.paddingRight = "0px";

    var active = -1, ticking = false, settleTimer = null;
    var logical = function (i) { return ((i % n) + n) % n; };
    var setWidth = function () { return slides[n].offsetLeft - slides[0].offsetLeft; };
    var centerOf = function (i) { var s = slides[i]; return s.offsetLeft + s.offsetWidth / 2 - track.clientWidth / 2; };

    var dots = originals.map(function (s, i) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "cr__dot";
      b.setAttribute("aria-label", "Фото " + (i + 1) + " из " + n);
      b.addEventListener("click", function () { pause(); goLogical(i); });
      dotsBox.appendChild(b);
      return b;
    });

    function update() {
      var mid = track.scrollLeft + track.clientWidth / 2, best = 0, bd = Infinity;
      slides.forEach(function (s, i) {
        var d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - mid);
        if (d < bd) { bd = d; best = i; }
        if (!RM) {
          var k = Math.min(1, d / (s.offsetWidth * 0.75 + 40));
          var a = s.firstElementChild;
          a.style.transform = "scale(" + (1 - 0.14 * k).toFixed(4) + ")";
          a.style.opacity = (1 - 0.55 * k).toFixed(3);
        }
      });
      if (best === active) return;
      var prevLogical = active < 0 ? -1 : logical(active);
      active = best;
      slides.forEach(function (s, i) {
        var on = i === best;
        s.classList.toggle("is-active", on);
        if (!s.dataset.clone) s.firstElementChild.tabIndex = on || (logical(best) === i - n) ? 0 : -1;
      });
      var L = logical(best);
      if (L === prevLogical) return;
      dots.forEach(function (d, i) { d.classList.toggle("is-on", i === L); d.setAttribute("aria-current", i === L ? "true" : "false"); });
      var text = originals[L].firstElementChild.dataset.caption;
      if (RM) { cap.textContent = text; return; }
      cap.classList.add("is-swap");
      setTimeout(function () { cap.textContent = text; cap.classList.remove("is-swap"); }, 160);
    }

    // когда прокрутка остановилась на копии — незаметно переносимся на такой же оригинал
    function normalize() {
      if (drag) return;
      if (active < n || active >= 2 * n) {
        var shift = active < n ? setWidth() : -setWidth();
        track.style.scrollSnapType = "none";
        track.scrollLeft += shift;
        track.style.scrollSnapType = "";
        update();
      }
    }

    function goAbs(i, instant) {
      i = clamp(i, 0, slides.length - 1);
      track.scrollTo({ left: centerOf(i), behavior: instant || RM ? "auto" : "smooth" });
      if (instant) update();
    }
    function goLogical(L, instant) { // ближайший к текущему экземпляр нужного фото
      var base = active < 0 ? n : active, best = n + L, bd = Infinity;
      for (var s = 0; s < 3; s++) { var i = s * n + L, d = Math.abs(i - base); if (d < bd) { bd = d; best = i; } }
      goAbs(best, instant);
    }
    window.__carouselGo = function (L, instant) { normalize(); goLogical(L, instant); };

    track.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; update(); }); }
      clearTimeout(settleTimer); settleTimer = setTimeout(normalize, 160);
    }, { passive: true });

    prev.addEventListener("click", function () { pause(); goAbs(active - 1); });
    next.addEventListener("click", function () { pause(); goAbs(active + 1); });
    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); pause(); goAbs(active + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); pause(); goAbs(active - 1); }
    });

    // перетаскивание мышью (на телефоне работает обычный свайп)
    var drag = null, moved = false;
    track.addEventListener("pointerdown", function (e) {
      pause();
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      drag = { x: e.clientX, left: track.scrollLeft, last: e.clientX, v: 0, t: performance.now() }; moved = false;
    });
    window.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x;
      if (!moved && Math.abs(dx) > 5) { moved = true; track.classList.add("is-drag"); }
      if (!moved) return;
      var now = performance.now();
      drag.v = (e.clientX - drag.last) / Math.max(1, now - drag.t); drag.last = e.clientX; drag.t = now;
      track.scrollLeft = drag.left - dx;
    });
    window.addEventListener("pointerup", function () {
      if (!drag) return;
      var v = drag.v; drag = null;
      if (!moved) return;
      track.classList.remove("is-drag");
      goAbs(active + (v < -0.4 ? 1 : v > 0.4 ? -1 : 0));
    });

    // соседнее фото — листаем к нему; центральное — открываем крупно (копию подменяем оригиналом)
    track.addEventListener("click", function (e) {
      var slide = e.target.closest(".cr__slide");
      if (!slide) return;
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; return; }
      var i = slides.indexOf(slide);
      if (!slide.classList.contains("is-active")) { e.preventDefault(); e.stopPropagation(); pause(); goAbs(i); return; }
      if (slide.dataset.clone) {
        e.preventDefault(); e.stopPropagation();
        normalize();
        originals[logical(i)].firstElementChild.click();
      }
    }, true);

    // автопрокрутка по кругу: пауза при наведении, касании, в просмотре фото и вне экрана
    var visible = false, hover = false, pausedUntil = 0;
    function pause() { pausedUntil = Date.now() + 9000; }
    var lb = $("#lightbox");
    if (!RM) {
      track.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") hover = true; });
      track.addEventListener("pointerleave", function () { hover = false; });
      track.addEventListener("focusin", pause);
      if (hasIO) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }, { threshold: 0.5 }).observe(track);
      setInterval(function () {
        if (!visible || hover || document.hidden || Date.now() < pausedUntil || (lb && lb.open) || drag) return;
        goAbs(active + 1);
      }, 3800);
    }

    window.addEventListener("resize", function () { var L = active < 0 ? 0 : logical(active); goAbs(n + L, true); }, { passive: true });
    goAbs(n, true);
    window.addEventListener("load", function () { goAbs(n + logical(active < 0 ? n : active), true); });
  })();

  /* ---------------- Галерея: превью раскрывается в полноэкранный просмотр ---------------- */
  (function gallery() {
    var links = $$(".gal__item:not([data-clone])");
    var dlg = $("#lightbox");
    if (!links.length || !dlg || typeof dlg.showModal !== "function") return; // без поддержки — обычные ссылки на фото
    var img = $("#lbImg"), cap = $("#lbCap"), cnt = $("#lbCount");
    var idx = 0, busy = false, closing = false;
    var EASE = "cubic-bezier(.2, .8, .2, 1)";

    function load(i) {
      idx = (i + links.length) % links.length;
      var a = links[idx];
      img.src = a.getAttribute("href");
      img.width = +a.dataset.w; img.height = +a.dataset.h;
      img.alt = $("img", a).alt;
      cap.textContent = a.dataset.caption;
      cnt.textContent = (idx + 1) + " из " + links.length;
      return img.decode ? img.decode().catch(function () {}) : Promise.resolve();
    }

    // кадр «из превью»: квадрат на месте миниатюры
    function fromThumb(thumb) {
      var t = thumb.getBoundingClientRect(), r = img.getBoundingClientRect();
      var s = Math.max(t.width / r.width, t.height / r.height);
      var cx = (r.width - t.width / s) / 2, cy = (r.height - t.height / s) / 2;
      var dx = (t.left + t.width / 2) - (r.left + r.width / 2), dy = (t.top + t.height / 2) - (r.top + r.height / 2);
      return {
        transform: "translate(" + dx + "px," + dy + "px) scale(" + s + ")",
        clipPath: "inset(" + cy + "px " + cx + "px round " + (20 / s) + "px)"
      };
    }
    var FULL = { transform: "none", clipPath: "inset(0px 0px round 18px)" };

    function open(i) {
      if (busy || closing) return; busy = true;
      document.documentElement.classList.add("lb-lock");
      load(i).then(function () {
        dlg.showModal();
        requestAnimationFrame(function () { dlg.classList.add("is-open"); });
        img.style.transformOrigin = "50% 50%";
        if (RM) { busy = false; return; }
        var anim = img.animate([fromThumb(links[idx]), FULL], { duration: 560, easing: EASE });
        anim.onfinish = function () { busy = false; };
      });
    }

    function close() { // закрывается в любой момент, даже во время перелистывания
      if (closing || !dlg.open) return; closing = true;
      if (img.getAnimations) img.getAnimations().forEach(function (an) { an.cancel(); });
      busy = false;
      dlg.classList.remove("is-open");
      var done = function () {
        dlg.close(); closing = false;
        document.documentElement.classList.remove("lb-lock");
        links[idx].focus({ preventScroll: true });
      };
      if (RM) { done(); return; }
      var thumb = links[idx];
      if (window.__carouselGo) window.__carouselGo(idx, true);
      thumb.scrollIntoView({ block: "nearest" });
      var anim = img.animate([FULL, fromThumb(thumb)], { duration: 440, easing: "cubic-bezier(.4, 0, .2, 1)", fill: "forwards" });
      anim.onfinish = function () { done(); anim.cancel(); };
    }

    function step(dir) {
      if (busy || closing) return; busy = true;
      var out = RM ? null : img.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateX(" + (-dir * 40) + "px)" }], { duration: 180, easing: "ease-in", fill: "forwards" });
      var after = function () {
        load(idx + dir).then(function () {
          if (out) out.cancel();
          if (RM || !dlg.open || closing) { busy = false; return; }
          var a = img.animate([{ opacity: 0, transform: "translateX(" + (dir * 40) + "px)" }, { opacity: 1, transform: "none" }], { duration: 360, easing: EASE });
          a.onfinish = function () { busy = false; };
        });
      };
      if (out) out.onfinish = after; else after();
    }

    links.forEach(function (a, i) {
      a.addEventListener("click", function (e) { e.preventDefault(); open(i); });
    });
    $("#lbClose").addEventListener("click", close);
    $("#lbPrev").addEventListener("click", function () { step(-1); });
    $("#lbNext").addEventListener("click", function () { step(1); });
    dlg.addEventListener("cancel", function (e) { e.preventDefault(); close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target.classList.contains("lb__fig")) close(); });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    });
    var sx = null;
    dlg.addEventListener("pointerdown", function (e) { sx = e.clientX; });
    dlg.addEventListener("pointerup", function (e) {
      if (sx === null) return;
      var d = e.clientX - sx; sx = null;
      if (Math.abs(d) > 50) step(d < 0 ? 1 : -1);
    });
  })();

  /* ---------------- Кнопка звонка внизу экрана на телефоне ---------------- */
  (function dock() {
    var btn = $("#dock"), call = $("#svyaz");
    if (!btn || !hasIO) return;
    var heroSeen = true, callSeen = false;
    var upd = function () { btn.classList.toggle("is-on", !heroSeen && !callSeen); };
    new IntersectionObserver(function (e) { heroSeen = e[0].isIntersecting; upd(); }, { rootMargin: "0px 0px -60% 0px" }).observe(hero);
    new IntersectionObserver(function (e) { callSeen = e[0].isIntersecting; upd(); }).observe(call);
  })();
})();
