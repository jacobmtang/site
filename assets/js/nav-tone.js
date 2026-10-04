// Fixed header: keep the signature legible over whatever scrolls beneath it (pattern from maureen.care).
// Looks at the page under the signature, finds the first solid background, and sets html.tone-light or
// html.tone-dark. The sky cards (hero, footer) are gradients, so they carry data-tone="dark" and say
// which edge fades into the page: past the middle of that fade, the page's own tone takes over.
// Registered as a mount (see site.js): runs on every page view; the cleanup removes every global listener.
(window.siteMounts ||= []).push(() => {
  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const sig = header && header.querySelector('.signature');
  if (!sig) return;
  let raf = 0, current = null;

  const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
  const isLight = (m) => (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255 > 0.5;
  const pageLight = () => isLight(rgb(getComputedStyle(document.body).backgroundColor));

  // a CSS length (e.g. --sky-fade, which uses svh and round()) resolved to px inside an element
  const px = (el, prop) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;height:var(${prop})`;
    el.appendChild(probe); const h = probe.getBoundingClientRect().height; probe.remove(); return h;
  };

  function tone() {
    raf = 0;
    const r = sig.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    let light = pageLight();
    const el = document.elementsFromPoint(x, y).find((e) => !header.contains(e));
    for (let e = el; e && e !== root; e = e.parentElement) {
      if (e.dataset.tone) {
        const b = e.getBoundingClientRect(), half = px(e, e.dataset.toneFadeVar) / 2;
        const inFade = e.dataset.toneFade === 'bottom' ? y > b.bottom - half : y < b.top + half;
        light = inFade ? pageLight() : e.dataset.tone === 'light';
        break;
      }
      const cs = getComputedStyle(e), m = rgb(cs.backgroundColor);
      if (m.length > 2 && (m.length < 4 || m[3] >= 0.5)) { light = isLight(m); break; }
    }
    if (light !== current) {
      current = light;
      root.classList.toggle('tone-light', light);
      root.classList.toggle('tone-dark', !light);
    }
  }
  const ask = () => { if (!raf) raf = requestAnimationFrame(tone); };
  const scheme = matchMedia('(prefers-color-scheme: dark)');

  tone();
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask);
  scheme.addEventListener('change', ask);

  return () => {
    removeEventListener('scroll', ask);
    removeEventListener('resize', ask);
    scheme.removeEventListener('change', ask);
    cancelAnimationFrame(raf); raf = 0;
  };
});
