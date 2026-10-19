// Replays the entrance each time the slide becomes current; the landing-page recording loads on first show,
// plays from the start, and pauses on leaving.
Deck.define('assets', {
  enter(el) {
    el.classList.remove('play'); void el.offsetWidth; el.classList.add('play');
    el.querySelectorAll('video').forEach(v => {
      if (!v.getAttribute('src')) { v.src = v.dataset.src; v.preload = 'auto'; }
      v.currentTime = 0; const p = v.play(); if (p) p.catch(() => {});
    });
    return () => { el.classList.remove('play'); el.querySelectorAll('video').forEach(v => v.pause()); };
  },
});
