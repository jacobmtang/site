// Text scramble: a word that swaps for the next one by cycling through random glyphs, settling letter by letter
// (inspired by pacolui.com). Markup: <span class="scramble" data-words="creative|video|motion" aria-hidden="true">creative</span>,
// inside a heading whose aria-label holds the steady text, so screen readers never hear the glyphs.
// Each letter starts scrambling and settles at its own random frame; the next word comes after a hold. Every
// character (glyph or letter) is its own span, coloured by position across a rainbow (--h, see home.css). It only
// runs while on screen; with reduced motion the first word just stays, still in rainbow letters.
// Registered as a mount (see site.js); the cleanup stops the timers and the observer and restores the first word.
(window.siteMounts ||= []).push(() => {
  const els = [...document.querySelectorAll('.scramble[data-words]')];
  if (!els.length) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const GLYPHS = '!<>-_\\/[]{}=+*^?#';
  const HOLD = 2600;   // ms a word stays put
  const offs = [];

  for (const el of els) {
    const words = el.dataset.words.split('|');
    let i = 0, raf = 0, timer = 0, visible = false;
    // one span per character, its hue from its place in the word: red at the first letter round to violet at the last
    const paint = (chars) => {
      const n = chars.length;
      el.replaceChildren(...chars.map(([c, glyph], k) => {
        const s = document.createElement('span');
        s.className = glyph ? 'scramble-ch scramble-glyph' : 'scramble-ch';
        s.style.setProperty('--h', Math.round((n > 1 ? k / (n - 1) : 0) * 280));
        s.textContent = c;
        return s;
      }));
    };
    const word = (w) => [...w].map((c) => [c, false]);
    paint(word(words[0]));
    if (still) { offs.push(() => { el.textContent = words[0]; }); continue; }

    const scrambleTo = (to) => {
      const from = el.textContent;
      const n = Math.max(from.length, to.length);
      const queue = Array.from({ length: n }, (_, k) => {
        const start = Math.floor(Math.random() * 16);
        return { from: from[k] || '', to: to[k] || '', start, end: start + 8 + Math.floor(Math.random() * 16), ch: '' };
      });
      let frame = 0;
      const tick = () => {
        let done = 0;
        const out = [];
        for (const q of queue) {
          if (frame >= q.end) { done++; if (q.to) out.push([q.to, false]); }
          else if (frame >= q.start) {
            if (!q.ch || Math.random() < 0.3) q.ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            out.push([q.ch, true]);
          } else if (q.from) out.push([q.from, false]);
        }
        paint(out);
        if (done === queue.length) { paint(word(to)); raf = 0; schedule(); }
        else { frame++; raf = requestAnimationFrame(tick); }
      };
      raf = requestAnimationFrame(tick);
    };
    const schedule = () => {
      clearTimeout(timer);
      if (!visible) return;
      timer = setTimeout(() => { i = (i + 1) % words.length; scrambleTo(words[i]); }, HOLD);
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) schedule(); else if (!visible) clearTimeout(timer);
    });
    io.observe(el);
    offs.push(() => { io.disconnect(); clearTimeout(timer); cancelAnimationFrame(raf); el.textContent = words[0]; });
  }
  return () => offs.forEach((off) => off());
});
