// Screenshot carousels (.shots-wrap > .shots + prev/next buttons).
// Tracks the scroll position to set .at-start / .at-end on the wrapper: CSS uses them to fade only the
// edges that have more to see, and to hide an arrow that has nowhere to go. The arrows (desktop only, CSS) scroll by about
// one screenful, gliding to an exact snap position with snapping switched off for the glide: a smooth scroll that ends between
// shots makes mandatory snapping fight it and then jump. While the row scrolls its videos are paused (see quiet() below).
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
    // Videos in the row are paused while it scrolls (arrows, trackpad or drag) and the visible ones resume when it settles: a playing,
    // rounded, scaled video made every frame of the glide expensive (dropped frames, worst going back to page 1). video.js checks .is-scrolling.
    let scrolling = false, settle = 0;
    const vids = () => [...track.querySelectorAll('video')];
    const resume = () => {
      scrolling = false; settle = 0; wrap.classList.remove('is-scrolling');
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const box = track.getBoundingClientRect();
      for (const v of vids()) {
        const r = v.getBoundingClientRect();
        const seen = Math.max(0, Math.min(r.right, box.right) - Math.max(r.left, box.left)) * Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
        if (r.width && seen >= r.width * r.height * 0.25 && v.getAttribute('src')) v.play().catch(() => {});
      }
    };
    const quiet = () => {
      if (!scrolling) { scrolling = true; wrap.classList.add('is-scrolling'); vids().forEach((v) => { if (!v.paused) v.pause(); }); }
      clearTimeout(settle); settle = setTimeout(resume, 160);
    };
    const ask = () => { quiet(); if (!raf) raf = requestAnimationFrame(update); };
    let snapTimer = 0;
    const restoreSnap = () => { clearTimeout(snapTimer); snapTimer = 0; track.style.removeProperty('scroll-snap-type'); };
    const page = (dir) => () => {
      const max = track.scrollWidth - track.clientWidth;
      const pad = parseFloat(getComputedStyle(track).scrollPaddingLeft) || 0;
      const stops = [...new Set([...track.querySelectorAll('li')].map((li) => Math.round(Math.min(max, Math.max(0, li.offsetLeft - pad)))))];
      const from = track.scrollLeft, want = from + dir * track.clientWidth * 0.9;
      const ahead = stops.filter((x) => (x - from) * dir > 1);
      const to = ahead.length ? ahead.reduce((a, b) => Math.abs(b - want) < Math.abs(a - want) ? b : a) : (dir < 0 ? 0 : max);
      restoreSnap();
      track.style.scrollSnapType = 'none';
      track.scrollTo({ left: to, behavior: 'smooth' });
      track.addEventListener('scrollend', restoreSnap, { once: true });
      snapTimer = setTimeout(restoreSnap, 1200);   // browsers without scrollend
    };
    const goPrev = page(-1), goNext = page(1);

    update();
    track.addEventListener('scroll', ask, { passive: true });
    addEventListener('resize', ask);
    prev?.addEventListener('click', goPrev);
    next?.addEventListener('click', goNext);

    offs.push(() => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
      wrap.classList.remove('is-scrolling');
      restoreSnap();
      track.removeEventListener('scroll', ask);
      removeEventListener('resize', ask);
      prev?.removeEventListener('click', goPrev);
      next?.removeEventListener('click', goNext);
    });
  }
  return () => offs.forEach((off) => off());
});
