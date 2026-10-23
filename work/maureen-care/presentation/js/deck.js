// The deck engine. Loads the slides listed in slides/slides.json, then runs navigation, inner steps,
// the language toggle and the progress bar.
//
// A slide is a folder in slides/: slide.html (required), slide.css and slide.js (optional, flagged in
// slides.json). "fit": true lays it out on a fixed 1512 x 982 frame scaled to the window (see fit() below). A slide.js registers itself with Deck.define(id, { init, enter, step }):
//   init(el)              once, after the slide is in the page
//   enter(el, step)       each time it becomes the current slide; may return a cleanup for when it leaves
//   step(el, i, dir)      after its inner step changes (dir: 1 forward, -1 back)
//   steps                 how many inner steps it has (otherwise derived from data-from, see below);
//                         a slide can change it later with Deck.setSteps(id, n), e.g. pages after a resize
//
// Inner steps without any JS: mark an element data-from="1" and it appears at step 1; data-until="1"
// hides it after step 1. → walks the steps before moving to the next slide, ← walks them back.
(() => {
  const root = document.documentElement;
  const main = document.querySelector('main');
  const progress = document.querySelector('.progress');
  const defs = {};          // id → slide.js definition
  let slides = [];          // { id, el, steps, step, cleanup }
  let current = -1;

  window.Deck = {
    define: (id, def) => { defs[id] = def; },
    // A slide whose step count depends on layout (e.g. pages that reflow on resize) updates it here.
    setSteps(id, n) {
      const i = slides.findIndex(s => s.id === id);
      if (i < 0) return;
      const s = slides[i];
      s.steps = Math.max(1, n);
      if (s.step > s.steps - 1) s.step = s.steps - 1;
      applyStep(s);
      if (i === current) (defs[s.id] || {}).step?.(s.el, s.step, 0);
      renderProgress();
    },
  };

  // ---------- loading ----------

  const fail = (html) => {
    const box = document.createElement('div');
    box.className = 'deck-error';
    box.innerHTML = html;
    document.body.appendChild(box);
  };

  // async = false: the slide scripts all download at once but still run in list order (one at a time, each
  // waiting for the last to load, left the deck blank for seconds on a first visit over the network)
  const loadScript = (src) => new Promise((ok, no) => {
    const s = document.createElement('script');
    s.src = src; s.async = false; s.onload = ok; s.onerror = () => no(new Error(src));
    document.head.appendChild(s);
  });

  async function load() {
    if (location.protocol === 'file:') {
      fail('<p>The deck loads its slides as separate files, so it needs a local server.</p><code>./serve.sh</code><p>then open <strong>http://localhost:4173</strong></p>');
      return;
    }
    // A dropped request (the server just starting, or busy) gets two more tries before the deck gives up.
    const get = async (url, tries = 3) => {
      for (let k = 1; ; k++) {
        try {
          // no-store only on a local preview (fresh slides mid-edit); a hosted copy lets the browser cache them
          const r = await fetch(url, { cache: /^(localhost|127\.|\[::1\])/.test(location.hostname) ? 'no-store' : 'default' });
          if (!r.ok) throw new Error(`${url} (${r.status})`);
          return r;
        } catch (e) {
          if (k >= tries) throw new Error(`${url}: ${e.message}. Is the server still running? Double-click "Start Presentation", then reload.`);
          await new Promise(res => setTimeout(res, 400 * k));
        }
      }
    };
    const list = await (await get('slides/slides.json')).json();
    const html = await Promise.all(list.map(s => get(`slides/${s.id}/slide.html`).then(r => r.text())));

    list.forEach((s, i) => {
      if (s.css) {
        const link = document.createElement('link');
        link.rel = 'stylesheet'; link.href = `slides/${s.id}/slide.css`;
        document.head.appendChild(link);
      }
      const el = document.createElement('section');
      el.className = ['chapter', s.class, s.fit && 'fit'].filter(Boolean).join(' ');
      el.dataset.slide = s.id;
      el.innerHTML = html[i];
      main.appendChild(el);
      slides.push({ id: s.id, el, step: 0, steps: 1, cleanup: null });
    });

    await Promise.all(list.filter(s => s.js).map(s => loadScript(`slides/${s.id}/slide.js`)));

    slides.forEach(s => {
      const def = defs[s.id] || {};
      const fromMax = Math.max(0, ...[...s.el.querySelectorAll('[data-from]')].map(n => +n.dataset.from));
      s.steps = def.steps || fromMax + 1;
      def.init?.(s.el);
    });
  }

  // ---------- rendering ----------

  function applyStep(s) {
    s.el.dataset.step = s.step;
    s.el.querySelectorAll('[data-from], [data-until]').forEach(n => {
      const from = n.dataset.from ? +n.dataset.from : 0;
      const until = n.dataset.until ? +n.dataset.until : Infinity;
      n.classList.toggle('is-later', s.step < from || s.step > until);
    });
  }

  function renderProgress() {
    [...progress.children].forEach((b, j) => {
      const s = slides[j];
      const p = j < current ? 1 : j > current ? 0 : (s.step + 1) / s.steps;
      b.firstChild.style.width = p * 100 + '%';
    });
  }

  function render(i, step, dir) {
    const leaving = slides[current];
    if (i !== current) {
      leaving?.cleanup?.();
      if (leaving) leaving.cleanup = null;
      slides.forEach((s, j) => s.el.classList.toggle('on', j === i));
      slides.forEach((s, j) => s.el.classList.toggle('shown', j === i));
    }
    const s = slides[i];
    const changedSlide = i !== current;
    current = i;
    s.step = step;
    applyStep(s);
    const def = defs[s.id] || {};
    if (changedSlide) {
      const c = def.enter?.(s.el, step);
      s.cleanup = typeof c === 'function' ? c : null;
    }
    def.step?.(s.el, s.step, dir);   // s.step, not step: enter() may have re-paged the slide and clamped it
    renderProgress();
    renderArrows();
    try { history.replaceState(null, '', '#' + (i + 1) + (step ? '.' + (step + 1) : '')); } catch (e) {}
    warm(i);
  }

  // An element's images, decoded (and so ready to paint), or the timeout, whichever comes first.
  function ready(el, ms) {
    const imgs = [...el.querySelectorAll('img')].filter(im => im.getAttribute('src'));
    const all = Promise.all(imgs.map(im => im.decode ? im.decode().catch(() => {}) : null));
    return Promise.race([all, new Promise(res => setTimeout(res, ms))]);
  }
  // After each move, decode the slides either side in the background, so the next transition rarely waits.
  function warm(i) {
    const idle = window.requestIdleCallback || (f => setTimeout(f, 200));
    idle(() => [i - 1, i + 1].forEach(j => slides[j] && ready(slides[j].el, 3000)));
  }

  // View Transitions where supported (Chrome, Edge, Safari 18+); otherwise an instant change.
  let transitions = 0;
  function show(i, step, kind) {
    const dir = i < current || (i === current && step < slides[i].step) ? -1 : 1;
    root.classList.toggle('back', dir < 0);
    if (kind === 'instant' || !document.startViewTransition) return render(i, step, dir);
    root.classList.add('vt');
    root.classList.toggle('step', kind === 'step');
    // Name only the fills whose width changes, so a transition snapshots 1-2 of them (a jump: the span it
    // crosses), however long the deck. Named before the old snapshot, cleared once the transition ends.
    // A quick second click skips the running transition; only the LATEST one may clear names, or it would
    // strip a fill the new transition still needs.
    const named = fills().slice(Math.min(i, current), Math.max(i, current) + 1);
    fills().forEach(f => f.style.viewTransitionName = named.includes(f) ? 'fill-' + f.dataset.i : '');
    const run = ++transitions;
    // Safari decodes an image only once it's on screen, so its NEW snapshot could catch the slide with blank
    // holes (a white flash, then a hitch as they pop in). Wait for the new slide's images first, at most 250 ms.
    const t = document.startViewTransition(() => { render(i, step, dir); return ready(slides[i].el, 250); });
    t.finished.finally(() => {
      if (run !== transitions) return;
      root.classList.remove('vt', 'step');
      named.forEach(f => f.style.viewTransitionName = '');
    });
  }

  function next() {
    const s = slides[current];
    if (s.step < s.steps - 1) return show(current, s.step + 1, 'step');
    if (current < slides.length - 1) show(current + 1, 0, 'slide');
  }
  function prev() {
    const s = slides[current];
    if (s.step > 0) return show(current, s.step - 1, 'step');
    if (current > 0) show(current - 1, slides[current - 1].steps - 1, 'slide');
  }
  function goto(i) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    if (i !== current) show(i, 0, 'slide');
  }

  // ---------- progress bar ----------

  const fills = () => [...progress.querySelectorAll('.fill')];

  function buildProgress() {
    slides.forEach((s, i) => {
      const b = document.createElement('button');
      b.setAttribute('aria-label', 'Slide ' + (i + 1));
      b.onclick = () => { goto(i); b.blur(); };
      const fill = document.createElement('span');
      fill.className = 'fill';
      fill.dataset.i = i;   // named only while it animates (show)
      b.appendChild(fill);
      progress.appendChild(b);
    });
  }

  // ---------- fit: a slide flagged "fit" in slides.json is laid out on a fixed FRAME (the laptop it was
  // designed on) and scaled as one piece to the window, so a composition never reflows or clips.
  // --fit is the scale; base.css applies it. Slides without the flag size themselves (the library reflows its cards). ----------

  // Browser zoom is deliberately ignored: a fit slide already fills the window, so anything larger would
  // only crop its edges. Text that reads small is enlarged in the slide's own CSS instead.
  const FRAME = { w: 1512, h: 982 };
  function fit() { root.style.setProperty('--fit', Math.min(innerWidth / FRAME.w, innerHeight / FRAME.h)); }
  fit();
  addEventListener('resize', fit);   // window resizes, and zooms, both re-fit

  // ---------- back / next buttons: the same next() and prev() as the keys; dimmed at either end ----------

  const arrows = [...document.querySelectorAll('.arrows [data-go]')];
  arrows.forEach(b => b.onclick = () => { (+b.dataset.go > 0 ? next : prev)(); b.blur(); });
  // the signature, top left: back to the first slide
  const home = document.querySelector('.bar .home');
  if (home) home.onclick = () => { goto(0); home.blur(); };
  const count = document.querySelector('.arrows .count');
  function renderArrows() {
    const s = slides[current];
    if (count) count.textContent = (current + 1) + ' / ' + slides.length;   // slide counter, beside the arrows
    arrows.forEach(b => b.disabled = +b.dataset.go > 0
      ? current === slides.length - 1 && s.step === s.steps - 1
      : current === 0 && s.step === 0);
  }

  // ---------- language: EN, EN + 中文, 中文 ('L' cycles) ----------

  const LANGS = ['en', 'both', 'zh'];
  const seg = document.querySelector('.segmented');
  const lens = seg.querySelector('.lens');
  function placeLens() {
    const on = seg.querySelector('[aria-pressed="true"]');
    if (!on) return;
    lens.style.left = on.offsetLeft + 'px';
    lens.style.width = on.offsetWidth + 'px';
  }
  function setLang(lang) {
    document.body.dataset.lang = lang;
    seg.querySelectorAll('[data-set-lang]').forEach(b => b.setAttribute('aria-pressed', b.dataset.setLang === lang));
    placeLens();
    try { localStorage.setItem('lang', lang); } catch (e) {}
  }
  // blur after a click: a focused button + the arrow keys reads as keyboard use and draws the focus ring
  seg.querySelectorAll('[data-set-lang]').forEach(b => b.onclick = () => { setLang(b.dataset.setLang); b.blur(); });
  // the lens swells while held, like an iOS 26 control
  seg.addEventListener('pointerdown', () => seg.classList.add('pressing'));
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => seg.addEventListener(t, () => seg.classList.remove('pressing')));
  window.addEventListener('resize', placeLens);
  let saved = null;
  try { saved = localStorage.getItem('lang'); } catch (e) {}
  setLang(LANGS.includes(saved) ? saved : 'both');
  // first placement without animation; fonts can change widths, so re-place once they load
  requestAnimationFrame(() => requestAnimationFrame(() => seg.classList.remove('instant')));
  if (document.fonts) document.fonts.ready.then(placeLens);

  // ---------- keys ----------

  // ---------- definitions: a .def term opens its <template data-def> in the sheet (see index.html) ----------
  const sheet = document.querySelector('.sheet');
  const sheetBody = sheet.querySelector('.sheet-body');
  function openSheet(id) {
    const t = document.querySelector(`template[data-def="${id}"]`);
    if (!t || sheet.open) return;
    sheetBody.replaceChildren(t.content.cloneNode(true));
    sheet.classList.remove('is-closing');
    sheet.showModal();
    root.classList.add('sheet-open');
  }
  // The slide menu: every slide's number and title (its h1/h2, both languages), the current one marked.
  // A choice closes the sheet, then moves, so the transition never snapshots the sheet on its way out.
  function openMenu() {
    if (sheet.open) return;
    const title = document.createElement('h3'); title.className = 'sheet-title';
    title.innerHTML = '<span class="en">Slides</span><span class="zh">目录</span>';
    const list = document.createElement('ol'); list.className = 'toc';
    slides.forEach((s, j) => {
      const h = s.el.querySelector('h1, h2');
      const li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button';
      if (j === current) b.setAttribute('aria-current', 'true');
      b.innerHTML = `<span class="n">${j + 1}</span><span class="t">${h ? h.innerHTML : s.id}</span>`;
      b.querySelectorAll('.def').forEach(d => d.replaceWith(...d.childNodes));   // plain text here, not terms
      b.addEventListener('click', () => { closeSheet(); setTimeout(() => goto(j), 200); });
      li.append(b); list.append(li);
    });
    sheetBody.replaceChildren(title, list);
    sheet.classList.remove('is-closing');
    sheet.showModal();
    root.classList.add('sheet-open');
    list.querySelector('[aria-current]')?.focus();
  }
  document.querySelector('.menu-btn')?.addEventListener('click', e => { openMenu(); e.currentTarget.blur(); });
  document.addEventListener('keydown', e => {   // M opens the menu
    if ((e.key === 'm' || e.key === 'M') && !e.metaKey && !e.ctrlKey && !e.altKey && !sheet.open && !/INPUT|TEXTAREA/.test(e.target.tagName)) openMenu();
  });
  function closeSheet() {
    if (!sheet.open || sheet.classList.contains('is-closing')) return;
    sheet.classList.add('is-closing');   // plays the exit, then closes (base.css: 180ms)
    setTimeout(() => { sheet.close(); sheet.classList.remove('is-closing'); root.classList.remove('sheet-open'); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180);
  }
  document.addEventListener('click', e => {
    const term = e.target.closest('.def');
    if (term) { e.preventDefault(); openSheet(term.dataset.def); }
  });
  document.addEventListener('keydown', e => {   // the term is a span with role=button: Enter / Space open it
    const term = e.target.closest?.('.def');
    if (term && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); openSheet(term.dataset.def); }
  }, true);
  sheet.querySelector('.sheet-close').addEventListener('click', closeSheet);
  sheet.addEventListener('cancel', e => { e.preventDefault(); closeSheet(); });   // Esc
  sheet.addEventListener('click', e => {   // a click on the blurred backdrop lands on the dialog itself, outside its box
    if (e.target !== sheet) return;
    const r = sheet.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeSheet();
  });

  document.addEventListener('keydown', e => {
    if (!slides.length || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (sheet.open) return;   // the sheet is up: arrows and number keys wait
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
    else if (e.key === 'l' || e.key === 'L') setLang(LANGS[(LANGS.indexOf(document.body.dataset.lang) + 1) % LANGS.length]);
    else if (/^[1-9]$/.test(e.key)) goto(Number(e.key) - 1);
    else if (e.key === '0') goto(slides.length - 1);
  });

  // ---------- start: #3 opens slide 3, #3.2 its second step ----------

  load().then(() => {
    if (!slides.length) return;
    buildProgress();
    // A refresh lands mid-deck: show the bar as it stands, without every segment easing in from 0.
    progress.classList.add('still');
    requestAnimationFrame(() => requestAnimationFrame(() => progress.classList.remove('still')));
    const [a, b] = location.hash.slice(1).split('.').map(n => parseInt(n, 10));
    const i = Number.isFinite(a) ? Math.max(0, Math.min(slides.length - 1, a - 1)) : 0;
    const step = Number.isFinite(b) ? Math.max(0, Math.min(slides[i].steps - 1, b - 1)) : 0;
    show(i, step, 'instant');
  }).catch(err => fail(`<p>A slide failed to load.</p><code>${err.message}</code>`));
})();
