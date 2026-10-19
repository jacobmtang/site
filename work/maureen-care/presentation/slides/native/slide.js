// Replays the entrance each time the slide becomes current. One phone at a time: step 0 shows
// native-1, step 1 native-2 (data-until / data-from in slide.html). The visible recording plays from
// the start; the hidden one is paused, and leaving the slide pauses both and stops the callout loop.
// Callouts: once the phone has risen they turn on in turn (.is-on); one with data-t="a-b" (or "a-b,c-d") is on
// only while its video's time is inside one of those windows (seconds), so a label shows only while its element does.
Deck.define('native', {
  enter(el) {
    el.classList.remove('play', 'swap'); void el.offsetWidth; el.classList.add('play');
    el._entering = true;
    // as the portfolio's video.js: nothing downloads until the slide is first shown, then both src attach
    // (the second too, so → switches without a wait)
    el.querySelectorAll('video[data-src]').forEach(v => { if (!v.getAttribute('src')) { v.src = v.dataset.src; v.preload = 'auto'; } });
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      el.querySelectorAll('.n-phone:not(.is-later)').forEach(ph => {
        const t = ph.querySelector('video').currentTime;
        ph.querySelectorAll('.n-call').forEach((c, k) => {
          const w = c.dataset.t && c.dataset.t.split(',').map(r => r.split('-').map(Number));
          c.classList.toggle('is-on', now >= el._readyAt + k * 100 && (!w || w.some(([a, b]) => t >= a && t < b)));
        });
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.classList.remove('play', 'swap');
      el.querySelectorAll('video').forEach(v => v.pause());
      el.querySelectorAll('.n-call').forEach(c => c.classList.remove('is-on'));
    };
  },
  step(el, i) {
    if (el._entering) { el._entering = false; el._readyAt = performance.now() + (i ? 1300 : 1200); }
    else { el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap'); el._readyAt = performance.now() + 380; }
    el.querySelectorAll('.n-call').forEach(c => c.classList.remove('is-on'));
    el.querySelectorAll('.n-phone').forEach((ph, k) => {
      const v = ph.querySelector('video');
      if (k === i) { v.currentTime = 0; const p = v.play(); if (p) p.catch(() => {}); }
      else v.pause();
    });
  },
});
