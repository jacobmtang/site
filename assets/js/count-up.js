// Count-up for big stats: <p data-count-to="7"><span class="count-val">7</span> million</p>.
// When the stat scrolls into view it counts 0 → target once (ease-out, one decimal while counting). At the end
// the trailing ".0" fades and its width eases closed, so the words after the number glide into place rather
// than jumping. The markup already holds the final number, so no JS / reduced motion just shows it.
// If the stat is also a .swap with a second .swap-word (e.g. "1 in 36"), after the count it holds, then swaps
// to the second figure with the rotator's drift (old up and out, new rises in), and keeps alternating while
// in view; it pauses off screen.
// Registered as a mount (see site.js); the cleanup stops the observer, frames and timers.
(window.siteMounts ||= []).push(() => {
  const els = [...document.querySelectorAll('[data-count-to]')];
  if (!els.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const HOLD = 2600;
  let raf = 0; let timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  const state = new Map();   // el -> { counted, visible, side }

  const build = (out) => {
    out.innerHTML = '<span class="count-int">0</span><span class="count-dec">.0</span>';
    return [out.firstChild, out.lastChild];
  };
  const words = (el) => [...el.querySelectorAll(':scope > .swap-word')];
  const swapTo = (el, i) => {
    const w = words(el);
    w.forEach((word, n) => {
      word.className = n === i ? 'swap-word is-on' : (word.classList.contains('is-on') ? 'swap-word is-off' : 'swap-word');
      word.setAttribute('aria-hidden', n === i ? 'false' : 'true');
    });
  };
  const cycle = (el) => {
    const st = state.get(el);
    if (words(el).length < 2 || !st.visible || st.waiting) return;
    st.waiting = true;
    at(HOLD, () => {
      st.waiting = false;
      if (!st.visible) return;
      st.side = 1 - st.side; swapTo(el, st.side); cycle(el);
    });
  };
  const run = (el) => {
    const st = state.get(el);
    const [int, dec] = build(el.querySelector('.count-val'));
    const to = parseFloat(el.dataset.countTo), dur = 1600, start = performance.now();
    const tick = (now) => {
      const k = Math.min((now - start) / dur, 1), v = to * (1 - Math.pow(1 - k, 3));
      const [i, d] = v.toFixed(1).split('.');
      int.textContent = i; dec.textContent = '.' + d;
      if (k < 1) { raf = requestAnimationFrame(tick); return; }
      // close the ".0": fix its current width, flush, then ease it to zero
      dec.style.maxWidth = dec.getBoundingClientRect().width + 'px';
      void dec.offsetWidth;
      dec.classList.add('is-closing');
      at(600, () => { el.querySelector('.count-val').textContent = String(to); st.counted = true; cycle(el); });
    };
    raf = requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    const st = state.get(e.target);
    st.visible = e.isIntersecting;
    if (!e.isIntersecting) return;
    if (!st.started) { st.started = true; run(e.target); }
    else if (st.counted) cycle(e.target);   // back in view: resume alternating
  }), { threshold: 0.6 });
  els.forEach((el) => {
    state.set(el, { started: false, counted: false, visible: false, side: 0 });
    build(el.querySelector('.count-val')); io.observe(el);
  });
  return () => {
    io.disconnect(); cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers = [];
    els.forEach((el) => { el.querySelector('.count-val').textContent = el.dataset.countTo; if (words(el).length > 1) swapTo(el, 0); });
  };
});
