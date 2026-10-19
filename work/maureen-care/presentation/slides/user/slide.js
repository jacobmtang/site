// Replays the entrance each time the slide becomes current: the circle opens, she rises, then the four
// stat cards arrive and count up. Delays match slide.css (cards from 1200ms, 120ms apart).
(() => {
  const ease = t => 1 - Math.pow(1 - t, 3);
  const CARD_AT = 1200, CARD_GAP = 120, DUR = 900;
  let run = 0;   // bumped on every enter and leave, so a count from an earlier visit stops itself

  function countUp(n, delay, id) {
    const to = +n.dataset.to, t0 = performance.now() + delay;
    n.textContent = '0';
    const tick = now => {
      if (id !== run) return;
      const t = Math.max(0, Math.min(1, (now - t0) / DUR));
      n.textContent = Math.round(to * ease(t));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  const settle = el => el.querySelectorAll('.count').forEach(n => n.textContent = n.dataset.to);

  Deck.define('user', {
    enter(el) {
      const id = ++run;
      el.classList.remove('play'); void el.offsetWidth; el.classList.add('play');
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) settle(el);
      else el.querySelectorAll('.u-card').forEach((c, k) =>
        c.querySelectorAll('.count').forEach(n => countUp(n, CARD_AT + k * CARD_GAP, id)));
      return () => { run++; settle(el); el.classList.remove('play'); };
    },
  });
})();
