// Screen recordings: <video muted loop playsinline preload="none" data-src="…" poster="…">.
// Nothing downloads until the video is within about a screen of view; then its src is attached. It plays while
// at least a quarter is on screen and pauses when it leaves, so off-screen videos never decode.
// Reduced motion: the poster (first frame) only; the video is never loaded.
// Registered as a mount (see site.js); the cleanup pauses every video and disconnects both observers.
(window.siteMounts ||= []).push(() => {
  const vids = [...document.querySelectorAll('video[data-src]')];
  if (!vids.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const near = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const v = e.target;
    if (v.closest('.ex-panel:not(.is-active)')) return;   // hidden example: don't download until chosen
    if (!v.src) { v.src = v.dataset.src; v.preload = 'auto'; }
    near.unobserve(v);
  }), { rootMargin: '100% 0px' });

  const inView = new IntersectionObserver((entries) => entries.forEach((e) => {
    const v = e.target;
    if (v.closest('.ex-panel:not(.is-active)')) { v.pause(); return; }   // a hidden example: examples.js plays it when chosen
    if (e.isIntersecting) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); }
    else v.pause();
  }), { threshold: 0.25 });

  vids.forEach((v) => { near.observe(v); inView.observe(v); });
  return () => { near.disconnect(); inView.disconnect(); vids.forEach((v) => v.pause()); };
});
