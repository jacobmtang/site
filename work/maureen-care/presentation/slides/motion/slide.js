// Replays the entrance each time the slide becomes current. Three clips per step (data-until / data-from in
// slide.html): the visible step's clips load on first show (data-src), play from the start, and the rest pause.
function motionPlay(el) {
  el.querySelectorAll('.m-grid').forEach(g => {
    const on = !g.classList.contains('is-later');
    g.querySelectorAll('video').forEach(v => {
      if (!on) { v.pause(); return; }
      if (!v.getAttribute('src')) { v.src = v.dataset.src; v.preload = 'auto'; }
      v.currentTime = 0; const p = v.play(); if (p) p.catch(() => {});
    });
  });
}
Deck.define('motion', {
  enter(el) {
    el.classList.remove('play'); void el.offsetWidth; el.classList.add('play');
    return () => { el.classList.remove('play'); el.querySelectorAll('video').forEach(v => v.pause()); };
  },
  step(el) { motionPlay(el); },
});
