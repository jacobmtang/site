// Design library stage (slide 04): a step at a time, each component inside its own Figma-style selection
// frame. Loop: every frame grows from a point to its component's size (revealing it; the tag shows the name
// and real size), the components demonstrate themselves, then the frames shrink back to points (clipping
// them away) and grow out around the next step. A step can hold one component or two small ones.
// data-zoom shows a small component larger (Figma-style zoom; the tag still reports its real size and the
// zoom). On narrow screens components scale down to fit.
// Demos: carousel (the page indicator springing through pages), lens (the Pacer title swapping words), press (the button's press-in), select (pills), rows (the sheet row's iOS press fill), notice (the empty-state action's press fill), dot (the selection dot's spring, ported from the
// app's SelectFillDot), check (the app's own success-check Lottie; lottie_light is loaded only when the
// stage first comes into view). Runs only while the stage is on screen. Reduced motion: first step, framed,
// static. Registered as a mount (see site.js); the cleanup clears timers, animations and the observer.
(window.siteMounts ||= []).push(() => {
  const stages = [...document.querySelectorAll('.lib-stage')];
  if (!stages.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOVE = 380, HOLD = 3200;
  const offs = [];

  // lottie_light (SVG only, ~45KB gzipped) and the check's JSON, fetched once for the whole site
  const loadLottie = () => (window.__lottieReady ||= new Promise((res, rej) => {
    if (window.lottie) return res(window.lottie);
    const sc = document.createElement('script');
    sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie_light.min.js';
    sc.onload = () => res(window.lottie); sc.onerror = rej;
    document.head.appendChild(sc);
  }));
  const loadCheck = () => (window.__checkData ||= fetch('/assets/data/success-check.json').then((r) => r.json()));

  // The selection dot: the app's geometry and motion (tint, a ring pulse, a disc that springs in a beat behind)
  const makeDot = (root, stage) => {
    const ring = root.querySelector('.ring'), disc = root.querySelector('.disc');
    const REST_R = 12.2, REST_STROKE = 1.6, DISC_R = 10, TEAL = [0x45, 0x81, 0x8e];
    const v = { tint: 0, fill: 0, bounce: 1 }, tracks = {};
    let raf = 0, last = 0;
    const outCubic = (t) => 1 - Math.pow(1 - t, 3), inCubic = (t) => t * t * t;
    const hex = (s) => { const h = s.trim().replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
    const draw = () => {
      const soft = hex(getComputedStyle(stage).getPropertyValue('--m-soft') || '#8A8A84');
      const c = soft.map((s, i) => Math.round(s + (TEAL[i] - s) * v.tint));
      ring.setAttribute('r', REST_R * v.bounce); ring.setAttribute('stroke-width', REST_STROKE * v.bounce);
      ring.setAttribute('stroke', `rgb(${c})`); disc.setAttribute('r', DISC_R * Math.max(0, v.fill));
    };
    const timing = (to, ms, ease, delay = 0) => ({ type: 't', to, ms, ease, delay });
    const spring = (to, damping, stiffness, mass, delay = 0) => ({ type: 's', to, damping, stiffness, mass, delay });
    const tick = (now) => {
      raf = 0;
      const dt = last ? Math.min(32, now - last) / 1000 : 1 / 60; last = now;
      let busy = false;
      for (const key in tracks) {
        const tr = tracks[key], st = tr.steps[tr.i];
        if (!st) { delete tracks[key]; continue; }
        busy = true;
        if (tr.start === null) tr.start = now;
        const t = now - tr.start - st.delay;
        if (t < 0) continue;
        if (st.type === 't') {
          const p = Math.min(1, t / st.ms);
          v[key] = tr.from + (st.to - tr.from) * st.ease(p);
          if (p === 1) { tr.i++; tr.start = null; tr.from = v[key]; tr.vel = 0; }
        } else {
          for (let n = 0; n < 4; n++) {
            const h = dt / 4, a = (-st.stiffness * (v[key] - st.to) - st.damping * tr.vel) / st.mass;
            tr.vel += a * h; v[key] += tr.vel * h;
          }
          if (Math.abs(v[key] - st.to) < 0.001 && Math.abs(tr.vel) < 0.01) { v[key] = st.to; tr.i++; tr.start = null; tr.from = v[key]; tr.vel = 0; }
        }
      }
      draw();
      if (busy) raf = requestAnimationFrame(tick); else last = 0;
    };
    const run = (key, steps) => { tracks[key] = { steps, i: 0, start: null, from: v[key], vel: 0 }; if (!raf) raf = requestAnimationFrame(tick); };
    const set = (on) => {
      if (on) {
        run('tint', [timing(1, 150, outCubic)]);
        run('bounce', [timing(1.25, 150, outCubic), timing(1, 300, outCubic)]);
        run('fill', [spring(1, 10, 220, 0.6, 70)]);
      } else {
        run('fill', [timing(0, 150, inCubic)]);
        run('tint', [timing(0, 180, outCubic, 50)]);
        run('bounce', [timing(0.9, 110, outCubic), timing(1, 220, outCubic)]);
      }
    };
    const reset = () => { cancelAnimationFrame(raf); raf = 0; for (const k in tracks) delete tracks[k]; v.tint = 0; v.fill = 0; v.bounce = 1; draw(); };
    draw();
    return { set, reset, stop: () => { cancelAnimationFrame(raf); raf = 0; } };
  };

  // The carousel indicator: one pill per page, the active one stretched and centred, edge dots shrunk;
  // position and length spring (damping 13, stiffness 180, mass 0.5), as in the app
  const makeCarousel = (root) => {
    const COUNT = 8, WINDOW = 5, DOT = 6, ACTIVE = 18, EDGE = 4, GAP = 6, DAMP = 13, STIFF = 180, MASS = 0.5;
    const els = [], st = [];
    for (let n = 0; n < COUNT; n++) { els.push(root.appendChild(document.createElement('span'))); st.push({ pos: 0, len: DOT, vp: 0, vl: 0, tPos: 0, tLen: DOT, op: 0 }); }
    let active = 0, first = true, raf = 0, last = 0;
    const paint = () => els.forEach((e, n) => { const s = st[n]; e.style.width = Math.max(0, s.len) + 'px'; e.style.opacity = s.op; e.style.transform = `translate(calc(-50% + ${s.pos}px), -50%)`; });
    const step = (s, x, v, tg, dt) => { const a = (-STIFF * (s[x] - s[tg]) - DAMP * s[v]) / MASS; s[v] += a * dt; s[x] += s[v] * dt; return Math.abs(s[x] - s[tg]) > 0.01 || Math.abs(s[v]) > 0.01; };
    const tick = (now) => {
      raf = 0; const dt = last ? Math.min(32, now - last) / 1000 : 1 / 60; last = now; let moving = false;
      st.forEach((s) => { for (let k = 0; k < 4; k++) { if (step(s, 'pos', 'vp', 'tPos', dt / 4)) moving = true; if (step(s, 'len', 'vl', 'tLen', dt / 4)) moving = true; } });
      paint(); if (moving) raf = requestAnimationFrame(tick); else last = 0;
    };
    const layout = () => {
      const start = Math.min(Math.max(active - 2, 0), Math.max(0, COUNT - WINDOW)), end = Math.min(start + WINDOW, COUNT);
      const lens = [];
      for (let n = start; n < end; n++) { const edge = (n === start && start > 0) || (n === end - 1 && end < COUNT); lens.push(n === active ? ACTIVE : edge ? EDGE : DOT); }
      const total = lens.reduce((a, b) => a + b, 0) + GAP * (lens.length - 1);
      let cur = -total / 2;
      st.forEach((s, n) => {
        if (n >= start && n < end) { const len = lens[n - start]; s.tPos = cur + len / 2; s.tLen = len; s.op = n === active ? 0.9 : len === EDGE ? 0.22 : 0.3; cur += len + GAP; }
        else { s.tPos = n < start ? -total / 2 - EDGE : total / 2 + EDGE; s.tLen = EDGE; s.op = 0; }
        if (first) { s.pos = s.tPos; s.len = s.tLen; }
      });
      if (first) { first = false; paint(); } else if (!raf) raf = requestAnimationFrame(tick);
    };
    layout();
    return {
      next: () => { active = (active + 1) % COUNT; layout(); },
      reset: () => { cancelAnimationFrame(raf); raf = 0; last = 0; active = 0; first = true; layout(); },
      stop: () => { cancelAnimationFrame(raf); raf = 0; },
    };
  };

  // The lens switch: the two words trade slots over 460ms (the app's curve), dipping to nothing as they cross;
  // each word's colour follows its position (active colour in the left slot, muted on the right)
  const makeLens = (root, stage) => {
    const a = root.querySelector('.is-a'), b = root.querySelector('.is-b'), GAP = 16, SLIDE = 460;
    const bez = (x1, y1, x2, y2) => {
      const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
      const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t, dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
      return (x) => { let t = x; for (let n = 0; n < 6; n++) { const d = dX(t); if (Math.abs(d) < 1e-6) break; t -= (X(t) - x) / d; } return Y(Math.min(1, Math.max(0, t))); };
    };
    const slideEase = bez(.4, 0, .2, 1), dipEase = bez(.42, 0, .58, 1);
    const W = {}, v = { aTx: 0, bTx: 0, dip: 0 };
    let active = 'a', raf = 0;
    // both widths at the active (400) weight, so the gap holds whichever word is active
    [['a', a], ['b', b]].forEach(([k, el]) => { el.classList.add('is-active'); W[k] = Math.round(el.getBoundingClientRect().width); el.classList.remove('is-active'); });
    root.style.width = W.a + W.b + GAP + 'px';
    const rgb = (name) => { const h = getComputedStyle(stage).getPropertyValue(name).trim().slice(1); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
    const mix = (t) => { const x = rgb('--m-active'), y = rgb('--m-soft'); return `rgb(${x.map((c, i) => Math.round(c + (y[i] - c) * t))})`; };
    const draw = () => {
      a.style.transform = `translate(${v.aTx}px, -50%)`; b.style.transform = `translate(${v.bTx}px, -50%)`;
      a.style.opacity = b.style.opacity = 1 - v.dip;
      a.style.color = mix(Math.min(1, Math.max(0, v.aTx / (W.b + GAP))));
      b.style.color = mix(Math.min(1, Math.max(0, v.bTx / (W.a + GAP))));
      a.classList.toggle('is-active', active === 'a'); b.classList.toggle('is-active', active === 'b');
    };
    const place = () => { v.aTx = active === 'a' ? 0 : W.b + GAP; v.bTx = active === 'b' ? 0 : W.a + GAP; v.dip = 0; draw(); };
    const swap = () => {
      active = active === 'a' ? 'b' : 'a';
      const from = { aTx: v.aTx, bTx: v.bTx }, to = { aTx: active === 'a' ? 0 : W.b + GAP, bTx: active === 'b' ? 0 : W.a + GAP };
      const t0 = performance.now();
      cancelAnimationFrame(raf);
      const frame = (now) => {
        const t = Math.min(1, (now - t0) / SLIDE), s = slideEase(t);
        v.aTx = from.aTx + (to.aTx - from.aTx) * s; v.bTx = from.bTx + (to.bTx - from.bTx) * s;
        v.dip = t < .5 ? dipEase(t / .5) : 1 - dipEase((t - .5) / .5);
        draw();
        raf = t < 1 ? requestAnimationFrame(frame) : 0;
      };
      raf = requestAnimationFrame(frame);
    };
    place();
    return { swap, reset: () => { cancelAnimationFrame(raf); raf = 0; active = 'a'; place(); }, stop: () => { cancelAnimationFrame(raf); raf = 0; } };
  };

  for (const stage of stages) {
    const canvas = stage.querySelector('.lib-canvas');
    const items = [...stage.querySelectorAll('.lib-item')];
    if (!canvas || !items.length) continue;
    let i = 0, timers = [], visible = false, checkAnim = null;
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const stop = () => { timers.forEach(clearTimeout); timers = []; };
    const targetsOf = (n) => [...items[n].querySelectorAll('.lib-target')];

    const lenses = new Map();
    stage.querySelectorAll('.lib-target[data-demo="lens"]').forEach((t) => lenses.set(t, makeLens(t.querySelector('.m-lens'), stage)));
    const carousels = new Map();
    stage.querySelectorAll('.lib-target[data-demo="carousel"]').forEach((t) => carousels.set(t, makeCarousel(t.querySelector('.m-carousel'))));
    const dots = new Map();
    stage.querySelectorAll('.lib-target[data-demo="dot"]').forEach((t) => dots.set(t, makeDot(t, stage)));

    // a component's real size, and the scale it's drawn at (its zoom, reduced if it wouldn't fit)
    const frameTo = (t, siblings) => {
      const el = t.querySelector('.lib-part').firstElementChild;
      const w = el.offsetWidth, h = el.offsetHeight, zoom = Number(t.dataset.zoom) || 1;
      const room = (canvas.clientWidth - 48 - (siblings - 1) * 128) / siblings;
      const s = Math.min(zoom, room / w);
      t.style.setProperty('--s', s);
      t.style.width = w * s + 'px'; t.style.height = h * s + 'px';
      t.style.setProperty('--fw', w * s + 'px'); t.style.setProperty('--fh', h * s + 'px');
      t.querySelector('.lib-name').textContent = t.dataset.name;
      t.querySelector('.lib-size').textContent = `${w} × ${h}` + (zoom !== 1 && Math.abs(s - zoom) < 0.01 ? ` · ${Math.round(zoom * 100)}%` : '');
    };
    const frameStep = (n) => { const ts = targetsOf(n); const across = items[n].dataset.stack === 'column' ? 1 : ts.length; ts.forEach((t) => frameTo(t, across)); };
    const shrink = (n) => {
      canvas.classList.remove('is-settled'); canvas.classList.add('is-shrunk');
      targetsOf(n).forEach((t) => { t.style.setProperty('--fw', '0px'); t.style.setProperty('--fh', '0px'); });
    };

    const demo = (t) => {
      const kind = t.dataset.demo;
      if (kind === 'press') {
        const b = t.querySelector('.m-cta');
        [700, 1900].forEach((ms) => { at(ms, () => b.classList.add('is-pressing')); at(ms + 140, () => b.classList.remove('is-pressing')); });
      } else if (kind === 'select') {
        const pills = [...t.querySelectorAll('.m-pill')].slice(0, 3);
        [600, 1500, 2400].forEach((ms, n) => {
          const p = pills[n];
          at(ms, () => p.classList.add('is-pressing'));
          at(ms + 120, () => { p.classList.remove('is-pressing'); pills.forEach((o) => o.classList.toggle('is-on', o === p)); });
        });
      } else if (kind === 'lens') {
        const l = lenses.get(t);
        l.reset();
        at(900, () => l.swap()); at(2300, () => l.swap());   // Meal Pacer → Task Timer → back
      } else if (kind === 'carousel') {
        const c = carousels.get(t);
        c.reset();
        [800, 1700, 2600].forEach((ms) => at(ms, () => c.next()));   // three swipes through the pages
      } else if (kind === 'notice') {
        const btn = t.querySelector('.m-notice-action');   // its inside fills while held, then lets go
        at(1200, () => btn.classList.add('is-pressed')); at(1450, () => btn.classList.remove('is-pressed'));
      } else if (kind === 'rows') {
        const rows = [...t.querySelectorAll('.m-row')].slice(0, 2);   // tap the first two rows, as a finger would
        [700, 1800].forEach((ms, n) => { at(ms, () => rows[n].classList.add('is-pressed')); at(ms + 220, () => rows[n].classList.remove('is-pressed')); });
      } else if (kind === 'dot') {
        const d = dots.get(t);
        d.reset();
        at(600, () => d.set(true));   // selects once and holds, in step with the success check
      } else if (kind === 'check') {
        const box = t.querySelector('.m-check');
        Promise.all([loadLottie(), loadCheck()]).then(([lottie, data]) => {
          if (!checkAnim) checkAnim = lottie.loadAnimation({ container: box, renderer: 'svg', loop: false, autoplay: false, animationData: data });
          checkAnim.goToAndStop(0, true);
          at(500, () => checkAnim.goToAndPlay(0, true));
        }).catch(() => {});
      }
    };

    const show = (n) => {
      items.forEach((it, k) => it.classList.toggle('is-on', k === n));
      canvas.classList.remove('is-shrunk');
      frameStep(n);
      at(MOVE, () => canvas.classList.add('is-settled'));
      if (reduce || !visible) return;
      targetsOf(n).forEach(demo);
      at(MOVE + HOLD, () => {
        shrink(n);
        at(MOVE + 60, () => { i = (i + 1) % items.length; show(i); });
      });
    };

    // start framed around the first step (no transition); every other target starts at a point
    stage.querySelectorAll('.lib-target').forEach((t) => { t.style.transition = 'none'; t.style.setProperty('--fw', '0px'); t.style.setProperty('--fh', '0px'); });
    frameStep(0); canvas.classList.add('is-settled');
    void canvas.offsetWidth;
    stage.querySelectorAll('.lib-target').forEach((t) => { t.style.transition = ''; });

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      stop();
      if (visible && !reduce) { loadLottie().catch(() => {}); loadCheck().catch(() => {}); show(i); }
      else if (checkAnim) checkAnim.pause();
    }, { threshold: 0.4 });
    io.observe(stage);
    const onResize = () => frameStep(i);
    window.addEventListener('resize', onResize);
    offs.push(() => {
      stop(); io.disconnect(); window.removeEventListener('resize', onResize);
      dots.forEach((d) => d.stop()); carousels.forEach((c) => c.stop()); lenses.forEach((l) => l.stop());
      if (checkAnim) { checkAnim.destroy(); checkAnim = null; }
    });
  }
  return () => offs.forEach((fn) => fn());
});
