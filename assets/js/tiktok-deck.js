// TikTok Studio case study: the deck's 18 slides as page sections (.tt-deck > .tt-frame > .tt-slide). Each slide is a
// 1920 x 1080 canvas scaled to the section's width (--tt-scale), so it keeps its layout at any size; the frame's 16:9
// aspect ratio holds the space. The three Tako marks are inline SVGs drawn here (the master deck's tako-loop/index.html),
// with their eyes animated only while on screen. Videos are plain <video data-src> handled by video.js like the rest of
// the site. Registered as a mount (see site.js); the cleanup stops the observers and the animation.
(window.siteMounts ||= []).push(() => {
  const deck = document.querySelector('.tt-deck');
  if (!deck) return;
  const fit = () => deck.style.setProperty('--tt-scale', deck.clientWidth / 1920);
  const ro = new ResizeObserver(fit);
  ro.observe(deck);
  fit();

  // --- Language switch: EN | 中文, top right of the first slide. Every string is in the markup in both languages (.en / .zh); data-lang picks one. ---
  const first = deck.querySelector('.tt-frame');
  const sw = document.createElement('div');
  sw.className = 'tt-lang';
  sw.setAttribute('role', 'group');
  sw.setAttribute('aria-label', 'Deck language');
  sw.innerHTML = '<button type="button" data-lang="en">EN</button><button type="button" data-lang="zh" lang="zh-Hans">中文</button>';
  if (first) first.appendChild(sw);
  const setLang = (lang, save) => {
    deck.dataset.lang = lang;
    deck.lang = lang === 'zh' ? 'zh-Hans' : 'en';
    sw.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    if (save) { try { localStorage.setItem('tt-lang', lang); } catch (e) { /* storage blocked: the choice just isn't remembered */ } }
  };
  let saved = 'en';
  try { saved = localStorage.getItem('tt-lang') === 'zh' ? 'zh' : 'en'; } catch (e) { /* ignore */ }
  setLang(saved, false);
  const onSwitch = (e) => { const b = e.target.closest('button[data-lang]'); if (b) setLang(b.dataset.lang, true); };
  sw.addEventListener('click', onSwitch);

  // --- Tako mark (tako-mark.md): a black disc with three blurred brand blobs, the white face path, two eyes that glance and blink ---
  const FACE = 'M260.10 283.98 L303.57 295.19 A4 4 0 0 1 305.10 302.16 A153.2 153.2 0 1 1 328.31 278.72 A2.5 2.5 0 0 1 323.95 277.85 L310.77 231.71 A1.5 1.5 0 0 1 310.86 230.67 A112.8 112.8 0 1 0 259.05 284.09 A1.5 1.5 0 0 1 260.10 283.98 Z';
  const marks = [...deck.querySelectorAll('.tako-mark')];
  marks.forEach((el, k) => {
    const id = 'tk' + k;
    el.innerHTML = `<svg viewBox="0 0 1 1" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="${id}-disc"><circle cx=".5" cy=".5" r=".5"/></clipPath>
        <filter id="${id}-soft" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation=".06"/></filter>
        <radialGradient id="${id}-face" cx=".5" cy=".5" r=".42" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#000"/><stop offset=".3" stop-color="#000"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <g clip-path="url(#${id}-disc)">
        <circle cx=".5" cy=".5" r=".5" fill="#000"/>
        <circle cx=".33" cy=".05" r=".4" fill="#25F4EE" filter="url(#${id}-soft)"/>
        <circle cx="0" cy=".65" r=".4" fill="#0E88C4" filter="url(#${id}-soft)"/>
        <circle cx=".84" cy=".74" r=".475" fill="#FE2C55" filter="url(#${id}-soft)"/>
        <circle cx=".5" cy=".5" r=".5" fill="url(#${id}-face)"/>
      </g>
      <svg x="0" y="0" width="1" height="1" viewBox="26 0.75 365 365"><path fill="#fff" d="${FACE}"/></svg>
      <ellipse class="eye-l" fill="#fff"/><ellipse class="eye-r" fill="#fff"/>
    </svg>`;
  });

  // Eye geometry, fractions of the mark: diameter 2 x 23.76 / 365, centres (0.38, 0.45) and (0.62, 0.45).
  const D = 2 * 23.76 / 365, LX = (165.63 - 26) / 365, RX = (251.14 - 26) / 365, EY = (164.37 - 0.75) / 365, CLOSED = 0.1;
  const BLINK = 0.12, SHIFT = 0.3, HOLD = 0.8, PAUSE = 0.5, GAP = 0.35;
  const UR = [0.045, -0.035], DL = [-0.045, 0.035], UL = [-0.045, -0.035], DR = [0.045, 0.035];
  const steps = [['p', PAUSE], ['b'], ['p', PAUSE], ['g', UR], ['p', GAP], ['b'], ['p', PAUSE], ['g', DL], ['p', GAP],
    ['b'], ['p', 0.15], ['b'], ['p', PAUSE], ['g', UL], ['p', GAP], ['b'], ['p', PAUSE], ['g', DR], ['p', PAUSE]];
  const ease = (x) => x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
  const len = (s) => s[0] === 'p' ? s[1] : s[0] === 'b' ? BLINK : 2 * SHIFT + HOLD;
  const LOOP = steps.reduce((a, s) => a + len(s), 0);
  const pose = (t) => {
    for (const s of steps) {
      const L = len(s);
      if (t < L) {
        if (s[0] === 'b') { const h = BLINK / 2, k = t < h ? ease(t / h) : 1 - ease((t - h) / h); return { close: k, gx: 0, gy: 0 }; }
        if (s[0] === 'g') { const k = t < SHIFT ? ease(t / SHIFT) : t < SHIFT + HOLD ? 1 : 1 - ease((t - SHIFT - HOLD) / SHIFT); return { close: 0, gx: s[1][0] * k, gy: s[1][1] * k }; }
        return { close: 0, gx: 0, gy: 0 };
      }
      t -= L;
    }
    return { close: 0, gx: 0, gy: 0 };
  };
  const render = (el, t) => {
    const p = pose(t), ry = D / 2 * (1 - (1 - CLOSED) * p.close);
    for (const [cls, x] of [['eye-l', LX], ['eye-r', RX]]) {
      const e = el.querySelector('.' + cls);
      e.setAttribute('cx', x + p.gx); e.setAttribute('cy', EY + p.gy); e.setAttribute('rx', D / 2); e.setAttribute('ry', ry);
    }
  };
  marks.forEach((el) => render(el, 0));

  // Animate only the marks on screen (and not under reduced motion); one frame loop for all of them.
  const live = new Set();
  let raf = 0;
  const t0 = performance.now();
  const tick = (now) => {
    live.forEach((el) => render(el, ((now - t0) / 1000) % LOOP));
    raf = live.size ? requestAnimationFrame(tick) : 0;
  };
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) live.add(e.target); else live.delete(e.target);
    if (live.size && !raf) raf = requestAnimationFrame(tick);
  }));
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) marks.forEach((el) => io.observe(el));

  return () => { ro.disconnect(); io.disconnect(); live.clear(); cancelAnimationFrame(raf); raf = 0; sw.removeEventListener('click', onSwitch); sw.remove(); };
});
