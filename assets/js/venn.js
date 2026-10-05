// Venn (Identifying the ideal user), on a loop while in view: the two circles start apart, ease together,
// then the overlap and "Maureen" fade in; hold; the name fades, the circles part; short rest; again.
// Only runs while at least 40% is on screen (IntersectionObserver), and stops off screen.
// No JS or reduced motion: the joined diagram, static.
// Registered as a mount (see site.js); the cleanup clears timers and the observer and restores the joined state.
(window.siteMounts ||= []).push(() => {
  const figs = [...document.querySelectorAll('.cs-venn')];
  if (!figs.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const MOVE = 900, HOLD = 2600, REST = 1000;
  const offs = [];

  for (const fig of figs) {
    let timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const stop = () => { timers.forEach(clearTimeout); timers = []; };
    const apart = () => { fig.classList.add('is-apart'); fig.classList.remove('is-joining'); };
    const play = () => {
      stop();
      // join: circles slide in while the overlap stays hidden, then the overlap and name fade in
      fig.classList.add('is-joining'); fig.classList.remove('is-apart');
      at(MOVE, () => fig.classList.remove('is-joining'));
      // hold, then part: the name fades, the circles slide out, rest, repeat
      at(MOVE + HOLD, apart);
      at(MOVE + HOLD + MOVE + REST, play);
    };
    apart();
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { if (!timers.length) at(300, play); }
      else { stop(); apart(); }
    }, { threshold: 0.4 });
    io.observe(fig);
    offs.push(() => { stop(); io.disconnect(); fig.classList.remove('is-apart', 'is-joining'); });
  }
  return () => offs.forEach((fn) => fn());
});
