// Screen recordings: <video muted loop playsinline preload="none" data-src="…" poster="…">.
// Nothing downloads until the video is within about a screen of view; then its src is attached. It plays while
// at least a quarter is on screen and pauses when it leaves, so off-screen videos never decode.
// A video that has scrolled more than ~2.5 screens away is unloaded (src removed) so its decoder and buffers are freed:
// a paused video still holds them, and the 16-video TikTok deck crashed iOS Safari when scrolled fast. It reloads when it nears again.
// Carousel cards (.shots) on a mouse/trackpad device show their poster and play only while hovered, like a YouTube thumbnail:
// Chrome drops to ~30fps with the home row's six infographics all playing (any one alone is fine), which showed as a stutter on
// the arrow glide. Touch screens keep the autoplay, since they show only a card or two at a time.
// Reduced motion: the poster (first frame) only; the video is never loaded.
// Registered as a mount (see site.js); the cleanup pauses every video and disconnects both observers.
(window.siteMounts ||= []).push(() => {
  const vids = [...document.querySelectorAll('video[data-src]')];
  if (!vids.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const hover = matchMedia('(hover: hover)').matches;
  const hoverOnly = (v) => hover && v.closest('.shots');
  const cards = hover ? [...new Set(vids.map((v) => v.closest('.shots li')).filter(Boolean))] : [];
  const vidOf = (c) => c.querySelector('video[data-src]');
  const onEnter = (e) => { const v = vidOf(e.currentTarget); if (!v) return; if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); };
  const onLeave = (e) => { const v = vidOf(e.currentTarget); if (!v) return; v.pause(); try { v.currentTime = 0; } catch (err) { /* not loaded yet */ } };   // back to the poster
  cards.forEach((c) => { c.addEventListener('pointerenter', onEnter); c.addEventListener('pointerleave', onLeave); });

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
    if (e.isIntersecting) { if (!v.src) v.src = v.dataset.src; if (!hoverOnly(v)) v.play().catch(() => {}); }
    else v.pause();
  }), { threshold: 0.25 });

  const far = new IntersectionObserver((entries) => entries.forEach((e) => {
    const v = e.target;
    if (e.isIntersecting || !v.src || v.closest('.ex-panel, .shots')) return;   // examples.js manages example-panel videos; a carousel's cards count as off screen the moment they leave the row, and tearing a decoder down mid-glide made the slide stutter
    v.pause(); v.removeAttribute('src'); v.load();
    near.observe(v);
  }), { rootMargin: '250% 0px' });

  vids.forEach((v) => { near.observe(v); inView.observe(v); far.observe(v); });
  return () => {
    near.disconnect(); inView.disconnect(); far.disconnect();
    cards.forEach((c) => { c.removeEventListener('pointerenter', onEnter); c.removeEventListener('pointerleave', onLeave); });
    vids.forEach((v) => v.pause());
  };
});
