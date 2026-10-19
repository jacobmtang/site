// Replays the entrance (fade and slide up) each time the slide becomes current, then marks it settled
// (see slide.css). The deck calls step() right after enter() too, so that first call is skipped; only a real
// step change (or the timer) settles the slide.
let timer, fresh = false;
Deck.define('journey', {
  enter(el) {
    clearTimeout(timer); fresh = true;
    el.classList.remove('play', 'settled'); void el.offsetWidth; el.classList.add('play');
    timer = setTimeout(() => el.classList.add('settled'), 1300);
    return () => { clearTimeout(timer); el.classList.remove('play', 'settled'); };
  },
  step(el) {
    if (fresh) { fresh = false; return; }
    clearTimeout(timer); el.classList.add('settled');
  },
});
