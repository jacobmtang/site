// Title slide. Screen wall: repeat each column's set until it is taller than the wall, then double it so the
// drift loops by exactly one set; pace every column at ~20px/s (as the portfolio's screen-wall.js).
// Phone: hold each screen, fade up to white, swap, fade back down. Starts on the home screen on every visit and
// stops when the slide is left (the cleanup enter() returns).
(() => {
  const HOLD = 2800, FADE = 360;   // ms; FADE matches --fade in slide.css

  function wall(el) {
    const H = 982;   // the fit frame's height (slides.json), not the window's
    el.querySelectorAll('.wall-col').forEach(col => {
      const originals = [...col.children];
      const shot = 140 * 652 / 300, gap = 16;
      const one = originals.length * (shot + gap);
      const reps = Math.max(1, Math.ceil(H * 1.4 / one));
      for (let r = 1; r < reps * 2; r++) originals.forEach(img => {
        const c = img.cloneNode(); c.setAttribute('aria-hidden', 'true'); col.appendChild(c);
      });
      col.style.setProperty('--wall-dur', Math.max(30, reps * one / 20) + 's');
    });
  }

  Deck.define('title', {
    init(el) { wall(el); el.style.setProperty('--fade', FADE + 'ms'); },
    enter(el) {
      const shots = [...el.querySelectorAll('.hp-glass img')];
      const white = el.querySelector('.hp-white');
      let i = 0, timer = 0;
      const show = n => shots.forEach((s, k) => s.classList.toggle('is-on', k === n));
      show(0); white.classList.remove('is-on');
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const next = () => {
        white.classList.add('is-on');                       // up to white
        timer = setTimeout(() => {
          i = (i + 1) % shots.length; show(i);              // swap while the screen is white
          white.classList.remove('is-on');                  // and back down
          timer = setTimeout(next, HOLD + FADE);
        }, FADE);
      };
      timer = setTimeout(next, HOLD);
      return () => { clearTimeout(timer); white.classList.remove('is-on'); };
    },
  });
})();
