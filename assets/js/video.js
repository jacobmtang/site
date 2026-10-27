// Screen recordings: <video muted loop playsinline preload="none" data-src="…" poster="…">.
// Nothing downloads until the video is within about a screen of view; then its src is attached. It plays while
// at least a quarter is on screen and pauses when it leaves, so off-screen videos never decode.
// A video that has scrolled more than ~2.5 screens away is unloaded (src removed) so its decoder and buffers are freed:
// a paused video still holds them, and the 16-video TikTok deck crashed iOS Safari when scrolled fast. It reloads when it nears again.
// Carousel cards (.shots) on a mouse/trackpad device never play more than one at a time: Chrome drops to ~30fps with the home
// row's six infographics all playing (any one alone is fine), which showed as a stutter on the arrow glide. The card under the
// pointer plays (looping); with the pointer away, the visible cards take turns, each playing once through to its end and then
// resetting to its poster before the next starts. Touch screens keep the autoplay, since they show only a card or two at a time.
// Reduced motion: the poster (first frame) only; the video is never loaded.
// Registered as a mount (see site.js); the cleanup pauses every video and disconnects both observers.
(window.siteMounts ||= []).push(() => {
  const vids = [...document.querySelectorAll('video[data-src]')];
  if (!vids.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const hover = matchMedia('(hover: hover)').matches;
  const hoverOnly = (v) => hover && v.closest('.shots');
  const cards = hover ? [...new Set(vids.map((v) => v.closest('.shots li')).filter(Boolean))] : [];
  const vidOf = (c) => c.querySelector('video[data-src]');
  const start = (v) => { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); };
  let hovered = null, current = null, timer = 0;
  const showing = (c) => {   // the card is at least half inside its row and the page
    const r = c.getBoundingClientRect(), row = c.closest('.shots').getBoundingClientRect();
    const w = Math.min(r.right, row.right) - Math.max(r.left, row.left), h = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
    return w > r.width / 2 && h > r.height / 2;
  };
  const reset = (v) => { v.pause(); v.loop = true; v.removeEventListener('ended', onEnded); try { v.currentTime = 0; } catch (e) { /* not loaded yet */ } };
  const stopCurrent = () => { if (current) reset(vidOf(current)); current = null; };
  const rotate = () => {
    clearTimeout(timer); timer = 0;
    if (hovered) return;
    const seen = cards.filter(showing);
    const next = seen[(seen.indexOf(current) + 1) % seen.length];   // indexOf is -1 when none or not visible: starts at the first
    stopCurrent();
    if (!next) return;
    current = next;
    const v = vidOf(current);
    v.loop = false;   // play once through; ended moves on (loop would swallow the event)
    v.addEventListener('ended', onEnded);
    start(v);
  };
  const onEnded = (e) => { reset(e.currentTarget); timer = setTimeout(rotate, 400); };   // back to the poster, a beat, then the next card
  const onEnter = (e) => { hovered = e.currentTarget; clearTimeout(timer); timer = 0; stopCurrent(); start(vidOf(hovered)); };
  const onLeave = (e) => { reset(vidOf(e.currentTarget)); hovered = null; timer = setTimeout(rotate, 600); };
  let rowRaf = 0;
  const onRow = () => { if (!hovered && !rowRaf) rowRaf = requestAnimationFrame(() => { rowRaf = 0; clearTimeout(timer); timer = setTimeout(rotate, 250); }); };   // after the row scrolls or the page moves, pick again from what's visible
  const rows = [...new Set(cards.map((c) => c.closest('.shots')))];
  cards.forEach((c) => { c.addEventListener('pointerenter', onEnter); c.addEventListener('pointerleave', onLeave); });
  rows.forEach((r) => r.addEventListener('scroll', onRow, { passive: true }));
  if (cards.length) { addEventListener('scroll', onRow, { passive: true }); timer = setTimeout(rotate, 400); }

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
    clearTimeout(timer); cancelAnimationFrame(rowRaf);
    cards.forEach((c) => { c.removeEventListener('pointerenter', onEnter); c.removeEventListener('pointerleave', onLeave); });
    rows.forEach((r) => r.removeEventListener('scroll', onRow)); if (cards.length) removeEventListener('scroll', onRow);
    vids.forEach((v) => v.pause());
  };
});
