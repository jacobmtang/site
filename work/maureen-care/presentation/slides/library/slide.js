// Design library: pages the cards to fit, and makes the recreated components respond.
// Pages: as many columns and rows as fit at the card's MINIMUM size (320 x 304, 298 in EN + 中文), then the
// cards stretch to share the leftover space, up to MAX. Each page is an inner step: → shows the next page
// before moving on. Resizing or switching language recomputes the pages and tells the deck via Deck.setSteps.
(() => {
  const MIN_W = 320, MAX_W = 440, MAX_H = 400, GAP = 16;
  let el, grid, cards, perPage = 1, entering = false;

  function measure() {
    const cs = getComputedStyle(el);
    const visible = el.classList.contains('on');
    // Hidden, the slide has no size: estimate from the window, then measure for real on enter.
    const W = (visible ? el.clientWidth : innerWidth) - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const top = visible ? grid.offsetTop : parseFloat(cs.paddingTop) + 100;
    const H = (visible ? el.clientHeight : innerHeight) - top - parseFloat(cs.paddingBottom);
    const MIN_H = parseFloat(getComputedStyle(grid).getPropertyValue('--card-min-h')) || 304;
    const cols = Math.max(1, Math.floor((W + GAP) / (MIN_W + GAP)));
    const rows = Math.max(1, Math.floor((H + GAP) / (MIN_H + GAP)));
    // stretch into what is left, capped so a card never turns into a poster
    const w = Math.min(MAX_W, Math.floor((W - GAP * (cols - 1)) / cols));
    const h = Math.min(MAX_H, Math.max(MIN_H, Math.floor((H - GAP * (rows - 1)) / rows)));
    return { cols, perPage: cols * rows, w, h };
  }

  // animate: replay the cards' rise (arriving on the slide, or turning a page), from `base` ms, 60ms apart.
  // A resize or a language switch re-pages without it, so nothing jumps while you talk.
  function showPage(step, animate, base = 0) {
    cards.forEach((c, i) => c.classList.toggle('is-off', Math.floor(i / perPage) !== step));
    if (animate) {
      const on = cards.filter(c => !c.classList.contains('is-off'));
      on.forEach(c => c.classList.remove('is-in')); void grid.offsetWidth;
      on.forEach((c, k) => { c.style.setProperty('--d', base + k * 60 + 'ms'); c.classList.add('is-in'); });
    }
    // a lens on a hidden page measured 0 wide; place it now that its page is showing
    el.querySelectorAll('.lib-card:not(.is-off) [data-lens]').forEach(placeLens);
    initWheels(); fitPills();
    if (animate) el.querySelectorAll('.lib-card:not(.is-off) [data-swipe]').forEach(b => b._peek());
  }

  function layout() {
    const m = measure();
    perPage = m.perPage;
    grid.style.setProperty('--cols', m.cols);
    grid.style.setProperty('--card-w', m.w + 'px');
    grid.style.setProperty('--card-h', m.h + 'px');
    Deck.setSteps('library', Math.ceil(cards.length / perPage));   // calls step() → showPage when current
    showPage(+el.dataset.step || 0);
  }

  // ---- LensSwitch: measure both words at the active weight, then place the slots (see slide.css) ----
  const LENS_GAP = 16;
  function placeLens(box) {
    if (!box.getClientRects().length) return;   // not rendered (hidden slide or page): measure later
    const words = [...box.children];
    const widths = words.map(w => {
      const was = w.classList.contains('is-on');
      w.classList.add('is-on'); const width = w.getBoundingClientRect().width;
      if (!was) w.classList.remove('is-on');
      return width;
    });
    box.style.width = widths[0] + widths[1] + LENS_GAP + 'px';
    const active = words.findIndex(w => w.classList.contains('is-on'));
    words.forEach((w, i) => w.style.setProperty('--x', i === active ? '0px' : widths[active] + LENS_GAP + 'px'));
    box.dataset.widths = widths.join(',');
  }
  function swapLens(box) {
    const words = [...box.children];
    const widths = box.dataset.widths.split(',').map(Number);
    const next = words.findIndex(w => !w.classList.contains('is-on'));
    words.forEach((w, i) => {
      w.classList.toggle('is-on', i === next);
      w.style.setProperty('--x', i === next ? '0px' : widths[next] + LENS_GAP + 'px');
    });
    box.classList.remove('is-dipping'); void box.offsetWidth; box.classList.add('is-dipping');
  }


  // ---- WheelPicker: native scroll-snap does the momentum; each row tilts from its distance to the centre,
  // with WheelPicker.tsx's own curves. A mouse can drag it too (touch and trackpads scroll natively). ----
  const ITEM = 44, lerp = (x, [a, b], [c, d]) => c + (d - c) * Math.min(1, Math.max(0, (x - a) / (b - a)));
  function tiltWheel(sc) {
    const at = sc.scrollTop / ITEM;
    [...sc.children].forEach((row, i) => {
      const pos = i - at, abs = Math.abs(pos);
      const rot = lerp(pos, [-2.5, 2.5], [64, -64]);
      const op = abs < 1 ? lerp(abs, [0, 1], [1, 0.5]) : abs < 2 ? lerp(abs, [1, 2], [0.5, 0.22]) : lerp(abs, [2, 3], [0.22, 0.08]);
      row.style.transform = `perspective(480px) rotateX(${rot}deg) scale(${lerp(abs, [0, 1.6], [1, 0.88])})`;
      row.style.opacity = op;
    });
  }
  function initWheels() {
    el.querySelectorAll('.lib-card:not(.is-off) .c-wheel').forEach(w => {
      const sc = w.querySelector('.c-wscroll');
      if (!sc.children.length) {
        const [min, max, pad] = w.dataset.wheel.split(',').map(Number);
        for (let v = min; v <= max; v++) { const b = document.createElement('b'); b.textContent = pad ? String(v).padStart(2, '0') : v; sc.appendChild(b); }
        sc.addEventListener('scroll', () => tiltWheel(sc), { passive: true });
        sc.addEventListener('pointerdown', e => {
          if (e.pointerType !== 'mouse') return;
          const y0 = e.clientY, top0 = sc.scrollTop;
          sc.classList.add('is-dragging'); sc.setPointerCapture(e.pointerId);
          const move = ev => { sc.scrollTop = top0 - (ev.clientY - y0); };
          const up = () => {
            sc.removeEventListener('pointermove', move); sc.classList.remove('is-dragging');
            sc.scrollTo({ top: Math.round(sc.scrollTop / ITEM) * ITEM, behavior: 'smooth' });
          };
          sc.addEventListener('pointermove', move); sc.addEventListener('pointerup', up, { once: true });
        });
      }
      // hidden on another page it has no height, so the start value is set the first time it shows
      if (!w.dataset.placed && sc.clientHeight) {
        const min = +w.dataset.wheel.split(',')[0];
        sc.scrollTop = (+w.dataset.value - min) * ITEM; w.dataset.placed = '1';
      }
      tiltWheel(sc);
    });
  }

  // ---- SwipeDeletePill: drag the row; past half it opens to SWIPE_REVEAL, else it closes. The label fades
  // in over 25-75% of the reveal. Tapping an open row closes it; Delete removes it and the card closes the gap. ----
  const REVEAL = 92;
  function wireSwipe(box) {
    const row = box.querySelector('.c-grow');
    let tx = -REVEAL;
    const set = v => { tx = v; box.style.setProperty('--tx', v + 'px'); box.style.setProperty('--label', lerp(-v / REVEAL, [0.25, 0.75], [0, 1])); };
    const settle = v => { box.classList.add('is-settling'); set(v); };
    row.addEventListener('pointerdown', e => {
      if (e.target.closest('[data-toggle]')) return;
      const x0 = e.clientX, tx0 = tx; let moved = false;
      box.classList.remove('is-settling'); row.setPointerCapture(e.pointerId);
      const move = ev => {
        const dx = ev.clientX - x0; if (Math.abs(dx) > 4) moved = true;
        let v = tx0 + dx; if (v < -REVEAL) v = -REVEAL + (v + REVEAL) * 0.25; set(Math.min(0, v));
      };
      const up = () => {
        row.removeEventListener('pointermove', move);
        settle(!moved && tx0 < 0 ? 0 : tx < -REVEAL / 2 ? -REVEAL : 0);
      };
      row.addEventListener('pointermove', move); row.addEventListener('pointerup', up, { once: true });
    });
    // Delete removes the row outright and the card closes the gap (TheLadder: no exit animation, the rest
    // move on a 300ms LinearTransition). It comes back after a beat so the card can be shown again.
    const wrap = box.closest('.c-gwrap');
    box.querySelector('[data-delete]').addEventListener('click', () => {
      wrap.classList.add('is-gone');
      setTimeout(() => { box.classList.remove('is-settling'); set(0); wrap.classList.remove('is-gone'); box._peek(); }, 1600);
    });
    // arriving on its page: shown closed (the item readable), then it slides open on its own
    box._peek = () => { clearTimeout(box._t); box.classList.remove('is-settling'); set(0); box._t = setTimeout(() => settle(-REVEAL), 1800); };
    set(0);
  }

  // ---- TimePill: two layers, the new content written to the HIDDEN one, the capsule growing to its width
  // while the old fades out and the new fades in (TimePill.tsx's ping-pong). A tick of the clock updates
  // the front layer in place. Tap: timer → finishing → complete → timer. ----
  // success-check-maureen.json's own coordinates (512 canvas): the disc ends at 150% (236 → 354), so the view is
  // that disc's box. TimePill's neutral ring (15.6 across) sits under it until the disc grows over it.
  const CHECK = '<svg class="c-tcheck" viewBox="79 79 354 354" aria-hidden="true"><circle cx="256" cy="256" r="118"/><circle class="c-tfill" cx="256" cy="253.4" r="177"/><path d="M173.5 260.5 225 311 329 203.5"/></svg>';
  function wirePill(pill) {
    const tin = pill.querySelector('.c-tin'), layers = [...tin.children];
    let phase = 0, secs = 4 * 60 + 32, front = 0;
    const clock = () => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    const content = () => phase === 0 ? clock() : phase === 1 ? 'Finishing' : 'Complete' + CHECK;
    const fit = layer => {
      const m = layer.cloneNode(true); m.className = 'c-tlayer is-on is-instant';
      m.style.cssText = 'position:absolute;inset:auto;visibility:hidden;width:max-content'; tin.appendChild(m);
      const w = m.getBoundingClientRect().width; m.remove();
      if (w) tin.style.setProperty('--w', w + 'px');
    };
    pill._fit = () => fit(layers[front]);
    layers[0].innerHTML = content();
    pill.addEventListener('click', () => {
      phase = (phase + 1) % 3; if (phase === 0) secs = 4 * 60 + 32;
      const back = 1 - front;
      layers[back].innerHTML = content(); layers[back].classList.remove('is-drawn', 'is-instant');
      layers[front].classList.remove('is-on', 'is-instant'); layers[back].classList.add('is-on');
      front = back; fit(layers[front]);
      if (phase === 2) { const l = layers[front]; setTimeout(() => l.classList.add('is-drawn'), 650); }
    });
    setInterval(() => {
      if (phase !== 0 || !el.classList.contains('on')) return;
      secs = secs > 0 ? secs - 1 : 4 * 60 + 32; layers[front].innerHTML = clock();
    }, 1000);
  }
  function fitPills() { el.querySelectorAll('.lib-card:not(.is-off) [data-tpill]').forEach(p => p._fit?.()); }

  // ---- the components ----
  function wire() {
    el.addEventListener('click', e => {
      const t = e.target;
      const toggle = t.closest('[data-toggle]');
      if (toggle) return toggle.classList.toggle('is-on');
      const choose = t.closest('[data-choose] > *');
      if (choose) { [...choose.parentElement.children].forEach(c => c.classList.toggle('is-on', c === choose)); return; }
      const word = t.closest('[data-lens] > span');
      if (word && !word.classList.contains('is-on')) return swapLens(word.parentElement);
      const adv = t.closest('[data-advance]');
      if (adv) { const dots = [...adv.children]; const i = dots.findIndex(d => d.classList.contains('is-on')); dots.forEach((d, j) => d.classList.toggle('is-on', j === (i + 1) % dots.length)); return; }
      const replay = t.closest('[data-replay]');
      if (replay) { const fresh = replay.cloneNode(true); replay.replaceWith(fresh); return; }
      const btn = t.closest('.c-step-btn');
      if (btn) {
        const box = btn.parentElement, out = box.querySelector('.c-step-value');
        const v = Math.max(0, Math.min(10, +out.textContent + +btn.dataset.delta));
        out.textContent = v;
        box.querySelector('[data-delta="-1"]').classList.toggle('is-off', v <= 0);
        box.querySelector('[data-delta="1"]').classList.toggle('is-off', v >= 10);
      }
    });
    // the lens needs real widths: measure when the slide is laid out, and again once fonts arrive
    const lens = () => el.querySelectorAll('[data-lens]').forEach(placeLens);
    document.fonts?.ready.then(() => { if (el.classList.contains('on')) { lens(); fitPills(); } });
    el._placeLens = lens;
    el.querySelectorAll('[data-swipe]').forEach(wireSwipe);
    el.querySelectorAll('[data-tpill]').forEach(wirePill);
    const dots = el.querySelectorAll('.c-carousel i');
    dots[1]?.classList.add('is-on');
  }

  Deck.define('library', {
    init(node) {
      el = node; grid = el.querySelector('.lib-grid'); cards = [...grid.children];
      wire();
      layout();
      let t;
      addEventListener('resize', () => { clearTimeout(t); t = setTimeout(layout, 120); });
      // the heading grows in EN + 中文 mode, which can take a row of cards with it
      new MutationObserver(layout).observe(document.body, { attributes: true, attributeFilter: ['data-lang'] });
    },
    enter() {
      layout(); el._placeLens();
      el.classList.remove('play'); void el.offsetWidth; el.classList.add('play');   // the title rises (slide.css)
      showPage(+el.dataset.step || 0, true, 380);                                  // then the cards, after it
      entering = true;   // deck.js calls step() right after enter(): that call must not replay the cards
      return () => { el.classList.remove('play'); cards.forEach(c => c.classList.remove('is-in')); };
    },
    step(node, i, dir) {
      if (entering) { entering = false; return; }
      showPage(i, dir !== 0);   // dir 0: a re-page from layout(), not a turn
    },
  });
})();
