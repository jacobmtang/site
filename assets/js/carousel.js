// Screenshot carousels (.shots-wrap > .shots + prev/next buttons).
// Tracks the scroll position to set .at-start / .at-end on the wrapper: CSS uses them to fade only the
// edges that have more to see, and to hide an arrow that has nowhere to go. The arrows (desktop only, CSS)
// scroll by about one screenful and let scroll-snap land on the nearest shot.
// Registered as a mount (see site.js); the cleanup removes every listener, including the window resize one.
(window.siteMounts ||= []).push(() => {
  const wraps = [...document.querySelectorAll('.shots-wrap')];
  if (!wraps.length) return;
  const offs = [];

  for (const wrap of wraps) {
    const track = wrap.querySelector('.shots');
    const prev = wrap.querySelector('.shots-prev');
    const next = wrap.querySelector('.shots-next');
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = track.scrollWidth - track.clientWidth;
      wrap.classList.toggle('at-start', track.scrollLeft <= 1);
      wrap.classList.toggle('at-end', track.scrollLeft >= max - 1);
    };
    const ask = () => { if (!raf) raf = requestAnimationFrame(update); };
    const page = (dir) => () => track.scrollBy({ left: dir * track.clientWidth * 0.9, behavior: 'smooth' });
    const goPrev = page(-1), goNext = page(1);

    update();
    track.addEventListener('scroll', ask, { passive: true });
    addEventListener('resize', ask);
    prev?.addEventListener('click', goPrev);
    next?.addEventListener('click', goNext);

    offs.push(() => {
      cancelAnimationFrame(raf);
      track.removeEventListener('scroll', ask);
      removeEventListener('resize', ask);
      prev?.removeEventListener('click', goPrev);
      next?.removeEventListener('click', goNext);
    });
  }
  return () => offs.forEach((off) => off());
});
