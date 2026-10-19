// Replays the entrance each time the slide becomes current, then marks the slide settled (see slide.css).
let timer;
Deck.define('journey', {
  enter(el) {
    clearTimeout(timer);
    el.classList.remove('play', 'settled'); void el.offsetWidth; el.classList.add('play');
    timer = setTimeout(() => el.classList.add('settled'), 1300);
    return () => { clearTimeout(timer); el.classList.remove('play', 'settled'); };
  },
  step(el) { clearTimeout(timer); el.classList.add('settled'); },
});
